import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import {
  parseBranchUrl,
  resolveRunFolder,
  retryable,
  runFigmaPremerge,
  slugifyBranchName,
  type PremergeSteps,
} from '../../../src/version/figmaPremerge.js';
import { buildPremergeDataset, loadManifest } from '../../../src/version/datasets.js';
import { renderReport, gradeOf } from '../../../src/version/report.js';
import { loadRules } from '../../../src/version/rules.js';
import { makeWorkspace, removeWorkspace, editYaml } from './helpers.js';

const ruleSet = loadRules();
const dirs: string[] = [];

afterEach(() => {
  while (dirs.length) removeWorkspace(dirs.pop()!);
});

function workspace(name: string): string {
  const dir = makeWorkspace(name);
  dirs.push(dir);
  return dir;
}

const BRANCH_URL = 'https://www.figma.com/design/MAINKEY123/My-Library/branch/BRANCHKEY456/My-Library?node-id=1-2';

describe('branch URL parsing (ported from premerge-run.sh)', () => {
  it('reads the main key after /design/ and the branch key after /branch/', () => {
    expect(parseBranchUrl(BRANCH_URL)).toEqual({ mainKey: 'MAINKEY123', branchKey: 'BRANCHKEY456' });
  });

  it('rejects a URL without a /branch/ segment', () => {
    expect(() => parseBranchUrl('https://www.figma.com/design/MAINKEY123/My-Library'))
      .toThrow(/no \/branch\/ segment/);
  });

  it('rejects a URL without a main file key', () => {
    expect(() => parseBranchUrl('https://www.figma.com/branch/BRANCHKEY456'))
      .toThrow(/main file key/);
  });
});

describe('run folder resolution', () => {
  it('names the folder after the branch; reruns of the same branch reuse it; a different branch gets a date suffix', () => {
    const dir = workspace('runfolder');
    const diffs = path.join(dir, 'versions', 'diffs');

    const first = resolveRunFolder(diffs, 'Homepage refresh Q3', 'KEY1');
    expect(path.basename(first)).toBe('Homepage-refresh-Q3');

    fs.ensureDirSync(first);
    fs.writeJsonSync(path.join(first, 'run.json'), { branchKey: 'KEY1' });
    expect(resolveRunFolder(diffs, 'Homepage refresh Q3', 'KEY1')).toBe(first); // rerun overwrites its own folder

    const other = resolveRunFolder(diffs, 'Homepage refresh Q3', 'KEY2');
    expect(path.basename(other)).toMatch(/^Homepage-refresh-Q3-\d{4}-\d{2}-\d{2}$/);
  });

  it('slugifies branch names safely', () => {
    expect(slugifyBranchName('feat: new tokens / spacing')).toBe('feat-new-tokens-spacing');
    expect(slugifyBranchName('***')).toBe('branch');
  });
});

describe('retryable causes (ported verbatim)', () => {
  it('matches license, rate-limit, and network causes only', () => {
    expect(retryable('The license check could not be completed')).toBe(true);
    expect(retryable('HTTP 429 Too Many Requests')).toBe(true);
    expect(retryable('connect ETIMEDOUT 1.2.3.4')).toBe(true);
    expect(retryable('Error: component had no anatomy')).toBe(false);
  });
});

/**
 * Fake steps: fetch writes receipts (and payload stand-ins), generate copies a
 * fixture spec tree — the branch side with one MINOR-class edit.
 */
function fakeSteps(fixturesFrom: string, options: { branchName?: string | null; failFetchTimes?: number } = {}): PremergeSteps & { calls: string[] } {
  let fetchFailures = options.failFetchTimes ?? 0;
  const calls: string[] = [];
  return {
    calls,
    fetch(side, sourceArg, dataDir) {
      calls.push(`fetch ${side} ${sourceArg}`);
      if (side === 'branch' && fetchFailures > 0) {
        fetchFailures--;
        throw new Error('Figma returned 429 rate limit');
      }
      fs.ensureDirSync(dataDir);
      fs.writeJsonSync(path.join(dataDir, `${side}.source.json`), {
        alias: side,
        key: side === 'branch' ? 'BRANCHKEY456' : 'MAINKEY123',
        mainFileKey: side === 'branch' ? 'MAINKEY123' : null,
        branchName: side === 'branch' ? (options.branchName === undefined ? 'Feature tokens' : options.branchName) : 'My Library',
        fetchedAt: new Date().toISOString(),
      });
      for (const kind of ['file', 'variables', 'styles']) {
        fs.writeFileSync(path.join(dataDir, `${side}.${kind}.json`), '{}');
      }
    },
    scan(side, _filePath, manifestPath) {
      calls.push(`scan ${side}`);
      fs.writeFileSync(manifestPath, '| [x] | DE Button | x | x | READY_FOR_DEV |\n| [x] | DE Alert | x | x | READY_FOR_DEV |\n');
    },
    generate(side, _manifest, specsDir) {
      calls.push(`generate ${side}`);
      fs.copySync(path.join(fixturesFrom, 'specs'), specsDir);
      if (side === 'branch') {
        const api = path.join(specsDir, 'deButton', 'api.yaml');
        const doc = yaml.parse(fs.readFileSync(api, 'utf8'));
        doc.props.branchOnly = { type: 'boolean', default: false };
        fs.writeFileSync(api, yaml.stringify(doc));
      }
    },
  };
}

describe('figmapremerge orchestration (injected steps, no network)', () => {
  it('fetches, scans, and generates both sides into versions/diffs/<branch>/, then cleans payloads', () => {
    const dir = workspace('fp-run');
    const run = runFigmaPremerge({
      url: BRANCH_URL,
      workspaceRoot: dir,
      versionsDir: path.join(dir, 'versions'),
      steps: fakeSteps(dir),
      sleep: () => undefined,
    });

    expect(path.basename(run.runDir)).toBe('Feature-tokens');
    expect(run.branchName).toBe('Feature tokens');
    expect(run.targetLabel).toBe('My Library');
    expect(fs.existsSync(path.join(run.runDir, 'run.json'))).toBe(true);
    expect(fs.existsSync(run.baseSpecsDir)).toBe(true);
    expect(fs.existsSync(run.currentSpecsDir)).toBe(true);
    // payloads deleted, receipts kept
    expect(fs.existsSync(path.join(run.runDir, 'current/data/branch.file.json'))).toBe(false);
    expect(fs.existsSync(path.join(run.runDir, 'current/data/branch.source.json'))).toBe(true);

    // the diff sees the branch-side edit as MINOR
    const dataset = buildPremergeDataset({
      baseDir: run.baseSpecsDir,
      currentDir: run.currentSpecsDir,
      ruleSet,
      rulesLabel: 'built-in',
      targetLabel: run.targetLabel,
      sourceLabel: run.sourceLabel,
    });
    const button = dataset.components.find(c => c.name === 'deButton')!;
    expect(button.entries.some(e => e.path === 'props.branchOnly' && e.impact === 'minor')).toBe(true);
    const report = renderReport(dataset);
    expect(report).toContain('`My Library` ← `Feature tokens`');
  });

  it('retries a transient fetch failure and then succeeds', () => {
    const dir = workspace('fp-retry');
    const steps = fakeSteps(dir, { failFetchTimes: 1 });
    const waits: number[] = [];
    const run = runFigmaPremerge({
      url: BRANCH_URL,
      workspaceRoot: dir,
      versionsDir: path.join(dir, 'versions'),
      steps,
      sleep: ms => { waits.push(ms); },
    });
    expect(waits).toEqual([30_000]);
    expect(fs.existsSync(run.runDir)).toBe(true);
  });

  it('gives up on a non-retryable failure, naming the step', () => {
    const dir = workspace('fp-fail');
    const steps = fakeSteps(dir);
    steps.scan = () => { throw new Error('component had no anatomy'); };
    expect(() => runFigmaPremerge({
      url: BRANCH_URL,
      workspaceRoot: dir,
      versionsDir: path.join(dir, 'versions'),
      steps,
      sleep: () => undefined,
    })).toThrow(/scan branch failed/);
  });

  it('keeps payloads under --keep-payloads and falls back to "branch" without a receipt name', () => {
    const dir = workspace('fp-keep');
    const run = runFigmaPremerge({
      url: BRANCH_URL,
      workspaceRoot: dir,
      versionsDir: path.join(dir, 'versions'),
      steps: fakeSteps(dir, { branchName: null }),
      keepPayloads: true,
      sleep: () => undefined,
    });
    expect(path.basename(run.runDir)).toBe('branch');
    expect(fs.existsSync(path.join(run.runDir, 'current/data/branch.file.json'))).toBe(true);
  });
});

describe('manifest-aware presence (ported from premerge-diff.mjs)', () => {
  it('tells an unpublished component apart from a deleted one, and a first publish from a new component', () => {
    const base = workspace('mf-base');
    const current = workspace('mf-current');
    // deAlert vanishes from the current tree but its manifest row is unchecked → unpublished
    fs.removeSync(path.join(current, 'specs/deAlert'));
    // deChip appears in the current tree and base manifest lists it unchecked → published
    fs.copySync(path.join(base, 'specs/deButton'), path.join(current, 'specs/deChip'));
    editYaml(current, 'specs/deChip/api.yaml', doc => {
      doc.title = 'DE Chip';
      doc.metadata.source.nodeId = '4242:1';
    });

    const currentManifest = path.join(current, 'current.manifest.md');
    fs.writeFileSync(currentManifest, [
      '| [x] | DE Button | p | n | READY_FOR_DEV |',
      '| [ ] | DE Alert | p | n | IN_PROGRESS |',
      '| [x] | DE Chip | p | n | READY_FOR_DEV |',
    ].join('\n'));
    const baseManifest = path.join(base, 'base.manifest.md');
    fs.writeFileSync(baseManifest, [
      '| [x] | DE Button | p | n | READY_FOR_DEV |',
      '| [x] | DE Alert | p | n | READY_FOR_DEV |',
      '| [ ] | DE Chip | p | n | NONE |',
    ].join('\n'));

    expect(loadManifest(currentManifest)!.get('deAlert')).toMatchObject({ checked: false, devStatus: 'IN_PROGRESS' });

    const dataset = buildPremergeDataset({
      baseDir: path.join(base, 'specs'),
      currentDir: path.join(current, 'specs'),
      ruleSet,
      rulesLabel: 'built-in',
      baseManifest,
      currentManifest,
    });

    const alert = dataset.components.find(c => c.name === 'deAlert')!;
    expect(alert.entries[0].rule).toBe('component-unpublished');
    expect(alert.entries[0].impact).toBe('major');
    const chip = dataset.components.find(c => c.name === 'deChip')!;
    expect(chip.entries[0].rule).toBe('component-published');
    expect(chip.entries[0].impact).toBe('minor');

    const report = renderReport(dataset);
    expect(report).toContain('no longer published as a spec');
    expect(report).toContain('dev status IN_PROGRESS');
    expect(report).toContain('published as a spec for the first time');
  });
});
