/**
 * Version Command
 *
 * `specs version …` — spec-workspace versioning: automated semantic versioning
 * of the generated spec payload, with append-only ledgers, version folders
 * under `<workspace>/versions/`, and fully scripted reports and changelogs.
 * Free tier — no license gating.
 *
 * Subcommands: diff · history · bump · restore · premerge · report.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { assemble, resolveWorkspace, slugify, type Workspace } from '../version/assemble.js';
import { commitBump, planBump, tagMessage } from '../version/bump.js';
import {
  buildBumpChangelog,
  buildBumpDataset,
  buildLedgerReport,
  buildPremergeDataset,
} from '../version/datasets.js';
import { diffComponent } from '../version/diff.js';
import { createAnnotatedTag } from '../version/gitInfo.js';
import {
  ledgeredComponents,
  readComponentLedger,
  specPathAtVersion,
} from '../version/ledger.js';
import { loadRenames } from '../version/renames.js';
import { loadRules, type RuleSet } from '../version/rules.js';
import { renderChangelog, renderReport } from '../version/report.js';
import type { ComponentLedger, LedgerOverride } from '../version/types.js';

const ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
};

const fail = (message: string, code: number = ERROR_CODES.GENERAL_ERROR): never => {
  console.error(`Error: ${message}`);
  process.exit(code);
  throw new Error(message); // unreachable; satisfies control flow
};

const normalizeVersion = (v: string): string => v.replace(/^v/, '');

function workspaceOf(options: { workspace?: string }): Workspace {
  try {
    return resolveWorkspace(options.workspace ?? process.cwd());
  } catch (e) {
    return fail((e as Error).message, ERROR_CODES.INVALID_ARGS);
  }
}

function rulesOf(options: { rules?: string }): { ruleSet: RuleSet; label: string } {
  const ruleSet = loadRules(options.rules);
  return { ruleSet, label: options.rules ? `\`${path.resolve(options.rules)}\`` : 'built-in (compiled from semver-rules.md)' };
}

/** Resolve a component argument (folder name, title, or slug) to its ledger. */
function findLedger(versionsDir: string, componentArg: string): { name: string; ledger: ComponentLedger } {
  const direct = readComponentLedger(versionsDir, componentArg);
  if (direct) return { name: componentArg, ledger: direct };
  for (const name of ledgeredComponents(versionsDir)) {
    const ledger = readComponentLedger(versionsDir, name)!;
    if (ledger.component.title === componentArg || slugify(componentArg) === name) return { name, ledger };
  }
  return fail(
    `No ledger for component "${componentArg}" under ${versionsDir} — ` +
    `known: ${ledgeredComponents(versionsDir).join(', ') || 'none (run specs version bump first)'}`,
    ERROR_CODES.INVALID_ARGS,
  );
}

function overrideOf(options: { forceMajor?: string; forceMinor?: string; forcePatch?: string }): LedgerOverride | null {
  const given = [
    options.forceMajor && { class: 'major' as const, reason: options.forceMajor },
    options.forceMinor && { class: 'minor' as const, reason: options.forceMinor },
    options.forcePatch && { class: 'patch' as const, reason: options.forcePatch },
  ].filter(Boolean) as LedgerOverride[];
  if (given.length > 1) fail('Pass at most one of --force-major / --force-minor / --force-patch.', ERROR_CODES.INVALID_ARGS);
  return given[0] ?? null;
}

// ---------------------------------------------------------------- diff

const Diff = new Command('diff')
  .description('Jump comparison: what changed for a component between two versions')
  .argument('<component>', 'Component (spec folder name or title)')
  .requiredOption('--from <version>', 'Base component version (from the ledger)')
  .option('--to <version>', 'Target component version; defaults to the current working spec', 'current')
  .option('--workspace <dir>', 'Workspace directory (contains specs/ and versions/)')
  .option('--rules <path>', 'Override the built-in severity rules with an external YAML file')
  .action((componentArg: string, options: { from: string; to: string; workspace?: string; rules?: string }) => {
    try {
      const workspace = workspaceOf(options);
      const { ruleSet, label } = rulesOf(options);
      const { name, ledger } = findLedger(workspace.versionsDir, componentArg);
      const renames = loadRenames(workspace.versionsDir);

      const from = normalizeVersion(options.from);
      const base = specPathAtVersion(workspace.versionsDir, ledger, name, from);
      const baseComponent = assemble(path.dirname(base.dir), name);

      let currentComponent;
      let toLabel: string;
      if (options.to === 'current') {
        if (!fs.existsSync(path.join(workspace.specsDir, name))) {
          fail(`Component ${name} is not in the current specs/ tree; pass --to <version> instead.`, ERROR_CODES.INVALID_ARGS);
        }
        currentComponent = assemble(workspace.specsDir, name);
        toLabel = 'current';
      } else {
        const to = normalizeVersion(options.to);
        const target = specPathAtVersion(workspace.versionsDir, ledger, name, to);
        currentComponent = assemble(path.dirname(target.dir), name);
        toLabel = `v${to}`;
      }

      const { entries, warnings } = diffComponent(baseComponent, currentComponent, { ruleSet, renames });
      const dataset = {
        title: `Diff — ${ledger.component.title} v${from} → ${toLabel}`,
        date: new Date().toISOString().slice(0, 10),
        target: { label: `${name} v${from}` },
        source: { label: `${name} ${toLabel}` },
        components: [{
          name, title: currentComponent.title, presence: 'changed' as const, entries, warnings,
        }],
        assetEntries: [],
        runEntries: [],
        renames: [],
        provenance: [
          ['Base', `\`versions/${base.entry.libraryVersion}/specs/${name}\` (component v${from})`],
          ['Target', toLabel === 'current' ? '`specs/` (the live working tree)' : `the versions/ folder for component ${toLabel}`],
          ['Severity rules', label],
        ] as Array<[string, string]>,
      };
      console.log(renderReport(dataset));
    } catch (e) {
      fail((e as Error).message);
    }
  });

// ---------------------------------------------------------------- history

const History = new Command('history')
  .description('Layered replay listing: every ledgered version of a component')
  .argument('<component>', 'Component (spec folder name or title)')
  .argument('[range]', 'Version range, e.g. 1.0.0..2.0.0 (inclusive)')
  .option('--workspace <dir>', 'Workspace directory (contains specs/ and versions/)')
  .action((componentArg: string, range: string | undefined, options: { workspace?: string }) => {
    try {
      const workspace = workspaceOf(options);
      const { ledger } = findLedger(workspace.versionsDir, componentArg);

      let from: string | undefined;
      let to: string | undefined;
      if (range) {
        const match = range.match(/^(.+?)\.\.(.+)$/);
        if (!match) fail(`Range must look like 1.0.0..2.0.0 (got "${range}")`, ERROR_CODES.INVALID_ARGS);
        from = normalizeVersion(match![1]);
        to = normalizeVersion(match![2]);
      }

      const rows = ledger.versions.filter(v =>
        (!from || compare(v.version, from) >= 0) && (!to || compare(v.version, to) <= 0));
      if (rows.length === 0) fail(`No versions${range ? ` in ${range}` : ''} for ${ledger.component.title}.`, ERROR_CODES.INVALID_ARGS);

      console.log(`${ledger.component.title} — ${rows.length} version(s)\n`);
      console.log('| Version | Library | Date | Change | Reason |');
      console.log('|---|---|---|---|---|');
      for (const v of rows) {
        const overrideNote = v.override ? ` (override: ${v.override.class} — ${v.override.reason})` : '';
        console.log(`| ${v.version} | ${v.libraryVersion} | ${v.timestamp.slice(0, 10)} | ${v.changeType} | ${v.reason}${overrideNote} |`);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

const compare = (a: string, b: string): number => {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

// ---------------------------------------------------------------- bump

const BumpCmd = new Command('bump')
  .description('Classify the workspace diff since the last version, write ledger entries and a new version folder, and suggest/apply bumps')
  .option('--force-major <reason>', 'Override the computed class to MAJOR (reason required, recorded in the ledger)')
  .option('--force-minor <reason>', 'Override the computed class to MINOR (reason required, recorded in the ledger)')
  .option('--force-patch <reason>', 'Override the computed class to PATCH (reason required, recorded in the ledger)')
  .option('--tag', 'Create the annotated library git tag v<version> (never pushed)')
  .option('--workspace <dir>', 'Workspace directory (contains specs/ and versions/)')
  .option('--rules <path>', 'Override the built-in severity rules with an external YAML file')
  .action((options: {
    forceMajor?: string; forceMinor?: string; forcePatch?: string;
    tag?: boolean; workspace?: string; rules?: string;
  }) => {
    try {
      const workspace = workspaceOf(options);
      const { ruleSet, label } = rulesOf(options);
      const override = overrideOf(options);

      const plan = planBump(workspace, ruleSet, override);

      if (plan.fatal.length > 0) {
        for (const message of plan.fatal) console.error(`✗ ${message}`);
        console.error('The bump was not written. Restore the asset or remove the reference; a --force-* override (with reason) records the defect and proceeds.');
        process.exit(ERROR_CODES.GENERAL_ERROR);
      }

      for (const warning of plan.warnings) console.warn(`Warning: ${warning}`);

      if (!plan.initialized && plan.noChanges) {
        console.log(`No changes since v${plan.libraryFrom}. Nothing to bump.`);
        return;
      }

      const dataset = buildBumpDataset(plan, label);
      const reportMd = renderReport(dataset);
      const changelogMd = renderChangelog(buildBumpChangelog(plan));
      commitBump(workspace, plan, { reportMd, changelogMd });

      if (plan.initialized) {
        console.log(`✓ Initialized: ${plan.components.length} components at 1.0.0, library at 1.0.0.`);
      } else {
        const moved = plan.components.filter(c => c.presence !== 'unchanged');
        console.log(`✓ Library ${plan.libraryFrom} → ${plan.libraryVersion} (${plan.libraryBump}${override ? `, forced: ${override.reason}` : ''})`);
        for (const c of moved) {
          console.log(`  ${c.title}: ${c.from ?? 'new'} → ${c.to} (${c.changeType})`);
        }
      }
      console.log(`  versions/${plan.libraryVersion}/ written (report.md, changelog.md, specs/); latest/ refreshed.`);

      if (options.tag) {
        createAnnotatedTag(workspace.root, plan.libraryVersion, tagMessage(plan));
        console.log(`✓ Tagged v${plan.libraryVersion} (annotated, not pushed).`);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

// ---------------------------------------------------------------- restore

const Restore = new Command('restore')
  .description('Reconstruct a component spec at a version — to stdout or --out, never over the live spec')
  .argument('<component>', 'Component (spec folder name or title)')
  .argument('<version>', 'Component version to restore (from the ledger)')
  .option('--out <path>', 'Directory to write the concern files into')
  .option('--workspace <dir>', 'Workspace directory (contains specs/ and versions/)')
  .action((componentArg: string, versionArg: string, options: { out?: string; workspace?: string }) => {
    try {
      const workspace = workspaceOf(options);
      const { name, ledger } = findLedger(workspace.versionsDir, componentArg);
      const version = normalizeVersion(versionArg);
      const { dir, entry } = specPathAtVersion(workspace.versionsDir, ledger, name, version);

      const files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)).sort();
      if (options.out) {
        const out = path.resolve(options.out);
        const live = path.resolve(workspace.specsDir, name);
        if (out === live || out.startsWith(`${live}${path.sep}`)) {
          fail('Refusing to overwrite the live spec in place — pass a different --out directory.', ERROR_CODES.INVALID_ARGS);
        }
        fs.mkdirSync(out, { recursive: true });
        for (const file of files) fs.copyFileSync(path.join(dir, file), path.join(out, file));
        console.log(`✓ ${ledger.component.title} v${version} (from library v${entry.libraryVersion}) → ${out} (${files.join(', ')})`);
      } else {
        for (const file of files) {
          console.log(`# --- ${file} (${name} v${version}, library v${entry.libraryVersion}) ---`);
          console.log(fs.readFileSync(path.join(dir, file), 'utf8'));
        }
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

// ---------------------------------------------------------------- premerge

const Premerge = new Command('premerge')
  .description('Pre-merge report from two spec trees supplied as paths (target ← source)')
  .requiredOption('--base <specs-dir>', 'The merge target\'s spec tree (what is being merged into)')
  .requiredOption('--current <specs-dir>', 'The arriving spec tree (the feature branch)')
  .option('--target-label <label>', 'Label for the base side in the report header')
  .option('--source-label <label>', 'Label for the current side in the report header')
  .option('--out <file>', 'Write the report to a file instead of stdout')
  .option('--rules <path>', 'Override the built-in severity rules with an external YAML file')
  .action((options: {
    base: string; current: string; targetLabel?: string; sourceLabel?: string; out?: string; rules?: string;
  }) => {
    try {
      for (const [flag, dir] of [['--base', options.base], ['--current', options.current]] as const) {
        if (!fs.existsSync(dir)) fail(`${flag} directory does not exist: ${dir}`, ERROR_CODES.INVALID_ARGS);
      }
      const { ruleSet, label } = rulesOf(options);
      const dataset = buildPremergeDataset({
        baseDir: options.base,
        currentDir: options.current,
        ruleSet,
        rulesLabel: label,
        targetLabel: options.targetLabel,
        sourceLabel: options.sourceLabel,
      });
      const report = renderReport(dataset);
      if (options.out) {
        fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
        fs.writeFileSync(options.out, report);
        console.log(`✓ wrote ${options.out}`);
      } else {
        console.log(report);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

// ---------------------------------------------------------------- report

const Report = new Command('report')
  .description('Pre-release report and itemized changelog from ledger diffs since the last release')
  .option('--since <version>', 'Report library versions strictly after this one (default: the previous library version)')
  .option('--out <dir>', 'Write report.md and changelog.md into a directory instead of stdout')
  .option('--workspace <dir>', 'Workspace directory (contains specs/ and versions/)')
  .option('--rules <path>', 'Override the built-in severity rules with an external YAML file')
  .action((options: { since?: string; out?: string; workspace?: string; rules?: string }) => {
    try {
      const workspace = workspaceOf(options);
      const { label } = rulesOf(options);
      const { dataset, releases } = buildLedgerReport({
        versionsDir: workspace.versionsDir,
        ruleSet: loadRules(options.rules),
        rulesLabel: label,
        since: options.since ? normalizeVersion(options.since) : undefined,
      });
      const report = renderReport(dataset);
      const changelog = renderChangelog(releases);
      if (options.out) {
        const out = path.resolve(options.out);
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, 'report.md'), report);
        fs.writeFileSync(path.join(out, 'changelog.md'), changelog);
        console.log(`✓ wrote ${path.join(out, 'report.md')} and ${path.join(out, 'changelog.md')}`);
      } else {
        console.log(report);
        console.log('\n---\n');
        console.log(changelog);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

// ---------------------------------------------------------------- root

export const Version = new Command('version')
  .description('Spec workspace versioning: diffs, semver bumps, ledgers, reports, changelogs')
  .addCommand(Diff)
  .addCommand(History)
  .addCommand(BumpCmd)
  .addCommand(Restore)
  .addCommand(Premerge)
  .addCommand(Report);
