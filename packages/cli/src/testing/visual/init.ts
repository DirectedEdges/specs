// `specs testing visual init` — scaffold testing/visual/, declaring the
// customer-installed dependencies. The same contract as `specs storybook
// init` (ADR A): we write a package.json naming Playwright, pixelmatch and
// pngjs; the customer runs the one install this prints; the CLI ships none
// of them and the published package gains no dependency.
//
// --force rewrites the scaffold's own files only — it never touches
// visual-ignore.yaml or anything else hand-kept beside them.
import fs from 'fs-extra';
import path from 'path';
import type { VisualWorkspace } from './paths.js';

const PACKAGE_JSON = {
  name: 'specs-visual-testing',
  private: true,
  version: '0.0.0',
  description:
    'Dependencies for `specs testing visual` — installed by you, resolved by the CLI at runtime.',
  devDependencies: {
    pixelmatch: '^7.2.0',
    playwright: '^1.63.0',
    pngjs: '^7.0.0',
  },
};

const GITIGNORE = `# Per-run outputs, rebuilt on demand.
node_modules/
render/
diff/
# Figma baselines: durable but large, reproducible via \`specs testing visual baseline\`.
figma/
`;

export function runInit(vw: VisualWorkspace, opts: { force?: boolean }): void {
  const pkgPath = path.join(vw.root, 'package.json');
  if (fs.existsSync(pkgPath) && !opts.force) {
    console.log('✓ testing/visual/ is already scaffolded (--force rewrites the scaffold).');
    printInstall(vw);
    return;
  }
  fs.mkdirSync(vw.root, { recursive: true });
  fs.writeFileSync(pkgPath, JSON.stringify(PACKAGE_JSON, null, 2) + '\n');
  const giPath = path.join(vw.root, '.gitignore');
  if (!fs.existsSync(giPath) || opts.force) fs.writeFileSync(giPath, GITIGNORE);
  console.log('✓ scaffolded testing/visual/ — one install, yours, and it is ready:');
  printInstall(vw);
}

function printInstall(vw: VisualWorkspace): void {
  const rel = path.relative(process.cwd(), vw.root) || '.';
  console.log('');
  console.log(`  cd ${rel} && npm install && npx playwright install chromium`);
  console.log('');
  console.log('  Then: manifest → baseline → shoot → diff. `specs testing visual --help` lists the stages.');
}
