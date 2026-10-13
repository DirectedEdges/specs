#!/usr/bin/env node
// Bridge server — persistent WebSocket server for the Specs 2 CLI bridge.
// Stays running until Ctrl+C (or SIGTERM from `specs bridge stop`). Accepts
// multiple renderComponent/generateFromSelection commands per session, and
// multiple simultaneously connected Figma files (each with its own plugin
// connection).
//
// Ports:
//   9001 — WebSocket, for plugin connections (ui.html) — one per open Figma file
//   9002 — HTTP, control endpoint for the CLI (`specs render` / `specs generate`) or scripts
//
// HTTP API:
//   POST http://localhost:9002/render
//   Body: { "specPath": "/abs/path/to/spec.yaml", "pageId": "1462-365", "fileKey": "..." }
//   fileKey is optional when exactly one plugin is connected; required (and
//   validated) when more than one is connected.
//   Response: { "success": true, "nodeId": "..." }  (round-trip spec read is
//   an explicit second call — POST /generate — not a render side effect)
//   POST http://localhost:9002/generate
//   Body: { "fileKey": "..." }  (fileKey optional under the same single-connection rule)
//   Generates a spec from the plugin's current Figma selection — no REST fetch needed.
//   Response: { "success": true, "nodeId": "...", "name": "...", "specData": {...} }
//   POST http://localhost:9002/variables
//   Body: { "fileKey": "..." }  (fileKey optional under the same single-connection rule)
//   Reads the connected file's variables via the Plugin API, shaped like the REST
//   variables/local response's meta — no REST call, no Enterprise plan needed.
//   Response: { "success": true, "fileKey": "...", "meta": { "variableCollections": {...}, "variables": {...} } }
//   POST http://localhost:9002/inspect
//   Body: { "pageId": "42:2", "nodeId": "43:2", "fileKey": "...", "conventions": {...}, "settings": {...} }
//   Describes a live component's anatomy elements, keyed the way the spec keys them, with
//   the annotations already standing on each. Read-only. pageId and nodeId come from the
//   spec's metadata.source; conventions/settings are needed for key derivation.
//   Response: { "success": true, "name": "Checkbox", "elements": [
//     { "key": "fieldLabel", "figmaName": "Field.Label", "type": "TEXT",
//       "nodes": [{ "variant": "checked=false, …", "nodeId": "42:6", "annotations": ["role:label"] }],
//       "signals": { "role": ["label"] } } ] }
//   POST http://localhost:9002/annotate
//   Body: { "pageId": "42:2", "components": [{ "nodeId": "43:2", "title": "checkbox",
//            "elements": [{ "key": "control", "lines": ["role:checkbox"] }] }],
//          "conventions": {...}, "settings": {...} }
//   Adds role annotations to components on one page. Elements are named by anatomy key,
//   never by node id — the plugin resolves each key against the live component at write
//   time. Appends; never assigns over an existing annotation, and refuses an element that
//   already carries a role on any variant.
//   Response: { "success": true, "components": [{ "title": "checkbox", "elements": [
//     { "key": "control", "nodeId": "42:4", "status": "applied" } ] }] }
//   GET  http://localhost:9002/status
//   Response: { "connections": [{ "fileKey": "...", "fileName": "...", "connected": true }] }
//
// CLI (one-shot render, then stays running):
//   node bridge-server.js [--workspace /path/to/workspace] --render path/to/spec.yaml [--pageId 1462-365]
//
// Workspace resolution (in order of precedence):
//   1. --workspace <path> CLI flag
//   2. WORKSPACE_DIR env var
//   3. Derived per-request from the specPath (walks up to find specs/ + data/ sibling dirs)
//   4. SPECS_DIR / DATA_DIR env vars as explicit overrides for non-standard layouts
//
// Multi-connection protocol:
//   Each plugin connection sends { type: 'hello', fileKey, fileName? } immediately
//   on connect. The server tracks connections in a Map keyed by fileKey — this
//   replaces a single "activeSocket" variable, which had a real bug: with only
//   one tracked socket, an older connection's close event would null out a
//   newer, still-live connection's reference. Every request (getPageId,
//   renderComponent) carries a generated requestId; the plugin must echo it
//   back on the matching result message, so responses route to the right
//   caller even with multiple connections and requests in flight.

import type { ResolvedConventions, ResolvedSettings } from '@directededges/specs-schema';
import { WebSocketServer, type WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { isAbsolute } from 'path';
import { parse } from 'yaml';
import { WS_PORT, HTTP_PORT, DEFAULT_PAGE_ID } from './config.js';
import { ConnectionRegistry, type Connection } from './connections.js';
import { RequestTracker } from './requestTracker.js';
import {
  buildManifest, buildGlyphManifest, buildStylesManifest, buildVariablesManifest,
  type Manifest, type GlyphManifest, type VariablesManifest,
} from './manifests.js';
import {
  resolveDirs as resolveWorkspaceDirs,
  type WorkspaceOverrides,
} from './workspace.js';
import type { RenderRequestBody } from './client.js';
import { validateCache, describeProblems } from '../cache/cache.js';

/** The Dev Mode status a render request may carry — the bridge relays it, it does not
 *  derive it. `RenderCommand` reads it from the workspace scan manifest. */
type DevStatusRequest = RenderRequestBody['devStatus'];


interface RenderResult {
  success: boolean;
  nodeId?: string;
  error?: string;
  /** Phase durations reported by the plugin render (see figma-from-specs Timings.ts). */
  timings?: { total: number; phases: Array<{ label: string; ms: number; count: number }> };
  /** Phase durations measured here, before and around the plugin round-trip. */
  bridgeTimings?: Array<{ label: string; ms: number }>;
  /** Size of the render payload sent over the socket, in KB. */
  payloadKB?: number;
}

interface GenerateResult {
  success: boolean;
  nodeId?: string;
  name?: string;
  specData?: unknown;
  error?: string;
}

/** The connected file's variables, read by the plugin and shaped like the REST
 *  variables/local response's `meta` — see bridge/client.ts GetVariablesResponse. */
interface VariablesResult {
  success: boolean;
  fileKey?: string;
  meta?: { variableCollections: Record<string, unknown>; variables: Record<string, unknown> };
  error?: string;
}

/** The outcome of adding role annotations to one page's components —
 *  see bridge/client.ts AnnotateResponse. */
interface AnnotateResult {
  success: boolean;
  fileKey?: string;
  components?: Array<{
    title: string;
    elements: Array<{ key: string; nodeId?: string; status: string; detail?: string }>;
  }>;
  error?: string;
}

/** A live component's anatomy elements, keyed as the spec keys them —
 *  see bridge/client.ts InspectResponse for the shape and why each field is there. */
interface InspectResult {
  success: boolean;
  fileKey?: string;
  name?: string;
  elements?: Array<{
    key: string;
    figmaName: string;
    type: string;
    nodes: Array<{ variant?: string; nodeId: string; annotations: string[] }>;
    signals: { role?: string[]; action?: string[] };
  }>;
  error?: string;
}

// ── Startup workspace (optional) ──────────────────────────────────────────────
// If set, all requests use this workspace. If not set, workspace is derived per-request.

const workspaceIdx = process.argv.indexOf('--workspace');
const startupWorkspaceDir: string | null =
  process.env.WORKSPACE_DIR ??
  (workspaceIdx !== -1 ? process.argv[workspaceIdx + 1] : null);

if (startupWorkspaceDir) {
  console.log(`  Workspace : ${startupWorkspaceDir}`);
} else {
  console.log(`  Workspace : (derived per-request from spec path)`);
}

/**
 * The startup answers every request resolves against: the pinned workspace above, and
 * the SPECS_DIR / DATA_DIR overrides for a layout that does not put `specs/` and `data/`
 * side by side. Read once here, because they are a property of how this process was
 * started rather than of any one request.
 */
const workspaceOverrides: WorkspaceOverrides = {
  startupWorkspaceDir,
  envSpecsDir: process.env.SPECS_DIR ?? null,
  envDataDir: process.env.DATA_DIR ?? null,
};

const resolveDirs = (fromPath: string) => resolveWorkspaceDirs(fromPath, workspaceOverrides);

console.log(`\nSpecs 2 — CLI bridge`);
console.log(`  WebSocket : ws://localhost:${WS_PORT}  (plugin)`);
console.log(`  HTTP      : http://localhost:${HTTP_PORT}/render  (control)`);
console.log(`  Enable the CLI Bridge in the Specs 2 plugin to connect.`);
console.log(`  Ctrl+C to stop.\n`);

// ── WebSocket server (plugin connections) ─────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT });

// Keyed by Figma file key. One entry per connected plugin instance.
const registry = new ConnectionRegistry<WebSocket>();

// Pending requests keyed by a generated requestId, so responses route to the
// right caller regardless of which connection they came from.
const requests = new RequestTracker<string | RenderResult | GenerateResult | VariablesResult | InspectResult | AnnotateResult>();

wss.on('connection', (ws: WebSocket) => {
  // This connection's fileKey isn't known until its 'hello' message arrives.
  let thisFileKey: string | null = null;
  console.log('Plugin socket opened, awaiting hello…');

  ws.on('message', (data: Buffer) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === 'hello') {
      thisFileKey = msg.fileKey as string;
      const fileName = msg.fileName as string | undefined;
      registry.register(thisFileKey, ws, fileName);
      console.log(`Plugin connected: ${thisFileKey}${fileName ? ` (${fileName})` : ''}`);
      return;
    }

    if (msg.type === 'pageId-result' || msg.type === 'renderComponent-result' || msg.type === 'generateFromSelection-result' || msg.type === 'removeNode-result' || msg.type === 'getVariables-result' || msg.type === 'inspectComponent-result' || msg.type === 'annotateElements-result') {
      const requestId = msg.requestId as string | undefined;
      if (!requestId) return; // no way to route this response

      if (msg.type === 'pageId-result') {
        requests.resolve(requestId, msg.pageId as string);
        return;
      }

      if (msg.type === 'annotateElements-result') {
        if (msg.success) {
          const components = msg.components as AnnotateResult['components'];
          const tally = { applied: 0, conflict: 0, unresolved: 0, unsupported: 0 } as Record<string, number>;
          for (const component of components ?? []) {
            for (const element of component.elements) tally[element.status] = (tally[element.status] ?? 0) + 1;
          }
          const parts = Object.entries(tally).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
          console.log(`✓ Annotated ${components?.length ?? 0} component(s) — ${parts.join(', ') || 'nothing to do'}`);
          requests.resolve(requestId, { success: true, components });
        } else {
          console.error(`✗ Annotate failed: ${msg.error}`);
          requests.resolve(requestId, { success: false, error: msg.error as string });
        }
        return;
      }

      if (msg.type === 'inspectComponent-result') {
        if (msg.success) {
          const elements = msg.elements as InspectResult['elements'];
          const annotated = (elements ?? []).filter((e) => (e.signals.role?.length ?? 0) > 0).length;
          console.log(`✓ Inspected ${msg.name ?? 'component'} — ${elements?.length ?? 0} elements, ${annotated} already carrying a role`);
          requests.resolve(requestId, { success: true, name: msg.name as string, elements });
        } else {
          console.error(`✗ Inspect failed: ${msg.error}`);
          requests.resolve(requestId, { success: false, error: msg.error as string });
        }
        return;
      }

      if (msg.type === 'getVariables-result') {
        if (msg.success) {
          const meta = msg.meta as VariablesResult['meta'];
          console.log(`✓ Variables read from plugin (${Object.keys(meta?.variables ?? {}).length} variables)`);
          requests.resolve(requestId, { success: true, meta });
        } else {
          console.error(`✗ Get variables failed: ${msg.error}`);
          requests.resolve(requestId, { success: false, error: msg.error as string });
        }
        return;
      }

      if (msg.type === 'generateFromSelection-result') {
        if (msg.success) {
          const nodeId = msg.nodeId as string;
          const name = msg.name as string | undefined;
          console.log(`✓ Generated from selection. nodeId: ${nodeId}`);
          requests.resolve(requestId, { success: true, nodeId, name, specData: msg.specData ?? null });
        } else {
          console.error(`✗ Generate from selection failed: ${msg.error}`);
          requests.resolve(requestId, { success: false, error: msg.error as string });
        }
        return;
      }

      // renderComponent-result
      if (msg.success) {
        const nodeId = msg.nodeId as string;
        const warnings = Array.isArray(msg.warnings) && msg.warnings.length > 0 ? (msg.warnings as string[]) : undefined;
        console.log(`✓ Rendered in Figma. nodeId: ${nodeId}`);
        for (const w of warnings ?? []) console.warn(`  ⚠ ${w}`);
        const timings = msg.timings as RenderResult['timings'];
        requests.resolve(requestId, { success: true, nodeId, ...(warnings ? { warnings } : {}), ...(timings ? { timings } : {}) });
      } else {
        console.error(`✗ Render failed: ${msg.error}`);
        requests.resolve(requestId, { success: false, error: msg.error as string });
      }
    }
  });

  ws.on('close', () => {
    if (thisFileKey) {
      registry.unregister(thisFileKey);
      console.log(`Plugin disconnected: ${thisFileKey}`);
    } else {
      console.log('Plugin socket closed before hello.');
    }
  });

  ws.on('error', (e: Error) => console.error('Socket error:', e.message));
});

wss.on('error', (e: NodeJS.ErrnoException) => {
  console.error(`WebSocket server error: ${e.message}`);
  if (e.code === 'EADDRINUSE') console.error(`Port ${WS_PORT} already in use.`);
  process.exit(1);
});

// ── HTTP control server ───────────────────────────────────────────────────────

/** Callers prefix what they print with "Error: ", so report the bare message. */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const http = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ connections: registry.list() }));
    return;
  }

  if (req.method === 'POST' && req.url === '/generate') {
    let genBody = '';
    req.on('data', (chunk) => { genBody += chunk; });
    req.on('end', () => {
      let params: { fileKey?: string; nodeId?: string; conventions?: ResolvedConventions; settings?: ResolvedSettings; remove?: boolean };
      try { params = genBody ? JSON.parse(genBody) : {}; } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
        return;
      }

      sendGenerateFromSelection(params.fileKey, params.nodeId, params.conventions, params.settings)
        // The spec is in hand before the node goes, so a failed removal cannot cost the read.
        .then(async (result) => {
          if (params.remove && result.success && result.nodeId) {
            try { await sendRemoveNode(result.nodeId, params.fileKey); } catch { /* reported by the caller's next read */ }
          }
          return result;
        })
        .then((result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        })
        .catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage(err) }));
        });
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/variables') {
    let varsBody = '';
    req.on('data', (chunk) => { varsBody += chunk; });
    req.on('end', () => {
      let params: { fileKey?: string };
      try { params = varsBody ? JSON.parse(varsBody) : {}; } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
        return;
      }

      sendGetVariables(params.fileKey)
        .then((result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        })
        .catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage(err) }));
        });
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/inspect') {
    let inspectBody = '';
    req.on('data', (chunk) => { inspectBody += chunk; });
    req.on('end', () => {
      let params: { fileKey?: string; pageId?: string; nodeId?: string; conventions?: ResolvedConventions; settings?: ResolvedSettings };
      try { params = inspectBody ? JSON.parse(inspectBody) : {}; } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
        return;
      }

      if (!params.pageId || !params.nodeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'pageId and nodeId are required — both come from the spec\'s metadata.source.' }));
        return;
      }

      sendInspectComponent(params.fileKey, params.pageId, params.nodeId, params.conventions, params.settings)
        .then((result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        })
        .catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage(err) }));
        });
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/annotate') {
    let annotateBody = '';
    req.on('data', (chunk) => { annotateBody += chunk; });
    req.on('end', () => {
      let params: { fileKey?: string; pageId?: string; components?: unknown; conventions?: ResolvedConventions; settings?: ResolvedSettings };
      try { params = annotateBody ? JSON.parse(annotateBody) : {}; } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
        return;
      }

      if (!params.pageId || !Array.isArray(params.components) || params.components.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'pageId and a non-empty components array are required.' }));
        return;
      }

      sendAnnotateElements(params.fileKey, params.pageId, params.components, params.conventions, params.settings)
        .then((result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        })
        .catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage(err) }));
        });
    });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/render') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Only POST /render, POST /generate, POST /variables, POST /inspect, POST /annotate, or GET /status is supported.' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let params: { specPath?: string; spec?: Record<string, unknown>; pageId?: string | null; fileKey?: string; overwrite?: boolean; conventions?: ResolvedConventions; settings?: ResolvedSettings; devStatus?: DevStatusRequest };
    try { params = JSON.parse(body); } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
      return;
    }

    const { specPath: specArg, spec: preParsedSpec, pageId = null, fileKey, overwrite, conventions, settings, devStatus } = params;

    if (!specArg) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'specPath is required.' }));
      return;
    }

    // Single spec path: must be absolute (workspace derivation requires a real path)
    if (!specArg || !isAbsolute(specArg)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'specPath must be absolute when no startup workspace is configured.' }));
      return;
    }

    sendRender(specArg, pageId, fileKey, preParsedSpec, overwrite, conventions, settings, devStatus)
      .then((result) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: errorMessage(err) }));
      });
  });
});

http.listen(HTTP_PORT);
http.on('error', (e: NodeJS.ErrnoException) => {
  console.error(`HTTP server error: ${e.message}`);
  if (e.code === 'EADDRINUSE') console.error(`Port ${HTTP_PORT} already in use.`);
  process.exit(1);
});


// ── Shared render logic ───────────────────────────────────────────────────────

/**
 * Ask a specific connection's plugin for the current Figma page ID.
 */
function getCurrentPageId(conn: Connection<WebSocket>): Promise<string> {
  const { requestId, promise } = requests.create(5000, 'Timed out waiting for pageId-result.');
  conn.ws.send(JSON.stringify({ type: 'getPageId', requestId }));
  return promise as Promise<string>;
}

/**
 * Ask a specific connection's plugin to generate a spec from its current Figma
 * selection, or from an explicit nodeId (the plugin selects that node first).
 */
/** Testing utility: delete a rendered node so a catalogue sweep leaves the page as it found it. */
async function sendRemoveNode(nodeId: string, fileKey?: string): Promise<{ success: boolean; error?: string }> {
  const conn = registry.resolve(fileKey);
  const { requestId, promise } = requests.create(30000, 'Timed out waiting for removeNode-result.');
  conn.ws.send(JSON.stringify({ type: 'removeNode', requestId, nodeId }));
  return promise as Promise<{ success: boolean; error?: string }>;
}

/**
 * Ask a connection's plugin to describe a live component's anatomy elements.
 *
 * Read-only, and the companion to annotating by anatomy key rather than by node id: the
 * plugin traverses the component set and keys every element the way the reader does, so a
 * caller can name `control` instead of a node id that a layer rebuild would invalidate.
 * The annotations already standing on each element come back with it, which is what tells
 * a caller a role is authored here already.
 *
 * `conventions`/`settings` travel with the request because key derivation depends on them
 * — the same reason `generateFromSelection` carries them. The plugin must not adopt them
 * as its own settings.
 */
async function sendInspectComponent(
  fileKey: string | undefined,
  pageId: string,
  nodeId: string,
  conventions?: ResolvedConventions,
  settings?: ResolvedSettings,
): Promise<InspectResult> {
  const conn = registry.resolve(fileKey);
  const { requestId, promise } = requests.create(60000, 'Timed out waiting for inspectComponent-result.');
  conn.ws.send(JSON.stringify({ type: 'inspectComponent', requestId, pageId, nodeId, conventions, settings }));
  const result = await (promise as Promise<InspectResult>);
  return { ...result, fileKey: conn.fileKey };
}

/**
 * Ask a connection's plugin to add role annotations to components on one page.
 *
 * The one mutating operation besides render, and the narrowest possible: it appends an
 * annotation and touches nothing else. Elements are named by anatomy key, and the plugin
 * resolves each key against the live component at write time, so no node id travels and
 * there is no stale-snapshot failure to detect.
 *
 * One page per call. A page is the unit a reviewer can watch and stop at, and the plugin
 * has to load a page to address its subtree, so batching across pages would load the whole
 * file to no purpose.
 */
async function sendAnnotateElements(
  fileKey: string | undefined,
  pageId: string,
  components: unknown[],
  conventions?: ResolvedConventions,
  settings?: ResolvedSettings,
): Promise<AnnotateResult> {
  const conn = registry.resolve(fileKey);
  const { requestId, promise } = requests.create(120000, 'Timed out waiting for annotateElements-result.');
  conn.ws.send(JSON.stringify({ type: 'annotateElements', requestId, pageId, components, conventions, settings }));
  const result = await (promise as Promise<AnnotateResult>);
  return { ...result, fileKey: conn.fileKey };
}

/** Ask a connection's plugin for the file's variables, shaped like the REST payload's meta. */
async function sendGetVariables(fileKey?: string): Promise<VariablesResult> {
  const conn = registry.resolve(fileKey);
  const { requestId, promise } = requests.create(60000, 'Timed out waiting for getVariables-result.');
  conn.ws.send(JSON.stringify({ type: 'getVariables', requestId }));
  const result = await (promise as Promise<VariablesResult>);
  // The answering connection names the file — the caller maps it to a source alias.
  return { ...result, fileKey: conn.fileKey };
}

async function sendGenerateFromSelection(fileKey?: string, nodeId?: string, conventions?: ResolvedConventions, settings?: ResolvedSettings): Promise<GenerateResult> {
  const conn = registry.resolve(fileKey);
  const { requestId, promise } = requests.create(60000, 'Timed out waiting for generateFromSelection-result.');
  // `conventions`/`settings` travel with the request and govern how the plugin builds
  // this one spec. The plugin must not adopt them as its own settings.
  conn.ws.send(JSON.stringify({ type: 'generateFromSelection', requestId, nodeId, conventions, settings }));
  return promise as Promise<GenerateResult>;
}

/**
 * Send a single renderComponent message over the WebSocket and wait for the result.
 */
async function sendRender(specPath: string, rawPageId: string | null, fileKey?: string, preParsedSpec?: Record<string, unknown>, overwrite?: boolean, conventions?: ResolvedConventions, settings?: ResolvedSettings, devStatus?: DevStatusRequest): Promise<RenderResult> {
  const conn = registry.resolve(fileKey);

  let spec: Record<string, unknown>;
  if (preParsedSpec) {
    spec = preParsedSpec;
  } else {
    try {
      spec = parse(readFileSync(specPath, 'utf8'));
    } catch (e) {
      throw new Error(`Error reading spec: ${(e as Error).message}`);
    }
  }

  const dirs = resolveDirs(specPath);
  const { specsDir, dataDir, aliases, glyphs } = dirs;

  // Render resolves against the caches only. A missing or stale cache is fatal rather
  // than rebuilt here: rebuilding parses every fetched payload, which is exactly the
  // per-render cost the caches exist to remove — and silently rendering against data
  // that no longer matches what was fetched binds specs to the wrong variables.
  const problems = validateCache({ dataDir, aliases, glyphs });
  if (problems.length > 0) throw new Error(describeProblems(problems));

  const bridgeTimings: Array<{ label: string; ms: number }> = [];
  const timed = <T>(label: string, fn: () => T): T => {
    const start = Date.now();
    try { return fn(); } finally { bridgeTimings.push({ label, ms: Date.now() - start }); }
  };

  // A spec generated since the conventions/settings split (ADR-071) records its key
  // format at `metadata.settings.spec.keys`; older specs carry `metadata.config.format.keys`.
  // Read the new key first and fall back so pre-split specs still render.
  type SpecMeta = { settings?: { spec?: { keys?: string } }; config?: { format?: { keys?: string } } };
  const keysOf = (m?: SpecMeta): string | undefined => m?.settings?.spec?.keys ?? m?.config?.format?.keys;
  const componentsOf = (spec as { components?: Record<string, { metadata?: SpecMeta }> })?.components;
  const keyFormat = keysOf((spec as { metadata?: SpecMeta })?.metadata)
    ?? keysOf(componentsOf?.[Object.keys(componentsOf ?? {})[0]]?.metadata);
  const manifest = timed('instance manifest', () => buildManifest(spec, specsDir, dataDir, keyFormat));
  const glyphIdManifest = timed('glyph manifest', () => buildGlyphManifest(dataDir));
  const stylesManifest = timed('styles manifest', () => buildStylesManifest(dataDir));
  const variablesManifest = timed('variables manifest', () => buildVariablesManifest(dataDir));

  // Resolve page ID: use provided value, or ask this connection's plugin for its current page.
  let pageId: string;
  if (rawPageId) {
    pageId = rawPageId.replace(/-/g, ':');
  } else {
    pageId = await getCurrentPageId(conn);
    console.log(`  Page ID: ${pageId} (from plugin current page, ${conn.fileKey})`);
  }

  const specTyped = spec as { components?: Record<string, { title?: string }> };
  const componentName = Object.values(specTyped.components ?? {})[0]?.title
    ?? Object.keys(specTyped.components ?? {})[0]
    ?? specPath;

  console.log(`Rendering: ${componentName} → page ${pageId} (${conn.fileKey})`);

  // A large component set against a big library can take minutes today; a timeout
  // shorter than the render discards a result the plugin actually produced.
  const { requestId, promise } = requests.create(300000, 'Timed out waiting for renderComponent-result.');
  const payload = JSON.stringify({ type: 'renderComponent', requestId, spec, pageId, instanceIdManifest: manifest, glyphIdManifest, stylesManifest, variablesManifest, overwrite, conventions, settings, devStatus });

  const sentAt = Date.now();
  conn.ws.send(payload);
  const result = await (promise as Promise<RenderResult>);
  bridgeTimings.push({ label: 'plugin round-trip', ms: Date.now() - sentAt });
  return { ...result, bridgeTimings, payloadKB: Math.round(payload.length / 1024) };
}

// ── CLI: --render flag ────────────────────────────────────────────────────────
//
// node bridge-server.js --render /abs/path/to/spec.yaml [--pageId 1462-365]
// Debug shortcut — only works when exactly one plugin is connected.

const renderIdx = process.argv.indexOf('--render');
if (renderIdx !== -1) {
  const specArg = process.argv[renderIdx + 1];
  const pageIdIdx = process.argv.indexOf('--pageId');
  const rawPageId = pageIdIdx !== -1 ? process.argv[pageIdIdx + 1] : DEFAULT_PAGE_ID;

  if (!specArg) { console.error('--render requires a spec path'); process.exit(1); }
  if (!isAbsolute(specArg)) { console.error('--render path must be absolute'); process.exit(1); }

  const tryRender = (): void => {
    if (registry.size > 0) {
      sendRender(specArg, rawPageId)
        .catch((e) => console.error((e as Error).message));
    } else {
      console.log('Waiting for plugin to connect…');
      setTimeout(tryRender, 1000);
    }
  };
  setTimeout(tryRender, 500);
}
