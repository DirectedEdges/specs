// Token existence for `specs validate` — the names a `$token` reference may
// legally use, read from the render lookup caches (`{data.directory}/cache/`).
//
// Inventing a token is the most common authoring error and nothing else
// catches it before render. The check is honest about its blind spots: an
// empty cache cannot distinguish "the library has none" from "never fetched",
// so that class of token is skipped and the skip is reported once.

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export interface TokenIndex {
  /** Variable token names; undefined when the variables cache has no entries. */
  variables?: ReadonlySet<string>;
  /** Text/effect style names; undefined when the styles cache has no entries. */
  styles?: ReadonlySet<string>;
}

function readEntryNames(file: string): Set<string> | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    const doc = yaml.parse(fs.readFileSync(file, 'utf8')) as { entries?: Record<string, unknown> };
    const names = Object.keys(doc?.entries ?? {});
    return names.length > 0 ? new Set(names) : undefined;
  } catch {
    return undefined;
  }
}

/** Read the token index from a workspace's data directory, if caches exist. */
export function loadTokenIndex(dataDir: string): TokenIndex {
  const cacheDir = path.join(dataDir, 'cache');
  return {
    variables: readEntryNames(path.join(cacheDir, 'variables.yaml')),
    styles: readEntryNames(path.join(cacheDir, 'styles.yaml')),
  };
}

/** Which cache a token's `$type` resolves against. */
export function cacheClassFor(type: string): 'styles' | 'variables' {
  return type === 'typography' || type === 'effect' ? 'styles' : 'variables';
}
