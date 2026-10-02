// `specs storybook init` — scaffold the host, once. Writes package.json,
// tsconfig.json and .storybook/*, creates content-overrides/, and seeds
// content/components/tabs.json so the manager's build-time import resolves
// before the first publish. Prints the install step; the customer installs
// Storybook — we never ship or vendor it (ADR A decision 1).
import fs from 'fs-extra';
import path from 'path';
import type { Workspace } from './workspace.js';
import { readTemplate, renderTemplate, templatesHash } from './templates.js';
import { deriveTabs, deriveModes } from './concerns/components/index.js';

declare const __SPECS_CLI_VERSION__: string;

export interface InitOptions {
  force: boolean;
  port: string;
}

export interface InitResult {
  written: string[];
  port: string;
}

/** Files init owns. `--force` rewrites exactly these — never content/ or content-overrides/. */
const HOST_FILES: Array<{ out: string; template: string }> = [
  { out: 'package.json', template: 'package.json.tpl' },
  { out: 'tsconfig.json', template: 'tsconfig.json.tpl' },
  { out: '.storybook/main.ts', template: 'main.ts.tpl' },
  { out: '.storybook/preview.tsx', template: 'preview.tsx.tpl' },
  { out: '.storybook/manager.tsx', template: 'manager.tsx.tpl' },
  { out: '.storybook/manager-head.html', template: 'manager-head.html.tpl' },
  { out: '.storybook/ComponentDocs.tsx', template: 'ComponentDocs.tsx.tpl' },
];

export function init(ws: Workspace, options: InitOptions): InitResult {
  const dotStorybook = path.join(ws.storybookDir, '.storybook');
  if (fs.existsSync(dotStorybook) && !options.force) {
    throw new Error(
      `storybook/.storybook/ already exists — the host is scaffolded.\n` +
      `  To refresh what the host shows, run: specs storybook\n` +
      `  To rewrite the host config itself (your edits to it are lost), run: specs storybook init --force`,
    );
  }

  const workspaceName = path.basename(ws.root);
  const cssvarsPath = path.join(ws.assetsDir, 'cssvars', 'cssvars.css');
  const vars: Record<string, string> = {
    WORKSPACE_NAME: workspaceName,
    PORT: options.port,
    // Only asset kinds present produce config entries (specs#610): a workspace
    // that never emitted a platform gets the import commented, not broken.
    CSSVARS_IMPORT: fs.existsSync(cssvarsPath)
      ? "import '../../assets/cssvars/cssvars.css';"
      : "// No generated stylesheet yet — after `specs react` or `specs webcomponents`, uncomment:\n// import '../../assets/cssvars/cssvars.css';",
  };

  const written: string[] = [];
  for (const file of HOST_FILES) {
    const out = path.join(ws.storybookDir, file.out);
    fs.ensureDirSync(path.dirname(out));
    fs.writeFileSync(out, renderTemplate(readTemplate(file.template), vars));
    written.push(path.join('storybook', file.out));
  }

  // The scaffold stamp: which CLI templates built this host. Publish compares
  // it so a host left behind by an upgrade is announced, never silently stale.
  fs.writeFileSync(
    path.join(dotStorybook, 'scaffold.json'),
    JSON.stringify({ templates: templatesHash(), cli: typeof __SPECS_CLI_VERSION__ !== 'undefined' ? __SPECS_CLI_VERSION__ : 'dev' }, null, 2) + '\n',
  );
  written.push(path.join('storybook', '.storybook', 'scaffold.json'));

  // The override tree: the customer's, from the start. No command writes into it.
  fs.ensureDirSync(path.join(ws.storybookDir, 'content-overrides'));

  // Seed tabs.json: the manager imports it at build time, so it must exist
  // before the first publish. Publish rewrites it from the same derivation.
  const tabsFile = path.join(ws.storybookDir, 'content', 'components', 'tabs.json');
  if (!fs.existsSync(tabsFile)) {
    fs.ensureDirSync(path.dirname(tabsFile));
    fs.writeFileSync(tabsFile, JSON.stringify(deriveTabs(ws), null, 2) + '\n');
    written.push(path.join('storybook', 'content', 'components', 'tabs.json'));
  }

  // Seed modes.json for the same reason: the scaffolded preview imports it.
  const modesFile = path.join(ws.storybookDir, 'content', 'components', 'modes.json');
  if (!fs.existsSync(modesFile)) {
    fs.writeFileSync(modesFile, JSON.stringify(deriveModes(ws, ws.config.conventions.storybook?.modes), null, 2) + '\n');
    written.push(path.join('storybook', 'content', 'components', 'modes.json'));
  }

  return { written, port: options.port };
}
