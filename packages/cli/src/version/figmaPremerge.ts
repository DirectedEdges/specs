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
 * Transient causes worth waiting out: the license validate endpoint
 * rate-limits bursts (~3 requests per ~32s window), and a failure there would
 * otherwise throw away two full fetches. "License server could not be
 * reached" is that endpoint refusing a burst — 30 seconds clears the window.
 */
export function retryable(output: string): boolean {
  return /license check could not be completed|license server could not be reached|key was not validated|network-error|rate limit|429|ETIMEDOUT|ECONNRESET/i.test(output);
}

/**
 * Run folders sit deep under the workspace; the absolute path buries the part
 * a reader acts on. Progress lines show the path from the workspace root.
 */
export function workspaceRelativePath(workspaceRoot: string, target: string): string {
  const rel = path.relative(workspaceRoot, target);
  return rel && !rel.startsWith('..') ? `/${rel}` : target;
}

export interface FigmaPremergeOptions {
  url: string;
  workspaceRoot: string;
  versionsDir: string;
  steps: PremergeSteps;
  /** Injected for tests; defaults to a real wait. */
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  /**
   * The in-flight loading state for a phase: called when the phase starts,
   * returns a stop function reporting elapsed time. The command passes the
   * CLI's spinner; the default keeps time silently.
   */
  spinner?: (text: string) => () => string;
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
 * Fetch + scan + generate both sides into the run folder, the two sides
 * concurrently. Returns the paths the diff and report read; the caller owns
 * diffing, rendering, and the post-report cleanup.
 */
export async function runFigmaPremerge(options: FigmaPremergeOptions): Promise<FigmaPremergeRun> {
  const { url, steps } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const log = options.log ?? (() => undefined);
  const spinner = options.spinner ?? ((_text: string) => {
    const start = Date.now();
    return () => `${Math.round((Date.now() - start) / 1000)}s`;
  });
  const { mainKey, branchKey } = parseBranchUrl(url);

  // What is being compared, named once up front.
  log(`Premerge diff — branch ${branchKey} onto ${mainKey}`);

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
   * One displayed phase over both sides. Execution inside stays pipelined —
   * a side that finished fetching may already be scanning — but the display
   * aggregates: one loading state, one ✓ when both sides are done. On failure
   * the run folder is removed once the other side settles — a half-run folder
   * without a report reads as a finished run and must not survive — and the
   * first failure is rethrown with its step named.
   */
  const phase = async (
    text: string,
    folder: () => string,
    tasks: Array<() => Promise<void>>,
    done: (elapsed: string) => string,
  ): Promise<void> => {
    const stop = spinner(text);
    const results = await Promise.allSettled(tasks.map(task => task()));
    const elapsed = stop();
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) {
      fs.rmSync(folder(), { recursive: true, force: true });
      log(`✗ ${text} failed — run folder removed`);
      throw failed.reason;
    }
    log(`✓ ${done(elapsed)}`);
  };

  const diffsDir = path.join(options.versionsDir, 'diffs');

  // The branch name is only known after the branch fetch probes the key, so
  // the run starts in a staging folder and moves once the name is in hand —
  // before scan writes manifests that record absolute paths.
  const staging = path.join(diffsDir, `.staging-${branchKey}`);
  fs.rmSync(staging, { recursive: true, force: true });
  const dataDir = (root: string, side: 'branch' | 'main') => path.join(root, side, 'data');
  fs.mkdirSync(dataDir(staging, 'branch'), { recursive: true });
  fs.mkdirSync(dataDir(staging, 'main'), { recursive: true });

  await phase(
    'Fetching branch and main',
    () => staging,
    [
      () => step('branch: fetch', () => steps.fetch('branch', `branch=${url}`, dataDir(staging, 'branch'))),
      () => step('main: fetch', () => steps.fetch('main', `main=${mainKey}`, dataDir(staging, 'main'))),
    ],
    elapsed => `Fetched branch and main (${elapsed})`,
  );

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
  log(`✓ Create diff folder: ${workspaceRelativePath(options.workspaceRoot, runDir)}`);

  const sideTask = (side: 'branch' | 'main') => async (): Promise<void> => {
    const dir = path.join(runDir, side);
    const data = path.join(dir, 'data');
    const manifest = path.join(data, `${side}.manifest.md`);
    const specsDir = path.join(dir, 'specs');
    await step(`${side}: scan`, () => steps.scan(side, path.join(data, `${side}.file.json`), manifest));
    await step(`${side}: generate`, () => steps.generate(
      side,
      manifest,
      specsDir,
      path.join(data, `${side}.variables.json`),
      path.join(data, `${side}.styles.json`),
    ));
  };

  await phase(
    'Generating specs from branch and main',
    () => runDir,
    [sideTask('branch'), sideTask('main')],
    elapsed => `Generate specs (${elapsed})`,
  );

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

  return {
    runDir,
    branchName,
    mainKey,
    branchKey,
    baseSpecsDir: path.join(runDir, 'main', 'specs'),
    baseManifest: path.join(runDir, 'main', 'data', 'main.manifest.md'),
    currentSpecsDir: path.join(runDir, 'branch', 'specs'),
    currentManifest: path.join(runDir, 'branch', 'data', 'branch.manifest.md'),
    targetLabel,
    sourceLabel: branchName,
  };
}

/**
 * Past runs as a reader meets them: one entry per finished run folder, newest
 * first, with the bytes each occupies. Several similarly-named folders is how a
 * designer ends up sent last week's report, so the command asks what to do with
 * them — and "remove old runs" means nothing without the count and the size.
 */
export interface PastRuns {
  folders: string[];
  bytes: number;
}

function bytesIn(dir: string): number {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    total += entry.isDirectory() ? bytesIn(child) : fs.statSync(child).size;
  }
  return total;
}

export function pastRuns(diffsDir: string): PastRuns {
  if (!fs.existsSync(diffsDir)) return { folders: [], bytes: 0 };
  const folders = fs.readdirSync(diffsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => path.join(diffsDir, e.name))
    .sort();
  return { folders, bytes: folders.reduce((sum, f) => sum + bytesIn(f), 0) };
}

/** `330M`, `1.2G` — the `du -sh` shape the shell version printed. */
export function formatBytes(bytes: number): string {
  const units = ['B', 'K', 'M', 'G', 'T'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${units[unit]}`;
}

export function removePastRuns(folders: string[]): void {
  for (const folder of folders) fs.rmSync(folder, { recursive: true, force: true });
}

/**
 * Post-report cleanup. Two full generated spec trees plus manifests per run
 * make diffs/ unusable within a week; a reader needs the report and the
 * impacted components' specs, nothing else.
 *
 * Default: `main/` is removed entirely; in `branch/` only `specs/` survives,
 * and inside it only the impacted components. Fetched payloads go with their
 * data folders. `keepData` keeps everything.
 */
export function cleanupRun(runDir: string, impactedComponents: string[], keepData: boolean): void {
  if (keepData) return;
  fs.rmSync(path.join(runDir, 'main'), { recursive: true, force: true });

  const current = path.join(runDir, 'branch');
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
