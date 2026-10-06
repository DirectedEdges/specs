// What a step is, and what running one means (ADR-101).
//
// A step is a function with its inputs and outputs written down. Everything the
// chain can do — ordering, deciding what a change affects, suppressing a step's
// own writes — reads those declarations rather than knowing about any particular
// command.
import type { Workspace } from '../storybook/workspace.js';

/**
 * The steps, in the order they depend on each other.
 *
 * `render` is in the vocabulary but not yet in the chain — see `STEPS` in
 * `steps.ts` for why. Naming it in `--only` or `--skip` is understood, so the
 * refusal can say what is actually going on rather than "unknown step".
 */
export const STEP_IDS = [
  'scan',
  'generate',
  'react',
  'webcomponents',
  'storybook',
  'render',
] as const;

export type StepId = (typeof STEP_IDS)[number];

/**
 * A path the chain watches, and what a change there means.
 *
 * `scope` turns a changed file into the component keys the step should be
 * limited to. Returning `null` means the change is not per-component and the
 * step runs over everything — which is the right answer for `config/` and
 * `assets/`, where one file decides the shape of every component's output.
 */
export interface StepInput {
  /** Absolute path to a file or directory to watch. */
  path: string;
  /** Component keys this change is confined to, or null for "all of them". */
  scope?: (changedPath: string) => string[] | null;
}

export interface StepContext {
  workspace: Workspace;
  /** Limit the run to these component folders. Empty means all of them. */
  components: string[];
  /** The `--config` path as given, passed through to each command's own loader. */
  configPath?: string;
  verbose: boolean;
}

export interface StepOutcome {
  /** A short line for the run summary — "12 components", "4 files changed". */
  detail?: string;
}

export interface Step {
  id: StepId;
  /** How the step is named in output. */
  label: string;
  /** False when the workspace has nothing for this step to do. */
  active(workspace: Workspace): boolean;
  /** Paths that, when changed, mean this step should run. */
  inputs(workspace: Workspace): StepInput[];
  /**
   * Paths this step writes. A change under one of these is ignored by the
   * watcher — without this, every step would re-trigger itself forever.
   */
  outputs(workspace: Workspace): string[];
  run(context: StepContext): Promise<StepOutcome>;
}

/**
 * A failure that is this step's own, with the exit code the one-shot path uses.
 *
 * Steps throw rather than exiting. `specs build` turns the first one into an
 * exit code; `specs run` reports it and keeps watching, because the fix is the
 * next time a file is saved. Defined in its own module so a command can throw
 * it without importing the workspace types.
 */
export { StepError } from './StepError.js';
