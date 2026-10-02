// `specs storybook dev` — the one process a designer runs (specs#644).
//
// You run fetch, generate, and renders yourself; this owns everything that
// reacts: the transform watchers re-emit components when specs change, the
// Storybook dev server hot-reloads their output, and its host plugin
// republishes the generated pages when config/, specs/, or assets/ move.
//
//   dev ─┬─ specs react --watch            (when react/ exists)
//        ├─ specs webcomponents --watch    (when webcomponents/ exists)
//        └─ storybook dev server ── publish-on-change (host plugin)
//
// Free and unobfuscated; spawns this same CLI binary for the watchers, so no
// PATH assumptions, and the customer's own Storybook install for the server —
// we never ship or vendor Storybook (ADR A).
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'fs-extra';
import path from 'path';
import type { Workspace } from './workspace.js';
import { publish } from './publish.js';

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

export async function dev(ws: Workspace): Promise<void> {
  if (!ws.scaffolded) {
    throw new Error(
      'No Storybook host here yet. Run `specs storybook init`, then the one install it prints, then `specs storybook dev`.',
    );
  }

  // One publish up front so the server starts against current content — this
  // also prints the stale-scaffold warning when the host needs `init --force`.
  await publish(ws);

  const children: ChildProcess[] = [];
  const spawnChild = (label: string, command: string, args: string[], cwd: string, pipeOutput = false) => {
    // Piped output still reaches the terminal verbatim (the log-trigger below
    // writes it through); inherit keeps the transform watchers zero-overhead.
    const child = spawn(command, args, { cwd, stdio: pipeOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit' });
    child.on('exit', (code) => {
      if (code !== null && code !== 0) console.warn(`[specs dev] ${label} exited (${code}) — the rest keeps running.`);
    });
    children.push(child);
    return child;
  };

  // The transform watchers own re-emission; their output is in Vite's module
  // graph, so the server hot-reloads it without being told.
  const self = process.argv[1];
  if (fs.existsSync(path.join(ws.root, 'react'))) {
    spawnChild('react --watch', process.execPath, [self, 'react', '--watch'], ws.root);
  }
  if (fs.existsSync(path.join(ws.root, 'webcomponents'))) {
    spawnChild('webcomponents --watch', process.execPath, [self, 'webcomponents', '--watch'], ws.root);
  }

  // The customer's own Storybook, through the scaffolded npm script (their
  // port, their flags). --ci suppresses the prompts that hang a spawned run.
  spawnChild('storybook', 'npm', ['run', 'storybook', '--', '--ci'], ws.storybookDir, true);

  // Health check for the one failure a designer cannot diagnose: Storybook's
  // indexer caches a per-file parse failure, so index.json 500s and STAYS 500
  // after the file is fine again — it reads as the server dying, and restarts
  // teach nothing. Re-saving the file is the cure. First try it ourselves
  // (touch re-triggers the parse); if the file is genuinely broken, name it
  // in one plain sentence instead of letting the UI fail mutely.
  const port = readScaffoldPort(ws);
  const touched = new Set<string>();
  const healFromErrorText = (body: string) => {
      // Any module path in the error body: the emitted trees name their files
      // bare `stories.tsx`, content pages `X.stories.tsx` — match by extension
      // and let the exists-under-workspace filter below do the narrowing.
      const files = [...body.matchAll(/[^\s"'`()]+\.(?:[jt]sx?|mdx)/g)]
        .map((m) => (path.isAbsolute(m[0]) ? m[0] : path.join(ws.storybookDir, m[0])))
        .filter((f) => f.startsWith(ws.root) && fs.existsSync(f));
      for (const file of files) {
        if (touched.has(file)) {
          console.warn(
            `[specs dev] Storybook's index is failing on ${path.relative(ws.root, file)} — the file has a real error. ` +
              'Fix and re-save it; the index recovers on its own. Do not restart Storybook.',
          );
        } else {
          touched.add(file);
          const now = new Date();
          fs.utimesSync(file, now, now); // a re-save clears the cached parse failure
          console.warn(`[specs dev] Storybook index failed on ${path.relative(ws.root, file)} — re-triggered its parse.`);
        }
      }
      if (files.length === 0) {
        console.warn('[specs dev] Storybook index failed — re-save the last story file you touched; do not restart.');
      }
  };

  // Primary trigger: the server's own log line, the instant it prints —
  // detection is immediate, the heal lands within a second or two. The
  // slow poll below is only a backstop for failures that never log.
  const storybookChild = children[children.length - 1];
  for (const stream of [storybookChild.stdout, storybookChild.stderr]) {
    if (!stream) continue;
    let buffer = '';
    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      (stream === storybookChild.stderr ? process.stderr : process.stdout).write(text);
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
        return; // starting up, or stopped — the child exit handler covers death
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

  const stop = () => {
    for (const child of children) child.kill('SIGINT');
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  console.log('[specs dev] watching — edit specs or config; fetch, generate, and render are yours to run.');
  await new Promise(() => {}); // runs until Ctrl-C
}
