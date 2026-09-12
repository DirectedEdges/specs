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

export interface EmitOptions {
  output?: string;
  config?: string;
  components?: string[];
  verbose?: boolean;
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

/**
 * Run a set of transformers over every component in a workspace.
 *
 * Exits the process: these are command bodies, and a failed component is a
 * non-zero exit rather than a thrown error the caller has to re-report.
 */
export async function runEmitters(run: EmitRun, options: EmitOptions): Promise<never> {
  try {
    const configLoader = new ConfigLoader();
    const config = configLoader.load(options.config);

    // Resolve the specs directory: flag → config → cwd.
    const specsPath = options.output
      ? path.resolve(options.output)
      : config.settings.spec.directory
        ? path.resolve(config.settings.spec.directory)
        : path.resolve(process.cwd());

    if (!fs.existsSync(specsPath)) {
      console.error(`Error: specs directory not found: ${specsPath}`);
      console.error('Tip: run `specs generate` first — it writes this layout by default');
      process.exit(ERROR_CODES.INVALID_ARGS);
    }

    const transformers =
      typeof run.transformers === 'function' ? run.transformers(config) : run.transformers;
    if (transformers.length === 0) {
      console.error('Error: no valid transformers to run');
      process.exit(ERROR_CODES.INVALID_ARGS);
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
      console.error(`Error: no component directories with api.yaml found in ${specsPath}`);
      console.error('Tip: run `specs generate` first — it writes this layout by default');
      process.exit(ERROR_CODES.FILE_ERROR);
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

    for (const transformer of transformers) {
      if (transformer.finalize) await transformer.finalize(specsPath);
    }

    console.log('');
    console.log(`✓ ${run.label} complete`);
    console.log(`  ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}`);

    process.exit(failed > 0 ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(ERROR_CODES.GENERAL_ERROR);
  }
}
