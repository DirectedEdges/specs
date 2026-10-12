/**
 * Scoping a run to one spec kind (`--compositions` / `--no-compositions`).
 *
 * Compositions are the slow, large things in a run: a screen composes dozens of
 * components and carries far more anatomy than any one of them. So iterating on
 * component output meant paying for composition output every time, and iterating on a
 * composition meant regenerating a catalogue to reach it. `--component` narrows to one
 * spec of either kind and `--components` matches keys across both; neither expresses
 * "just the compositions" or "everything except them".
 *
 * Shared by `generate` and the emit targets so the flags mean the same thing and the
 * conflict reads the same wherever it is hit.
 */

import type { SpecKind } from './specsLayout.js';

export const ONLY_FLAG = '--compositions';
export const WITHOUT_FLAG = '--no-compositions';

export interface KindScope {
  /** The kinds this run produces, in reading order. */
  kinds: SpecKind[];
  /**
   * The kinds this run deliberately excluded. A run is not authoritative over a kind it
   * did not produce, so nothing may prune that kind's output — the same rule a
   * `--components` run and a license-aborted run already follow.
   */
  excluded: SpecKind[];
  /** True when either flag narrowed the run, for a caller that reports what it covered. */
  scoped: boolean;
}

const ALL: SpecKind[] = ['component', 'composition'];

export class KindScopeConflict extends Error {
  constructor() {
    super(
      `Error: ${ONLY_FLAG} and ${WITHOUT_FLAG} cannot be combined — one restricts the run to compositions, the other excludes them.\n` +
      `  Pass ${ONLY_FLAG} to produce compositions only, ${WITHOUT_FLAG} to produce components only, or neither for both.`
    );
    this.name = 'KindScopeConflict';
  }
}

/**
 * The kinds a run covers, read from the raw arguments.
 *
 * Not from the parsed options: Commander maps `--no-compositions` onto the same key its
 * positive form sets, so passing both leaves one value and no way to see the conflict.
 * The tokens are what distinguish them, and an explicit conflict is the whole point of
 * the criterion.
 */
export function resolveKindScope(argv: readonly string[] = process.argv): KindScope {
  const only = argv.includes(ONLY_FLAG);
  const without = argv.includes(WITHOUT_FLAG);

  if (only && without) throw new KindScopeConflict();
  if (only) return { kinds: ['composition'], excluded: ['component'], scoped: true };
  if (without) return { kinds: ['component'], excluded: ['composition'], scoped: true };
  return { kinds: [...ALL], excluded: [], scoped: false };
}

/** How a run names the kinds it covered, so a narrowed run cannot read as a full one. */
export function describeKindScope(scope: KindScope): string | undefined {
  if (!scope.scoped) return undefined;
  const plural = (kinds: SpecKind[]): string => kinds.map((k) => `${k}s`).join(' and ');
  return `Scoped to ${plural(scope.kinds)} — ${plural(scope.excluded)} were not produced, and none of their output was removed.`;
}
