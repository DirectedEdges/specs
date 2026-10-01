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
