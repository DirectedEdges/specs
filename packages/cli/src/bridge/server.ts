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

import type { ResolvedConfig } from '@directededges/specs-schema';
import { WebSocketServer, type WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve as pathResolve, isAbsolute, basename } from 'path';
import { parse } from 'yaml';
import { WS_PORT, HTTP_PORT, DEFAULT_PAGE_ID, resolveWorkspaceDir } from './config.js';
import { ConnectionRegistry, type Connection } from './connections.js';
import { RequestTracker } from './requestTracker.js';
import { countUnpublished, type VariablesIndex } from '../utilities/variablesIndex.js';
import { formatKey } from '../utilities/formatKey.js';
import {
  readCacheFile, validateCache, describeProblems,
  type ComponentsEntry, type StylesEntry, type VariablesEntry, type IconsEntry,
} from '../Cache/Cache.js';

/** id = same-file node id (fast path); key = published cross-file key (fallback import). */
type ComponentEntry = { id: string; key?: string };
type Manifest = Record<string, ComponentEntry>;
type GlyphManifest = Record<string, ComponentEntry>;
/** Token name → the handles that name resolves to. A spec references a variable by name only,
 *  so this is what gives the name meaning on the render side. */
type VariablesManifest = VariablesIndex;

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

// SPECS_DIR / DATA_DIR env vars override workspace derivation for non-standard layouts.
const envSpecsDir = process.env.SPECS_DIR ?? null;
const envDataDir = process.env.DATA_DIR ?? null;

/**
 * Resolve the specs and data directories for a given spec or manifest path.
 * Precedence: explicit env overrides → startup workspace → per-request derivation.
 */
function resolveDirs(fromPath: string): { specsDir: string; dataDir: string; aliases: string[]; glyphNamePattern?: string } {
  const workspaceDir = startupWorkspaceDir ?? resolveWorkspaceDir(fromPath);
  if (!workspaceDir && (!envSpecsDir || !envDataDir)) {
    throw new Error(
      `Cannot determine workspace for "${fromPath}". ` +
      `Pass --workspace <dir>, set WORKSPACE_DIR, or ensure the path is inside a directory containing specs/ and data/.`
    );
  }
  const specsDir = envSpecsDir ?? pathResolve(workspaceDir as string, 'specs');
  const dataDir = envDataDir ?? pathResolve(workspaceDir as string, 'data');
  // Data files are named {sourceAlias}.manifest.md, {sourceAlias}.file.json, etc.
  // The source alias comes from the first key under `sources` in specs.config.yaml.
  const { aliases, glyphNamePattern } = resolveSources(workspaceDir as string);
  return { specsDir, dataDir, aliases, glyphNamePattern };
}

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
const requests = new RequestTracker<string | RenderResult | GenerateResult>();

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

    if (msg.type === 'pageId-result' || msg.type === 'renderComponent-result' || msg.type === 'generateFromSelection-result') {
      const requestId = msg.requestId as string | undefined;
      if (!requestId) return; // no way to route this response

      if (msg.type === 'pageId-result') {
        requests.resolve(requestId, msg.pageId as string);
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
      let params: { fileKey?: string; nodeId?: string; config?: ResolvedConfig };
      try { params = genBody ? JSON.parse(genBody) : {}; } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
        return;
      }

      sendGenerateFromSelection(params.fileKey, params.nodeId, params.config)
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
    res.end(JSON.stringify({ error: 'Only POST /render, POST /generate, or GET /status is supported.' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let params: { specPath?: string; spec?: Record<string, unknown>; pageId?: string | null; fileKey?: string; overwrite?: boolean; config?: ResolvedConfig };
    try { params = JSON.parse(body); } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
      return;
    }

    const { specPath: specArg, spec: preParsedSpec, pageId = null, fileKey, overwrite, config } = params;

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

    sendRender(specArg, pageId, fileKey, preParsedSpec, overwrite, config)
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

// ── Shared utilities ──────────────────────────────────────────────────────────

// ── Manifest builders ─────────────────────────────────────────────────────────
//
// Every library-side lookup a render needs is read from the caches under
// {dataDir}/cache/ (see src/Cache/Cache.ts). They are built by `specs fetch` and
// `specs cache` from the fetched payloads, so no payload is parsed here — a file
// payload can be hundreds of megabytes and used to be parsed three times per render.
// Only the spec-side half of the instance manifest is derived at render time, since
// it reflects the workspace's specs rather than the library.

/**
 * Build a flat manifest of spec key → component entry by scanning specsDir.
 * Also layers in subcomponent ref aliases from the current spec. Published
 * cross-file keys come from the components cache, which records them per node id
 * across every fetched library.
 */
function buildManifest(spec: Record<string, unknown>, specsDir: string, dataDir: string, keyFormat?: string): Manifest {
  const manifest: Manifest = {};

  const cache = readCacheFile<ComponentsEntry>(dataDir, 'components');
  const entryFor = (id: string): ComponentEntry => {
    const key = cache?.entries[id]?.key;
    return key ? { id, key } : { id };
  };

  const specFiles = collectSpecFiles(specsDir);
  // Deduplicate by key: first nodeId found wins (variants.yaml before api.yaml, etc.)
  for (const { key, path } of specFiles) {
    if (manifest[key]) continue; // already have a nodeId for this key
    try {
      const s = parse(readFileSync(path, 'utf8')) as { metadata?: { source?: { nodeId?: string } } };
      const nodeId = s.metadata?.source?.nodeId;
      if (nodeId) manifest[key] = entryFor(nodeId);
    } catch {
      // Skip unreadable or non-spec files silently
    }
  }

  // Layer 2: alias subcomponent ref keys from the current spec.
  const specTyped = spec as {
    subcomponents?: Record<string, { source?: { nodeId?: string }; title?: string }>;
    components?: Record<string, { subcomponents?: Record<string, { source?: { nodeId?: string }; title?: string }> }>;
  };
  const subcomponents = specTyped.subcomponents ?? Object.values(specTyped.components ?? {})[0]?.subcomponents;
  if (subcomponents) {
    for (const [refKey, sub] of Object.entries(subcomponents)) {
      if (sub.source?.nodeId) {
        manifest[refKey] = entryFor(sub.source.nodeId);
      } else if (sub.title) {
        const titleKey = toCamelCase(sub.title);
        if (manifest[titleKey]) manifest[refKey] = manifest[titleKey];
      }
    }
  }

  // Layer 3: the components the workspace has no spec for.
  //
  // A spec names an instance's component with a formatted key, and that transform is lossy
  // — "DS Link/On overlay/M/False/Rest/Start" formats to "dsLinkOnOverlayMFalseRestStart"
  // with the separators gone — so the name cannot be reconstructed from the key. It can be
  // recognised, though: format the library's own component names the same way and compare.
  // These resolve by published key on the render side, which is what makes a component from
  // another file placeable at all.
  //
  // Only names this spec actually references are added, so the payload does not grow by the
  // library's entire component list. Spec-derived entries always win — a workspace component
  // is the more specific answer, and its node id is local to the file being rendered into.
  const referenced = collectComponentNames(spec);
  if (referenced.size > 0 && cache) {
    const byFormattedName = new Map<string, ComponentEntry>();
    for (const [id, entry] of Object.entries(cache.entries)) {
      if (!entry.name) continue;
      const formatted = formatKey(entry.name, keyFormat);
      // First occurrence wins. Distinct components can format to the same key (the transform
      // is lossy), and nothing in the payload says which one a spec meant.
      if (!byFormattedName.has(formatted)) byFormattedName.set(formatted, { id, key: entry.key });
    }
    let added = 0;
    for (const name of referenced) {
      if (manifest[name]) continue;
      const found = byFormattedName.get(name);
      if (found) { manifest[name] = found; added++; }
    }
    if (added > 0) console.log(`  Manifest: +${added} from library components with no spec`);
  }

  console.log(`  Manifest: ${Object.keys(manifest).length} entries`);
  return manifest;
}

/**
 * Every component name a spec references, at any depth — variants, examples, slot content,
 * subcomponents. `$ref` forms are skipped: those already resolve within the spec.
 *
 * Two surfaces name components. `instanceOf` names the component an element instantiates.
 * A `propConfigurations` value names one too when the property behind it is an instance
 * swap — an icon on an avatar, say — and the spec gives no clue which of its values those
 * are, since it records the property's value, not its Figma type. So every string value is
 * offered up: a name that matches no library component simply finds nothing, and one that
 * does is only ever used by a swap that asked for it.
 */
function collectComponentNames(node: unknown, acc = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { for (const item of node) collectComponentNames(item, acc); return acc; }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'instanceOf' && typeof value === 'string') acc.add(value);
    else if (key === 'propConfigurations' && value && typeof value === 'object') {
      for (const configured of Object.values(value as Record<string, unknown>)) {
        if (typeof configured === 'string') acc.add(configured);
      }
      collectComponentNames(value, acc); // $nested configs carry their own values
    }
    else collectComponentNames(value, acc);
  }
  return acc;
}

/**
 * Glyph name → component entry, straight from the icons cache. The cache is built by
 * matching the configured glyphNamePattern against the fetched file, so render depends
 * on no scan output: a scan manifest is generated and then authored, which makes it a
 * poor thing to resolve against.
 */
function buildGlyphManifest(dataDir: string): GlyphManifest {
  const cache = readCacheFile<IconsEntry>(dataDir, 'icons');
  const result: GlyphManifest = {};
  for (const [name, entry] of Object.entries(cache?.entries ?? {})) {
    result[name] = entry.key ? { id: entry.id, key: entry.key } : { id: entry.id };
  }
  console.log(`  Glyph manifest: ${Object.keys(result).length} glyphs`);
  return result;
}

/** Style name → published key, for the style types a spec can reference. */
function buildStylesManifest(dataDir: string): Record<string, string> {
  const cache = readCacheFile<StylesEntry>(dataDir, 'styles');
  const result: Record<string, string> = {};
  for (const [name, entry] of Object.entries(cache?.entries ?? {})) {
    result[name] = entry.key;
  }
  console.log(`  Styles manifest: ${Object.keys(result).length} entries`);
  return result;
}

/** Token name → the handles it resolves to. */
function buildVariablesManifest(dataDir: string): VariablesManifest {
  const cache = readCacheFile<VariablesEntry>(dataDir, 'variables');
  const index: VariablesManifest = {};
  for (const [name, entry] of Object.entries(cache?.entries ?? {})) {
    index[name] = { key: entry.key, id: entry.id, published: entry.published };
  }

  const names = Object.keys(index).length;
  if (names === 0) {
    console.warn(`  Variables manifest: no named variables cached — variable binding disabled`);
    return index;
  }

  const unpublished = countUnpublished(index);
  const suffix = unpublished > 0 ? ` (${unpublished} not importable from the library — id fallback only)` : '';
  console.log(`  Variables manifest: ${names} token names${suffix}`);
  return index;
}

/**
 * Collect all spec YAML files from a specs directory.
 * Handles both flat layouts (specsDir/foo.yaml) and subdirectory layouts
 * (specsDir/foo/variants.yaml, specsDir/foo/api.yaml, etc.).
 * Returns an array of { key, path } where key is the camelCase component name.
 */
function collectSpecFiles(specsDir: string): Array<{ key: string; path: string }> {
  let entries: string[];
  try {
    entries = readdirSync(specsDir);
  } catch (e) {
    throw new Error(`Cannot read specs directory "${specsDir}": ${(e as Error).message}`);
  }

  const files: Array<{ key: string; path: string }> = [];
  for (const entry of entries) {
    const entryPath = pathResolve(specsDir, entry);
    let stat;
    try { stat = statSync(entryPath); } catch { continue; }

    if (stat.isFile() && entry.endsWith('.yaml')) {
      // Flat layout: specsDir/foo.yaml → key "foo"
      files.push({ key: basename(entry, '.yaml'), path: entryPath });
    } else if (stat.isDirectory()) {
      // Subdirectory layout: specsDir/foo/variants.yaml → key "foo"
      // Prefer variants.yaml; also collect api.yaml and others for nodeId scanning.
      let subEntries: string[];
      try { subEntries = readdirSync(entryPath); } catch { continue; }
      for (const sub of subEntries) {
        if (sub.endsWith('.yaml')) {
          files.push({ key: entry, path: pathResolve(entryPath, sub) });
        }
      }
    }
  }

  return files;
}


function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

// ── Workspace config resolution ───────────────────────────────────────────────

/**
 * Read specs.config.yaml from the workspace root and return the first source alias.
 * Data files are named {alias}.manifest.md, {alias}.file.json, etc. — matching what
 * `specs scan` produces (line: baseName = path.basename(alias + '.file.json', '.file.json')).
 * Falls back to the workspace directory name if the config is absent or has no sources.
 */
/**
 * Every source alias declared in the workspace config, in declaration order, plus the
 * glyph naming pattern. Render resolves against all of them: a component can instance a
 * component, bind a token, or place a glyph from any library the workspace declares.
 */
function resolveSources(workspaceDir: string): { aliases: string[]; glyphNamePattern?: string } {
  const configPath = pathResolve(workspaceDir, 'specs.config.yaml');
  try {
    const config = parse(readFileSync(configPath, 'utf8')) as {
      sources?: Record<string, unknown>;
      config?: { processing?: { glyphNamePattern?: string } };
    };
    const sources = config?.sources;
    const aliases = sources && typeof sources === 'object' ? Object.keys(sources) : [];
    return { aliases, glyphNamePattern: config?.config?.processing?.glyphNamePattern };
  } catch {
    // No config or unreadable — no aliases, which render reports as an unusable cache
    return { aliases: [] };
  }
}

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
async function sendGenerateFromSelection(fileKey?: string, nodeId?: string, config?: ResolvedConfig): Promise<GenerateResult> {
  const conn = registry.resolve(fileKey);
  const { requestId, promise } = requests.create(60000, 'Timed out waiting for generateFromSelection-result.');
  // `config` travels with the request and governs how the plugin builds this one spec.
  // The plugin must not adopt it as its own settings.
  conn.ws.send(JSON.stringify({ type: 'generateFromSelection', requestId, nodeId, config }));
  return promise as Promise<GenerateResult>;
}

/**
 * Send a single renderComponent message over the WebSocket and wait for the result.
 */
async function sendRender(specPath: string, rawPageId: string | null, fileKey?: string, preParsedSpec?: Record<string, unknown>, overwrite?: boolean, config?: ResolvedConfig): Promise<RenderResult> {
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
  const { specsDir, dataDir, aliases, glyphNamePattern } = dirs;

  // Render resolves against the caches only. A missing or stale cache is fatal rather
  // than rebuilt here: rebuilding parses every fetched payload, which is exactly the
  // per-render cost the caches exist to remove — and silently rendering against data
  // that no longer matches what was fetched binds specs to the wrong variables.
  const problems = validateCache({ dataDir, aliases, glyphNamePattern });
  if (problems.length > 0) throw new Error(describeProblems(problems));

  const bridgeTimings: Array<{ label: string; ms: number }> = [];
  const timed = <T>(label: string, fn: () => T): T => {
    const start = Date.now();
    try { return fn(); } finally { bridgeTimings.push({ label, ms: Date.now() - start }); }
  };

  const keyFormat = (spec as { metadata?: { config?: { format?: { keys?: string } } } })?.metadata?.config?.format?.keys
    ?? (spec as { components?: Record<string, { metadata?: { config?: { format?: { keys?: string } } } }> })
      ?.components?.[Object.keys((spec as { components?: Record<string, unknown> }).components ?? {})[0]]
      ?.metadata?.config?.format?.keys;
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
  const payload = JSON.stringify({ type: 'renderComponent', requestId, spec, pageId, instanceIdManifest: manifest, glyphIdManifest, stylesManifest, variablesManifest, overwrite, config });

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
