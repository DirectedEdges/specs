import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { availableAnalyzerNames, resolveAnalyzers } from '../analyzers/index.js';
import { platformOf } from '../Config/PlatformConventions.js';
import { loadFoundations } from '../utilities/loadFoundations.js';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import type { ProcessingStates } from '../transforms/states.js';
import { resolveSpecsLayout, legacyLayoutNotice, specFolderNames, SPEC_KINDS, type SpecKind } from '../utilities/specsLayout.js';

const ERROR_CODES = { SUCCESS: 0, INVALID_ARGS: 2, FILE_ERROR: 3, GENERAL_ERROR: 1 };

interface AnalyzeOptions {
  output?: string;
  analysis?: string;
  config?: string;
  verbose: boolean;
}

export const Analyze = new Command('analyze')
  .description('Run analysis passes over component specs and write aggregate reports to _analysis/. With no analyzer named, every analyzer runs.')
  .argument('[analyzers...]', 'Analyzer names to run (props, styling, dependencies, keys). Omit to run all of them.')
  .option('-o, --output <path>', 'Path to the specs directory (input)')
  .option('--analysis <path>', 'Path to write analysis output (default: <specs-dir>/_analysis)')
  .option('--config <path>', 'Path to a config/ directory or legacy specs.config.yaml')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (analyzerNames: string[], options: AnalyzeOptions) => {
    try {
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);

      const outputPath = options.output
        ? path.resolve(options.output)
        : config.settings.spec.directory
          ? path.resolve(config.settings.spec.directory)
          : path.resolve(process.cwd());

      if (!fs.existsSync(outputPath)) {
        console.error(`Error: specs directory not found: ${outputPath}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      // The layout (ADR-096) decides where specs are read from and where analysis
      // is written — including for a pre-`components/` directory, which keeps its
      // `_analysis/` so a re-analysis does not scatter reports across two folders.
      const layout = resolveSpecsLayout(outputPath);
      const notice = legacyLayoutNotice(layout);
      if (notice) console.log(notice);

      const analysisDir = options.analysis
        ? path.resolve(options.analysis)
        : layout.analysisDir();

      // No names given runs every analyzer: the whole report set is the useful
      // default, and refusing to act was only ever a way of asking again.
      const analyzers = resolveAnalyzers(analyzerNames);
      if (analyzers.length === 0) {
        console.error(`Error: no valid analyzers to run — available: ${availableAnalyzerNames().join(', ')}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }
      if (analyzerNames.length === 0) {
        console.log(`[analyze] no analyzer named — running all: ${analyzers.map(a => a.name).join(', ')}`);
      }

      if (options.verbose) {
        console.log(`[analyze] directory: ${outputPath}`);
        console.log(`[analyze] analysis output: ${analysisDir}`);
        console.log(`[analyze] analyzers: ${analyzers.map(a => a.name).join(', ')}`);
      }

      // What each analyzer reads is the analyzer's own declaration (`readsKinds`).
      // A composition composes components and carries styling, so the dependency and
      // styling analyses take it in; it declares no props and no variants, so the
      // prop and key analyses stay component-only rather than carrying rows that are
      // empty by construction.
      const componentsDir = layout.dirFor('component');
      const specs: Array<{ kind: SpecKind; key: string; dir: string }> = SPEC_KINDS.flatMap(kind =>
        specFolderNames(layout.dirFor(kind), 'yaml').map(key => ({
          kind,
          key,
          dir: path.join(layout.dirFor(kind), key),
        })),
      );
      const componentDirs = specs.filter(s => s.kind === 'component').map(s => s.key);

      if (componentDirs.length === 0) {
        console.error(`Error: no component directories with api.yaml found in ${componentsDir}`);
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      const reads = (analyzer: Transformer, kind: SpecKind): boolean =>
        (analyzer.readsKinds ?? ['component']).includes(kind);

      const compositionCount = specs.length - componentDirs.length;
      const readsCompositions = analyzers.some(a => reads(a, 'composition'));
      const scope = compositionCount > 0 && readsCompositions
        ? `${componentDirs.length} components and ${compositionCount} composition${compositionCount === 1 ? '' : 's'}`
        : `${componentDirs.length} components`;
      console.log(`⏳ Analyzing ${scope} (${analyzers.map(a => a.name).join(', ')})…`);
      console.log('');

      let succeeded = 0;
      let failed = 0;

      for (const { kind, key: componentKey, dir: componentDir } of specs) {
        const forThisKind = analyzers.filter(a => reads(a, kind));
        if (forThisKind.length === 0) continue;
        const apiPath = path.join(componentDir, 'api.yaml');

        try {
          const raw = await fs.readFile(apiPath, 'utf-8');
          const apiYaml = yaml.parse(raw) as Record<string, unknown>;

          for (const analyzer of forThisKind) {
            const context: TransformerContext = {
              specDir: componentDir,
              outputDir: componentDir,
              // The workspace root is the parent of the specs directory.
              workspaceDir: path.dirname(outputPath),
              specsRoot: layout.root,
              kind,
              componentKey,
              tokensFormat: config.settings.spec.tokens,
              outputFormat: config.settings.spec.format,
              processingStates: config.conventions.specs?.states as ProcessingStates | undefined,
              specs: config.conventions.specs,
              // The conventions of the platform this analyzer reads (ADR-073), the
              // same way runEmitters hands them to a transformer.
              platform: analyzer.platformId
                ? platformOf(config.conventions, analyzer.platformId)
                : undefined,
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

      // Load the full token universe (variables, styles) from fetched data
      // files so analyzers can report tokens never referenced by any spec.
      const dataDirectory = config.settings.data?.directory;
      const dataDir = dataDirectory ? path.resolve(dataDirectory) : path.resolve(process.cwd());
      const foundationsPathsFor = (kind: 'variables' | 'styles'): string[] =>
        Object.entries(config.settings.data?.sources ?? {})
          .filter(([, s]) => Array.isArray(s.fetch) && s.fetch.includes(kind))
          .map(([alias]) => path.join(dataDir, `${alias}.${kind}.json`))
          .filter(p => fs.existsSync(p));

      const variablesPaths = foundationsPathsFor('variables');
      const stylesPaths = foundationsPathsFor('styles');
      const foundations = variablesPaths.length > 0 || stylesPaths.length > 0
        ? await loadFoundations(variablesPaths, stylesPaths)
        : undefined;

      if (options.verbose) {
        if (foundations) {
          console.log(`[analyze] foundations: ${foundations.variables.size} variables, ${foundations.styles.size} styles`);
        } else {
          console.log('[analyze] foundations: no data files found — skipping unused-token analysis');
        }
      }

      for (const analyzer of analyzers) {
        if (analyzer.finalize) {
          await analyzer.finalize(outputPath, analysisDir, foundations);
        }
      }

      console.log('');
      console.log(`✓ Analysis complete → ${path.relative(process.cwd(), analysisDir)}/`);

      // Analyzers that also write beside every component name those files here.
      // Without this the files appear unannounced in each spec folder and read
      // as leftovers from some earlier run.
      const ext = config.settings.spec.format === 'YAML' ? 'yaml' : 'json';
      const perComponent = analyzers
        .map(a => a.perComponentOutput)
        .filter((b): b is string => Boolean(b))
        .map(b => `${b}.${ext}`);
      if (perComponent.length > 0) {
        const specDirLabel = path.relative(process.cwd(), outputPath) || '.';
        console.log(`  also wrote ${perComponent.join(', ')} into each component folder under ${specDirLabel}/`);
      }

      console.log(`  ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}`);

      process.exit(failed > 0 ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
