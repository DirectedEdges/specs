/**
 * Audit Command - Discover and list all components in a Figma file
 * 
 * Purpose: Scan Figma file and generate manifest of components for batch curation
 * Status: Phase 3 implementation (2026-01-13)
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { ComponentDiscovery, type ComponentInfo } from '../utilities/ComponentDiscovery.js';

// Error codes from contracts/error-codes.md
const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  FILE_ERROR: 3
};

interface AuditOptions {
  output: string;
  includeAll: boolean;
  variables?: string;
  verbose: boolean;
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
  sourceFile: string
): string {
  const timestamp = new Date().toISOString();

  const lines: string[] = [];
  
  // Manifest header
  lines.push(`# Component Manifest`);
  lines.push('');
  lines.push(`**Generated:** ${timestamp}  `);
  lines.push(`**File:** ${sourceFile}`);
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

export const Audit = new Command('audit')
  .description('Scan Figma file and generate component manifest for batch processing')
  .argument('<file>', 'Path to Figma JSON file')
  .requiredOption('-o, --output <path>', 'Output manifest file path (e.g., components.md)')
  .option('--include-all', 'Include all components by default (ignore heuristics)', false)
  .option('-v, --variables <path>', 'Variables file path (for reference in manifest)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (file: string, options: AuditOptions) => {
    try {
      if (options.verbose) {
        console.error(`[CLI] Scanning file: ${file}`);
      }

      // Validate file exists
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
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
        path.resolve(file)
      );

      // Write manifest to output file
      const outputPath = path.resolve(options.output);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, manifest, 'utf-8');

      // Success message
      console.log(`✓ Scanned ${path.basename(file)}`);
      console.log(`✓ Found ${components.length} components (${includedCount} selected, ${excludedCount} excluded)`);
      console.log(`✓ Saved to ${outputPath}`);
      console.log('');
      console.log(`Next: Edit ${path.basename(outputPath)} to adjust selections, then run:`);
      console.log(`  specs batch ${path.basename(outputPath)} -o specs.yaml`);

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
