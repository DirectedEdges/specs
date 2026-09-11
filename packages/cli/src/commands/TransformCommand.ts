// `specs transform` — the older, name-a-transformer surface.
//
// Superseded by `specs react` and `specs webcomponents`, which emit a target whole
// rather than asking a user to name the pieces and get their order right. Kept for
// one release so existing workspaces and scripts keep working.
import { Command } from 'commander';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { resolveTransformers, DEFAULT_TRANSFORMERS } from '../transforms/index.js';
import { runEmitters, type EmitOptions } from './runEmitters.js';

export const Transform = new Command('transform')
  .description('Project component contracts into derived files (superseded by `specs react` / `specs webcomponents`)')
  .argument('[transformers...]', 'Transformer names to run')
  .option('-o, --output <path>', 'Path to the specs directory (input and output)')
  .option('--config <path>', 'Path to a config/ directory or legacy specs.config.yaml')
  .option('--components <keys...>', 'Only transform these component folders (default: all)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (transformerNames: string[], options: EmitOptions) => {
    await runEmitters(
      {
        label: 'transform',
        transformerOptions: optionsByName(new ConfigLoader().load(options.config)),
        transformers: (config) => {
          const configured = (config.pipeline.transformers as Array<Record<string, unknown>>)
            .map(e => e.name as string);
          const names = transformerNames.length > 0
            ? transformerNames
            : configured.length > 0
              ? configured
              : DEFAULT_TRANSFORMERS;
          return resolveTransformers(names);
        },
      },
      options,
    );
  });

/** Per-transformer options from `pipeline.yaml`, keyed by transformer name. */
function optionsByName(config: ReturnType<ConfigLoader['load']>): Map<string, Record<string, unknown>> {
  const entries = config.pipeline.transformers as Array<Record<string, unknown>>;
  return new Map(entries.map(e => {
    const { name, ...rest } = e;
    return [name as string, rest];
  }));
}
