import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { resolveAnalyzers } from '../analyzers/index.js';
import type { TransformerContext } from '../Types/Transformer.js';
import type { ProcessingStates } from '../transforms/states.js';

const ERROR_CODES = { SUCCESS: 0, INVALID_ARGS: 2, FILE_ERROR: 3, GENERAL_ERROR: 1 };

interface AnalyzeOptions {
  output?: string;
  analysis?: string;
  config?: string;
  verbose: boolean;
}

export const Analyze = new Command('analyze')
  .description('Run analysis passes over component specs and write aggregate reports to _analysis/')
  .argument('[analyzers...]', 'Analyzer names to run (props, styling)')
  .option('-o, --output <path>', 'Path to the specs directory (input)')
  .option('--analysis <path>', 'Path to write analysis output (default: <specs-dir>/_analysis)')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (analyzerNames: string[], options: AnalyzeOptions) => {
    try {
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);

      const outputPath = options.output
        ? path.resolve(options.output)
        : config.outputDirectory
          ? path.resolve(config.outputDirectory)
          : path.resolve(process.cwd());

      if (!fs.existsSync(outputPath)) {
        console.error(`Error: specs directory not found: ${outputPath}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const analysisDir = options.analysis
        ? path.resolve(options.analysis)
        : path.join(outputPath, '_analysis');

      if (analyzerNames.length === 0) {
        console.error('Error: specify at least one analyzer (e.g. specs analyze props)');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const analyzers = resolveAnalyzers(analyzerNames);
      if (analyzers.length === 0) {
        console.error('Error: no valid analyzers to run');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      if (options.verbose) {
        console.log(`[analyze] directory: ${outputPath}`);
        console.log(`[analyze] analysis output: ${analysisDir}`);
        console.log(`[analyze] analyzers: ${analyzers.map(a => a.name).join(', ')}`);
      }

      const entries = await fs.readdir(outputPath, { withFileTypes: true });
      const componentDirs = entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .filter(name => fs.existsSync(path.join(outputPath, name, 'api.yaml')));

      if (componentDirs.length === 0) {
        console.error(`Error: no component directories with api.yaml found in ${outputPath}`);
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      console.log(`⏳ Analyzing ${componentDirs.length} components (${analyzers.map(a => a.name).join(', ')})…`);
      console.log('');

      let succeeded = 0;
      let failed = 0;

      for (const componentKey of componentDirs) {
        const componentDir = path.join(outputPath, componentKey);
        const apiPath = path.join(componentDir, 'api.yaml');

        try {
          const raw = await fs.readFile(apiPath, 'utf-8');
          const apiYaml = yaml.parse(raw) as Record<string, unknown>;

          for (const analyzer of analyzers) {
            const context: TransformerContext = {
              outputDir: componentDir,
              componentKey,
              tokensFormat: config.config.format.tokens,
              processingStates: config.config.processing?.states as ProcessingStates | undefined,
            };
            await analyzer.run(apiYaml, context);
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

      for (const analyzer of analyzers) {
        if (analyzer.finalize) {
          await analyzer.finalize(outputPath, analysisDir);
        }
      }

      console.log('');
      console.log(`✓ Analysis complete → ${path.relative(process.cwd(), analysisDir)}/`);
      console.log(`  ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}`);

      process.exit(failed > 0 ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
