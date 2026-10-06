// Running the chain (ADR-101) — once for `specs build`, continuously for
// `specs run`.
//
// Both use the same plan and the same step bodies. What differs is only what
// happens at the end: `build` exits with a code, `run` watches and goes again
// from whichever step the change belonged to.
//
// Steps are called as functions in this process, never started as separate
// `specs …` commands. That is what keeps the license to one check per run: the
// answer is remembered for the life of a process, and a chain that spawns a
// process per step throws that away every time.
import fs from 'fs-extra';
import path from 'path';
import type { Workspace } from '../storybook/workspace.js';
import type { Step, StepContext } from './types.js';
import { StepError } from './types.js';
import { entryFor, fromEntry, resolvePlan, watchPaths, writtenBy, type PlanOptions } from './plan.js';

/**
 * Editors write a file two or three times per save, and a fetch rewrites a
 * whole directory at once. Long enough to turn either into one pass, short
 * enough to stay imperceptible between saving a spec and seeing the story.
 * Matches the existing transform watcher so the two cannot feel different.
 */
const DEBOUNCE_MS = 800;

export interface DriveOptions extends PlanOptions {
  configPath?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface PassResult {
  ran: number;
  failed: number;
}

function describe(steps: Step[]): string {
  return steps.map(step => step.label).join(' → ');
}

/** Run a list of steps in order, reporting each. Never throws for a step's own failure. */
async function runSteps(
  steps: Step[],
  context: StepContext,
  prefix: string,
): Promise<PassResult> {
  let ran = 0;
  let failed = 0;

  for (const step of steps) {
    const started = Date.now();
    try {
      const outcome = await step.run(context);
      ran++;
      const detail = outcome.detail ? ` — ${outcome.detail}` : '';
      console.log(`${prefix}  ✓ ${step.label}${detail} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (error) {
      failed++;
      if (error instanceof StepError && error.reported) {
        // The step already said what went wrong, in wording written for it.
        console.error(`${prefix}  ✗ ${step.label} — see above`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${prefix}  ✗ ${step.label}: ${message}`);
        if (error instanceof StepError && error.tip) console.error(`${prefix}    ${error.tip}`);
      }
      // A step's output is the next step's input, so continuing past a failure
      // would run the rest against stale or missing files and report success.
      break;
    }
  }

  return { ran, failed };
}

/** `specs build` — one pass, then exit. */
export async function build(workspace: Workspace, options: DriveOptions = {}): Promise<number> {
  const plan = resolvePlan(workspace, options);
  const components = options.components ?? [];

  console.log(`[specs build] ${describe(plan.steps)}`);
  if (components.length > 0) console.log(`[specs build] limited to: ${components.join(', ')}`);
  if (plan.excluded.length > 0) {
    console.log(`[specs build] not running: ${plan.excluded.map(s => s.id).join(', ')}`);
  }

  if (options.dryRun) {
    console.log('[specs build] --dry-run, so nothing ran.');
    return 0;
  }

  console.log('');
  const result = await runSteps(
    plan.steps,
    { workspace, components, configPath: options.configPath, verbose: options.verbose ?? false },
    '',
  );

  console.log('');
  if (result.failed > 0) {
    console.error(`✗ build failed at step ${result.ran + 1} of ${plan.steps.length}`);
    return 1;
  }
  console.log(`✓ build complete — ${result.ran} step${result.ran === 1 ? '' : 's'}`);
  return 0;
}

/** `specs run` — one pass, then watch. Returns only if setup fails. */
export async function run(workspace: Workspace, options: DriveOptions = {}): Promise<number> {
  const plan = resolvePlan(workspace, options);
  const components = options.components ?? [];
  const context: StepContext = {
    workspace,
    components,
    configPath: options.configPath,
    verbose: options.verbose ?? false,
  };

  console.log(`[specs run] ${describe(plan.steps)}`);
  if (plan.excluded.length > 0) {
    console.log(`[specs run] not running: ${plan.excluded.map(s => s.id).join(', ')}`);
  }

  // Curation is a human decision recorded in the manifest, and a rescan can
  // re-derive it. Said once, at the point someone can still act on it.
  if (plan.steps.some(step => step.id === 'scan') && !workspace.config.settings.curation.preserveManualSelections) {
    console.log(
      '[specs run] note: new data in data/ will re-tick the manifest from Figma\'s dev status. ' +
      'Set settings.curation.preserveManualSelections to keep your own selections.',
    );
  }

  if (options.dryRun) {
    console.log(`[specs run] would watch: ${watchPaths(plan, workspace).map(p => path.relative(workspace.root, p) || '.').join(', ')}`);
    console.log('[specs run] --dry-run, so nothing ran.');
    return 0;
  }

  console.log('');
  await runSteps(plan.steps, context, '');

  const watched = watchPaths(plan, workspace);
  console.log('');
  console.log(`[specs run] watching ${watched.map(p => path.relative(workspace.root, p) || '.').join(', ')} — Ctrl-C to stop`);

  // One pass at a time. A change arriving mid-pass is remembered and folded
  // into the next, rather than starting a second pass over the same files.
  let runningSteps: Step[] | null = null;
  let pendingEntry: { step: Step; components: Set<string> } | null = null;
  let timer: NodeJS.Timeout | undefined;

  const drain = async () => {
    if (runningSteps || !pendingEntry) return;
    const { step, components: keys } = pendingEntry;
    pendingEntry = null;

    const steps = fromEntry(plan, { step, components: [...keys] });
    runningSteps = steps;
    const scope = [...keys];
    const scopeLabel = scope.length > 0 ? ` (${scope.join(', ')})` : '';
    console.log('');
    console.log(`[specs run] ${describe(steps)}${scopeLabel}`);
    try {
      await runSteps(steps, { ...context, components: scope }, '');
    } finally {
      runningSteps = null;
      if (pendingEntry) void drain();
    }
  };

  const onChange = (changed: string) => {
    // A step writing its own output mid-pass is the pass talking to itself —
    // `generate` rewrites `specs/`, which the targets watch. Queueing that would
    // run the targets a second time for one change. Only the steps actually
    // running are consulted, so a spec someone edits while an unrelated pass is
    // in flight is still picked up.
    if (runningSteps && writtenBy(runningSteps, workspace, changed)) return;

    const entry = entryFor(plan, workspace, changed);
    if (!entry) return;

    if (!pendingEntry) {
      pendingEntry = { step: entry.step, components: new Set(entry.components) };
    } else {
      // Two changes in one burst: start at whichever is earlier in the chain,
      // and run the union of what they touched. An unscoped change widens the
      // pass to everything, which is what an empty set means.
      const earlier =
        plan.steps.indexOf(entry.step) < plan.steps.indexOf(pendingEntry.step)
          ? entry.step
          : pendingEntry.step;
      const widened =
        entry.components.length === 0 || pendingEntry.components.size === 0
          ? new Set<string>()
          : new Set([...pendingEntry.components, ...entry.components]);
      pendingEntry = { step: earlier, components: widened };
    }

    clearTimeout(timer);
    timer = setTimeout(() => void drain(), DEBOUNCE_MS);
  };

  for (const target of watched) {
    if (!fs.existsSync(target)) continue;
    const recursive = fs.statSync(target).isDirectory();
    fs.watch(target, { recursive }, (_event, filename) => {
      onChange(filename ? path.join(target, filename.toString()) : target);
    });
  }

  await new Promise(() => {}); // until Ctrl-C
  return 0;
}
