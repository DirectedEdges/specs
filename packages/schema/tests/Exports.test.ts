/**
 * Every subpath in the package's exports map must resolve to a file that
 * ships. A stale entry fails at the consumer's import site, long after
 * publish — this catches it at test time instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as {
  exports: Record<string, string | Record<string, string>>;
};

const targets = (entry: string | Record<string, string>): string[] =>
  typeof entry === 'string' ? [entry] : Object.values(entry);

describe('package exports map', () => {
  for (const [subpath, entry] of Object.entries(pkg.exports)) {
    for (const target of targets(entry)) {
      // dist/ is produced by the build; source and schema targets must exist
      // in the repository itself.
      if (target.startsWith('./dist/')) continue;
      it(`"${subpath}" → ${target} exists`, () => {
        expect(existsSync(join(pkgDir, target))).toBe(true);
      });
    }
  }
});
