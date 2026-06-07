/**
 * Specs CLI - Command registry and entry helpers
 */

import './figma-shim.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env from cwd if present (no external dependency needed)
try {
  const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* no .env file, that's fine */ }

import { Command } from 'commander';
import { Generate } from './commands/GenerateCommand.js';
import { Scan } from './commands/ScanCommand.js';
import { Fetch } from './commands/FetchCommand.js';
import { Init } from './commands/InitCommand.js';
import { Analyze } from './commands/AnalyzeCommand.js';
import { ApplyCustomTokens } from './commands/ApplyCustomTokensCommand.js';
import { Transform } from './commands/TransformCommand.js';

declare const __SPECS_CLI_VERSION__;

// Backward compatibility: export Scan also as Audit
export const Audit = Scan;

export { Generate, Scan, Fetch, Init, ApplyCustomTokens, Transform, Analyze };

export const commands = {
  Init,
  Generate,
  Scan,
  Fetch,
  ApplyCustomTokens,
  Transform,
  Analyze,
};

export function createProgram(): Command {
  const program = new Command();

  program
    .name('specs')
    .description('Generate component specifications from Figma REST API data')
    .version(__SPECS_CLI_VERSION__);

  program.addCommand(Init);
  program.addCommand(Generate);
  program.addCommand(Scan);
  program.addCommand(Fetch);
  program.addCommand(ApplyCustomTokens);
  program.addCommand(Transform);
  program.addCommand(Analyze);

  // Deprecated alias: 'audit' → 'scan'
  const auditAlias = new Command('audit')
    .description('(deprecated: use "scan") Scan Figma file and generate component manifest')
    .argument('<file>', 'Path to Figma JSON file')
    .allowUnknownOption(true)
    .action((_file: string, _options: unknown, cmd: Command) => {
      console.error('Warning: "specs audit" is deprecated, use "specs scan" instead');
      // Re-parse with scan command
      const args = process.argv.slice(2);
      args[args.indexOf('audit')] = 'scan';
      const prog = createProgram();
      prog.parse(['node', 'specs', ...args]);
    });
  auditAlias.helpOption(false);
  program.addCommand(auditAlias);

  return program;
}

export function runCli(argv: string[] = process.argv): void {
  const program = createProgram();
  program.parse(argv);
}
