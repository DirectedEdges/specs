// `specs build` and `specs run` — the whole workspace, in order (ADR-101).
//
//   specs build    bring everything up to date once, then exit
//   specs run      the same, then watch and redo whichever part a change affects
//
// Both read one chain of steps (`../pipeline/steps.ts`), so they cannot
// disagree about what depends on what. The difference is only what happens at
// the end: `build` exits with a code CI can read, `run` keeps going.
import { Command } from 'commander';
import { resolveWorkspace } from '../storybook/workspace.js';
import { build, run, type DriveOptions } from '../pipeline/drive.js';
import { StepError } from '../pipeline/StepError.js';

interface CommandOptions {
  config?: string;
  only?: string[];
  skip?: string[];
  components?: string[];
  render?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

function toDriveOptions(options: CommandOptions): DriveOptions {
  return {
    configPath: options.config,
    only: options.only,
    skip: options.skip,
    components: options.components,
    render: options.render,
    dryRun: options.dryRun,
    verbose: options.verbose ?? false,
  };
}

/** Shared flags, so the two commands cannot drift apart on what they accept. */
function withSharedOptions(command: Command): Command {
  return command
    .option('--config <path>', 'Path to a config/ directory or legacy specs.config.yaml')
    .option('--only <steps...>', 'Run these steps and nothing else')
    .option('--skip <steps...>', 'Run everything except these steps')
    .option('--components <keys...>', 'Limit the run to these component folders')
    .option('--render', 'Also render into the connected Figma file (not available yet — use `specs render`)')
    .option('--dry-run', 'Print what would run, and run nothing')
    .option('--verbose', 'Enable detailed logging', false);
}

function reportFailure(error: unknown): never {
  if (error instanceof StepError) {
    if (!error.reported) {
      console.error(`Error: ${error.message}`);
      if (error.tip) console.error(error.tip);
    }
    process.exit(error.code);
  }
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

export const Build = withSharedOptions(
  new Command('build').description(
    'Bring the whole workspace up to date once — scan, generate, emit each platform, publish Storybook — then exit',
  ),
).action(async (options: CommandOptions) => {
  try {
    const workspace = resolveWorkspace(options.config);
    process.exit(await build(workspace, toDriveOptions(options)));
  } catch (error) {
    reportFailure(error);
  }
});

export const Run = withSharedOptions(
  new Command('run').description(
    'Bring the whole workspace up to date, then keep it that way — watches your specs, data and config and redoes only what a change affects',
  ),
).action(async (options: CommandOptions) => {
  try {
    const workspace = resolveWorkspace(options.config);
    await run(workspace, toDriveOptions(options));
  } catch (error) {
    reportFailure(error);
  }
});
