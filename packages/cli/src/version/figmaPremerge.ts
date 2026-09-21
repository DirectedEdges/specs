/**
 * Figma pre-merge — the whole pipeline in one command, ported from the
 * specs-testing premerge tooling (premerge-run.sh + premerge-name-run.mjs):
 * parse the branch URL, fetch both sides, scan and generate both spec trees,
 * diff them, write the report. The CLI's own fetch/scan/generate commands do
 * the Figma work (branch URLs ride `--source branch=<url>`, which resolves the
 * branch name and main file via the fetch probe's `branch_data`).
 *
 * Run artifacts live under `<workspace>/versions/diffs/<date>-<branch>/` —
 * named the way the original tooling named finished runs: the date, then what
 * the run was about, with numbered siblings (` 2`, ` 3`) on duplicates so a
 * second run never overwrites a folder a designer may already have shared.
 *
 * The two sides are independent and write to separate folders, so their
 * fetch → scan → generate pipelines run concurrently; each side keeps its own
 * transient-retry loop. After the report is written the run folder is cleaned
 * to what a reader needs — the report and the impacted components' specs —
 * unless --keep-data retains everything.
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

/** The branch name as a folder-name segment: verbatim, spaces kept, path-hostile characters replaced. */
export function folderNameFor(branchName: string): string {
  return branchName.replace(/[\\/:]+/g, '-').replace(/^[-\s]+|[-\s.]+$/g, '') || 'branch';
}

/**
 * The run folder: `<date>-<branch name>`, with ` 2`, ` 3` numbered siblings on
 * duplicates — never overwriting an earlier run, which a designer may already
 * have shared (the premerge-name-run.mjs semantics).
 */
export function resolveRunFolder(
  diffsDir: string,
  branchName: string,
  date: string = new Date().toISOString().slice(0, 10),
): string {
  const base = path.join(diffsDir, `${date}-${folderNameFor(branchName)}`);
  let candidate = base;
  let n = 1;
  while (fs.existsSync(candidate)) {
    n += 1;
    candidate = `${base} ${n}`;
  }
  return candidate;
}

interface RunReceipt {
  branchKey: string;
  mainKey: string;
  branchName: string;
  ranAt: string;
}

/**
 * One pipeline step per side. Implementations throw an Error whose message
 * carries the step's combined output; transient failures are retried here.
 */
export interface PremergeSteps {
  /** `specs fetch --source <sourceArg> --data-dir <dataDir> --only file,variables,styles` */
  fetch(side: 'branch' | 'main', sourceArg: string, dataDir: string): void | Promise<void>;
  /** `specs scan <filePath> -o <manifestPath>` */
  scan(side: 'branch' | 'main', filePath: string, manifestPath: string): void | Promise<void>;
  /** `specs generate <manifestPath> -o <specsDir> -v <variablesPath> -s <stylesPath>` */
  generate(side: 'branch' | 'main', manifestPath: string, specsDir: string, variablesPath: string, stylesPath: string): void | Promise<void>;
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
  steps: PremergeSteps;
  /** Injected for tests; defaults to a real 30s wait. */
  sleep?: (ms: number) => Promise<void>;
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

function componentCount(specsDir: string): number {
  if (!fs.existsSync(specsDir)) return 0;
  return fs.readdirSync(specsDir)
    .filter(name => !name.startsWith('_') && !name.startsWith('.'))
    .filter(name => fs.statSync(path.join(specsDir, name)).isDirectory())
    .length;
}

/**
 * Fetch + scan + generate both sides into the run folder, the two sides
 * concurrently. Returns the paths the diff and report read; the caller owns
 * diffing, rendering, and the post-report cleanup.
 */
export async function runFigmaPremerge(options: FigmaPremergeOptions): Promise<FigmaPremergeRun> {
  const { url, steps } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const log = options.log ?? (() => undefined);
  const { mainKey, branchKey } = parseBranchUrl(url);

  const step = async (label: string, work: () => void | Promise<void>): Promise<void> => {
    for (let attempt = 1; ; attempt++) {
      try {
        await work();
        return;
      } catch (e) {
        const output = (e as Error).message;
        if (attempt < MAX_ATTEMPTS && retryable(output)) {
          log(`… ${label}: attempt ${attempt} failed on a transient cause, waiting ${RETRY_WAIT_MS / 1000}s`);
          await sleep(RETRY_WAIT_MS);
          continue;
        }
        throw new Error(`${label} failed:\n${output}`);
      }
    }
  };

  /**
   * Both sides at once. On failure the run folder is removed once the other
   * side settles — a half-run folder without a report reads as a finished run
   * and must not survive — and the first failure is rethrown with its step
   * named.
   */
  const bothSides = async (folder: string, tasks: Array<() => Promise<void>>): Promise<void> => {
    const results = await Promise.allSettled(tasks.map(task => task()));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) {
      fs.rmSync(folder, { recursive: true, force: true });
      log(`✗ run folder removed after failure`);
      throw failed.reason;
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
  fs.mkdirSync(dataDir(staging, 'main'), { recursive: true });

  await bothSides(staging, [
    async () => {
      const began = Date.now();
      await step('branch: fetch', () => steps.fetch('branch', `branch=${url}`, dataDir(staging, 'branch')));
      log(`✓ branch: fetch complete (${Math.round((Date.now() - began) / 1000)}s)`);
    },
    async () => {
      const began = Date.now();
      await step('main: fetch', () => steps.fetch('main', `main=${mainKey}`, dataDir(staging, 'main')));
      log(`✓ main: fetch complete (${Math.round((Date.now() - began) / 1000)}s)`);
    },
  ]);

  let branchName = 'branch';
  const receiptPath = path.join(dataDir(staging, 'branch'), 'branch.source.json');
  try {
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as { branchName?: string | null };
    if (receipt.branchName) branchName = receipt.branchName;
  } catch {
    // no receipt — keep the fallback name
  }

  const runDir = resolveRunFolder(diffsDir, branchName);
  fs.mkdirSync(path.dirname(runDir), { recursive: true });
  fs.renameSync(staging, runDir);
  log(`✓ run folder: ${runDir}`);

  const sideTask = (side: 'branch' | 'main') => async (): Promise<void> => {
    const dir = path.join(runDir, side === 'main' ? 'base' : 'current');
    const data = path.join(dir, 'data');
    const manifest = path.join(data, `${side}.manifest.md`);
    const specsDir = path.join(dir, 'specs');
    await step(`${side}: scan`, () => steps.scan(side, path.join(data, `${side}.file.json`), manifest));
    const began = Date.now();
    await step(`${side}: generate`, () => steps.generate(
      side,
      manifest,
      specsDir,
      path.join(data, `${side}.variables.json`),
      path.join(data, `${side}.styles.json`),
    ));
    log(`✓ ${side}: specs generated (${componentCount(specsDir)} components, ${Math.round((Date.now() - began) / 1000)}s)`);
  };

  await bothSides(runDir, [sideTask('branch'), sideTask('main')]);

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

/**
 * Post-report cleanup. Two full generated spec trees plus manifests per run
 * make diffs/ unusable within a week; a reader needs the report and the
 * impacted components' specs, nothing else.
 *
 * Default: `base/` is removed entirely; in `current/` only `specs/` survives,
 * and inside it only the impacted components. Fetched payloads go with their
 * data folders. `keepData` keeps everything.
 */
export function cleanupRun(runDir: string, impactedComponents: string[], keepData: boolean): void {
  if (keepData) return;
  fs.rmSync(path.join(runDir, 'base'), { recursive: true, force: true });

  const current = path.join(runDir, 'current');
  if (!fs.existsSync(current)) return;
  for (const entry of fs.readdirSync(current)) {
    if (entry !== 'specs') fs.rmSync(path.join(current, entry), { recursive: true, force: true });
  }
  const specs = path.join(current, 'specs');
  if (!fs.existsSync(specs)) return;
  const keep = new Set(impactedComponents);
  for (const entry of fs.readdirSync(specs)) {
    if (!keep.has(entry)) fs.rmSync(path.join(specs, entry), { recursive: true, force: true });
  }
}
