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

type FetchKind = 'file' | 'variables' | 'styles' | 'icons';

type MinimalConfig = {
  dataDirectory?: string;
  sourceDirectory?: string; // deprecated alias
  sources?: Record<string, { key: string; data: FetchKind[] }>;
  config?: { processing?: { glyphNamePattern?: string } };
};

/**
 * Walk the file document for COMPONENT nodes whose name matches the
 * glyphNamePattern ("DS Icon asset / {i}" — {i} captures the icon name).
 * Duplicate slugs keep the first occurrence and suffix later ones with the
 * node id so nothing is silently dropped.
 */
export function collectGlyphComponents(document: unknown, pattern: string): Array<{ id: string; name: string; slug: string }> {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{i\\\}/g, '(.+)');
  const regex = new RegExp(`^${escaped}$`);
  const found: Array<{ id: string; name: string; slug: string }> = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { id?: string; name?: string; type?: string; children?: unknown[] };
    if (n.type === 'COMPONENT' && typeof n.name === 'string' && typeof n.id === 'string') {
      const match = n.name.match(regex);
      if (match) found.push({ id: n.id, name: match[1] ?? n.name, slug: '' });
    }
    for (const child of n.children ?? []) walk(child);
  };
  walk(document);

  const seen = new Set<string>();
  for (const glyph of found) {
    const base = glyph.name.trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').toLowerCase();
    glyph.slug = seen.has(base) ? `${base}-${glyph.id.replace(':', '-')}` : base;
    seen.add(base);
  }
  return found;
}

async function streamToString(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return '';
  const chunks: Buffer[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

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

async function figmaFetch(url: string, token: string): Promise<{ status: number; body: string; headers: Headers; stream: ReadableStream<Uint8Array> | null }> {
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token
    }
  });

  if (response.status !== 200) {
    const body = await response.text();
    return { status: response.status, body, headers: response.headers, stream: null };
  }

  return { status: response.status, body: '', headers: response.headers, stream: response.body };
}

const RATE_LIMIT_TYPE_LABELS: Record<string, string> = {
  low: 'Viewer / Collab (low)',
  high: 'Dev / Full (high)'
};

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return `${totalSeconds}s`;

  const units: Array<[string, number]> = [
    ['month', 30 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1]
  ];

  for (const [unit, divisor] of units) {
    if (totalSeconds >= divisor) {
      const value = Math.round(totalSeconds / divisor);
      return `${value} ${unit}${value !== 1 ? 's' : ''}`;
    }
  }

  return '0 seconds';
}

export function formatRateLimitError(alias: string, kind: string, headers: Headers): string {
  const lines = [`Error: Rate limited (429) while fetching ${alias}.${kind}`];

  const retryAfter = headers.get('retry-after');
  if (retryAfter) lines.push(`  Retry after: ${formatDuration(Number(retryAfter))}`);

  const limitType = headers.get('x-figma-rate-limit-type');
  if (limitType) {
    const label = RATE_LIMIT_TYPE_LABELS[limitType] ?? limitType;
    lines.push(`  Seat tier: ${label}`);
  }

  const planTier = headers.get('x-figma-plan-tier');
  if (planTier) {
    lines.push(`  Plan: ${planTier.charAt(0).toUpperCase()}${planTier.slice(1)}`);
  }

  lines.push('  See: https://developers.figma.com/docs/rest-api/rate-limits/');

  return lines.join('\n');
}

function classifyHttpStatus(status: number): 'ok' | 'auth' | 'rate' | 'error' {
  if (status === 200) return 'ok';
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  return 'error';
}

function configReference(configPath: string | null): string {
  return configPath || 'specs.config.yaml';
}

export function formatNotFoundError(alias: string, kind: string, configPath: string | null): string {
  return [
    `Error: File not found (404) while fetching ${alias}.${kind}`,
    `  Figma returned 404 for the file key configured for "${alias}".`,
    '  This usually means the key in your config is stale or out of reach:',
    '    • The file was moved, deleted, or recreated (keys change on duplicate/recreate)',
    '    • Your FIGMA_TOKEN account cannot open this file',
    `  Check: sources.${alias}.key in ${configReference(configPath)}`
  ].join('\n');
}

export function formatAuthError(status: number, alias: string, kind: string, configPath: string | null, key?: string): string {
  if (status === 403) {
    const keyHint = key ? `  File key: ${key}` : '';
    return [
      `Error: Access denied (403) while fetching ${alias}.${kind}`,
      '  Your FIGMA_TOKEN is valid but cannot access this file.',
      `    • Confirm your Figma account can open the file for sources.${alias}.key`,
      '    • Personal access tokens only reach files your account can view',
      '    • If your org enforces SAML/SSO, personal access tokens are blocked',
      '      Use an OAuth token or ask your admin to allow PATs',
      '      See: https://www.figma.com/developers/api#oauth2',
      '    • The file may be in personal drafts or a restricted team (403 = exists but no access)',
      ...(keyHint ? [keyHint] : []),
      `  Check: sources.${alias}.key in ${configReference(configPath)}`
    ].join('\n');
  }

  return [
    `Error: Authentication failed (${status}) while fetching ${alias}.${kind}`,
    '  Your FIGMA_TOKEN is missing, invalid, or expired.',
    '  Add it to a .env file as FIGMA_TOKEN=your_token_here',
    '  Create a new token: https://www.figma.com/developers/api#access-tokens'
  ].join('\n');
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

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function startSpinner(text: string): () => string {
  const start = Date.now();
  if (!isInteractive()) {
    console.log(text);
    return () => formatElapsed(Date.now() - start);
  }
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    const elapsed = formatElapsed(Date.now() - start);
    renderInlineStatus(`${frames[i++ % frames.length]} ${text} (${elapsed})`);
  }, 80);
  return () => {
    clearInterval(id);
    clearInlineStatus();
    return formatElapsed(Date.now() - start);
  };
}

export interface FetchOptions {
  config?: string;
  dataDir?: string;
  outDir?: string; // deprecated alias for --data-dir
  only?: string;
  geometry: boolean;
  verbose: boolean;
}

export const Fetch = new Command('fetch')
  .description('Fetch raw REST payloads (file, variables, styles) for configured Figma files')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--data-dir <dir>', 'Override data directory (default: config dataDirectory or ./data)')
  .option('--outDir <dir>', 'Deprecated: use --data-dir')
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

      if (options.outDir && !options.dataDir) {
        console.error('Warning: --outDir is deprecated, use --data-dir instead');
      }
      const outDirValue = options.dataDir || options.outDir || config.dataDirectory || config.sourceDirectory || 'data';
      const outDir = path.resolve(configDir, outDirValue);

      const fileEntries = normalizeSources(config.sources);
      if (fileEntries.length === 0) {
        console.error('Error: No sources configured');
        console.error('Add to specs.config.yaml:');
        console.error('  dataDirectory: data');
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
        for (const kind of entry.fetch.filter(k => k !== 'icons')) {
          const url =
            kind === 'file'
              ? `https://api.figma.com/v1/files/${entry.key}${options.geometry ? '?geometry=paths' : ''}`
              : kind === 'variables'
                ? `https://api.figma.com/v1/files/${entry.key}/variables/local`
                : `https://api.figma.com/v1/files/${entry.key}/styles`;

          if (options.verbose) {
            console.log(`[CLI] GET ${kind}: ${url}`);
          }

          const stopSpinner = startSpinner(`Downloading: ${entry.alias} ${kind}`);

          const result = await figmaFetch(url, token);
          const { status, body, headers, stream } = result;
          const elapsed = stopSpinner();

          const classification = classifyHttpStatus(status);

          if (classification === 'auth') {
            console.error(formatAuthError(status, entry.alias, kind, configPath, options.verbose ? entry.key : undefined));
            process.exit(ERROR_CODES.AUTH_ERROR);
          }

          if (classification === 'rate') {
            console.error(formatRateLimitError(entry.alias, kind, headers));
            process.exit(ERROR_CODES.RATE_LIMIT);
          }

          if (classification === 'error') {
            if (status === 404) {
              console.error(formatNotFoundError(entry.alias, kind, configPath));
            } else {
              console.error(`Error: HTTP ${status} while fetching ${entry.alias}.${kind}`);
            }
            process.exit(ERROR_CODES.NETWORK_ERROR);
          }

          const outputPath = path.join(outDir, `${entry.alias}.${kind}.json`);
          if (stream) {
            const tmpPath = `${outputPath}.tmp`;
            try {
              const writeStream = fs.createWriteStream(tmpPath);
              await new Promise<void>((resolve, reject) => {
                const reader = stream.getReader();
                const pump = () =>
                  reader.read().then(({ done, value }) => {
                    if (done) { writeStream.end(); return; }
                    writeStream.write(value, (err) => { if (err) reject(err); else pump(); });
                  }).catch(reject);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                pump();
              });
              await fs.rename(tmpPath, outputPath);
            } catch (err) {
              await fs.remove(tmpPath).catch(() => {});
              throw err;
            }
          } else {
            await fs.writeFile(outputPath, body, 'utf-8');
          }

          console.log(`✓ Downloaded: ${entry.alias} ${kind} (${elapsed})`);

          if (options.verbose) {
            const relativeOut = path.relative(process.cwd(), outputPath);
            console.log(`[CLI] Wrote: ${relativeOut}`);
          }
        }

        // Icons run after the other kinds: glyph components are derived from
        // the saved file payload, so `file` must be present (fetched this run
        // or a previous one) before icons can resolve.
        if (entry.fetch.includes('icons')) {
          const pattern = config.config?.processing?.glyphNamePattern;
          if (!pattern) {
            console.error(`Error: sources.${entry.alias}.data includes "icons" but config.processing.glyphNamePattern is not set`);
            process.exit(ERROR_CODES.INVALID_ARGS);
          }
          const filePath = path.join(outDir, `${entry.alias}.file.json`);
          if (!fs.existsSync(filePath)) {
            console.error(`Error: icons require the file payload — fetch "file" for ${entry.alias} first (${filePath} not found)`);
            process.exit(ERROR_CODES.FILE_ERROR);
          }

          const stopSpinner = startSpinner(`Downloading: ${entry.alias} icons`);
          const fileJson = JSON.parse(await fs.readFile(filePath, 'utf-8')) as { document?: unknown };
          const glyphs = collectGlyphComponents(fileJson.document, pattern);
          const iconsDir = path.join(outDir, 'icons');
          await fs.ensureDir(iconsDir);

          let downloaded = 0;
          const CHUNK = 50;
          for (let i = 0; i < glyphs.length; i += CHUNK) {
            const chunk = glyphs.slice(i, i + CHUNK);
            const ids = chunk.map(g => g.id).join(',');
            const url = `https://api.figma.com/v1/images/${entry.key}?ids=${encodeURIComponent(ids)}&format=svg`;
            const result = await figmaFetch(url, token);
            if (result.status !== 200) {
              stopSpinner();
              const classification = classifyHttpStatus(result.status);
              if (classification === 'auth') {
                console.error(formatAuthError(result.status, entry.alias, 'icons', configPath));
                process.exit(ERROR_CODES.AUTH_ERROR);
              }
              if (classification === 'rate') {
                console.error(formatRateLimitError(entry.alias, 'icons', result.headers));
                process.exit(ERROR_CODES.RATE_LIMIT);
              }
              console.error(`Error: HTTP ${result.status} while exporting ${entry.alias} icons`);
              process.exit(ERROR_CODES.NETWORK_ERROR);
            }
            const payload = JSON.parse(await streamToString(result.stream)) as { err?: string; images: Record<string, string | null> };
            if (payload.err) {
              stopSpinner();
              console.error(`Error: images API error while exporting ${entry.alias} icons: ${payload.err}`);
              process.exit(ERROR_CODES.NETWORK_ERROR);
            }
            for (const glyph of chunk) {
              const imageUrl = payload.images[glyph.id];
              if (!imageUrl) continue;
              const svgRes = await fetch(imageUrl);
              if (!svgRes.ok) continue;
              await fs.writeFile(path.join(iconsDir, `${glyph.slug}.svg`), await svgRes.text(), 'utf-8');
              downloaded++;
            }
          }
          const elapsed = stopSpinner();
          console.log(`✓ Downloaded: ${entry.alias} icons (${downloaded}/${glyphs.length} glyphs, ${elapsed})`);
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
