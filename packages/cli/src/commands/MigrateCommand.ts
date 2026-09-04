/**
 * Migrate Command
 *
 * Runs a named, versioned migration over a workspace. Migrations are registered
 * per subject and source version so this command never becomes synonymous with
 * whichever migration happened to be first.
 *
 * Migrations write to the workspace, which is why they are a command a person
 * runs deliberately rather than something a loader does on their behalf: config
 * loading happens inside read-only commands and in CI, and a read path must not
 * mutate a checkout.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { migrateConfigV1 } from '../Config/migrations/configV1.js';
const ERROR_CODES = {
  INVALID_ARGS: 2,
};

interface MigrationResult {
  /** Files written, relative to the workspace root. */
  written: string[];
  /** The source file, renamed so discovery no longer finds it. */
  renamed?: { from: string; to: string };
}

interface Migration {
  subject: string;
  from: string;
  to: string;
  summary: string;
  /** Detect whether this migration applies in `dir`, returning the source path. */
  detect(dir: string, source?: string): string | null;
  /** Refuse with a reason, or return null when the migration can proceed. */
  blocked(dir: string): string | null;
  run(dir: string, source: string, dryRun: boolean): MigrationResult;
}

const CONFIG_V1_SOURCES = ['specs.config.yaml', 'specs.config.json'];

const configV1: Migration = {
  subject: 'config',
  from: 'v1',
  to: 'v2',
  summary: 'single specs.config.yaml → config/{conventions,settings,pipeline}.yaml (ADR-071)',

  detect(dir, source) {
    // An explicit source lets a workspace convert a file that discovery would
    // not find — a custom name, or one passed to another command via --config.
    if (source) {
      const explicit = path.isAbsolute(source) ? source : path.join(dir, source);
      return fs.existsSync(explicit) ? explicit : null;
    }
    for (const name of CONFIG_V1_SOURCES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  },

  blocked(dir) {
    const configDir = path.join(dir, 'config');
    if (!fs.existsSync(configDir)) return null;
    const present = ['conventions', 'settings', 'pipeline']
      .flatMap(base => ['yaml', 'json'].map(ext => `${base}.${ext}`))
      .filter(file => fs.existsSync(path.join(configDir, file)));
    if (present.length === 0) return null;
    return `config/ already contains ${present.join(', ')} — migrating would overwrite authored files. Move or delete them first.`;
  },

  run(dir, source, dryRun) {
    const raw = fs.readFileSync(source, 'utf-8');
    const parsed = source.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw);
    const migrated = migrateConfigV1(parsed);

    const files: Record<string, unknown> = {
      'config/conventions.yaml': migrated.conventions,
      'config/settings.yaml': migrated.settings,
      'config/pipeline.yaml': migrated.pipeline,
    };

    const written: string[] = [];
    for (const [rel, value] of Object.entries(files)) {
      if (value === undefined) continue; // nothing of that kind was configured
      written.push(rel);
      if (dryRun) continue;
      const target = path.join(dir, rel);
      fs.ensureDirSync(path.dirname(target));
      fs.writeFileSync(target, yaml.stringify(value), 'utf-8');
    }

    // Rename rather than delete: the original is the only record of what the
    // workspace declared, and discovery must stop finding it or every command
    // keeps refusing.
    const renamedTo = `${path.basename(source)}.migrated`;
    if (!dryRun) fs.renameSync(source, path.join(dir, renamedTo));

    return { written, renamed: { from: path.basename(source), to: renamedTo } };
  },
};

const MIGRATIONS: Migration[] = [configV1];

export const Migrate = new Command('migrate')
  .description('Run a versioned migration over this workspace')
  .argument('[subject]', 'What to migrate (e.g. config)')
  .option('--from <version>', 'Source version to migrate from (default: the detected one)')
  .option('--source <path>', 'Convert this file instead of the one discovery finds')
  .option('--dry-run', 'Report what would change without writing')
  .option('--list', 'List available migrations')
  .action((subject: string | undefined, options: { from?: string; source?: string; dryRun?: boolean; list?: boolean }) => {
    if (options.list || !subject) {
      console.log('Available migrations:\n');
      for (const m of MIGRATIONS) {
        console.log(`  specs migrate ${m.subject} --from ${m.from}`);
        console.log(`      ${m.from} → ${m.to}: ${m.summary}\n`);
      }
      if (!subject) process.exit(ERROR_CODES.INVALID_ARGS);
      return;
    }

    const candidates = MIGRATIONS.filter(m => m.subject === subject);
    if (candidates.length === 0) {
      console.error(`Error: no migrations registered for '${subject}'. Run \`specs migrate --list\`.`);
      process.exit(ERROR_CODES.INVALID_ARGS);
    }

    const migration = options.from
      ? candidates.find(m => m.from === options.from)
      : candidates.find(m => m.detect(process.cwd(), options.source) !== null) ?? candidates[0];

    if (!migration) {
      console.error(`Error: no '${subject}' migration from '${options.from}'. Run \`specs migrate --list\`.`);
      process.exit(ERROR_CODES.INVALID_ARGS);
    }

    const dir = process.cwd();
    const source = migration.detect(dir, options.source);
    if (!source) {
      console.log(
        options.source
          ? `Nothing to migrate — ${options.source} does not exist.`
          : `Nothing to migrate — no ${migration.from} ${migration.subject} found in this directory.`
      );
      return;
    }

    const blocked = migration.blocked(dir);
    if (blocked) {
      console.error(`Error: ${blocked}`);
      process.exit(ERROR_CODES.INVALID_ARGS);
    }

    const result = migration.run(dir, source, !!options.dryRun);
    const verb = options.dryRun ? 'Would write' : 'Wrote';

    console.log(`${migration.subject} ${migration.from} → ${migration.to}`);
    for (const file of result.written) console.log(`  ${verb}: ${file}`);
    if (result.renamed) {
      console.log(
        options.dryRun
          ? `  Would rename: ${result.renamed.from} → ${result.renamed.to}`
          : `  Renamed: ${result.renamed.from} → ${result.renamed.to}  (safe to delete once you have reviewed the new files)`
      );
    }
    if (!options.dryRun) console.log('\nReview the generated files before committing.');
  });
