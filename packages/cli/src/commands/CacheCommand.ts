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

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
};

/** Shared by this command and every command that refreshes the cache as a final step. */
export function reportCache(report: CacheReport): void {
  const { rebuilt, current, unfetched, counts } = report;
  if (rebuilt.length > 0) console.log(`  Cache rebuilt: ${rebuilt.join(', ')}`);
  if (current.length > 0) console.log(`  Cache current: ${current.join(', ')}`);
  // Not an error here — only render is in a position to insist a source be fetched.
  if (unfetched.length > 0) console.log(`  Not fetched, skipped: ${unfetched.join(', ')}`);
  console.log(
    `  Entries: ${counts.components} components, ${counts.styles} styles, ` +
    `${counts.variables} variables, ${counts.icons} icons`
  );
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
        glyphNamePattern: config.conventions.figma.glyphs?.match,
        force: options.force,
      });

      reportCache(report);
      console.log('✓ Cache written.');
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
