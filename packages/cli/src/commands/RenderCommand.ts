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
import { resolveFileKey } from '../bridge/pickConnection.js';
import { loadSpec } from '../Render/SpecLoader.js';

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
  .option('--file <fileKey>', 'Target a specific connected Figma file (prompts to choose if more than one is connected in an interactive terminal; required otherwise)')
  .option('--overwrite', 'Delete any existing page component with the same title before rendering (without this, a title collision is an error)')
  .option('--watch', 'Watch the spec path and re-render on every change (implies --overwrite)')
  .action(async (specPath: string | undefined, options: { manifest?: string; config?: string; file?: string; overwrite?: boolean; watch?: boolean; verbose?: boolean }) => {
    let manifestPath = options.manifest;

    if (options.watch) {
      if (manifestPath || !specPath) {
        console.error('Error: --watch requires a single spec path (not --manifest).');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }
      await watchAndRender(specPath, options);
      return;
    }

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
        const fileKey = await resolveFileKey(options.file);
        const result = await postRender({ manifestPath: absManifestPath, fileKey, overwrite: options.overwrite });

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
        await renderSpecPath(specPath, options);
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

// Shared by the one-shot render path and each watch-triggered re-render.
// Throws on failure; caller decides whether that's fatal (one-shot) or just
// logged and retried on the next change (watch).
async function renderSpecPath(
  specPath: string,
  options: { file?: string; overwrite?: boolean }
): Promise<void> {
  const { spec, resolvePath } = loadSpec(specPath);
  console.log(`Posting spec: ${resolvePath}`);
  const fileKey = await resolveFileKey(options.file);
  const result = await postRender({ specPath: resolvePath, spec, fileKey, overwrite: options.overwrite });

  if (!result.success) {
    const msg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    throw new Error(`Render failed: ${msg}`);
  }

  // Success is the whole contract — reading the produced component's spec is
  // an explicit second call (`specs generate --from-bridge`), not a side effect.
  console.log(`✓ Rendered in Figma. nodeId: ${result.nodeId}`);
}

const WATCH_DEBOUNCE_MS = 300;

async function watchAndRender(
  specPath: string,
  options: { file?: string }
): Promise<void> {
  const absSpecPath = path.resolve(specPath);
  if (!fs.existsSync(absSpecPath)) {
    console.error(`Error: Spec path not found: ${absSpecPath}`);
    process.exit(ERROR_CODES.INVALID_ARGS);
  }
  const watchTarget = fs.statSync(absSpecPath).isDirectory() ? absSpecPath : path.dirname(absSpecPath);

  let rendering = false;
  let pending = false;
  let debounceTimer: NodeJS.Timeout | undefined;

  const runRender = async () => {
    if (rendering) {
      pending = true;
      return;
    }
    rendering = true;
    try {
      await renderSpecPath(absSpecPath, { ...options, overwrite: true });
    } catch (e) {
      console.error(`✗ ${(e as Error).message}`);
    } finally {
      rendering = false;
      if (pending) {
        pending = false;
        void runRender();
      }
    }
  };

  const scheduleRender = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runRender, WATCH_DEBOUNCE_MS);
  };

  console.log(`Watching ${path.relative(process.cwd(), watchTarget) || '.'} for changes...`);
  fs.watch(watchTarget, { recursive: true }, scheduleRender);

  await runRender();
  await new Promise(() => {}); // keep the process alive until Ctrl+C
}
