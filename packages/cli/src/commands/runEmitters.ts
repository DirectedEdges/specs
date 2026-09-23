// Walking a workspace's components and running a set of transformers over each.
//
// Shared by `specs react` and `specs webcomponents`, so the two cannot drift
// on how components are discovered, how `--components` narrows them, how a
// failure is reported, or when `finalize` runs.
//
// What differs between the callers is only *which* transformers run and what the
// run is called in its output — which is the whole of the difference between them.
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { toPascalCase } from '../transforms/naming.js';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import type { ProcessingStates } from '../transforms/states.js';
import { platformOf } from '../Config/PlatformConventions.js';

export const ERROR_CODES = { SUCCESS: 0, INVALID_ARGS: 2, FILE_ERROR: 3, GENERAL_ERROR: 1 };

// Editors commonly write a file two or three times per save, and a config edit
// re-emits the whole catalogue — so a short debounce turns one Cmd-S into
// overlapping full emits. Long enough to coalesce a save burst, short enough to
// stay imperceptible between saving a spec and seeing the story update.
const WATCH_DEBOUNCE_MS = 800;

export interface EmitOptions {
  output?: string;
  config?: string;
  components?: string[];
  verbose?: boolean;
  watch?: boolean;
}

export interface EmitRun {
  /** What this run is called in its own output — `react`, `transform`. */
  label: string;
  /**
   * The transformers to run, or a function given the loaded config that returns
   * them. `transform` resolves its list from arguments and config; the target
   * commands know theirs.
   */
  transformers: Transformer[] | ((config: ReturnType<ConfigLoader['load']>) => Transformer[]);
  /** Per-transformer options, keyed by name. Only `transform` has any. */
  transformerOptions?: Map<string, Record<string, unknown>>;
}

interface EmitResult {
  /** The resolved specs directory this run read from. */
  specsPath: string;
  /** The `config/` directory this run read conventions from, if there was one. */
  configPath: string | null;
  succeeded: number;
  failed: number;
}

/**
 * A condition that stops the run before any component is emitted — a missing
 * specs directory, an empty transformer list. Carries the exit code the one-shot
 * path exits with; the watch path reports it and waits for the next change.
 */
class EmitSetupError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly tip?: string,
  ) {
    super(message);
  }
}

/**
 * Run a set of transformers over every component in a workspace, once.
 *
 * Does not exit: a per-component failure is counted, and a condition that stops
 * the run before emitting throws `EmitSetupError`. Config and component discovery
 * are resolved here rather than by the caller, so a watch-triggered re-run picks
 * up a component directory added since the last one.
 */
async function emitOnce(run: EmitRun, options: EmitOptions): Promise<EmitResult> {
  const configLoader = new ConfigLoader();
  const config = configLoader.load(options.config);

  // Resolve the specs directory: flag → config → cwd.
  const specsPath = options.output
    ? path.resolve(options.output)
    : config.settings.spec.directory
      ? path.resolve(config.settings.spec.directory)
      : path.resolve(process.cwd());

  if (!fs.existsSync(specsPath)) {
    throw new EmitSetupError(
      `specs directory not found: ${specsPath}`,
      ERROR_CODES.INVALID_ARGS,
      'run `specs generate` first — it writes this layout by default',
    );
  }

  const transformers =
    typeof run.transformers === 'function' ? run.transformers(config) : run.transformers;
  if (transformers.length === 0) {
    throw new EmitSetupError('no valid transformers to run', ERROR_CODES.INVALID_ARGS);
  }

  if (options.verbose) {
    console.log(`[${run.label}] directory: ${specsPath}`);
    console.log(`[${run.label}] transformers: ${transformers.map(t => t.name).join(', ')}`);
  }

  // The workspace root is the parent of the specs directory. Platform trees are
  // siblings of it, so every transformer's output root derives from here.
  const workspaceDir = path.dirname(specsPath);

  const entries = await fs.readdir(specsPath, { withFileTypes: true });
  let componentDirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => fs.existsSync(path.join(specsPath, name, 'api.yaml')));

  if (options.components && options.components.length > 0) {
    const requested = new Set(options.components);
    for (const missing of options.components.filter(c => !componentDirs.includes(c))) {
      console.warn(`Warning: component "${missing}" not found in ${specsPath} — skipping`);
    }
    componentDirs = componentDirs.filter(name => requested.has(name));
  }

  if (componentDirs.length === 0) {
    throw new EmitSetupError(
      `no component directories with api.yaml found in ${specsPath}`,
      ERROR_CODES.FILE_ERROR,
      'run `specs generate` first — it writes this layout by default',
    );
  }

  console.log(`⏳ ${componentDirs.length} components (${transformers.map(t => t.name).join(', ')})…`);
  console.log('');

  let succeeded = 0;
  let failed = 0;

  for (const componentKey of componentDirs) {
    const componentDir = path.join(specsPath, componentKey);

    try {
      const apiYaml = yaml.parse(
        await fs.readFile(path.join(componentDir, 'api.yaml'), 'utf-8'),
      ) as Record<string, unknown>;

      for (const transformer of transformers) {
        // Where a transformer writes is its own declaration (project 024). Absent
        // an `outputTree` it emits beside the spec.
        const outputDir = transformer.outputTree
          ? path.join(workspaceDir, transformer.outputTree, 'src', 'components', toPascalCase(componentKey))
          : componentDir;

        const context: TransformerContext = {
          specDir: componentDir,
          outputDir,
          workspaceDir,
          componentKey,
          tokensFormat: config.settings.spec.tokens,
          outputFormat: config.settings.spec.format,
          processingStates: config.conventions.specs?.states as ProcessingStates | undefined,
          specs: config.conventions.specs,
          // The conventions of the platform this transformer emits for (ADR-073).
          platform: transformer.platformId
            ? platformOf(config.conventions, transformer.platformId)
            : undefined,
          transformerOptions: run.transformerOptions?.get(transformer.name),
          dataDirectory: config.settings.data?.directory
            ? path.resolve(config.settings.data.directory)
            : undefined,
          scoped: (options.components?.length ?? 0) > 0,
        };
        await transformer.run(apiYaml, context);
      }

      if (options.verbose) console.log(`  ✓ ${componentKey}`);
      succeeded++;
    } catch (err) {
      console.error(`  ✗ ${componentKey}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  // A full run is authoritative over the trees it emits into: a component
  // renamed in Figma, or a naming convention changed in config, produces output
  // under a new directory and leaves the old one behind. Nothing else deletes
  // it, so it keeps appearing in Storybook as a component that no longer exists.
  //
  // Only a full run may do this. A `--components` run knows nothing about the
  // components it was not asked to emit, and every one of them would look
  // orphaned.
  if (!options.components?.length) {
    await pruneOrphans(transformers, componentDirs, workspaceDir);
  }

  // Stylesheets and index output are derived from the whole set, so they are
  // rebuilt after every pass — including a watch-triggered one, which would
  // otherwise leave them stale against the component that just changed.
  for (const transformer of transformers) {
    if (transformer.finalize) await transformer.finalize(specsPath);
  }

  console.log('');
  console.log(`✓ ${run.label} complete`);
  console.log(`  ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}`);

  return { specsPath, configPath: configLoader.resolveDirectory(options.config), succeeded, failed };
}

/**
 * Delete emitted component directories that no spec in this run accounts for.
 *
 * The expected set is derived the same way `outputDir` is, so the two cannot
 * disagree about where a component's output lives. Only whole component
 * directories are pruned — a stale file *inside* a directory whose component
 * still exists is not visible from here, because what a transformer writes
 * inside its `outputDir` is the transformer's own business.
 */
async function pruneOrphans(
  transformers: Transformer[],
  componentDirs: string[],
  workspaceDir: string,
): Promise<void> {
  const expected = new Set(componentDirs.map(toPascalCase));
  const trees = new Set(
    transformers.map(t => t.outputTree).filter((t): t is string => Boolean(t)),
  );

  for (const tree of trees) {
    const componentsRoot = path.join(workspaceDir, tree, 'src', 'components');
    if (!(await fs.pathExists(componentsRoot))) continue;

    const entries = await fs.readdir(componentsRoot, { withFileTypes: true });
    const orphans = entries
      .filter(e => e.isDirectory() && !expected.has(e.name))
      .map(e => e.name);

    if (orphans.length === 0) continue;

    // One line, not one per directory: the list is the finding, and a rename
    // that changes a convention can orphan the whole tree at once.
    console.warn(
      `⚠ removed ${orphans.length} emitted ${orphans.length === 1 ? 'directory' : 'directories'} ` +
        `under ${tree}/src/components with no matching spec: ${orphans.join(', ')}`,
    );
    for (const orphan of orphans) await fs.remove(path.join(componentsRoot, orphan));
  }
}

function reportSetupError(error: unknown): void {
  if (error instanceof EmitSetupError) {
    console.error(`Error: ${error.message}`);
    if (error.tip) console.error(`Tip: ${error.tip}`);
    return;
  }
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Watch the specs directory — and the workspace's `config/` — and re-emit the
 * whole set on every change.
 *
 * Config is watched because a convention decides what the emitted code looks
 * like just as directly as the spec does. Only these two are watched, not the
 * workspace root: the emitted platform trees are siblings of the specs
 * directory, and a recursive watch over their parent would re-trigger on this
 * run's own output.
 *
 * The whole set, not the changed component: a spec edit can change what one
 * component imports from another, and a partial re-emit would leave the emitted
 * tree internally inconsistent — which HMR serves without complaint.
 *
 * Only the first pass can exit. After that a failure is reported and the watcher
 * keeps running, so a mid-edit spec that fails to parse does not end the session.
 */
async function watchAndEmit(run: EmitRun, options: EmitOptions): Promise<never> {
  let first: EmitResult;
  try {
    first = await emitOnce(run, options);
  } catch (error) {
    reportSetupError(error);
    process.exit(error instanceof EmitSetupError ? error.code : ERROR_CODES.GENERAL_ERROR);
  }

  let emitting = false;
  let pending = false;
  let debounceTimer: NodeJS.Timeout | undefined;

  const runEmit = async () => {
    if (emitting) {
      pending = true;
      return;
    }
    emitting = true;
    try {
      await emitOnce(run, options);
    } catch (error) {
      reportSetupError(error);
    } finally {
      emitting = false;
      if (pending) {
        pending = false;
        void runEmit();
      }
    }
  };

  const scheduleEmit = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runEmit, WATCH_DEBOUNCE_MS);
  };

  // Both watchers share one debounce, so a config edit and a spec edit are the
  // same event as far as the re-emit is concerned.
  const watched = [first.specsPath, ...(first.configPath ? [first.configPath] : [])];
  const label = watched.map(p => path.relative(process.cwd(), p) || '.').join(' and ');

  console.log('');
  console.log(`Watching ${label} for changes...`);
  for (const target of watched) fs.watch(target, { recursive: true }, scheduleEmit);

  await new Promise(() => {}); // keep the process alive until Ctrl+C
  throw new Error('unreachable');
}

/**
 * Run a set of transformers over every component in a workspace.
 *
 * Exits the process: these are command bodies, and a failed component is a
 * non-zero exit rather than a thrown error the caller has to re-report. With
 * `--watch` the process stays alive instead, re-emitting on every spec change.
 */
export async function runEmitters(run: EmitRun, options: EmitOptions): Promise<never> {
  if (options.watch) return watchAndEmit(run, options);

  try {
    const { failed } = await emitOnce(run, options);
    process.exit(failed > 0 ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS);
  } catch (error) {
    reportSetupError(error);
    process.exit(error instanceof EmitSetupError ? error.code : ERROR_CODES.GENERAL_ERROR);
  }
}
