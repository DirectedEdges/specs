import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { resolveTransformers, DEFAULT_TRANSFORMERS } from '../transforms/index.js';
import type { TransformerContext } from '../Types/Transformer.js';
import type { ProcessingStates } from '../transforms/states.js';

const ERROR_CODES = { SUCCESS: 0, INVALID_ARGS: 2, FILE_ERROR: 3, GENERAL_ERROR: 1 };

interface TransformOptions {
  output?: string;
  config?: string;
  verbose: boolean;
}

export const Transform = new Command('transform')
  .description('Project component contracts into derived files (contract, css, tokens, …)')
  .argument('[transformers...]', 'Transformer names to run (default: contract)')
  .option('-o, --output <path>', 'Path to the specs directory (input and output)')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (transformerNames: string[], options: TransformOptions) => {
    try {
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);

      // Resolve output/input directory: flag → config → cwd
      const outputPath = options.output
        ? path.resolve(options.output)
        : config.outputDirectory
          ? path.resolve(config.outputDirectory)
          : path.resolve(process.cwd());

      if (!fs.existsSync(outputPath)) {
        console.error(`Error: specs directory not found: ${outputPath}`);
        console.error('Tip: run `specs generate --split-components --split-concerns --use-subfolders` first');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      // Resolve transformer names: positionals → config.transformers → defaults
      const configTransformerEntries = (config.config?.transformers ?? []) as Array<Record<string, unknown>>;
      const transformerOptionsMap = new Map<string, Record<string, unknown>>(
        configTransformerEntries.map(e => {
          const { name, ...rest } = e;
          return [name as string, rest];
        })
      );
      const configTransformers = configTransformerEntries.map(e => e.name as string);
      const names = transformerNames.length > 0
        ? transformerNames
        : configTransformers.length > 0
          ? configTransformers
          : DEFAULT_TRANSFORMERS;

      const transformers = resolveTransformers(names);
      if (transformers.length === 0) {
        console.error('Error: no valid transformers to run');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      if (options.verbose) {
        console.log(`[transform] directory: ${outputPath}`);
        console.log(`[transform] transformers: ${transformers.map(t => t.name).join(', ')}`);
      }

      // Discover component subfolders — each must contain api.yaml
      const entries = await fs.readdir(outputPath, { withFileTypes: true });
      const componentDirs = entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .filter(name => fs.existsSync(path.join(outputPath, name, 'api.yaml')));

      if (componentDirs.length === 0) {
        console.error(`Error: no component directories with api.yaml found in ${outputPath}`);
        console.error('Tip: run `specs generate --split-components --split-concerns --use-subfolders` first');
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      console.log(`⏳ Transforming ${componentDirs.length} components (${transformers.map(t => t.name).join(', ')})…`);
      console.log('');

      let succeeded = 0;
      let failed = 0;

      for (const componentKey of componentDirs) {
        const componentDir = path.join(outputPath, componentKey);
        const apiPath = path.join(componentDir, 'api.yaml');

        try {
          const raw = await fs.readFile(apiPath, 'utf-8');
          const apiYaml = yaml.parse(raw) as Record<string, unknown>;

          for (const transformer of transformers) {
            const context: TransformerContext = {
              outputDir: componentDir,
              componentKey,
              tokensFormat: config.config.format.tokens,
              processingStates: config.config.processing?.states as ProcessingStates | undefined,
              transformerOptions: transformerOptionsMap.get(transformer.name),
            };
            await transformer.run(apiYaml, context);
          }

          if (options.verbose) {
            console.log(`  ✓ ${componentKey}`);
          }
          succeeded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  ✗ ${componentKey}: ${msg}`);
          failed++;
        }
      }

      for (const transformer of transformers) {
        if (transformer.finalize) {
          await transformer.finalize(outputPath);
        }
      }

      console.log('');
      console.log(`✓ Transform complete`);
      console.log(`  ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}`);

      process.exit(failed > 0 ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
