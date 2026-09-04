/**
 * Scan Command - Discover and list all components in a Figma file
 *
 * Purpose: Scan Figma file and generate manifest of components for curation
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { ComponentDiscovery, type ComponentInfo, type DevStatus } from '../utilities/ComponentDiscovery.js';
import { ManifestParserV2, type ManifestRowV2 } from '../utilities/ManifestParserV2.js';
import { isV1Manifest, migrateV1ToV2 } from '../utilities/ManifestMigrationV1ToV2.js';
import { glyphPatternMatch } from '../utilities/glyphPatternMatch.js';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import { figmaOf } from '../Config/PlatformConventions.js';

const SCAN_FORMAT_VERSION = 2;

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
  keepChecks: boolean;
  resetChecks: boolean;
  variables?: string;
  verbose: boolean;
}

/**
 * Default inclusion when no prior manifest exists (or --reset-checks).
 *
 * - If ANY component in the file has devStatus=READY_FOR_DEV, only those
 *   components are checked. Designers are signalling curation explicitly.
 * - Otherwise (no devStatus signal anywhere), fall back to the legacy
 *   heuristic: include all COMPONENT_SETs and standalone COMPONENTs.
 */
export function deriveDefaultInclusion(
  components: ComponentInfo[],
  includeAll: boolean
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  const anyReady = components.some(c => c.devStatus === 'READY_FOR_DEV');

  for (const c of components) {
    if (includeAll) {
      result.set(c.id, true);
      continue;
    }
    if (anyReady) {
      result.set(c.id, c.devStatus === 'READY_FOR_DEV');
    } else {
      // Legacy heuristic: COMPONENT_SET and standalone COMPONENT both included.
      result.set(c.id, c.type === 'COMPONENT' || c.type === 'COMPONENT_SET');
    }
  }
  return result;
}

export interface MergeStats {
  added: number;
  removed: number;
  flippedByFigma: number;
  preserved: number;
}

/**
 * Merge prior rows with current scan.
 *
 * Rules (default):
 * - New rows: use deriveDefaultInclusion.
 * - Existing rows where devStatus changed: Figma wins — use new devStatus's
 *   implied check state (READY_FOR_DEV → checked, NONE → unchecked).
 * - Existing rows where devStatus unchanged: preserve prior checkbox.
 * - Removed rows: dropped.
 *
 * `--keep-checks`: prior checkbox always wins for existing rows; devStatus
 * column still updates. New rows still use deriveDefaultInclusion.
 */
export function mergeRows(
  current: ComponentInfo[],
  prior: ManifestRowV2[],
  defaults: Map<string, boolean>,
  keepChecks: boolean
): { rows: ManifestRowV2[]; stats: MergeStats } {
  const priorById = new Map(prior.map(r => [r.id, r]));
  const stats: MergeStats = { added: 0, removed: 0, flippedByFigma: 0, preserved: 0 };

  const rows: ManifestRowV2[] = current.map(c => {
    const prev = priorById.get(c.id);
    if (!prev) {
      stats.added++;
      return {
        id: c.id,
        name: c.name,
        type: c.type as 'COMPONENT' | 'COMPONENT_SET',
        included: defaults.get(c.id) ?? false,
        devStatus: c.devStatus
      };
    }

    let included: boolean;
    if (keepChecks) {
      included = prev.included;
      stats.preserved++;
    } else if (prev.devStatus !== c.devStatus) {
      included = c.devStatus === 'READY_FOR_DEV';
      stats.flippedByFigma++;
    } else {
      included = prev.included;
      stats.preserved++;
    }

    return {
      id: c.id,
      name: c.name,
      type: c.type as 'COMPONENT' | 'COMPONENT_SET',
      included,
      devStatus: c.devStatus
    };
  });

  const currentIds = new Set(current.map(c => c.id));
  for (const prev of prior) {
    if (!currentIds.has(prev.id)) stats.removed++;
  }

  return { rows, stats };
}

function readPriorManifest(outputPath: string): ManifestRowV2[] | null {
  if (!fs.existsSync(outputPath)) return null;
  const content = fs.readFileSync(outputPath, 'utf-8');

  // ⬇️ ManifestMigrationV1ToV2 — DELETE WITH ManifestParser.ts when v1 is retired.
  if (isV1Manifest(content)) {
    return migrateV1ToV2(content);
  }

  if (ManifestParserV2.isV2(content)) {
    const { components, warnings } = ManifestParserV2.parse(content);
    for (const warning of warnings) console.warn(`⚠ ${warning}`);
    return components;
  }
  return null;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

/**
 * Partition components by the glyph naming convention. When the pattern is falsy, all
 * components stay in the components list and glyphs is empty.
 */
export function partitionByGlyphPattern(
  components: ComponentInfo[],
  glyphPattern: string | undefined
): { components: ComponentInfo[]; glyphs: ComponentInfo[] } {
  if (!glyphPattern) return { components, glyphs: [] };
  const comps: ComponentInfo[] = [];
  const glyphs: ComponentInfo[] = [];
  for (const c of components) {
    if (glyphPatternMatch(c.name, glyphPattern)) {
      glyphs.push(c);
    } else {
      comps.push(c);
    }
  }
  return { components: comps, glyphs };
}

function generateManifestV2(
  rows: ManifestRowV2[],
  glyphs: ComponentInfo[],
  sourceFile: string,
  fileLastModified: string | undefined,
  variablesFile?: string
): string {
  const lines: string[] = [];
  lines.push('# Component Manifest');
  lines.push('');
  lines.push(`**Scan format version:** ${SCAN_FORMAT_VERSION}  `);
  lines.push(`**Generated:** ${new Date().toISOString()}  `);
  lines.push(`**File:** ${sourceFile}`);
  if (variablesFile) lines.push(`**Variables:** ${variablesFile}`);
  if (fileLastModified) lines.push(`**File last modified:** ${fileLastModified}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Components');
  lines.push('');
  lines.push('| ✓ | Name | ID | Type | Dev Status |');
  lines.push('|------|------|------|------|------------|');
  for (const row of rows) {
    const checkbox = row.included ? '[x]' : '[ ]';
    lines.push(
      `| ${checkbox} | ${escapeCell(row.name)} | ${row.id} | ${row.type} | ${row.devStatus} |`
    );
  }

  if (glyphs.length > 0) {
    lines.push('');
    lines.push('## Glyphs');
    lines.push('');
    lines.push('_Detected via `conventions.figma.glyphs.match`. Excluded from `specs generate`._');
    lines.push('');
    lines.push('| Name | ID | Type |');
    lines.push('|------|------|------|');
    for (const g of glyphs) {
      lines.push(`| ${escapeCell(g.name)} | ${g.id} | ${g.type} |`);
    }
  }

  return lines.join('\n') + '\n';
}

export const Scan = new Command('scan')
  .description('Scan Figma file and generate component manifest for curation')
  .argument('[file]', 'Path to Figma JSON file (default: resolved from a configured source in the workspace settings)')
  .option('--source <alias>', 'Configured source alias to scan (required when multiple sources exist)')
  .option('-o, --output <path>', 'Output manifest file path (default: {data.directory}/{alias}.manifest.md)')
  .option('--data-dir <dir>', 'Override data directory for default manifest output path')
  .option('--config <path>', 'Path to a config/ directory or legacy specs.config.yaml')
  .option('--include-all', 'Include all components (overrides devStatus and heuristics)', false)
  .option('--keep-checks', 'Preserve prior checkbox state for existing rows; ignore devStatus changes', false)
  .option('--reset-checks', 'Ignore prior manifest and re-derive checks from devStatus / heuristics', false)
  .option('-v, --variables <path>', 'Variables file path (for reference in manifest)')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (fileArg: string | undefined, options: ScanOptions) => {
    try {
      if (options.keepChecks && options.resetChecks) {
        console.error('Error: --keep-checks and --reset-checks are mutually exclusive');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const config = new ConfigLoader().load(options.config);
      const configDir = config.configDir ?? process.cwd();
      const dataDir = options.dataDir || config.settings.data?.directory;
      const resolvedDir = path.resolve(configDir, dataDir || '.');

      let file: string;
      if (fileArg) {
        if (options.source) {
          console.error('Error: Pass either a <file> argument or --source, not both');
          process.exit(ERROR_CODES.INVALID_ARGS);
        }
        file = fileArg;
      } else {
        const fileSources = Object.entries(config.settings.data?.sources ?? {}).filter(
          ([, entry]) => Array.isArray(entry.fetch) && entry.fetch.includes('file')
        );

        if (fileSources.length === 0) {
          console.error('Error: No <file> argument provided and no sources configured in the workspace settings');
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

      if (!options.output) {
        const baseName = path.basename(file, '.file.json');
        options.output = path.join(resolvedDir, `${baseName}.manifest.md`);
      }

      if (options.verbose) {
        console.error(`[CLI] Scanning file: ${file}`);
      }

      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        if (!fileArg) {
          console.error('Tip: run `specs fetch` to download source data');
        }
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      const discovery = await ComponentDiscovery.fromFile(file);

      if (options.verbose) {
        console.error(`[CLI] File loaded: ${discovery.getFileName()}`);
      }

      const componentInfoList = discovery.findAllComponents();

      if (componentInfoList.length === 0) {
        console.error('Warning: No components found in file');
      }

      if (options.verbose) {
        const readyCount = componentInfoList.filter(c => c.devStatus === 'READY_FOR_DEV').length;
        console.error(`[CLI] Found ${componentInfoList.length} top-level components (${readyCount} READY_FOR_DEV)`);
      }

      // Sort by name for stable diffs
      componentInfoList.sort((a, b) => a.name.localeCompare(b.name));

      const glyphPattern = figmaOf(config.conventions).glyphs?.match;
      const { components: componentList, glyphs: glyphList } = partitionByGlyphPattern(
        componentInfoList,
        glyphPattern
      );

      if (options.verbose && glyphPattern) {
        console.error(`[CLI] Glyph pattern "${glyphPattern}" matched ${glyphList.length} components`);
      }

      const outputPath = path.resolve(options.output!);
      const prior = options.resetChecks ? null : readPriorManifest(outputPath);
      const defaults = deriveDefaultInclusion(componentList, options.includeAll);

      let rows: ManifestRowV2[];
      let stats: MergeStats | null = null;
      if (prior && !options.includeAll) {
        const merged = mergeRows(componentList, prior, defaults, options.keepChecks);
        rows = merged.rows;
        stats = merged.stats;
      } else {
        rows = componentList.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type as 'COMPONENT' | 'COMPONENT_SET',
          included: defaults.get(c.id) ?? false,
          devStatus: c.devStatus as DevStatus
        }));
      }

      const manifest = generateManifestV2(
        rows,
        glyphList,
        path.resolve(file),
        discovery.getFileLastModified(),
        options.variables ? path.resolve(options.variables) : undefined
      );

      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, manifest, 'utf-8');

      const includedCount = rows.filter(r => r.included).length;
      const excludedCount = rows.length - includedCount;

      console.log(`✓ Scanned ${path.basename(file)}`);
      console.log(`✓ Found ${rows.length} components (${includedCount} selected, ${excludedCount} excluded)`);
      if (glyphList.length > 0) {
        console.log(`✓ Detected ${glyphList.length} glyphs (excluded from generate)`);
      }
      if (stats) {
        const parts: string[] = [];
        if (stats.added) parts.push(`${stats.added} added`);
        if (stats.removed) parts.push(`${stats.removed} removed`);
        if (stats.flippedByFigma) parts.push(`${stats.flippedByFigma} updated by devStatus`);
        if (stats.preserved) parts.push(`${stats.preserved} preserved`);
        if (parts.length) console.log(`  Merge: ${parts.join(', ')}`);
      }
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
