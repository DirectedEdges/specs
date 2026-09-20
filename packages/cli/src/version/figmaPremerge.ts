/**
 * Figma pre-merge — the whole pipeline in one command, ported from the
 * specs-testing premerge tooling (premerge-run.sh + premerge-name-run.mjs):
 * parse the branch URL, fetch both sides, scan and generate both spec trees,
 * diff them, write the report. The CLI's own fetch/scan/generate commands do
 * the Figma work (branch URLs ride `--source branch=<url>`, which resolves the
 * branch name and main file via the fetch probe's `branch_data`).
 *
 * Run artifacts live under `<workspace>/versions/diffs/<branch>/` — `base/`
 * (main), `current/` (branch), `report.md`, `diff.json`, `run.json` — one
 * folder per branch, date-suffixed when a different branch collides on the
 * name; a rerun of the same branch overwrites its own folder.
 *
 * Steps are injected so orchestration is unit-testable without the network;
 * the command supplies real implementations that invoke the CLI itself.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BranchUrlKeys {
  mainKey: string;
  branchKey: string;
}

/**
 * The main file key is the hash after /design/; the branch key the hash after
 * /branch/ (per the premerge-run.sh parsing this ports).
 */
export function parseBranchUrl(url: string): BranchUrlKeys {
  const mainKey = url.match(/\/design\/([A-Za-z0-9]*)/)?.[1] ?? '';
  const branchKey = url.match(/\/branch\/([A-Za-z0-9]*)/)?.[1] ?? '';
  if (!branchKey) {
    throw new Error('That URL has no /branch/ segment — it points at a file, not a branch.');
  }
  if (!mainKey) {
    throw new Error('Could not read the main file key from the URL.');
  }
  return { mainKey, branchKey };
}

/** `Homepage refresh Q3` → `Homepage-refresh-Q3`, safe as a folder name. */
export function slugifyBranchName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'branch';
}

interface RunReceipt {
  branchKey: string;
  mainKey: string;
  branchName: string;
  ranAt: string;
}

/**
 * The run folder for a branch: named after the branch, overwritten on rerun of
 * the same branch (same branch key), date-suffixed when a different branch
 * collides on the name.
 */
export function resolveRunFolder(diffsDir: string, branchName: string, branchKey: string): string {
  const base = path.join(diffsDir, slugifyBranchName(branchName));
  let candidate = base;
  let n = 1;
  while (fs.existsSync(candidate)) {
    const receiptPath = path.join(candidate, 'run.json');
    try {
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as RunReceipt;
      if (receipt.branchKey === branchKey) return candidate; // rerun — overwrite in place
    } catch {
      // no receipt: treat as foreign and suffix
    }
    const date = new Date().toISOString().slice(0, 10);
    n += 1;
    candidate = n === 2 ? `${base}-${date}` : `${base}-${date}-${n - 1}`;
  }
  return candidate;
}

/**
 * One pipeline step per side. Implementations throw an Error whose message
 * carries the step's combined output; transient failures are retried here.
 */
export interface PremergeSteps {
  /** `specs fetch --source <sourceArg> --data-dir <dataDir> --only file,variables,styles` */
  fetch(side: 'branch' | 'main', sourceArg: string, dataDir: string): void;
  /** `specs scan <filePath> -o <manifestPath>` */
  scan(side: 'branch' | 'main', filePath: string, manifestPath: string): void;
  /** `specs generate <manifestPath> -o <specsDir> -v <variablesPath> -s <stylesPath>` */
  generate(side: 'branch' | 'main', manifestPath: string, specsDir: string, variablesPath: string, stylesPath: string): void;
}

/**
 * Transient causes worth waiting out (ported verbatim): the license endpoint
 * rate-limits, and a failure there would otherwise throw away two full fetches.
 */
export function retryable(output: string): boolean {
  return /license check could not be completed|network-error|rate limit|429|ETIMEDOUT|ECONNRESET/i.test(output);
}

export interface FigmaPremergeOptions {
  url: string;
  workspaceRoot: string;
  versionsDir: string;
  keepPayloads?: boolean;
  steps: PremergeSteps;
  /** Injected for tests; defaults to a real 30s wait. */
  sleep?: (ms: number) => void;
  log?: (line: string) => void;
}

export interface FigmaPremergeRun {
  runDir: string;
  branchName: string;
  mainKey: string;
  branchKey: string;
  /** main side of the comparison */
  baseSpecsDir: string;
  baseManifest: string;
  /** branch side of the comparison */
  currentSpecsDir: string;
  currentManifest: string;
  targetLabel: string;
  sourceLabel: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_WAIT_MS = 30_000;

/**
 * Fetch + scan + generate both sides into the run folder. Returns the paths
 * the diff and report read; the caller owns diffing and rendering.
 */
export function runFigmaPremerge(options: FigmaPremergeOptions): FigmaPremergeRun {
  const { url, steps } = options;
  const sleep = options.sleep ?? ((ms: number) => {
    const buffer = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(buffer), 0, 0, ms);
  });
  const log = options.log ?? (() => undefined);
  const { mainKey, branchKey } = parseBranchUrl(url);

  const step = (label: string, work: () => void): void => {
    const began = Date.now();
    for (let attempt = 1; ; attempt++) {
      try {
        work();
        log(`✓ ${label.padEnd(20)} ${Math.round((Date.now() - began) / 1000)}s${attempt > 1 ? ` (after ${attempt - 1} retry)` : ''}`);
        return;
      } catch (e) {
        const output = (e as Error).message;
        if (attempt < MAX_ATTEMPTS && retryable(output)) {
          log(`… ${label.padEnd(20)} attempt ${attempt} failed, waiting ${RETRY_WAIT_MS / 1000}s`);
          sleep(RETRY_WAIT_MS);
          continue;
        }
        throw new Error(`${label} failed:\n${output}`);
      }
    }
  };

  const diffsDir = path.join(options.versionsDir, 'diffs');

  // The branch name is only known after the branch fetch probes the key, so
  // the run starts in a staging folder and moves once the name is in hand —
  // before scan writes manifests that record absolute paths.
  const staging = path.join(diffsDir, `.staging-${branchKey}`);
  fs.rmSync(staging, { recursive: true, force: true });
  const dataDir = (root: string, side: 'branch' | 'main') => path.join(root, side === 'main' ? 'base' : 'current', 'data');
  fs.mkdirSync(dataDir(staging, 'branch'), { recursive: true });

  step('fetch branch', () => steps.fetch('branch', `branch=${url}`, dataDir(staging, 'branch')));

  let branchName = 'branch';
  const receiptPath = path.join(dataDir(staging, 'branch'), 'branch.source.json');
  try {
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as { branchName?: string | null };
    if (receipt.branchName) branchName = receipt.branchName;
  } catch {
    // no receipt — keep the fallback name
  }

  const runDir = resolveRunFolder(diffsDir, branchName, branchKey);
  fs.rmSync(runDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(runDir), { recursive: true });
  fs.renameSync(staging, runDir);
  fs.mkdirSync(dataDir(runDir, 'main'), { recursive: true });
  log(`run folder: ${runDir}`);

  const sides: Array<{ side: 'branch' | 'main'; dir: string }> = [
    { side: 'branch', dir: path.join(runDir, 'current') },
    { side: 'main', dir: path.join(runDir, 'base') },
  ];

  step('fetch main', () => steps.fetch('main', `main=${mainKey}`, dataDir(runDir, 'main')));
  for (const { side, dir } of sides) {
    const data = path.join(dir, 'data');
    const manifest = path.join(data, `${side}.manifest.md`);
    step(`scan ${side}`, () => steps.scan(side, path.join(data, `${side}.file.json`), manifest));
    step(`generate ${side}`, () => steps.generate(
      side,
      manifest,
      path.join(dir, 'specs'),
      path.join(data, `${side}.variables.json`),
      path.join(data, `${side}.styles.json`),
    ));
  }

  // The main side's `branchName` is whatever Figma calls that file — for a
  // file rather than a branch, that is the library's own name.
  let targetLabel = 'main';
  try {
    const mainReceipt = JSON.parse(
      fs.readFileSync(path.join(dataDir(runDir, 'main'), 'main.source.json'), 'utf8'),
    ) as { branchName?: string | null };
    if (mainReceipt.branchName) targetLabel = mainReceipt.branchName;
  } catch {
    // keep 'main'
  }

  // The payloads are only an input to generate; two libraries per run makes
  // the diffs folder unusable within a week.
  if (!options.keepPayloads) {
    for (const { side, dir } of sides) {
      for (const kind of ['file', 'variables', 'styles']) {
        fs.rmSync(path.join(dir, 'data', `${side}.${kind}.json`), { force: true });
      }
    }
    log('✓ removed fetched payloads (--keep-payloads to keep them)');
  }

  const receipt: RunReceipt = { branchKey, mainKey, branchName, ranAt: new Date().toISOString() };
  fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify(receipt, null, 2)}\n`);

  return {
    runDir,
    branchName,
    mainKey,
    branchKey,
    baseSpecsDir: path.join(runDir, 'base', 'specs'),
    baseManifest: path.join(runDir, 'base', 'data', 'main.manifest.md'),
    currentSpecsDir: path.join(runDir, 'current', 'specs'),
    currentManifest: path.join(runDir, 'current', 'data', 'branch.manifest.md'),
    targetLabel,
    sourceLabel: branchName,
  };
}
