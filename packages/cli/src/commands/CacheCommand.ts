/**
 * Cache Command
 *
 * Builds the render lookup caches under `{data.directory}/cache/` from the fetched
 * Figma payloads. `fetch` and `apply-custom-tokens` run this themselves, so it is
 * needed by hand only when the caches are missing or something outside those
 * commands changed the data. See src/Cache/Cache.ts for what the files contain.
 */

import { Command } from 'commander';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { refreshCache, type CacheReport } from '../Cache/Cache.js';
import { figmaOf } from '../Config/PlatformConventions.js';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
};

/** Shared by this command and every command that refreshes the cache as a final step.
 *  Returns false when any payload failed to read — callers decide the exit code, but
 *  the failure is printed here so no caller can lose it. */
export function reportCache(report: CacheReport): boolean {
  const { rebuilt, current, unfetched, counts, aliasCounts, failures } = report;
  if (rebuilt.length > 0) console.log(`  Cache rebuilt: ${rebuilt.join(', ')}`);
  if (current.length > 0) console.log(`  Cache current: ${current.join(', ')}`);
  // Not an error here — only render is in a position to insist a source be fetched.
  if (unfetched.length > 0) console.log(`  Not fetched, skipped: ${unfetched.join(', ')}`);

  // Per-source contribution, so a source contributing nothing is visible as itself
  // rather than hidden inside a merged total.
  const failedAliases = new Set(failures.map(f => f.alias));
  for (const [alias, c] of Object.entries(aliasCounts)) {
    const line = `${c.components} components, ${c.styles} styles, ${c.variables} variables, ${c.icons} icons`;
    console.log(`    ${alias}: ${failedAliases.has(alias) ? `✗ FAILED — ${line}` : line}`);
  }
  console.log(
    `  Entries: ${counts.components} components, ${counts.styles} styles, ` +
    `${counts.variables} variables, ${counts.icons} icons`
  );

  for (const failure of failures) {
    console.error(`✗ Cache could not read ${failure.file} (source "${failure.alias}") — it contributed no entries.`);
    for (const reasonLine of failure.reason.split('\n')) console.error(`  ${reasonLine}`);
  }
  return failures.length === 0;
}

export const Cache = new Command('cache')
  .description('Build the render lookup caches from fetched Figma data')
  .option('--config <path>', 'Path to a config/ directory or legacy specs.config.yaml')
  .option('--force', 'Rebuild every source, even those whose cached data still matches')
  .action((options: { config?: string; force?: boolean }) => {
    try {
      const config = new ConfigLoader().load(options.config);

      const dataDirectory = config.settings.data?.directory;
      if (!dataDirectory) {
        console.error('Error: data.directory is not set in the workspace settings.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const aliases = Object.keys(config.settings.data?.sources ?? {});
      if (aliases.length === 0) {
        console.error('Error: no sources are configured in the workspace settings.');
        console.error('Tip: the cache is built per source — add one under `data.sources`, then run `specs fetch`.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const report = refreshCache({
        dataDir: dataDirectory,
        aliases,
        glyphNamePattern: figmaOf(config.conventions).glyphs?.match,
        force: options.force,
      });

      const ok = reportCache(report);
      if (!ok) {
        console.error('✗ Cache incomplete — one or more payloads could not be read.');
        process.exit(ERROR_CODES.GENERAL_ERROR);
      }
      console.log('✓ Cache written.');
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
