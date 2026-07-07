/**
 * Generate Command - Unified component specification generation
 *
 * Auto-detects source type:
 * - JSON file → file mode (single component with -c)
 * - Markdown manifest → manifest mode (multiple components from checkboxes)
 *
 * Both modes use Components.fromRestApi() batch API.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { Components } from '@directededges/specs-from-figma';
import type { ProgressEvent, RestLicenseInput } from '@directededges/specs-from-figma';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { loadFoundations } from '../utilities/loadFoundations.js';
import { ManifestParser } from '../utilities/ManifestParser.js';
import { ManifestParserV2 } from '../utilities/ManifestParserV2.js';
import { LicenseStatus } from '../utilities/LicenseStatus.js';
import { FileManifest } from '../Writers/FileManifest.js';
import { SingleFileWriter } from '../Writers/SingleFileWriter.js';
import { ComponentFileWriter } from '../Writers/ComponentFileWriter.js';
import { ConcernFileWriter } from '../Writers/ConcernFileWriter.js';
import { CombinedFileWriter } from '../Writers/CombinedFileWriter.js';
import type { FileWriter, WriteResult } from '../Writers/FileWriter.js';
import type { OutputFormat } from '../Types/OutputConfig.js';

declare const __SPECS_CLI_VERSION__: string;

const CLI_GENERATOR = {
  name: '@directededges/specs-cli',
  version: typeof __SPECS_CLI_VERSION__ !== 'undefined' ? __SPECS_CLI_VERSION__ : 'unknown',
  url: 'https://www.npmjs.com/package/@directededges/specs-cli',
};

// Re-export for backward compatibility
export { ManifestParser } from '../utilities/ManifestParser.js';
export type { ManifestComponent, ManifestMetadata } from '../utilities/ManifestParser.js';
export { LicenseStatus } from '../utilities/LicenseStatus.js';

// Error codes from contracts/error-codes.md
const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  FILE_ERROR: 3,
  NETWORK_ERROR: 4,
  AUTH_ERROR: 5,
  RATE_LIMIT: 6,
  COMPONENT_NOT_FOUND: 7
};

interface GenerateOptions {
  component?: string;
  license?: string;
  format?: string;
  output?: string;
  dataDir?: string;
  variables?: string;
  styles?: string;
  verbose: boolean;
  config?: string;
  splitComponents?: boolean;
  splitConcerns?: boolean;
  useSubfolders?: boolean;
}

export const Generate = new Command('generate')
  .description('Generate component specifications from Figma data or manifest')
  .argument('[source]', 'Path to Figma JSON file or markdown manifest (default: {dataDirectory}/{alias}.manifest.md from config)')
  .option('-c, --component <name|id>', 'Component name or ID (required for file mode)')
  .option('-l, --license <key>', 'License key for premium features (or set SPECS_LICENSE_KEY)')
  .option('-f, --format <format>', 'Output format (yaml or json) - overrides config')
  .option('-o, --output <path>', 'Output file or directory path')
  .option('-v, --variables <path>', 'External variables JSON file')
  .option('-s, --styles <path>', 'External styles JSON file')
  .option('--data-dir <dir>', 'Override data directory for loading source files')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--split-components', 'Create separate file per component')
  .option('--split-concerns', 'Separate API, variants, and examples into different files')
  .option('--use-subfolders', 'Organize component files in subdirectories (requires --split-components)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (source: string | undefined, options: GenerateOptions) => {
    try {
      // Load configuration (needed to resolve default source path)
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);
      const modelConfig = config.config;

      if (options.verbose && options.config) {
        console.log(`[CLI] Using config from: ${options.config}`);
      }

      // Use dataDirectory for loading data files (flag > config > default)
      const sourceDir = options.dataDir
        ? path.resolve(options.dataDir)
        : config.dataDirectory
          ? path.resolve(config.dataDirectory)
          : path.join(process.cwd(), 'data');

      // Resolve default source path: {dataDirectory}/{alias}.manifest.md
      // Alias preference: `library` if configured with `data: [file]`, else first source with `data: [file]`.
      if (!source) {
        const sources = config.sources || {};
        const defaultAlias = (() => {
          if (sources.library && Array.isArray(sources.library.data) && sources.library.data.includes('file')) return 'library';
          const candidate = Object.entries(sources).find(([, s]) => Array.isArray(s.data) && s.data.includes('file'));
          return candidate ? candidate[0] : null;
        })();

        if (!defaultAlias) {
          console.error('Error: No source argument provided and no default manifest could be resolved');
          console.error('Tip: run `specs scan` to generate a manifest, or configure a source with `data: [file]` in specs.config.yaml');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        source = path.join(sourceDir, `${defaultAlias}.manifest.md`);

        if (options.verbose) {
          console.log(`[CLI] Using default manifest: ${path.relative(process.cwd(), source)}`);
        }
      }

      const sourcePath = path.resolve(source);

      if (options.verbose) {
        console.log(`[CLI] Loading source: ${source}`);
      }

      // Validate source exists
      if (!fs.existsSync(sourcePath)) {
        console.error(`Error: Source file not found: ${source}`);
        if (source.endsWith('.manifest.md')) {
          console.error('Tip: run `specs scan` to generate the manifest');
        }
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      // Auto-detect mode by content.
      // - v2 manifest: markdown table emitted by `specs scan` (declares **Scan format version:** 2)
      // - v1 manifest: checkbox bullet list emitted by `specs audit`
      // - JSON: raw Figma file (file mode)
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');
      const trimmed = sourceContent.trimStart();
      const isV2Manifest = ManifestParserV2.isV2(sourceContent);
      const isV1Manifest = trimmed.includes('- [');
      const isJson = trimmed.startsWith('{');
      const isManifest = isV2Manifest || isV1Manifest;

      if (!isManifest && !isJson) {
        console.error('Error: Unrecognized source format. Expected JSON file or markdown manifest.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      if (options.verbose) {
        console.log(`[CLI] Mode: ${isManifest ? 'manifest' : 'file'}`);
      }

      // ---------------------------------------------------------------
      // Determine component IDs and Figma file JSON based on mode
      // ---------------------------------------------------------------
      let componentIds: string[];
      let componentNames: Map<string, string>; // id → display name
      let libraryJson: Record<string, any>;

      if (isManifest) {
        // MANIFEST MODE
        if (!options.output && !config.outputDirectory) {
          console.error('Error: Specify --output or set outputDirectory in config');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        const { components, metadata } = isV2Manifest
          ? ManifestParserV2.parse(sourceContent)
          : ManifestParser.parse(sourceContent);

        if (components.length === 0) {
          console.error('Error: No components found in manifest');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        const selectedComponents = components.filter(c => c.included);

        if (selectedComponents.length === 0) {
          console.error('Error: No components selected in manifest (none have [x])');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        console.log(`✓ Loaded manifest: ${components.length} components (${selectedComponents.length} selected)`);

        // Determine source file
        const componentSourceAlias = (() => {
          const sources = config.sources || {};
          if (sources.library && Array.isArray(sources.library.data) && sources.library.data.includes('file')) return 'library';
          const candidates = Object.entries(sources).filter(([, s]) => Array.isArray(s.data) && s.data.includes('file'));
          return candidates.length > 0 ? candidates[0][0] : null;
        })();

        const sourceFile = metadata.file || (componentSourceAlias ? path.join(sourceDir, `${componentSourceAlias}.file.json`) : undefined);

        if (!sourceFile) {
          console.error('Error: No component source file specified');
          console.error('Include **File:** in the manifest header (from `specs audit`) or configure a source alias with `data: [file]` in specs.config.yaml');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        if (!fs.existsSync(sourceFile)) {
          console.error(`Error: Source file not found: ${sourceFile}`);
          if (componentSourceAlias) {
            console.error(`Tip: run \`specs fetch\` to download ${componentSourceAlias}.file.json, or check sources.${componentSourceAlias}.key in your config`);
          } else {
            console.error('Tip: run `specs fetch` to download the source file, or check sources.<alias>.key in your config');
          }
          process.exit(ERROR_CODES.FILE_ERROR);
        }

        libraryJson = await fs.readJSON(sourceFile);
        componentIds = selectedComponents.map(c => c.id);
        componentNames = new Map(selectedComponents.map(c => [c.id, c.name]));

        if (options.verbose) {
          console.log(`[CLI] File loaded: ${libraryJson.name || path.basename(sourceFile)}`);
        }
      } else {
        // FILE MODE
        if (!options.component) {
          console.error('Error: --component is required when source is a JSON file');
          console.error('Usage: specs generate <file.json> -c <component-name|id>');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        libraryJson = JSON.parse(sourceContent);
        componentIds = [options.component];
        const resolvedName =
          libraryJson.componentSets?.[options.component]?.name ||
          libraryJson.components?.[options.component]?.name ||
          options.component;
        componentNames = new Map([[options.component, resolvedName]]);

        if (options.verbose) {
          console.log(`[CLI] File loaded: ${libraryJson.name || path.basename(sourcePath)}`);
        }
      }

      // ---------------------------------------------------------------
      // Load foundations
      // ---------------------------------------------------------------
      const fileDir = isManifest ? sourceDir : path.dirname(sourcePath);
      const foundationsDir = path.basename(fileDir) === 'foundations'
        ? fileDir
        : path.join(fileDir, 'foundations');

      const variablesPaths = options.variables
        ? [path.resolve(options.variables)]
        : Object.entries(config.sources || {})
            .filter(([, s]) => Array.isArray(s.data) && s.data.includes('variables'))
            .map(([alias]) => path.join(sourceDir, `${alias}.variables.json`))
            .filter(p => p.length > 0);

      const stylesPaths = options.styles
        ? [path.resolve(options.styles)]
        : Object.entries(config.sources || {})
            .filter(([, s]) => Array.isArray(s.data) && s.data.includes('styles'))
            .map(([alias]) => path.join(sourceDir, `${alias}.styles.json`))
            .filter(p => p.length > 0);

      // Auto-discovery fallback for file mode
      const finalVariablesPaths = variablesPaths.length > 0 ? variablesPaths : (isManifest ? [] : [path.join(foundationsDir, 'variables.json')]);
      const finalStylesPaths = stylesPaths.length > 0 ? stylesPaths : (isManifest ? [] : [path.join(foundationsDir, 'styles.json')]);

      if (options.verbose) {
        for (const p of finalVariablesPaths) {
          if (fs.existsSync(p)) {
            console.log(`[CLI] Found variables: ${path.relative(process.cwd(), p)}`);
          }
        }
        for (const p of finalStylesPaths) {
          if (fs.existsSync(p)) {
            console.log(`[CLI] Found styles: ${path.relative(process.cwd(), p)}`);
          }
        }
      }

      const { styles, variables, collections } = await loadFoundations(
        finalVariablesPaths.filter(p => fs.existsSync(p)),
        finalStylesPaths.filter(p => fs.existsSync(p)),
        libraryJson
      );

      if (options.verbose) {
        console.log(`[CLI] Foundations loaded:`);
        console.log(`  Variables: ${variables.size}`);
        console.log(`  Collections: ${collections.size}`);
        console.log(`  Styles: ${styles.size}`);
      }

      // ---------------------------------------------------------------
      // Resolve license
      // ---------------------------------------------------------------
      const licenseKey = options.license || process.env.SPECS_LICENSE_KEY || process.env.ANOVA_LICENSE_KEY;
      const licenseInput: RestLicenseInput | undefined = licenseKey ? { key: licenseKey } : undefined;

      // ---------------------------------------------------------------
      // Process components via batch API
      // ---------------------------------------------------------------
      if (isManifest) {
        console.log(`⏳ Processing ${componentIds.length} components...`);
        console.log('');
      }

      const results = await Components.fromRestApi(
        componentIds,
        libraryJson,
        modelConfig,
        { styles, variables, collections, author: config.author, generator: CLI_GENERATOR },
        (event: ProgressEvent) => {
          if (!isManifest) {
            // File mode: quiet progress (verbose only)
            if (options.verbose) console.log(`[CLI] ${event.status}: ${event.component}`);
          } else {
            // Manifest mode: per-component progress
            const symbol = event.status === 'error' ? '✗' : event.status === 'success' ? '✓' : '…';
            process.stdout.write(`\r[${event.index + 1}/${event.total}] ${componentNames.get(event.component) || event.component}... ${symbol}`);
            if (event.status !== 'processing') process.stdout.write('\n');
          }
        },
        licenseInput,
      );

      // ---------------------------------------------------------------
      // Hard-fail: wrong-runtime license key → AUTH_ERROR
      // ---------------------------------------------------------------
      if (results.length > 0 && results.every(r => 'error' in r)) {
        const firstError = (results[0] as { name: string; error: string }).error;
        if (firstError.includes('not valid for this runtime')) {
          console.error(`Error: ${firstError}`);
          process.exit(ERROR_CODES.AUTH_ERROR);
        }
      }

      // ---------------------------------------------------------------
      // Hard-fail: a *provided* key whose validation could not be completed
      // (transient proxy/network failure or rate-limit) must NOT silently fall
      // back to FREE output for a paid run. The transformer maps these states to
      // FREE and proceeds, so without this guard the run would succeed and write
      // free-tier specs under a valid key. Fail loud + retryable instead.
      // (DirectedEdges/specs#119, C1)
      // ---------------------------------------------------------------
      if (licenseKey) {
        const license = LicenseStatus.resolve(results);
        // 'invalid'/'removed'/'expired' are definitive key rejections where FREE
        // fallback is reasonable; these are the transient "check didn't complete"
        // states where the key may well be valid.
        const TRANSIENT_FAILURES = new Set(['error', 'network-error', 'rate-limited']);
        if (license?.status && TRANSIENT_FAILURES.has(license.status)) {
          console.error(`Error: License check could not be completed (status: ${license.status}).`);
          console.error(`Your key was not validated, so no licensed output was produced.`);
          console.error(`This is usually temporary — retry in a few seconds, or remove the key for free-tier output.`);
          process.exit(license.status === 'rate-limited' ? ERROR_CODES.RATE_LIMIT : ERROR_CODES.NETWORK_ERROR);
        }
      }

      // ---------------------------------------------------------------
      // Separate successes and errors
      // ---------------------------------------------------------------
      const processedComponents: Array<{ name: string; spec: Record<string, unknown> }> = [];
      const errors: Array<{ component: string; error: string }> = [];

      for (const result of results) {
        if ('component' in result) {
          const displayName = componentNames.get(result.name) || result.name;
          processedComponents.push({ name: displayName, spec: result.component as Record<string, unknown> });
        } else {
          const displayName = componentNames.get(result.name) || result.name;
          errors.push({ component: displayName, error: result.error });
        }
      }

      // Display summary for manifest mode
      if (isManifest) {
        console.log('');
        console.log(`✓ Generated specs`);
        console.log(`  - ${processedComponents.length} components successful`);
        if (errors.length > 0) {
          console.log(`  - ${errors.length} components failed`);
          errors.forEach(({ component, error }) => {
            console.log(`    ✗ ${component}: ${error}`);
          });
        }
      }

      // Display license status
      LicenseStatus.display(results, !!licenseKey);

      // Handle file mode errors
      if (!isManifest && errors.length > 0) {
        const msg = errors[0].error;
        if (msg.includes('Component not found') || msg.includes('not found')) {
          console.error(`Error: ${msg}`);
          console.error(`Tip: Use a component name like "DS Alert" or component ID like "123:456"`);
          process.exit(ERROR_CODES.COMPONENT_NOT_FOUND);
        }
        console.error(`Error: ${msg}`);
        process.exit(ERROR_CODES.GENERAL_ERROR);
      }

      if (processedComponents.length === 0) {
        console.error('Error: No components were successfully processed');
        process.exit(ERROR_CODES.GENERAL_ERROR);
      }

      // ---------------------------------------------------------------
      // File mode stdout (no -o)
      // ---------------------------------------------------------------
      if (!isManifest && !options.output && !config.outputDirectory) {
        const componentData = processedComponents[0].spec;
        const outputFormat = options.format
          ? options.format.toLowerCase()
          : modelConfig.format.output.toLowerCase();

        const formattedOutput = outputFormat === 'yaml'
          ? yaml.stringify(componentData)
          : JSON.stringify(componentData, null, 2);

        console.log(formattedOutput);
        process.exit(ERROR_CODES.SUCCESS);
        return;
      }

      // ---------------------------------------------------------------
      // File output via manifest + writer
      // ---------------------------------------------------------------
      const resolvedFormat: OutputFormat = options.format
        ? options.format.toLowerCase() as OutputFormat
        : modelConfig.format.output.toLowerCase() as OutputFormat;

      const outputConfig = {
        ...config.output,
        splitComponents: options.splitComponents ?? config.output?.splitComponents ?? false,
        splitConcerns: options.splitConcerns ?? config.output?.splitConcerns ?? false,
        useSubfolders: options.useSubfolders ?? config.output?.useSubfolders ?? false,
        defaultFormat: resolvedFormat
      };

      let outputPath: string;
      if (options.output) {
        outputPath = path.resolve(options.output);
      } else if (config.outputDirectory) {
        outputPath = path.resolve(config.outputDirectory);
      } else {
        // Should not reach here — handled above for file mode stdout
        process.exit(ERROR_CODES.INVALID_ARGS);
        return;
      }

      // When in single-file mode and outputPath is an existing directory,
      // append a default filename so we don't try to open a directory as a file
      const isSingleFileMode = !outputConfig.splitComponents && !outputConfig.splitConcerns;
      if (isSingleFileMode && fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
        outputPath = path.join(outputPath, `library.${resolvedFormat}`);
      }

      const baseDir = outputConfig.splitComponents || outputConfig.splitConcerns
        ? outputPath
        : path.dirname(outputPath);

      const outputFileName = (!outputConfig.splitComponents && !outputConfig.splitConcerns)
        ? path.basename(outputPath)
        : undefined;

      const manifest = new FileManifest(processedComponents, outputConfig, baseDir, outputFileName);

      // Select appropriate writer
      let writer: FileWriter;
      if (outputConfig.splitConcerns && !outputConfig.splitComponents) {
        writer = new ConcernFileWriter();
      } else if (outputConfig.splitComponents && !outputConfig.splitConcerns) {
        writer = new ComponentFileWriter(outputConfig.useSubfolders);
      } else if (!outputConfig.splitComponents && !outputConfig.splitConcerns) {
        writer = new SingleFileWriter();
      } else {
        writer = new CombinedFileWriter();
      }

      const writeResult: WriteResult = await writer.write(manifest);

      if (writeResult.warnings.length > 0) {
        const isOverwriteWarning = (warning: string) => warning.includes('Overwriting existing file');
        const overwriteCount = writeResult.warnings.filter(isOverwriteWarning).length;
        if (overwriteCount > 0) {
          console.log('Warning: Overwrote existing file(s)');
        }
        writeResult.warnings.filter(warning => !isOverwriteWarning(warning)).forEach(warning => console.log(warning));
      }

      if (writeResult.errors.length > 0) {
        writeResult.errors.forEach(error => console.error(`Error: ${error}`));
        process.exit(ERROR_CODES.FILE_ERROR);
      }


      process.exit(errors.length > 0 ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
