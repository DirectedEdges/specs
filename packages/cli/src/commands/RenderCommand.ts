/**
 * Render Command
 *
 * Sends a spec to the local CLI bridge, which relays it to a connected
 * Specs 2 Figma plugin to create or update the matching component live in
 * Figma. See `specs bridge` to start/stop the bridge.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { createInterface } from 'readline';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { postRender, type RenderResponse } from '../bridge/client.js';
import { resolveFileKey } from '../bridge/pickConnection.js';
import { findComponentFolders, isComponentFolder, loadSpec } from '../Render/SpecLoader.js';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
};

export const Render = new Command('render')
  .description('Render a spec into Figma via the local CLI bridge')
  .argument('[specPath]', 'Path to a spec YAML file, a component folder, or a directory of component folders (default: {outputDirectory} from config)')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--file <fileKey>', 'Target a specific connected Figma file (prompts to choose if more than one is connected in an interactive terminal; required otherwise)')
  .option('--page <id>', 'Render onto this page id instead of the plugin\'s current page (recommended for scripted runs — immune to page drift)')
  .option('--overwrite', 'Delete any existing page component with the same title before rendering (without this, a title collision is an error)')
  .option('--watch', 'Watch the spec path and re-render on every change (implies --overwrite)')
  .option('--strict', 'Fail the render when an instance element cannot be resolved, instead of rendering a component with missing content')
  .option('--timing', 'Print a phase-by-phase timing report for the render (bridge manifests, then plugin write phases)')
  .action(async (specPath: string | undefined, options: { config?: string; file?: string; page?: string; overwrite?: boolean; watch?: boolean; strict?: boolean; timing?: boolean; verbose?: boolean }) => {
    if (options.watch) {
      if (!specPath) {
        console.error('Error: --watch requires a spec path.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }
      await watchAndRender(specPath, options);
      return;
    }

    // Zero-arg resolution: the configured outputDirectory, as a batch of
    // component folders.
    if (!specPath) {
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);

      if (config.outputDirectory && fs.existsSync(path.resolve(config.outputDirectory))) {
        specPath = path.resolve(config.outputDirectory);
        console.log(`Using output directory: ${path.relative(process.cwd(), specPath) || '.'}`);
      } else {
        console.error('Error: provide a spec path.');
        console.error('Tip: no outputDirectory to fall back to — set one in specs.config.yaml.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }
    }

    try {
      const absSpecPath = path.resolve(specPath);
      if (!fs.existsSync(absSpecPath)) {
        console.error(`Error: Spec path not found: ${absSpecPath}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const isBatchDir = fs.statSync(absSpecPath).isDirectory() && !isComponentFolder(absSpecPath);
      if (isBatchDir) {
        await renderBatchDirectory(absSpecPath, options);
      } else {
        await renderSpecPath(absSpecPath, options);
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
  options: { file?: string; page?: string; overwrite?: boolean; strict?: boolean; timing?: boolean }
): Promise<number> {
  const { spec, resolvePath } = loadSpec(specPath);
  console.log(`Posting spec: ${resolvePath}`);
  const fileKey = await resolveFileKey(options.file);
  const startedAt = Date.now();
  const result = await postRender({ specPath: resolvePath, spec, fileKey, pageId: options.page, overwrite: options.overwrite });
  const elapsed = Date.now() - startedAt;

  if (!result.success) {
    const msg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    throw new Error(`Render failed: ${msg}`);
  }

  // Success is the whole contract — reading the produced component's spec is
  // an explicit second call (`specs generate --from-bridge`), not a side effect.
  for (const w of result.warnings ?? []) console.warn(`  ⚠ ${w}`);

  // A render that could not place an instance produced a component missing
  // content, so "✓ Rendered" on its own overstates what happened. Say it plainly
  // — a per-warning line scrolls past in a batch, a count does not.
  const dropped = countDroppedInstances(result.warnings);
  if (dropped > 0) {
    console.warn(
      `  ⚠ INCOMPLETE: ${dropped} instance element(s) could not be resolved and were not rendered. ` +
      'The component exists in Figma but is missing content.'
    );
    if (options.strict) {
      throw new Error(
        `Render incomplete: ${dropped} instance element(s) not rendered (--strict). ` +
        'Drop --strict to accept an incomplete render.'
      );
    }
  }

  console.log(`✓ Rendered in Figma in ${(elapsed / 1000).toFixed(1)}s. nodeId: ${result.nodeId}`);
  if (options.timing) printTimingReport(result, elapsed);
  return dropped;
}

/**
 * Warnings that mean content is missing from the rendered component, as opposed to
 * cosmetic degradations (font fallbacks, skipped style keys) which leave it complete.
 * Matched on the writer's own message text — see `Elements.createChild`.
 */
/**
 * Attribute a render's wall-clock time to bridge phases (manifest builds, which
 * parse the fetched file data) and plugin write phases. Plugin phases that run
 * concurrently — one row per variant, say — sum above the render's own total;
 * the count column is what makes that readable.
 */
function printTimingReport(result: RenderResponse, elapsed: number): void {
  const row = (label: string, ms: number, count?: number): void => {
    const share = elapsed > 0 ? `${Math.round((ms / elapsed) * 100)}%`.padStart(4) : '   -';
    const times = count !== undefined && count > 1 ? `  ×${count}` : '';
    console.log(`    ${label.padEnd(24)} ${String(ms).padStart(6)}ms ${share}${times}`);
  };

  console.log('\n  Timing');
  const bridge = [...(result.bridgeTimings ?? [])].sort((a, b) => b.ms - a.ms);
  if (bridge.length > 0) {
    console.log('  Bridge:');
    for (const t of bridge) row(t.label, t.ms);
  }
  if (result.payloadKB !== undefined) {
    console.log(`    ${'payload'.padEnd(24)} ${String(result.payloadKB).padStart(6)}KB`);
  }
  const phases = [...(result.timings?.phases ?? [])].sort((a, b) => b.ms - a.ms);
  if (phases.length > 0) {
    console.log(`  Plugin (${result.timings?.total}ms total):`);
    for (const p of phases) row(p.label, p.ms, p.count);
  }
  console.log(`    ${'TOTAL'.padEnd(24)} ${String(elapsed).padStart(6)}ms`);
}

function countDroppedInstances(warnings?: string[]): number {
  return (warnings ?? []).filter((w) => w.includes('no manifest entry for')).length;
}

function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

/**
 * Render every component folder found beneath a directory, sequentially and in
 * path order. One failure doesn't abort the run; the exit code reflects the total.
 */
async function renderBatchDirectory(
  absDir: string,
  options: { file?: string; page?: string; overwrite?: boolean; strict?: boolean; timing?: boolean },
  // In watch mode a batch is re-run on every change: don't re-confirm, and
  // don't exit the process on a failure the next save might fix.
  { watch = false }: { watch?: boolean } = {}
): Promise<void> {
  const folders = findComponentFolders(absDir);

  if (folders.length === 0) {
    const msg = `no component folders found in ${absDir}\nTip: a component folder holds api.(yaml|json) and variants.(yaml|json), at most two levels deep.`;
    if (watch) throw new Error(msg);
    console.error(`Error: ${msg}`);
    process.exit(ERROR_CODES.INVALID_ARGS);
  }

  console.log(`Found ${folders.length} component${folders.length === 1 ? '' : 's'} in ${path.relative(process.cwd(), absDir) || '.'}:`);
  for (const folder of folders) console.log(`  - ${path.relative(absDir, folder)}`);

  // --overwrite deletes each existing same-titled component before re-rendering,
  // so a multi-component sweep is worth confirming when someone is there to ask.
  if (!watch && options.overwrite && folders.length > 1 && process.stdin.isTTY && process.stdout.isTTY) {
    const ok = await confirm(`\nOverwrite ${folders.length} components in the connected Figma file?`);
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  // Resolve the target file once, so an ambiguous bridge doesn't prompt per component.
  const resolved = { ...options, file: (await resolveFileKey(options.file)) ?? options.file };

  let written = 0;
  const incomplete: string[] = [];
  const failures: string[] = [];

  for (const folder of folders) {
    try {
      const dropped = await renderSpecPath(folder, resolved);
      written++;
      if (dropped > 0) incomplete.push(`${path.relative(absDir, folder)} (${dropped})`);
    } catch (e) {
      const name = path.relative(absDir, folder);
      failures.push(name);
      console.error(`  ✗ ${name}: ${(e as Error).message}`);
    }
  }

  console.log(`\nDone: ${written} rendered in Figma, ${failures.length} failed.`);
  // Incomplete renders succeeded, so they are not failures — but a sweep that
  // silently produced components missing content is exactly what this reports.
  if (incomplete.length > 0) {
    console.warn(`⚠ ${incomplete.length} rendered with missing content: ${incomplete.join(', ')}`);
  }
  if (failures.length > 0 && !watch) process.exit(ERROR_CODES.GENERAL_ERROR);
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
  const isDir = fs.statSync(absSpecPath).isDirectory();
  const watchTarget = isDir ? absSpecPath : path.dirname(absSpecPath);
  const isBatchDir = isDir && !isComponentFolder(absSpecPath);

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
      if (isBatchDir) {
        await renderBatchDirectory(absSpecPath, { ...options, overwrite: true }, { watch: true });
      } else {
        await renderSpecPath(absSpecPath, { ...options, overwrite: true });
      }
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
