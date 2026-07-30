/**
 * Render Command - Stub pointer to the figma-from-specs render bridge client
 *
 * Purpose:
 * - Give the fetch → scan → generate → render demo flow a single, consistent
 *   `specs render` entry point while the bridge client lives in
 *   specs-from-figma's src-figma-writer/bridge/write.js (see project-011
 *   notes: promotes into specs-cli + MCP tools later).
 * - This command only works against a local specs-from-figma checkout on
 *   feat/figma-writer (linked via file:/workspace symlink) — it resolves
 *   src-figma-writer/bridge/write.js relative to the resolved package root,
 *   which does not exist in a published npm install.
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigLoader } from '../Config/ConfigLoader.js';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  NOT_AVAILABLE: 7
};

function resolveBridgeScript(): string {
  // package "exports" only exposes "." (dist/index.js), not package.json,
  // so resolve the entry point and walk up to the package root.
  const entryUrl = import.meta.resolve('@directededges/specs-from-figma');
  const entryPath = fileURLToPath(entryUrl);
  const repoRoot = path.dirname(path.dirname(entryPath)); // strip dist/index.js
  return path.join(repoRoot, 'src-figma-writer', 'bridge', 'write.js'); // bridge client script name unchanged
}

// Resolve default alias the same way Generate/Scan do: `library` if it
// declares `data: [file]`, else the first source that does.
function resolveDefaultAlias(sources: Record<string, { data?: string[] }>): string | null {
  if (sources.library && Array.isArray(sources.library.data) && sources.library.data.includes('file')) return 'library';
  const candidate = Object.entries(sources).find(([, s]) => Array.isArray(s.data) && s.data.includes('file'));
  return candidate ? candidate[0] : null;
}

export const Render = new Command('render')
  .description('Render a spec (or manifest) into Figma via the figma-from-specs bridge [demo stub]')
  .argument('[specPath]', 'Path to a spec YAML file (default: {dataDirectory}/{alias}.render-manifest.md from config)')
  .option('-m, --manifest <path>', 'Path to a render-manifest.md file')
  .option('--config <path>', 'Path to config file (specs.config.yaml)')
  .option('--no-return-spec', 'Skip round-trip spec read after rendering in Figma')
  .action(async (specPath: string | undefined, options: { manifest?: string; config?: string; returnSpec: boolean; verbose?: boolean }) => {
    const bridgeScript = resolveBridgeScript();

    if (!fs.existsSync(bridgeScript)) {
      console.error('Error: figma-from-specs render bridge not found.');
      console.error(`  Expected: ${bridgeScript}`);
      console.error('  This command only works against a local specs-from-figma checkout on feat/figma-writer.');
      process.exit(ERROR_CODES.NOT_AVAILABLE);
    }

    let manifestPath = options.manifest;

    if (!specPath && !manifestPath) {
      const configLoader = new ConfigLoader();
      const config = configLoader.load(options.config);
      const dataDir = config.dataDirectory ? path.resolve(config.dataDirectory) : path.join(process.cwd(), 'data');
      const defaultAlias = resolveDefaultAlias(config.sources || {});

      if (!defaultAlias) {
        console.error('Error: provide a spec path or --manifest <path>.');
        console.error('Tip: no default could be resolved — configure a source with `data: [file]` in specs.config.yaml.');
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const defaultManifest = path.join(dataDir, `${defaultAlias}.render-manifest.md`);
      if (!fs.existsSync(defaultManifest)) {
        console.error(`Error: provide a spec path or --manifest <path>.`);
        console.error(`Tip: no default render manifest found at ${defaultManifest}`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      manifestPath = defaultManifest;
      console.log(`Using default render manifest: ${path.relative(process.cwd(), manifestPath)}`);
    }

    const args: string[] = [];
    if (manifestPath) options.manifest = manifestPath;
    if (options.manifest) {
      args.push('--manifest', path.resolve(options.manifest));
    } else if (specPath) {
      args.push(path.resolve(specPath));
    }
    if (!options.returnSpec) {
      args.push('--no-return-spec');
    }

    const child = spawn('node', [bridgeScript, ...args], { stdio: 'inherit' });

    child.on('exit', (code) => {
      process.exit(code ?? ERROR_CODES.GENERAL_ERROR);
    });

    child.on('error', (error) => {
      console.error(`Error: ${error.message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    });
  });
