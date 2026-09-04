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
import readline from 'readline';
import { collectGlyphComponents } from '../utilities/glyphComponents.js';
import { startSpinner, clearInlineStatus, renderInlineStatus, isInteractive, formatElapsed } from '../utilities/spinner.js';
import { refreshCache } from '../Cache/Cache.js';
import { reportCache } from './CacheCommand.js';
import { ConfigLoader } from '../Config/ConfigLoader.js';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  FILE_ERROR: 3,
  NETWORK_ERROR: 4,
  AUTH_ERROR: 5,
  RATE_LIMIT: 6
};

import type { SourceEntry } from '@directededges/specs-schema';

type FetchKind = 'file' | 'variables' | 'styles' | 'icons';

export { collectGlyphComponents };

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

const FETCH_KINDS: readonly FetchKind[] = ['file', 'variables', 'styles', 'icons'];

function isFetchKind(value: string): value is FetchKind {
  return (FETCH_KINDS as readonly string[]).includes(value);
}

function splitOnly(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeSources(sources?: Record<string, SourceEntry>): Array<{ alias: string; key: string; fetch: FetchKind[] }> {
  if (!sources) return [];

  return Object.entries(sources).map(([alias, entry]) => ({
    alias,
    key: entry.key,
    fetch: (entry.fetch ?? []).filter(isFetchKind)
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
  return configPath || 'the workspace settings (config/settings.yaml)';
}

export function formatNotFoundError(alias: string, kind: string, configPath: string | null): string {
  return [
    `Error: File not found (404) while fetching ${alias}.${kind}`,
    `  Figma returned 404 for the file key configured for "${alias}".`,
    '  This usually means the key in your config is stale or out of reach:',
    '    • The file was moved, deleted, or recreated (keys change on duplicate/recreate)',
    '    • Your FIGMA_TOKEN account cannot open this file',
    `  Check: data.sources.${alias}.key in ${configReference(configPath)}`
  ].join('\n');
}

export function formatAuthError(status: number, alias: string, kind: string, configPath: string | null, key?: string): string {
  if (status === 403) {
    const keyHint = key ? `  File key: ${key}` : '';
    return [
      `Error: Access denied (403) while fetching ${alias}.${kind}`,
      '  Your FIGMA_TOKEN is valid but cannot access this file.',
      `    • Confirm your Figma account can open the file for data.sources.${alias}.key`,
      '    • Personal access tokens only reach files your account can view',
      '    • If your org enforces SAML/SSO, personal access tokens are blocked',
      '      Use an OAuth token or ask your admin to allow PATs',
      '      See: https://www.figma.com/developers/api#oauth2',
      '    • The file may be in personal drafts or a restricted team (403 = exists but no access)',
      ...(keyHint ? [keyHint] : []),
      `  Check: data.sources.${alias}.key in ${configReference(configPath)}`
    ].join('\n');
  }

  return [
    `Error: Authentication failed (${status}) while fetching ${alias}.${kind}`,
    '  Your FIGMA_TOKEN is missing, invalid, or expired.',
    '  Add it to a .env file as FIGMA_TOKEN=your_token_here',
    '  Create a new token: https://www.figma.com/developers/api#access-tokens'
  ].join('\n');
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
  .option('--config <path>', 'Path to a config/ directory or legacy specs.config.yaml')
  .option('--data-dir <dir>', 'Override data directory (default: data.directory from the workspace settings, or ./data)')
  .option('--outDir <dir>', 'Deprecated: use --data-dir')
  .option('--only <name[,name...]>', 'Fetch only these — a file alias from sources, a data kind (file, variables, styles, icons), or both')
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

      const configPath = options.config ? path.resolve(options.config) : null;
      const config = new ConfigLoader().load(options.config);
      const configDir = config.configDir ?? process.cwd();

      if (options.outDir && !options.dataDir) {
        console.error('Warning: --outDir is deprecated, use --data-dir instead');
      }
      const outDirValue = options.dataDir || options.outDir || config.settings.data?.directory || 'data';
      const outDir = path.resolve(configDir, outDirValue);

      const fileEntries = normalizeSources(config.settings.data?.sources);
      if (fileEntries.length === 0) {
        console.error('Error: No sources configured');
        console.error('Add to config/settings.yaml:');
        console.error('  data:');
        console.error('    directory: data');
        console.error('    sources:');
        console.error('      library:');
        console.error('        key: "<FILE_KEY>"');
        console.error('        fetch: ["file","variables","styles"]');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      // `--only` narrows two independent axes: which source files to fetch, and which kinds
      // of data to fetch for them. A value naming a data kind narrows the kind; anything
      // else is read as a file alias. Both can be given together (`--only library,icons`).
      const onlyValues = splitOnly(options.only);
      const onlyKinds = onlyValues.filter(isFetchKind);
      const onlyAliases = onlyValues.filter(v => !isFetchKind(v));

      // An alias sharing a data kind's name would be silently unreachable, so say so
      // rather than guess which the caller meant.
      const shadowed = fileEntries.map(f => f.alias).filter(isFetchKind);
      if (shadowed.length > 0 && onlyKinds.some(k => shadowed.includes(k))) {
        console.error(`Error: --only "${onlyKinds.filter(k => shadowed.includes(k)).join(', ')}" is both a data kind and a source alias.`);
        console.error('Rename the source alias, or drop --only and let config decide.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      // Every name has to mean something. A typo alongside a valid alias would otherwise
      // fetch more than was asked for and say nothing — the opposite of what --only is for.
      const unmatched = onlyAliases.filter(a => !fileEntries.some(f => f.alias === a));
      if (unmatched.length > 0) {
        console.error(`Error: --only ${unmatched.join(', ')} — not a source alias or a data kind.`);
        console.error(`Aliases: ${fileEntries.map(f => f.alias).join(', ') || '(none)'}`);
        console.error(`Kinds:   ${FETCH_KINDS.join(', ')}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const selected = onlyAliases.length > 0 ? fileEntries.filter(f => onlyAliases.includes(f.alias)) : fileEntries;

      // A kind the caller asked for that no selected source is configured to fetch would
      // otherwise do nothing at all and say nothing about why.
      if (onlyKinds.length > 0) {
        const available = new Set(selected.flatMap(f => f.fetch));
        const unavailable = onlyKinds.filter(k => !available.has(k));
        if (unavailable.length === onlyKinds.length) {
          console.error(`Error: --only ${onlyKinds.join(', ')} — no selected source is configured to fetch ${unavailable.length === 1 ? 'it' : 'them'}.`);
          console.error(`Configured data for ${selected.map(f => `${f.alias}: [${f.fetch.join(', ')}]`).join('; ')}`);
          process.exit(ERROR_CODES.INVALID_ARGS);
        }
      }

      const wants = (kind: FetchKind): boolean => onlyKinds.length === 0 || onlyKinds.includes(kind);

      await fs.ensureDir(outDir);

      if (options.verbose) {
        console.log(`[CLI] Config: ${configPath || '(none)'} (${configDir})`);
        console.log(`[CLI] Output directory: ${outDir}`);
        console.log(`[CLI] Files: ${selected.map(s => s.alias).join(', ')}`);
      }

      for (const entry of selected) {
        for (const kind of entry.fetch.filter(k => k !== 'icons' && wants(k))) {
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
        if (entry.fetch.includes('icons') && wants('icons')) {
          const pattern = config.conventions.figma.glyphs?.match;
          if (!pattern) {
            console.error(`Error: data.sources.${entry.alias}.fetch includes "icons" but conventions.figma.glyphs.match is not set`);
            process.exit(ERROR_CODES.INVALID_ARGS);
          }
          // Icons are consumed by generated component output, so they live in
          // the durable spec workspace (beside _images/), not the data cache.
          const specDirectory = config.settings.spec.directory;
          if (!specDirectory) {
            console.error(`Error: data.sources.${entry.alias}.fetch includes "icons" but spec.directory is not set in the workspace settings`);
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
          const iconsDir = path.join(path.resolve(configDir, specDirectory), '_icons');
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

      // Refresh the render caches from everything now on disk — the sources fetched this
      // run, plus any fetched previously. A source with no payload yet is skipped: not
      // having fetched it is a normal state, and only render treats it as an error.
      const dataDirectory = config.settings.data?.directory;
      if (dataDirectory) {
        const dataDir = path.resolve(configDir, dataDirectory);
        const report = refreshCache({
          dataDir,
          aliases: Object.keys(config.settings.data?.sources ?? {}),
          glyphNamePattern: config.conventions.figma.glyphs?.match,
        });
        reportCache(report);
      }

      console.log('✓ Fetch complete');
      process.exit(ERROR_CODES.SUCCESS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
