// Scaffolded by `specs storybook init`. Yours after that: `init` never rewrites
// it without --force, and `specs storybook` (publish) never touches it.
// What is safe to edit and what gets rewritten: everything under content/ is
// generated and rewritten wholesale; content-overrides/ is yours and always wins.
import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const workspaceRoot = path.resolve(__dirname, '../..');
const contentDir = path.resolve(__dirname, '../content');
const overridesDir = path.resolve(__dirname, '../content-overrides');
const baselinesDir = path.resolve(__dirname, '../visualtesting/baselines');

// Generated elements under ../../webcomponents/ import 'lit' from outside this
// project root, where node resolution finds no node_modules — pin it here.
function litAlias(): Record<string, string> {
  try {
    const litDir = path.dirname(require.resolve('lit'));
    return { 'lit/': `${litDir}/`, lit: litDir };
  } catch {
    return {};
  }
}

/**
 * Generated pages with override resolution: for every *.stories.tsx under
 * content/, the file at the same relative path under content-overrides/ wins
 * when it exists. Taking control of a page is one copied file; a publish can
 * never destroy it because no command writes into content-overrides/.
 */
function contentStories(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.stories\.tsx?$/.test(entry.name)) {
        const override = path.join(overridesDir, path.relative(contentDir, full));
        out.push(fs.existsSync(override) ? override : full);
      }
    }
  };
  walk(contentDir);
  return out;
}

/**
 * The running Storybook republishes itself: edit anything under config/ (the
 * conventions file included) or specs/ and `specs storybook publish` re-runs,
 * Vite picks up the rewritten content, and the open page refreshes. Publish is
 * idempotent and diff-writing, so a change that affects nothing writes nothing
 * and the loop goes quiet. Manual publish is only for when no server is up.
 *
 * assets/ is watched for the same reason — the modes manifest and the icons
 * directory are publish inputs. The emitted react/ and webcomponents/ trees
 * need nothing here: they are in Vite's own module graph via the story globs,
 * so a transform run already hot-reloads them.
 */
function specsPublishOnChange() {
  const root = path.resolve(__dirname, '../..');
  let running = false;
  let queued = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (running) { queued = true; return; }
    running = true;
    const { execFile } = require('node:child_process') as typeof import('node:child_process');
    execFile('specs', ['storybook', 'publish'], { cwd: root }, (error: Error | null, stdout: string, stderr: string) => {
      running = false;
      const out = `${stdout ?? ''}${stderr ?? ''}`.trim();
      if (out && !/nothing changed/i.test(out)) console.log(`[specs] ${out.split('\n').pop()}`);
      if (error && !out) console.warn('[specs] publish-on-change unavailable — is the specs CLI installed? Edit → run `specs storybook` yourself.');
      if (queued) { queued = false; run(); }
    });
  };
  const relevant = (file: string) =>
    (file.startsWith(path.join(root, 'config') + path.sep) ||
      file.startsWith(path.join(root, 'specs') + path.sep) ||
      file.startsWith(path.join(root, 'assets') + path.sep)) &&
    !file.includes(`${path.sep}storybook${path.sep}`);
  return {
    name: 'specs-publish-on-change',
    configureServer(server: { watcher: { add(p: string[]): void; on(e: string, cb: (file: string) => void): void } }) {
      server.watcher.add([path.join(root, 'config'), path.join(root, 'specs'), path.join(root, 'assets')]);
      server.watcher.on('all', ((_event: string, file: string) => {
        if (typeof file !== 'string' || !relevant(file)) return;
        clearTimeout(timer);
        timer = setTimeout(run, 300);
      }) as unknown as (file: string) => void);
    },
  };
}

const config: StorybookConfig = {
  stories: [
    ...contentStories(),
    // Components and compositions, for the platform trees the workspace emitted.
    ...(fs.existsSync(path.join(workspaceRoot, 'react/src'))
      ? ['../../react/src/components/**/stories.tsx', '../../react/src/compositions/**/stories.tsx']
      : []),
    ...(fs.existsSync(path.join(workspaceRoot, 'webcomponents/src'))
      ? ['../../webcomponents/src/components/**/stories.ts', '../../webcomponents/src/compositions/**/stories.ts']
      : []),
  ],
  // Controls (props panel), Actions, Docs — argTypes come from react-docgen
  // over the generated scaffolds' prop interfaces.
  addons: ['@storybook/addon-essentials'],
  // The sidebar shows only the Docs entry per component, so the component name
  // is the link rather than a parent with an indented Docs child.
  docs: {
    docsMode: true,
    // Only surfaces where a component has subcomponents — docsMode collapses a
    // lone Docs child into the component link, so leaf components never show it.
    defaultName: 'Overview',
  },
  // Fetched assets, served where generated code expects them. Only asset kinds
  // the workspace has produce entries.
  staticDirs: [
    ...(fs.existsSync(path.join(workspaceRoot, 'assets/icons')) ? [{ from: '../../assets/icons', to: '/assets/icons' }] : []),
    ...(fs.existsSync(path.join(workspaceRoot, 'assets/images')) ? [{ from: '../../assets/images', to: '/assets/images' }] : []),
    ...(fs.existsSync(path.join(workspaceRoot, 'assets/fonts')) ? [{ from: '../../assets/fonts', to: '/assets/fonts' }] : []),
    ...(fs.existsSync(baselinesDir) ? [{ from: '../visualtesting/baselines', to: '/baselines' }] : []),
    // The Specs tab reads authored spec YAML over HTTP.
    ...(fs.existsSync(path.join(workspaceRoot, 'specs')) ? [{ from: '../../specs', to: '/specs' }] : []),
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(cfg) {
    cfg.plugins = [...(cfg.plugins ?? []), specsPublishOnChange()];
    cfg.resolve = {
      ...cfg.resolve,
      alias: {
        ...(cfg.resolve?.alias as Record<string, string> | undefined),
        ...litAlias(),
      },
    };
    cfg.server = {
      ...cfg.server,
      fs: {
        ...cfg.server?.fs,
        // Serve files from the whole workspace (specs/, emitted trees).
        allow: [workspaceRoot],
        // `specs react` / `specs webcomponents` delete and recreate generated
        // files; Vite's cached existence checks go stale on recreated
        // directories and 404 them.
        cachedChecks: false,
      },
    };
    return cfg;
  },
};

export default config;
