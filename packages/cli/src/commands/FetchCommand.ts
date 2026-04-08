/**
 * Fetch Command - Download and store raw Figma REST API payloads
 *
 * Purpose:
 * - Fetch file JSON, variables, and styles for one or more Figma files
 * - Store raw payloads on disk (no transforms)
 * - Enable generate/batch to load and merge in-memory later
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import readline from 'readline';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  FILE_ERROR: 3,
  NETWORK_ERROR: 4,
  AUTH_ERROR: 5,
  RATE_LIMIT: 6
};

type FetchKind = 'file' | 'variables' | 'styles';

type MinimalConfig = {
  sourceDirectory?: string;
  sources?: Record<string, { key: string; data: FetchKind[] }>;
};

function findConfigFile(cwd: string): string | null {
  const locations = [
    path.join(cwd, '.specs.config.yaml'),
    path.join(cwd, '.specs.config.json'),
    path.join(process.env.HOME || '~', '.specs', 'config.yaml')
  ];

  for (const location of locations) {
    if (fs.existsSync(location)) return location;
  }

  return null;
}

function loadConfig(configPath?: string): { configPath: string | null; config: MinimalConfig } {
  const resolvedPath = configPath ? path.resolve(configPath) : findConfigFile(process.cwd());

  if (!resolvedPath) {
    return { configPath: null, config: {} };
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = resolvedPath.endsWith('.json') ? JSON.parse(raw) : (yaml.parse(raw) as unknown);

  return {
    configPath: resolvedPath,
    config: (parsed as MinimalConfig) || {}
  };
}

function splitOnly(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeSources(sources?: MinimalConfig['sources']): Array<{ alias: string; key: string; fetch: FetchKind[] }> {
  if (!sources) return [];

  return Object.entries(sources).map(([alias, entry]) => ({
    alias,
    key: entry.key,
    fetch: entry.data
  }));
}

async function figmaFetch(url: string, token: string): Promise<{ status: number; body: string }> {
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token
    }
  });

  const body = await response.text();
  return { status: response.status, body };
}

function classifyHttpStatus(status: number): 'ok' | 'auth' | 'rate' | 'error' {
  if (status === 200) return 'ok';
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  return 'error';
}

function isInteractive(): boolean {
  return Boolean(process.stdout.isTTY);
}

function renderInlineStatus(text: string): void {
  if (!isInteractive()) {
    console.log(text);
    return;
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(text);
}

function clearInlineStatus(): void {
  if (!isInteractive()) return;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

export interface FetchOptions {
  config?: string;
  outDir?: string;
  only?: string;
  geometry: boolean;
  verbose: boolean;
}

export const Fetch = new Command('fetch')
  .description('Fetch raw REST payloads (file, variables, styles) for configured Figma files')
  .option('--config <path>', 'Path to config file (.specs.config.yaml)')
  .option('--outDir <dir>', 'Override output directory (default: sources.outDir or ./data)')
  .option('--only <alias[,alias...]>', 'Fetch only the given file alias(es) from sources.files')
  .option('--no-geometry', 'Omit geometry data (fillGeometry, strokeGeometry, size, relativeTransform) from file payloads')
  .option('--verbose', 'Enable detailed logging', false)
  .action(async (options: FetchOptions) => {
    try {
      const token = process.env.FIGMA_TOKEN;
      if (!token) {
        console.error('Error: FIGMA_TOKEN environment variable is required');
        console.error('Tip: create a .env file with FIGMA_TOKEN=your_token_here');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const { configPath, config } = loadConfig(options.config);
      const configDir = configPath ? path.dirname(configPath) : process.cwd();

      const outDirValue = options.outDir || config.sourceDirectory || 'data';
      const outDir = path.resolve(configDir, outDirValue);

      const fileEntries = normalizeSources(config.sources);
      if (fileEntries.length === 0) {
        console.error('Error: No sources configured');
        console.error('Add to .specs.config.yaml:');
        console.error('  sourceDirectory: data');
        console.error('  sources:');
        console.error('    library:');
        console.error('      key: "<FILE_KEY>"');
        console.error('      data: ["file","variables","styles"]');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const onlyAliases = splitOnly(options.only);
      const selected = onlyAliases.length > 0 ? fileEntries.filter(f => onlyAliases.includes(f.alias)) : fileEntries;

      if (onlyAliases.length > 0 && selected.length === 0) {
        console.error(`Error: --only did not match any configured aliases: ${onlyAliases.join(', ')}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      await fs.ensureDir(outDir);

      if (options.verbose) {
        console.log(`[CLI] Config: ${configPath || '(none)'} (${configDir})`);
        console.log(`[CLI] Output directory: ${outDir}`);
        console.log(`[CLI] Files: ${selected.map(s => s.alias).join(', ')}`);
      }

      for (const entry of selected) {
        for (const kind of entry.fetch) {
          const url =
            kind === 'file'
              ? `https://api.figma.com/v1/files/${entry.key}${options.geometry ? '?geometry=paths' : ''}`
              : kind === 'variables'
                ? `https://api.figma.com/v1/files/${entry.key}/variables/local`
                : `https://api.figma.com/v1/files/${entry.key}/styles`;

          if (options.verbose) {
            console.log(`[CLI] GET ${kind}: ${url}`);
          }

          renderInlineStatus(`Downloading: ${entry.alias} ${kind}`);

          const { status, body } = await figmaFetch(url, token);
          const classification = classifyHttpStatus(status);

          if (classification === 'auth') {
            console.error(`Error: Auth failed (${status}) while fetching ${entry.alias}.${kind}`);
            process.exit(ERROR_CODES.AUTH_ERROR);
          }

          if (classification === 'rate') {
            console.error(`Error: Rate limited (${status}) while fetching ${entry.alias}.${kind}`);
            process.exit(ERROR_CODES.RATE_LIMIT);
          }

          if (classification === 'error') {
            console.error(`Error: HTTP ${status} while fetching ${entry.alias}.${kind}`);
            process.exit(ERROR_CODES.NETWORK_ERROR);
          }

          const outputPath = path.join(outDir, `${entry.alias}.${kind}.json`);
          await fs.writeFile(outputPath, body, 'utf-8');

          clearInlineStatus();
          console.log(`✓ Downloaded: ${entry.alias} ${kind}`);

          if (options.verbose) {
            const relativeOut = path.relative(process.cwd(), outputPath);
            console.log(`[CLI] Wrote: ${relativeOut}`);
          }
        }
      }

      clearInlineStatus();
      console.log('✓ Fetch complete');
      process.exit(ERROR_CODES.SUCCESS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
