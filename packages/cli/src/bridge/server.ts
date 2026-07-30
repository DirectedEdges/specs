#!/usr/bin/env node
// Bridge server — persistent WebSocket server for the Specs 2 CLI bridge.
// Stays running until Ctrl+C (or SIGTERM from `specs bridge stop`). Accepts
// multiple writeComponent commands per session, and multiple simultaneously
// connected Figma files (each with its own plugin connection).
//
// Ports:
//   9001 — WebSocket, for plugin connections (ui.html) — one per open Figma file
//   9002 — HTTP, control endpoint for the CLI (`specs render`) or scripts
//
// HTTP API:
//   POST http://localhost:9002/write
//   Body: { "specPath": "/abs/path/to/spec.yaml", "pageId": "1462-365", "fileKey": "..." }
//   fileKey is optional when exactly one plugin is connected; required (and
//   validated) when more than one is connected.
//   Response: { "success": true, "nodeId": "...", "specData": {...} }
//   GET  http://localhost:9002/status
//   Response: { "connections": [{ "fileKey": "...", "fileName": "...", "connected": true }] }
//
// CLI (one-shot render, then stays running):
//   node bridge-server.js [--workspace /path/to/workspace] --write path/to/spec.yaml [--pageId 1462-365]
//
// Workspace resolution (in order of precedence):
//   1. --workspace <path> CLI flag
//   2. WORKSPACE_DIR env var
//   3. Derived per-request from the specPath/manifestPath (walks up to find specs/ + data/ sibling dirs)
//   4. SPECS_DIR / DATA_DIR env vars as explicit overrides for non-standard layouts
//
// Multi-connection protocol:
//   Each plugin connection sends { type: 'hello', fileKey, fileName? } immediately
//   on connect. The server tracks connections in a Map keyed by fileKey — this
//   replaces a single "activeSocket" variable, which had a real bug: with only
//   one tracked socket, an older connection's close event would null out a
//   newer, still-live connection's reference. Every request (getPageId,
//   writeComponent) carries a generated requestId; the plugin must echo it
//   back on the matching result message, so responses route to the right
//   caller even with multiple connections and requests in flight.

import { WebSocketServer, type WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve as pathResolve, isAbsolute, basename, dirname } from 'path';
import { parse } from 'yaml';
import { WS_PORT, HTTP_PORT, DEFAULT_PAGE_ID, resolveWorkspaceDir } from './config.js';
import { ConnectionRegistry, type Connection } from './connections.js';
import { RequestTracker } from './requestTracker.js';

type Manifest = Record<string, string>;

interface WriteResult {
  success: boolean;
  nodeId?: string;
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
function resolveDirs(fromPath: string): { specsDir: string; dataDir: string; workspaceName: string } {
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
  const sourceAlias = resolveSourceAlias(workspaceDir as string);
  return { specsDir, dataDir, workspaceName: sourceAlias };
}

console.log(`\nSpecs 2 — CLI bridge`);
console.log(`  WebSocket : ws://localhost:${WS_PORT}  (plugin)`);
console.log(`  HTTP      : http://localhost:${HTTP_PORT}/write  (control)`);
console.log(`  Enable the CLI Bridge in the Specs 2 plugin to connect.`);
console.log(`  Ctrl+C to stop.\n`);

// ── WebSocket server (plugin connections) ─────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT });

// Keyed by Figma file key. One entry per connected plugin instance.
const registry = new ConnectionRegistry<WebSocket>();

// Pending requests keyed by a generated requestId, so responses route to the
// right caller regardless of which connection they came from.
const requests = new RequestTracker<string | WriteResult>();

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

    if (msg.type === 'pageId-result' || msg.type === 'writeComponent-result') {
      const requestId = msg.requestId as string | undefined;
      if (!requestId) return; // no way to route this response

      if (msg.type === 'pageId-result') {
        requests.resolve(requestId, msg.pageId as string);
        return;
      }

      // writeComponent-result
      if (msg.success) {
        const nodeId = msg.nodeId as string;
        const specData = msg.specData ?? null;
        console.log(`✓ Rendered in Figma. nodeId: ${nodeId}`);
        if (specData) console.log('  Spec round-trip: received generated spec data.');
        requests.resolve(requestId, { success: true, nodeId, specData });
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

const http = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ connections: registry.list() }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/write') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Only POST /write or GET /status is supported.' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let params: { specPath?: string; spec?: Record<string, unknown>; manifestPath?: string; pageId?: string | null; returnSpec?: boolean; fileKey?: string };
    try { params = JSON.parse(body); } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
      return;
    }

    const { specPath: specArg, spec: preParsedSpec, manifestPath: manifestArg, pageId = null, returnSpec, fileKey } = params;

    if (!specArg && !manifestArg) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'specPath or manifestPath is required.' }));
      return;
    }

    // Manifest path: drain the queue, return summary
    if (manifestArg) {
      const manifestPath = isAbsolute(manifestArg) ? manifestArg : pathResolve(process.cwd(), manifestArg);
      let specPaths: string[];
      try {
        specPaths = parseRenderManifest(manifestPath);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: (e as Error).message }));
        return;
      }
      drainManifest(specPaths, pageId, fileKey)
        .then((summary) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, ...summary }));
        })
        .catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: String(err) }));
        });
      return;
    }

    // Single spec path: must be absolute (workspace derivation requires a real path)
    if (!specArg || !isAbsolute(specArg)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'specPath must be absolute when no startup workspace is configured.' }));
      return;
    }

    const shouldReturnSpec = typeof returnSpec === 'boolean' ? returnSpec : true;

    sendWrite(specArg, pageId, shouldReturnSpec, {}, fileKey, preParsedSpec)
      .then((result) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: String(err) }));
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

function readJson(filePath: string, label: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    console.warn(`  ${label}: could not read "${filePath}" — skipping`);
    return null;
  }
}

// ── Manifest builders ─────────────────────────────────────────────────────────

/**
 * Build a glyph manifest from a scan manifest.md file.
 */
function buildGlyphManifest(spec: Record<string, unknown>, manifestPath: string): Manifest {
  const pattern = (spec as { metadata?: { config?: { processing?: { glyphNamePattern?: unknown } } } })
    ?.metadata?.config?.processing?.glyphNamePattern;
  if (!pattern || typeof pattern !== 'string') return {};

  let content: string;
  try {
    content = readFileSync(manifestPath, 'utf8');
  } catch {
    console.warn(`  Glyph manifest: file not found at "${manifestPath}" — glyph placement disabled`);
    return {};
  }

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{i\\}', '(.+)');
  const regex = new RegExp(`^${escaped}$`);

  const result: Manifest = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^\|\s*(?:\[.?\]\s*\|\s*)?(.+?)\s*\|\s*(\S+)\s*\|\s*COMPONENT\s*\|/);
    if (!match) continue;
    const [, name, id] = match;
    const normalized = name.trim().replace(/\s+/g, ' ');
    const glyphMatch = normalized.match(regex);
    if (!glyphMatch) continue;
    const glyphName = glyphMatch[1].trim();
    if (!glyphName) continue;
    if (!result[glyphName]) result[glyphName] = id;
  }

  console.log(`  Glyph manifest: ${Object.keys(result).length} glyphs`);
  return result;
}

/**
 * Build a styles manifest from the file data JSON.
 */
function buildStylesManifest(fileDataPath: string): Manifest {
  const data = readJson(fileDataPath, 'Styles manifest');
  if (!data) return {};

  const styles = data?.styles as Record<string, { styleType?: string; name?: string; key?: string }> | undefined;
  if (!styles || typeof styles !== 'object') {
    console.warn(`  Styles manifest: no styles in file data — style token binding disabled`);
    return {};
  }

  const result: Manifest = {};
  for (const meta of Object.values(styles)) {
    if ((meta.styleType === 'EFFECT' || meta.styleType === 'TEXT' || meta.styleType === 'FILL') && meta.name && meta.key) {
      result[meta.name] = meta.key;
    }
  }

  console.log(`  Styles manifest: ${Object.keys(result).length} entries`);
  return result;
}

/**
 * Build a variables manifest from the variables JSON file.
 */
function buildVariablesManifest(variablesJsonPath: string): Manifest {
  const data = readJson(variablesJsonPath, 'Variables manifest');
  if (!data) return {};

  const meta = (data.meta ?? data) as {
    variables?: Record<string, { name?: string; key?: string; variableCollectionId?: string }>;
    variableCollections?: Record<string, { name?: string }>;
  };
  const vars = meta.variables;
  const cols = meta.variableCollections;
  if (!vars || !cols) {
    console.warn(`  Variables manifest: no variables/collections in file — variable binding disabled`);
    return {};
  }

  const colNames: Record<string, string> = {};
  for (const [id, col] of Object.entries(cols)) {
    if (col.name) colNames[id] = col.name;
  }

  const result: Manifest = {};
  for (const varDef of Object.values(vars)) {
    const name = varDef.name;
    const key = varDef.key;
    const colName = (varDef.variableCollectionId ? colNames[varDef.variableCollectionId] : undefined) ?? '';
    if (!name || !key) continue;
    const tokenPath = colName ? `${colName}/${name}` : name;
    result[tokenPath] = key;
  }

  console.log(`  Variables manifest: ${Object.keys(result).length} entries`);
  return result;
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

/**
 * Build a flat manifest of spec key → Figma nodeId by scanning specsDir.
 * Also layers in subcomponent ref aliases from the current spec.
 */
function buildManifest(spec: Record<string, unknown>, specsDir: string): Manifest {
  const manifest: Manifest = {};

  const specFiles = collectSpecFiles(specsDir);
  // Deduplicate by key: first nodeId found wins (variants.yaml before api.yaml, etc.)
  for (const { key, path } of specFiles) {
    if (manifest[key]) continue; // already have a nodeId for this key
    try {
      const s = parse(readFileSync(path, 'utf8')) as { metadata?: { source?: { nodeId?: string } } };
      const nodeId = s.metadata?.source?.nodeId;
      if (nodeId) manifest[key] = nodeId;
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
        manifest[refKey] = sub.source.nodeId;
      } else if (sub.title) {
        const titleKey = toCamelCase(sub.title);
        if (manifest[titleKey]) manifest[refKey] = manifest[titleKey];
      }
    }
  }

  console.log(`  Manifest: ${Object.keys(manifest).length} entries`);
  return manifest;
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
function resolveSourceAlias(workspaceDir: string): string {
  const configPath = pathResolve(workspaceDir, 'specs.config.yaml');
  try {
    const config = parse(readFileSync(configPath, 'utf8')) as { sources?: Record<string, unknown> };
    const sources = config?.sources;
    if (sources && typeof sources === 'object') {
      const firstAlias = Object.keys(sources)[0];
      if (firstAlias) return firstAlias;
    }
  } catch {
    // No config or unreadable — fall back to workspace dir name
  }
  return basename(workspaceDir);
}

// ── Render manifest parser ────────────────────────────────────────────────────

/**
 * Parse a render manifest file.
 * Lines starting with # are comments; blank lines are ignored.
 * Relative paths resolve against the workspace specs/ dir derived from the manifest's location.
 * Absolute paths pass through unchanged.
 */
function parseRenderManifest(manifestPath: string): string[] {
  let content: string;
  try {
    content = readFileSync(manifestPath, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read render manifest "${manifestPath}": ${(e as Error).message}`);
  }

  // Derive specs dir from manifest location: manifest lives in data/, workspace is its parent.
  const manifestWorkspaceDir = resolveWorkspaceDir(manifestPath) ?? dirname(dirname(manifestPath));
  const manifestSpecsDir = pathResolve(manifestWorkspaceDir, 'specs');

  const paths: string[] = [];
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    paths.push(isAbsolute(line) ? line : pathResolve(manifestSpecsDir, line));
  }

  if (paths.length === 0) throw new Error(`Render manifest "${manifestPath}" contains no spec entries.`);
  console.log(`  Render manifest: ${paths.length} specs`);
  return paths;
}

/**
 * Drain a render manifest queue sequentially, accumulating instanceIds for dependency resolution.
 */
async function drainManifest(specPaths: string[], rawPageId: string | null, fileKey?: string) {
  const results: Array<{ name: string; nodeId?: string; error?: string }> = [];
  const instanceIdAccumulator: Manifest = {};
  const total = specPaths.length;

  for (let i = 0; i < specPaths.length; i++) {
    const specPath = specPaths[i];
    const name = basename(dirname(specPath)) === 'specs'
      ? basename(specPath, '.yaml')
      : basename(dirname(specPath)); // subdirectory layout: use dir name as key
    console.log(`Rendering ${i + 1}/${total}: ${name}…`);

    try {
      const result = await sendWrite(specPath, rawPageId, false, instanceIdAccumulator, fileKey);
      if (result.success && result.nodeId) {
        instanceIdAccumulator[name] = result.nodeId;
        results.push({ name, nodeId: result.nodeId });
      } else {
        const errMsg = result.error ?? 'Unknown error';
        console.error(`  ✗ ${name}: ${errMsg}`);
        results.push({ name, error: errMsg });
      }
    } catch (e) {
      console.error(`  ✗ ${name}: ${(e as Error).message}`);
      results.push({ name, error: (e as Error).message });
    }
  }

  const written = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;
  console.log(`\nManifest complete: ${written} rendered in Figma, ${failed} failed.`);
  return { written, failed, results };
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
 * Send a single writeComponent message over the WebSocket and wait for the result.
 */
async function sendWrite(specPath: string, rawPageId: string | null, returnSpec = true, instanceIdOverrides: Manifest = {}, fileKey?: string, preParsedSpec?: Record<string, unknown>): Promise<WriteResult> {
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
  const { specsDir, dataDir, workspaceName } = dirs;

  const manifest = buildManifest(spec, specsDir);
  Object.assign(manifest, instanceIdOverrides);

  const glyphIdManifest = buildGlyphManifest(spec, pathResolve(dataDir, workspaceName + '.manifest.md'));
  const stylesManifest = buildStylesManifest(pathResolve(dataDir, workspaceName + '.file.json'));
  const variablesManifest = buildVariablesManifest(pathResolve(dataDir, workspaceName + '.variables.json'));

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

  const { requestId, promise } = requests.create(60000, 'Timed out waiting for writeComponent-result.');
  conn.ws.send(JSON.stringify({ type: 'writeComponent', requestId, spec, pageId, returnSpec, instanceIdManifest: manifest, glyphIdManifest, stylesManifest, variablesManifest }));
  return promise as Promise<WriteResult>;
}

// ── CLI: --write flag ─────────────────────────────────────────────────────────
//
// node bridge-server.js --write /abs/path/to/spec.yaml [--pageId 1462-365]
// Debug shortcut — only works when exactly one plugin is connected.

const writeIdx = process.argv.indexOf('--write');
if (writeIdx !== -1) {
  const specArg = process.argv[writeIdx + 1];
  const pageIdIdx = process.argv.indexOf('--pageId');
  const rawPageId = pageIdIdx !== -1 ? process.argv[pageIdIdx + 1] : DEFAULT_PAGE_ID;

  if (!specArg) { console.error('--write requires a spec path'); process.exit(1); }
  if (!isAbsolute(specArg)) { console.error('--write path must be absolute'); process.exit(1); }

  const tryWrite = (): void => {
    if (registry.size > 0) {
      sendWrite(specArg, rawPageId)
        .then((r) => { if (r.specData) console.log('Spec data received. Ready for diff.'); })
        .catch((e) => console.error((e as Error).message));
    } else {
      console.log('Waiting for plugin to connect…');
      setTimeout(tryWrite, 1000);
    }
  };
  setTimeout(tryWrite, 500);
}
