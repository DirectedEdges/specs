// Running the workspace's own Storybook, and keeping its index alive.
//
// Extracted from `specs storybook dev` so `specs run` can serve Storybook too
// without a second copy. The index-recovery handling below is the subtlest code
// in this package and the least likely to be kept in step if duplicated — which
// is the whole reason this is one function and not two.
//
// Always the customer's own Storybook, through the scaffolded npm script (their
// port, their flags). We never ship or vendor Storybook (ADR A).
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'fs-extra';
import path from 'path';
import type { Workspace } from './workspace.js';

/** The dev-server port from the scaffolded npm script, as storybook-up infers it. */
function readScaffoldPort(ws: Workspace): string | null {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ws.storybookDir, 'package.json'), 'utf-8')) as {
      scripts?: { storybook?: string };
    };
    return pkg.scripts?.storybook?.match(/-p\s+(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Start Storybook and watch its health. Returns the child, or null when the
 * workspace has no Storybook host to serve.
 *
 * `label` prefixes the messages, so a person can tell which command is talking.
 */
export function serveStorybook(ws: Workspace, label = 'specs run'): ChildProcess | null {
  if (!ws.scaffolded) return null;

  // Piped output still reaches the terminal verbatim — the log trigger below
  // writes it through. --ci suppresses the prompts that hang a spawned run.
  const child = spawn('npm', ['run', 'storybook', '--', '--ci'], {
    cwd: ws.storybookDir,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.warn(`[${label}] Storybook exited (${code}) — everything else keeps running.`);
    }
  });

  // The one failure a designer cannot diagnose: Storybook's indexer caches a
  // per-file parse failure, so index.json 500s and STAYS 500 after the file is
  // fine again. It reads as the server dying, and restarting teaches nothing —
  // re-saving the file is the cure. Try that first; if the file is genuinely
  // broken, name it in one plain sentence rather than failing mutely.
  const port = readScaffoldPort(ws);
  const touched = new Set<string>();
  const healFromErrorText = (body: string) => {
    // Any module path in the error body: emitted trees name their files bare
    // `stories.tsx`, content pages `X.stories.tsx` — match by extension and let
    // the exists-under-workspace filter do the narrowing.
    const files = [...body.matchAll(/[^\s"'`()]+\.(?:[jt]sx?|mdx)/g)]
      .map((m) => (path.isAbsolute(m[0]) ? m[0] : path.join(ws.storybookDir, m[0])))
      .filter((f) => f.startsWith(ws.root) && fs.existsSync(f));
    for (const file of files) {
      if (touched.has(file)) {
        console.warn(
          `[${label}] Storybook's index is failing on ${path.relative(ws.root, file)} — the file has a real error. ` +
            'Fix and re-save it; the index recovers on its own. Do not restart Storybook.',
        );
      } else {
        touched.add(file);
        const now = new Date();
        fs.utimesSync(file, now, now); // a re-save clears the cached parse failure
        console.warn(`[${label}] Storybook index failed on ${path.relative(ws.root, file)} — re-triggered its parse.`);
      }
    }
    if (files.length === 0) {
      console.warn(`[${label}] Storybook index failed — re-save the last story file you touched; do not restart.`);
    }
  };

  // Primary trigger: the server's own log line, the instant it prints. The slow
  // poll below is only a backstop for failures that never log.
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    let buffer = '';
    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      (stream === child.stderr ? process.stderr : process.stdout).write(text);
      buffer = (buffer + text).slice(-8192);
      // The live log says "Unable to index <path>:"; the HTTP body's aggregate
      // says "Unable to index files:". Match the stem so both trigger.
      if (/Unable to index/.test(buffer)) {
        const slice = buffer;
        buffer = '';
        healFromErrorText(slice);
      }
    });
  }

  if (port && typeof fetch === 'function') {
    let everHealthy = false;
    const check = async () => {
      let res: Response;
      try {
        res = await fetch(`http://localhost:${port}/index.json`);
      } catch {
        return; // starting up, or stopped — the exit handler covers death
      }
      if (res.ok) {
        everHealthy = true;
        touched.clear();
        return;
      }
      if (!everHealthy || res.status !== 500) return;
      healFromErrorText(await res.text().catch(() => ''));
    };
    const healthTimer = setInterval(() => void check(), 15000);
    healthTimer.unref?.();
  }

  if (port) console.log(`[${label}] Storybook starting — http://localhost:${port}`);
  return child;
}
