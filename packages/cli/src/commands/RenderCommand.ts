/**
 * Render Command
 *
 * Sends a spec (or a render manifest) to the local CLI bridge, which relays
 * it to a connected Specs 2 Figma plugin to create or update the matching
 * component live in Figma. See `specs bridge` to start/stop the bridge.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { postRender } from '../bridge/client.js';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
};

// Resolve default alias the same way Generate/Scan do: `library` if it
// declares `data: [file]`, else the first source that does.
function resolveDefaultAlias(sources: Record<string, { data?: string[] }>): string | null {
  if (sources.library && Array.isArray(sources.library.data) && sources.library.data.includes('file')) return 'library';
  const candidate = Object.entries(sources).find(([, s]) => Array.isArray(s.data) && s.data.includes('file'));
  return candidate ? candidate[0] : null;
}

export const Render = new Command('render')
  .description('Render a spec (or manifest) into Figma via the local CLI bridge')
  .argument('[specPath]', 'Path to a spec YAML file (default: {dataDirectory}/{alias}.render-manifest.md from config)')
  .option('-m, --manifest <path>', 'Path to a render-manifest.md file')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--no-return-spec', 'Skip round-trip spec read after rendering in Figma')
  .action(async (specPath: string | undefined, options: { manifest?: string; config?: string; returnSpec: boolean; verbose?: boolean }) => {
    let manifestPath = options.manifest;

    if (!specPath && !manifestPath) {
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);
      const dataDir = config.dataDirectory ? path.resolve(config.dataDirectory) : path.join(process.cwd(), 'data');
      const defaultAlias = resolveDefaultAlias(config.sources || {});

      if (!defaultAlias) {
        console.error('Error: provide a spec path or --manifest <path>.');
        console.error('Tip: no default could be resolved — configure a source with `data: [file]` in specs.config.yaml.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const defaultManifest = path.join(dataDir, `${defaultAlias}.render-manifest.md`);
      if (!fs.existsSync(defaultManifest)) {
        console.error(`Error: provide a spec path or --manifest <path>.`);
        console.error(`Tip: no default render manifest found at ${defaultManifest}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      manifestPath = defaultManifest;
      console.log(`Using default render manifest: ${path.relative(process.cwd(), manifestPath)}`);
    }

    try {
      if (manifestPath) {
        const absManifestPath = path.resolve(manifestPath);
        console.log(`Posting manifest: ${absManifestPath}`);
        const result = await postRender({ manifestPath: absManifestPath });

        if (!result.success) {
          console.error(`Error: ${result.error}`);
          process.exit(ERROR_CODES.GENERAL_ERROR);
        }

        console.log(`\nDone: ${result.written} rendered in Figma, ${result.failed} failed.`);
        if ((result.failed ?? 0) > 0) {
          for (const r of result.results ?? []) {
            if (r.error) console.error(`  ✗ ${r.name}: ${r.error}`);
          }
          process.exit(ERROR_CODES.GENERAL_ERROR);
        }
      } else if (specPath) {
        const absSpecPath = path.resolve(specPath);
        console.log(`Posting spec: ${absSpecPath}`);
        const result = await postRender({ specPath: absSpecPath, returnSpec: options.returnSpec });

        if (!result.success) {
          const msg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
          console.error(`✗ Render failed: ${msg}`);
          process.exit(ERROR_CODES.GENERAL_ERROR);
        }

        console.log(`✓ Rendered in Figma. nodeId: ${result.nodeId}`);
        if (result.specData) {
          console.log('Spec round-trip data received.');
        }
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.cause && (err.cause as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        console.error('Error: bridge is not running.');
        console.error('  Start it with: specs bridge start');
      } else {
        console.error(`Error: ${err.message}`);
      }
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
