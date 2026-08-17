/**
 * Loads a render input from disk, resolving two supported shapes:
 *  - a single spec file (.yaml/.yml/.json) — combined component data, as
 *    produced by `generate` without --split-concerns
 *  - a split-concerns component folder — api.(yaml|json) + variants.(yaml|json)
 *    + optional examples.(yaml|json), as produced by
 *    `generate --split-components --split-concerns`
 *  - a parent directory of those — see `findComponentFolders`, which collects
 *    every component folder beneath it for a batch render
 *
 * Format (JSON vs YAML) is detected per-file by extension. The result is
 * always a single merged, in-memory component spec — the bridge/plugin never
 * sees the on-disk shape.
 */

import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

export interface LoadedSpec {
  spec: Record<string, unknown>;
  /** Absolute path used for workspace (specsDir/dataDir) derivation. */
  resolvePath: string;
}

const CONCERN_EXTENSIONS = ['.yaml', '.yml', '.json'];

function parseByExtension(filePath: string, raw: string): Record<string, unknown> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return JSON.parse(raw);
  if (ext === '.yaml' || ext === '.yml') return parseYaml(raw);
  throw new Error(`Unsupported spec file extension "${ext}" (expected .yaml, .yml, or .json): ${filePath}`);
}

function readSpecFile(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseByExtension(filePath, raw);
}

function findConcernFile(dir: string, name: string): string | null {
  for (const ext of CONCERN_EXTENSIONS) {
    const candidate = path.join(dir, `${name}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Recursively recombines api/variants/examples concern data (as split by
 * `splitComponentByConcern` in the generate pipeline) back into one component
 * object. Each concern's `metadata` is identical at the source, so last-write
 * wins is safe. `subcomponents` are merged per-key rather than overwritten,
 * since each concern only carries its own slice of subcomponent fields.
 */
function mergeConcerns(
  api: Record<string, any>,
  variants: Record<string, any>,
  examples?: Record<string, any>
): Record<string, unknown> {
  const merged: Record<string, any> = { ...api, ...variants, ...(examples ?? {}) };

  const subKeys = new Set([
    ...Object.keys(api.subcomponents ?? {}),
    ...Object.keys(variants.subcomponents ?? {}),
    ...Object.keys(examples?.subcomponents ?? {}),
  ]);

  if (subKeys.size > 0) {
    merged.subcomponents = {};
    for (const key of subKeys) {
      merged.subcomponents[key] = mergeConcerns(
        api.subcomponents?.[key] ?? {},
        variants.subcomponents?.[key] ?? {},
        examples?.subcomponents?.[key]
      );
    }
  } else {
    delete merged.subcomponents;
  }

  return merged;
}

function loadSplitConcernsFolder(dir: string): Record<string, unknown> {
  const apiPath = findConcernFile(dir, 'api');
  const variantsPath = findConcernFile(dir, 'variants');
  const examplesPath = findConcernFile(dir, 'examples');

  if (!apiPath || !variantsPath) {
    throw new Error(
      `Expected api.(yaml|json) and variants.(yaml|json) in split-concerns component folder: ${dir}`
    );
  }

  const api = readSpecFile(apiPath);
  const variants = readSpecFile(variantsPath);
  const examples = examplesPath ? readSpecFile(examplesPath) : undefined;

  return mergeConcerns(api, variants, examples);
}

/** A directory is a component folder when it carries both required concerns. */
export function isComponentFolder(dir: string): boolean {
  return Boolean(findConcernFile(dir, 'api') && findConcernFile(dir, 'variants'));
}

/**
 * How far below a parent directory component folders are looked for. 1 covers
 * the flat `specs/deButton/` layout; 2 also covers one level of grouping,
 * `specs/forms/deInput/`. Deeper nesting is intentionally not scanned — a batch
 * render should stay predictable about what it will touch.
 */
const MAX_SCAN_DEPTH = 2;

/**
 * Collect every component folder at or beneath `dir`, sorted by path for a
 * deterministic render order. If `dir` is itself a component folder it is the
 * only result — scanning never descends into a component.
 */
export function findComponentFolders(dir: string, maxDepth = MAX_SCAN_DEPTH): string[] {
  if (isComponentFolder(dir)) return [dir];
  if (maxDepth < 1) return [];

  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    found.push(...findComponentFolders(path.join(dir, entry.name), maxDepth - 1));
  }
  return found.sort();
}

/**
 * Load a render input (single spec file or split-concerns component folder)
 * into a single in-memory spec object, ready to send to the bridge.
 */
export function loadSpec(rawPath: string): LoadedSpec {
  const absPath = path.resolve(rawPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Spec path not found: ${absPath}`);
  }

  const isDirectory = fs.statSync(absPath).isDirectory();
  const spec = isDirectory ? loadSplitConcernsFolder(absPath) : readSpecFile(absPath);

  return { spec, resolvePath: absPath };
}
