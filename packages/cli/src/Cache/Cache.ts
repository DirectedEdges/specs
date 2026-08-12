/**
 * Render lookup caches.
 *
 * Render resolves a spec's references — component ids, style names, token names, glyph
 * names — against data fetched from Figma. That data arrives as whole API responses: a
 * file payload can be hundreds of megabytes, of which render needs a few hundred small
 * entries. Re-deriving those entries per render meant parsing the whole payload every
 * time, which cost seconds before any Figma work began.
 *
 * These caches are those entries, extracted once and written to `<dataDir>/cache/` as
 * four merged YAML files — one per concern, covering every fetched library:
 *
 * | file              | maps                              | built from             |
 * |-------------------|-----------------------------------|------------------------|
 * | `components.yaml` | node id → published key           | `<alias>.file.json`    |
 * | `styles.yaml`     | style name → key + type           | `<alias>.file.json`    |
 * | `variables.yaml`  | token name → key, id, published   | `<alias>.variables.json` |
 * | `icons.yaml`      | glyph name → node id + key        | `<alias>.file.json`    |
 *
 * Merged rather than per-library, because render wants one lookup, not N. Each entry
 * records the alias it came from: node ids are file-scoped, so knowing an entry's origin
 * is what lets render decide whether an id is usable at all — and it lets one library be
 * rebuilt without re-parsing the rest.
 *
 * Every file carries a `sources` block naming the payload each alias was built from, with
 * its size and mtime. That block is the staleness check: a `stat` per source, and any
 * mismatch means the cache no longer describes the data on disk. Render validates and
 * fails; `specs cache` rebuilds.
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';
import { buildVariablesIndex } from '../utilities/variablesIndex.js';
import { collectGlyphComponents } from '../utilities/glyphComponents.js';

/** The four caches, by concern. Order is display order for reporting. */
export const CACHE_CONCERNS = ['components', 'styles', 'variables', 'icons'] as const;
export type CacheConcern = (typeof CACHE_CONCERNS)[number];

/** What one alias's slice of a cache was built from — the staleness check's input. */
export interface CacheSource {
  /** Payload file name, relative to the data directory. */
  from: string;
  bytes: number;
  mtime: string;
  /** icons.yaml only: the pattern glyph names were extracted with. A config edit to the
   *  pattern changes what the entries mean, with no change to any fetched file. */
  glyphNamePattern?: string;
}

export interface CacheFile<E> {
  /** Alias → the payload that alias's entries came from. */
  sources: Record<string, CacheSource>;
  entries: Record<string, E>;
}

/** Component/component-set node id → its published key. Keyless nodes are omitted: without
 *  a key there is nothing to record beyond the id the caller already holds. */
export interface ComponentsEntry { key: string; file: string }
export interface StylesEntry { key: string; type: 'FILL' | 'TEXT' | 'EFFECT'; file: string }
export interface VariablesEntry { key: string; id: string; published: boolean; file: string }
export interface IconsEntry { id: string; key?: string; file: string }

export type AnyCacheEntry = ComponentsEntry | StylesEntry | VariablesEntry | IconsEntry;

/** One alias's contribution to all four caches. */
interface AliasSlice {
  components: { source: CacheSource | null; entries: Record<string, ComponentsEntry> };
  styles: { source: CacheSource | null; entries: Record<string, StylesEntry> };
  variables: { source: CacheSource | null; entries: Record<string, VariablesEntry> };
  icons: { source: CacheSource | null; entries: Record<string, IconsEntry> };
}

export interface CacheOptions {
  dataDir: string;
  /** Aliases declared in config, in declaration order. */
  aliases: string[];
  glyphNamePattern?: string;
  /** Rebuild every alias, whether or not its provenance still matches. */
  force?: boolean;
}

export interface CacheReport {
  /** Aliases whose entries were re-derived. */
  rebuilt: string[];
  /** Aliases whose cached provenance still matched the payload on disk. */
  current: string[];
  /** Aliases declared in config with no fetched payload — skipped, not an error here. */
  unfetched: string[];
  /** Entry counts per concern, after the rebuild. */
  counts: Record<CacheConcern, number>;
}

// ── Paths ─────────────────────────────────────────────────────────────────────

export function cacheDir(dataDir: string): string {
  return join(dataDir, 'cache');
}

export function cachePath(dataDir: string, concern: CacheConcern): string {
  return join(cacheDir(dataDir), `${concern}.yaml`);
}

// ── Read / write ──────────────────────────────────────────────────────────────

export function readCacheFile<E>(dataDir: string, concern: CacheConcern): CacheFile<E> | null {
  const path = cachePath(dataDir, concern);
  if (!existsSync(path)) return null;
  try {
    const parsed = parse(readFileSync(path, 'utf8')) as CacheFile<E> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return { sources: parsed.sources ?? {}, entries: parsed.entries ?? {} };
  } catch {
    return null; // unreadable is indistinguishable from absent, and both mean "rebuild"
  }
}

function writeCacheFile<E>(dataDir: string, concern: CacheConcern, data: CacheFile<E>): void {
  mkdirSync(cacheDir(dataDir), { recursive: true });
  const header =
    `# Generated by \`specs cache\` — derived from fetched Figma data, safe to delete.\n` +
    `# Rebuild with \`specs cache\`. Do not edit by hand.\n`;
  writeFileSync(cachePath(dataDir, concern), header + stringify(data, { lineWidth: 0 }), 'utf8');
}

// ── Provenance ────────────────────────────────────────────────────────────────

function sourceOf(dataDir: string, fileName: string, glyphNamePattern?: string): CacheSource | null {
  const path = join(dataDir, fileName);
  if (!existsSync(path)) return null;
  const stat = statSync(path);
  return {
    from: fileName,
    bytes: stat.size,
    mtime: stat.mtime.toISOString(),
    ...(glyphNamePattern ? { glyphNamePattern } : {}),
  };
}

/** True when a recorded source still describes the file on disk. A payload that has been
 *  re-fetched, or a glyph pattern that has been edited in config, fails this. */
function matches(recorded: CacheSource | undefined, current: CacheSource | null): boolean {
  if (!recorded || !current) return false;
  return recorded.from === current.from
    && recorded.bytes === current.bytes
    && recorded.mtime === current.mtime
    && recorded.glyphNamePattern === current.glyphNamePattern;
}

// ── Builders ──────────────────────────────────────────────────────────────────

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Derive one alias's entries for all four concerns. The file payload is parsed once and
 * feeds three of them; the variables payload is separate and much smaller.
 */
function buildAliasSlice(alias: string, dataDir: string, glyphNamePattern?: string): AliasSlice {
  const empty: AliasSlice = {
    components: { source: null, entries: {} },
    styles: { source: null, entries: {} },
    variables: { source: null, entries: {} },
    icons: { source: null, entries: {} },
  };

  const fileName = `${alias}.file.json`;
  const fileSource = sourceOf(dataDir, fileName);
  if (fileSource) {
    const data = readJson(join(dataDir, fileName));
    if (data) {
      const refs = {
        ...((data.components as Record<string, { key?: string }> | undefined) ?? {}),
        ...((data.componentSets as Record<string, { key?: string }> | undefined) ?? {}),
      };
      for (const [id, meta] of Object.entries(refs)) {
        if (meta?.key) empty.components.entries[id] = { key: meta.key, file: alias };
      }
      empty.components.source = fileSource;

      const styles = (data.styles as Record<string, { styleType?: string; name?: string; key?: string }> | undefined) ?? {};
      for (const meta of Object.values(styles)) {
        const type = meta.styleType;
        if ((type === 'EFFECT' || type === 'TEXT' || type === 'FILL') && meta.name && meta.key) {
          empty.styles.entries[meta.name] = { key: meta.key, type, file: alias };
        }
      }
      empty.styles.source = fileSource;

      // An unset pattern means this workspace has no glyph convention — the cache is
      // written empty rather than skipped, so "no glyphs" stays distinguishable from
      // "never built".
      empty.icons.source = sourceOf(dataDir, fileName, glyphNamePattern);
      if (glyphNamePattern) {
        for (const glyph of collectGlyphComponents(data.document, glyphNamePattern)) {
          if (empty.icons.entries[glyph.name]) continue; // first occurrence wins, as scan does
          const key = refs[glyph.id]?.key;
          empty.icons.entries[glyph.name] = key ? { id: glyph.id, key, file: alias } : { id: glyph.id, file: alias };
        }
      }
    }
  }

  const variablesName = `${alias}.variables.json`;
  const variablesSource = sourceOf(dataDir, variablesName);
  if (variablesSource) {
    const data = readJson(join(dataDir, variablesName));
    if (data) {
      const index = buildVariablesIndex((data.meta ? data : { meta: data }) as Parameters<typeof buildVariablesIndex>[0]);
      for (const [name, entry] of Object.entries(index)) {
        empty.variables.entries[name] = { ...entry, file: alias };
      }
      empty.variables.source = variablesSource;
    }
  }

  return empty;
}

// ── Refresh ───────────────────────────────────────────────────────────────────

/**
 * Bring the caches in line with the fetched data on disk.
 *
 * An alias whose recorded provenance still matches is left alone — its entries are copied
 * forward untouched — so refreshing after fetching one library parses that library only.
 * An alias with no fetched payload is skipped rather than reported as an error: not having
 * fetched something yet is a normal state for this command, and only render is in a
 * position to call it a problem.
 */
export function refreshCache(options: CacheOptions): CacheReport {
  const { dataDir, aliases, glyphNamePattern, force } = options;

  const existing = {
    components: readCacheFile<ComponentsEntry>(dataDir, 'components'),
    styles: readCacheFile<StylesEntry>(dataDir, 'styles'),
    variables: readCacheFile<VariablesEntry>(dataDir, 'variables'),
    icons: readCacheFile<IconsEntry>(dataDir, 'icons'),
  };

  const next: { [K in CacheConcern]: CacheFile<AnyCacheEntry> } = {
    components: { sources: {}, entries: {} },
    styles: { sources: {}, entries: {} },
    variables: { sources: {}, entries: {} },
    icons: { sources: {}, entries: {} },
  };

  const report: CacheReport = {
    rebuilt: [],
    current: [],
    unfetched: [],
    counts: { components: 0, styles: 0, variables: 0, icons: 0 },
  };

  for (const alias of aliases) {
    const hasFile = existsSync(join(dataDir, `${alias}.file.json`));
    const hasVariables = existsSync(join(dataDir, `${alias}.variables.json`));
    if (!hasFile && !hasVariables) {
      report.unfetched.push(alias);
      continue;
    }

    const currentSources = {
      components: sourceOf(dataDir, `${alias}.file.json`),
      styles: sourceOf(dataDir, `${alias}.file.json`),
      variables: sourceOf(dataDir, `${alias}.variables.json`),
      icons: sourceOf(dataDir, `${alias}.file.json`, glyphNamePattern),
    };

    const stale = force || CACHE_CONCERNS.some(concern => {
      const current = currentSources[concern];
      if (!current) return false; // that payload isn't fetched — nothing to be stale about
      return !matches(existing[concern]?.sources[alias], current);
    });

    if (!stale) {
      for (const concern of CACHE_CONCERNS) {
        const from = existing[concern];
        if (!from?.sources[alias]) continue;
        next[concern].sources[alias] = from.sources[alias];
        for (const [key, entry] of Object.entries(from.entries)) {
          if ((entry as { file?: string }).file === alias) next[concern].entries[key] = entry;
        }
      }
      report.current.push(alias);
      continue;
    }

    const slice = buildAliasSlice(alias, dataDir, glyphNamePattern);
    for (const concern of CACHE_CONCERNS) {
      const built = slice[concern];
      if (!built.source) continue;
      next[concern].sources[alias] = built.source;
      Object.assign(next[concern].entries, built.entries);
    }
    report.rebuilt.push(alias);
  }

  for (const concern of CACHE_CONCERNS) {
    writeCacheFile(dataDir, concern, next[concern]);
    report.counts[concern] = Object.keys(next[concern].entries).length;
  }

  return report;
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface CacheProblem {
  concern: CacheConcern;
  alias: string;
  reason: 'missing' | 'stale';
}

/**
 * Check the caches against the payloads on disk, without writing anything. Every declared
 * alias must be present and current in every cache whose payload it has fetched — render
 * calls this and refuses to run on any problem, because a stale lookup binds a spec to the
 * wrong variable or drops an instance, which surfaces far from its cause.
 */
export function validateCache(options: Omit<CacheOptions, 'force'>): CacheProblem[] {
  const { dataDir, aliases, glyphNamePattern } = options;
  const problems: CacheProblem[] = [];

  const files = {
    components: readCacheFile<ComponentsEntry>(dataDir, 'components'),
    styles: readCacheFile<StylesEntry>(dataDir, 'styles'),
    variables: readCacheFile<VariablesEntry>(dataDir, 'variables'),
    icons: readCacheFile<IconsEntry>(dataDir, 'icons'),
  };

  for (const alias of aliases) {
    const currentSources = {
      components: sourceOf(dataDir, `${alias}.file.json`),
      styles: sourceOf(dataDir, `${alias}.file.json`),
      variables: sourceOf(dataDir, `${alias}.variables.json`),
      icons: sourceOf(dataDir, `${alias}.file.json`, glyphNamePattern),
    };

    for (const concern of CACHE_CONCERNS) {
      const current = currentSources[concern];
      if (!current) continue; // payload not fetched for this alias — nothing to validate
      const file = files[concern];
      if (!file || !file.sources[alias]) {
        problems.push({ concern, alias, reason: 'missing' });
        continue;
      }
      if (!matches(file.sources[alias], current)) {
        problems.push({ concern, alias, reason: 'stale' });
      }
    }
  }

  return problems;
}

/** One line per problem, plus the command that fixes them. */
export function describeProblems(problems: CacheProblem[]): string {
  const lines = problems.map(p => `  - ${p.concern}.yaml: "${p.alias}" is ${p.reason}`);
  return [
    `Render cache is not usable:`,
    ...lines,
    ``,
    `Run \`specs cache\` to rebuild it.`,
  ].join('\n');
}
