/**
 * Sectioned-file reader — the ONE place that reads a page-split payload
 * (`<alias>.file/`, written by fetch — see payloadSplit.ts for the layout).
 *
 * Consumers stay dumb callers: root maps come from `root()`, single pages from
 * `loadPage()`, and a generate-shaped pruned document from
 * `assembleDocument()`, which faults in cross-page dependencies automatically.
 *
 * The fault-in contract (from the specs#558 audit):
 * - Anatomy never crosses pages: REST payloads inline every instance's subtree.
 * - What crosses pages is STRUCTURE — an instance's `componentId` (and its
 *   root-map `componentSetId`) resolved to the defining COMPONENT /
 *   COMPONENT_SET node for property definitions and set parentage.
 * - An id defined in NO local page is a remote-library component. That is the
 *   majority case and legitimately non-faulting: only the root maps describe it.
 *
 * Locating a node's page uses a raw byte search for `"id":"<id>"` over the
 * unloaded page slices — no parse, so cost tracks bytes scanned, not JSON
 * complexity. A false positive (the pattern inside a string) merely loads one
 * extra page.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SPLIT_FORMAT_VERSION, splitDirFor, type SplitManifest, type SplitPageEntry } from './payloadSplit.js';

export interface AssembleStats {
  pagesTotal: number;
  /** Pages materialized into the document, in manifest order. */
  pagesLoaded: string[];
  /** The subset of pagesLoaded pulled in by dependency fault-in, with the id
   *  that caused each. */
  faults: Array<{ pageId: string; pageName: string; causedBy: string }>;
  /** Referenced component ids defined in no local page — remote-library
   *  components, resolvable only through the root maps. Informational. */
  remoteIds: string[];
}

export interface AssembledDocument {
  json: Record<string, unknown>;
  stats: AssembleStats;
}

const CLOSURE_ROUNDS_MAX = 5;

export class SectionedFile {
  readonly dir: string;
  readonly manifest: SplitManifest;
  private rootCache: Record<string, unknown> | null = null;
  private rawCache = new Map<string, Buffer>();

  private constructor(dir: string, manifest: SplitManifest) {
    this.dir = dir;
    this.manifest = manifest;
  }

  /** Open an alias's split payload. Returns null when the artifact is absent
   *  (callers fall back to the monolithic file); throws on a format version
   *  this build does not understand — silently misreading it is the one
   *  forbidden outcome. */
  static open(dataDir: string, alias: string): SectionedFile | null {
    const dir = splitDirFor(dataDir, alias);
    const manifestPath = join(dir, 'manifest.json');
    if (!existsSync(manifestPath)) return null;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as SplitManifest;
    if (manifest.formatVersion !== SPLIT_FORMAT_VERSION) {
      throw new Error(
        `${alias}.file/ uses split format v${manifest.formatVersion}, but this build reads v${SPLIT_FORMAT_VERSION}. ` +
        `Re-run \`specs fetch\` to rewrite it.`
      );
    }
    return new SectionedFile(dir, manifest);
  }

  /** The payload without pages: root maps (components, componentSets, styles),
   *  file metadata, and an empty document.children. Fresh copy per call — the
   *  caller may mutate it (assembleDocument does). */
  root(): Record<string, unknown> {
    if (this.rootCache === null) {
      this.rootCache = JSON.parse(readFileSync(join(this.dir, 'root.json'), 'utf-8')) as Record<string, unknown>;
    }
    return structuredClone(this.rootCache);
  }

  pageEntries(): SplitPageEntry[] {
    return this.manifest.pages;
  }

  /** Raw bytes of one page slice, cached until releasePage(). */
  loadPageRaw(entry: SplitPageEntry): Buffer {
    let raw = this.rawCache.get(entry.id);
    if (!raw) {
      raw = readFileSync(join(this.dir, entry.file));
      this.rawCache.set(entry.id, raw);
    }
    return raw;
  }

  /** One page parsed. Not cached parsed — parse cost is the caller's to manage;
   *  use releasePage() to drop the raw slice when iterating a large payload. */
  loadPage(entry: SplitPageEntry): Record<string, unknown> {
    return JSON.parse(this.loadPageRaw(entry).toString('utf-8')) as Record<string, unknown>;
  }

  releasePage(id: string): void {
    this.rawCache.delete(id);
  }

  /** Which page defines the node with this id, by raw byte scan. Null when
   *  no local page does (a remote-library component — a normal outcome). */
  locatePageOfNodeId(nodeId: string): SplitPageEntry | null {
    const candidate = new Set([nodeId]);
    for (const entry of this.manifest.pages) {
      const raw = this.rawCache.get(entry.id) ?? readFileSync(join(this.dir, entry.file));
      if (extractDefinedIds(raw, candidate).length > 0) return entry;
    }
    return null;
  }

  /**
   * Build a document containing the seed pages plus the transitive closure of
   * cross-page component definitions their instances reference. The result has
   * the monolithic payload's exact shape — an engine sees a smaller but
   * shape-identical document.
   */
  assembleDocument(seedPageIds: string[], onFault?: (fault: AssembleStats['faults'][number]) => void): AssembledDocument {
    const byId = new Map(this.manifest.pages.map(p => [p.id, p]));
    for (const id of seedPageIds) {
      if (!byId.has(id)) throw new Error(`Page ${id} is not in the split manifest (${this.manifest.pages.length} pages)`);
    }

    const root = this.root();
    const rootComponents = ((root as { components?: Record<string, { componentSetId?: string }> }).components) ?? {};

    const loaded = new Map<string, SplitPageEntry>();
    const faults: AssembleStats['faults'] = [];
    const remoteIds = new Set<string>();
    const resolved = new Set<string>(); // ids already located (or known remote)

    let frontier = seedPageIds.map(id => byId.get(id)!);
    frontier.forEach(e => loaded.set(e.id, e));

    for (let round = 0; round < CLOSURE_ROUNDS_MAX && frontier.length > 0; round++) {
      // Collect every component reference in the frontier pages' raw bytes.
      const wanted = new Set<string>();
      for (const entry of frontier) {
        const text = this.loadPageRaw(entry).toString('utf-8');
        for (const match of text.matchAll(/"componentId"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
          const id = unescape(match[1]);
          wanted.add(id);
          const setId = rootComponents[id]?.componentSetId;
          if (setId) wanted.add(setId);
        }
      }

      // Drop ids already handled or already defined in a loaded page — one
      // extraction pass per page for ALL candidates, never a scan per id.
      const missing = new Set<string>();
      for (const id of wanted) {
        if (resolved.has(id)) continue;
        resolved.add(id);
        missing.add(id);
      }
      for (const entry of loaded.values()) {
        if (missing.size === 0) break;
        for (const id of extractDefinedIds(this.loadPageRaw(entry), missing)) missing.delete(id);
      }

      // Sweep each unloaded page ONCE with the same extraction pass — cost
      // tracks bytes on disk per round, independent of how many ids are wanted.
      const nextFrontier: SplitPageEntry[] = [];
      for (const entry of this.manifest.pages) {
        if (missing.size === 0) break;
        if (loaded.has(entry.id)) continue;
        const raw = readFileSync(join(this.dir, entry.file));
        const hits = extractDefinedIds(raw, missing);
        if (hits.length === 0) continue;
        this.rawCache.set(entry.id, raw);
        loaded.set(entry.id, entry);
        nextFrontier.push(entry);
        for (const id of hits) missing.delete(id);
        const fault = { pageId: entry.id, pageName: entry.name, causedBy: hits[0] };
        faults.push(fault);
        onFault?.(fault);
      }
      for (const id of missing) remoteIds.add(id); // in no local page — root maps only
      frontier = nextFrontier;
    }

    // Materialize in manifest order so assembly is deterministic.
    const pagesInOrder = this.manifest.pages.filter(e => loaded.has(e.id));
    (root as { document: { children: unknown[] } }).document.children =
      pagesInOrder.map(e => this.loadPage(e));

    return {
      json: root,
      stats: {
        pagesTotal: this.manifest.pages.length,
        pagesLoaded: pagesInOrder.map(e => e.id),
        faults,
        remoteIds: [...remoteIds],
      },
    };
  }
}

function unescape(escaped: string): string {
  try { return JSON.parse(`"${escaped}"`) as string; } catch { return escaped; }
}

// ── Shadow mode ───────────────────────────────────────────────────────────────
// Dev-only verification for the consumer migrations (specs#561–#563): a
// migrated command runs BOTH read paths and diffs the results. Deleted at the
// dual-write flip. Never enabled for customers — it doubles the work on purpose.

export function shadowIngestEnabled(): boolean {
  return process.env.SPECS_SHADOW_INGEST === '1';
}

/** Compare a monolithic-path result against the sectioned-path result and
 *  report the first divergence loudly. Returns true when they match. */
export function shadowCompare(label: string, monolithic: unknown, sectioned: unknown): boolean {
  const divergence = firstDifference(monolithic, sectioned, label);
  if (divergence === null) {
    console.log(`  [shadow] ${label}: sectioned path matches monolithic path`);
    return true;
  }
  console.error(`✗ [shadow] INGEST DIVERGENCE at ${divergence}`);
  return false;
}

function firstDifference(a: unknown, b: unknown, path: string): string | null {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    return `${path} (${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)})`;
  }
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  if (ka.length !== kb.length) return `${path} (key count ${ka.length} vs ${kb.length})`;
  for (const key of ka) {
    const diff = firstDifference(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
      `${path}.${key}`
    );
    if (diff) return diff;
  }
  return null;
}

const ID_KEY = Buffer.from('"id":', 'utf8');
const SPACE = 0x20, QUOTE = 0x22;

/** Which of `candidates` are defined as node ids in this raw page slice.
 *  One native-indexOf pass over the bytes, independent of candidate count —
 *  the property that keeps closure cost tracking bytes, not ids × bytes.
 *  Tolerates compact and single-space-pretty forms. A hit inside a string
 *  literal is a false positive that merely loads one extra page. */
function extractDefinedIds(raw: Buffer, candidates: ReadonlySet<string>): string[] {
  const hits = new Set<string>();
  let pos = 0;
  while (hits.size < candidates.size && (pos = raw.indexOf(ID_KEY, pos)) !== -1) {
    pos += ID_KEY.length;
    if (raw[pos] === SPACE) pos++;
    if (raw[pos] !== QUOTE) continue;
    pos++;
    const end = raw.indexOf(QUOTE, pos);
    if (end === -1) break;
    const id = raw.toString('utf8', pos, end);
    if (candidates.has(id)) hits.add(id);
    pos = end + 1;
  }
  return [...hits];
}
