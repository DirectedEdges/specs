/**
 * Scan Command - Discover and list all components in a Figma file
 *
 * Purpose: Scan Figma file and generate manifest of components for curation
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { ComponentDiscovery, type ComponentInfo } from '../utilities/ComponentDiscovery.js';

// Error codes from contracts/error-codes.md
const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  FILE_ERROR: 3
};

interface ScanOptions {
  output?: string;
  dataDir?: string;
  config?: string;
  source?: string;
  includeAll: boolean;
  variables?: string;
  verbose: boolean;
}

type MinimalConfig = {
  dataDirectory?: string;
  sourceDirectory?: string; // deprecated alias
  sources?: Record<string, { key: string; data: string[] }>;
};

function findConfigFile(cwd: string): string | null {
  const locations = [
    path.join(cwd, 'specs.config.yaml'),
    path.join(cwd, 'specs.config.json'),
    path.join(process.env.HOME || '~', '.specs', 'config.yaml')
  ];
  for (const location of locations) {
    if (fs.existsSync(location)) return location;
  }
  return null;
}

function loadConfig(configPath?: string): { configDir: string; config: MinimalConfig } {
  const resolvedPath = configPath ? path.resolve(configPath) : findConfigFile(process.cwd());
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return { configDir: process.cwd(), config: {} };
  }
  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = resolvedPath.endsWith('.json') ? JSON.parse(raw) : (yaml.parse(raw) as unknown);
  return {
    configDir: path.dirname(resolvedPath),
    config: (parsed as MinimalConfig) || {}
  };
}

interface AuditComponentInfo extends ComponentInfo {
  included: boolean;
}

/**
 * Apply heuristics to determine if a component should be included by default
 * 
 * Rules:
 * - COMPONENT_SET: included (likely design system components)
 * - Other COMPONENT: included
 * 
 * Future heuristics (commented out until needed):
 * - Use isAsset property if Figma REST API adds it
 * - Documentation/Examples exclusion patterns
 */
function applyDefaultInclusion(component: AuditComponentInfo): boolean {
  // Rule 1: COMPONENT_SET are included by default (variant sets are design system components)
  if (component.type === 'COMPONENT_SET') {
    return true;
  }

  // Rule 2: Standalone COMPONENT are included by default
  // Future: Could use isAsset property when available in REST API
  // const iconPatterns = ['icon /', 'icons /', 'icon/', 'icons/', 'asset /', 'assets /'];
  // if (node.isAsset || iconPatterns.some(pattern => name.toLowerCase().startsWith(pattern))) {
  //   return false;
  // }

  // Rule 3: Documentation/example exclusions (commented out for now)
  // const docPatterns = ['documentation /', 'example ', 'examples /', 'demo /', 'test /'];
  // if (docPatterns.some(pattern => name.toLowerCase().startsWith(pattern))) {
  //   return false;
  // }

  return true;
}

/**
 * Generate markdown manifest with checkbox format
 */
function generateManifest(
  components: AuditComponentInfo[],
  sourceFile: string,
  variablesFile?: string
): string {
  const timestamp = new Date().toISOString();

  const lines: string[] = [];

  // Manifest header
  lines.push(`# Component Manifest`);
  lines.push('');
  lines.push(`**Generated:** ${timestamp}  `);
  lines.push(`**File:** ${sourceFile}`);
  if (variablesFile) {
    lines.push(`**Variables:** ${variablesFile}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Components');
  lines.push('');
  
  // Component list with checkboxes
  for (const component of components) {
    const checkbox = component.included ? '[x]' : '[ ]';
    lines.push(`- ${checkbox} ${component.name} (${component.id}, ${component.type})`);
  }
  
  return lines.join('\n');
}

export const Scan = new Command('scan')
  .description('Scan Figma file and generate component manifest for curation')
  .argument('[file]', 'Path to Figma JSON file (default: resolved from configured source in specs.config.yaml)')
  .option('--source <alias>', 'Configured source alias to scan (required when multiple sources exist)')
  .option('-o, --output <path>', 'Output manifest file path (default: {dataDirectory}/{alias}.manifest.md)')
  .option('--data-dir <dir>', 'Override data directory for default manifest output path')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--include-all', 'Include all components by default (ignore heuristics)', false)
  .option('-v, --variables <path>', 'Variables file path (for reference in manifest)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (fileArg: string | undefined, options: ScanOptions) => {
    try {
      const { configDir, config } = loadConfig(options.config);
      const dataDir = options.dataDir || config.dataDirectory || config.sourceDirectory;
      const resolvedDir = path.resolve(configDir, dataDir || '.');

      // Resolve file: explicit arg wins, else derive from config sources
      let file: string;
      if (fileArg) {
        if (options.source) {
          console.error('Error: Pass either a <file> argument or --source, not both');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }
        file = fileArg;
      } else {
        const fileSources = Object.entries(config.sources || {}).filter(
          ([, entry]) => Array.isArray(entry.data) && entry.data.includes('file')
        );

        if (fileSources.length === 0) {
          console.error('Error: No <file> argument provided and no sources configured in specs.config.yaml');
          console.error('Tip: run `specs fetch` first, or pass a file path explicitly (e.g., `specs scan data/library.file.json`)');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        let alias: string;
        if (options.source) {
          const match = fileSources.find(([name]) => name === options.source);
          if (!match) {
            const available = fileSources.map(([name]) => name).join(', ');
            console.error(`Error: --source "${options.source}" did not match a configured source with file data`);
            console.error(`Available: ${available}`);
            process.exit(ERROR_CODES.INVALID_ARGS);
          }
          alias = match[0];
        } else if (fileSources.length === 1) {
          alias = fileSources[0][0];
        } else {
          const available = fileSources.map(([name]) => name).join(', ');
          console.error('Error: Multiple sources configured. Specify one with --source <alias>.');
          console.error(`Available: ${available}`);
          process.exit(ERROR_CODES.INVALID_ARGS);
        }

        file = path.join(resolvedDir, `${alias}.file.json`);

        if (options.verbose) {
          console.error(`[CLI] Using source "${alias}": ${path.relative(process.cwd(), file)}`);
        }
      }

      // Resolve output path: explicit -o, or derive from input filename
      if (!options.output) {
        const baseName = path.basename(file, '.file.json');
        options.output = path.join(resolvedDir, `${baseName}.manifest.md`);
      }

      if (options.verbose) {
        console.error(`[CLI] Scanning file: ${file}`);
      }

      // Validate file exists
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        if (!fileArg) {
          console.error('Tip: run `specs fetch` to download source data');
        }
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      // Load the Figma file and discover components
      const discovery = await ComponentDiscovery.fromFile(file);
      
      if (options.verbose) {
        console.error(`[CLI] File loaded: ${discovery.getFileName()}`);
      }

      // Find all components (automatically filters variant children)
      const componentInfoList = discovery.findAllComponents();
      
      if (componentInfoList.length === 0) {
        console.error('Warning: No components found in file');
      }

      if (options.verbose) {
        console.error(`[CLI] Found ${componentInfoList.length} top-level components`);
      }

      // Build component info list with heuristics
      const components: AuditComponentInfo[] = componentInfoList.map(node => {
        const info: AuditComponentInfo = {
          id: node.id,
          name: node.name,
          type: node.type as 'COMPONENT' | 'COMPONENT_SET',
          included: false
        };
        
        // Apply heuristics unless --include-all is set
        info.included = options.includeAll || applyDefaultInclusion(info);
        
        return info;
      });

      // Sort by name for better readability
      components.sort((a, b) => a.name.localeCompare(b.name));

      const includedCount = components.filter(c => c.included).length;
      const excludedCount = components.length - includedCount;

      // Generate markdown manifest
      const manifest = generateManifest(
        components,
        path.resolve(file),
        options.variables ? path.resolve(options.variables) : undefined
      );

      // Write manifest to output file
      const outputPath = path.resolve(options.output!);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, manifest, 'utf-8');

      // Success message
      console.log(`✓ Scanned ${path.basename(file)}`);
      console.log(`✓ Found ${components.length} components (${includedCount} selected, ${excludedCount} excluded)`);
      console.log(`✓ Saved to ${outputPath}`);
      console.log('');
      console.log(`Next: Edit ${path.basename(outputPath)} to adjust selections, then run:`);
      console.log(`  specs generate`);

      process.exit(ERROR_CODES.SUCCESS);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
