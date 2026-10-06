// A scoped render must not report success for components it never rendered.
//
// `--components` warns and skips a name it cannot find, which is right when
// some names matched. When *none* did, success means a typo in a CI invocation
// passes green having rendered nothing — the one outcome a scoped run must not
// produce. Caught by running it; kept honest here.
//
// Nothing below reaches the bridge: the guard runs before the first render, so
// a zero-match call throws without a Figma file anywhere in sight.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { runRender } from '../../../src/commands/RenderCommand.js';
import { StepError } from '../../../src/pipeline/StepError.js';

let root: string;
let cwd: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'specs-render-scope-'));
  fs.ensureDirSync(path.join(root, 'config'));
  fs.writeFileSync(
    path.join(root, 'config', 'settings.yaml'),
    ['spec:', '  directory: ./specs', ''].join('\n'),
  );
  // Two component folders, each shaped the way the loader recognises one.
  for (const key of ['dsButton', 'dsBlock']) {
    const dir = path.join(root, 'specs', 'components', key);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'api.yaml'), `title: ${key}\n`);
    fs.writeFileSync(path.join(dir, 'variants.yaml'), 'variants: []\n');
  }
  cwd = process.cwd();
  process.chdir(root);
});

afterEach(() => {
  process.chdir(cwd);
  fs.removeSync(root);
  vi.restoreAllMocks();
});

describe('runRender — scoping by component', () => {
  it('fails when none of the named components exist, rather than rendering nothing and passing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(runRender({ components: ['nope', 'alsoNope'] })).rejects.toThrow(StepError);
    await expect(runRender({ components: ['nope'] })).rejects.toThrow(/none of the named components exist/);
  });

  it('names every component it could not find, so a typo is identifiable', async () => {
    const warnings: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => void warnings.push(args.join(' ')));
    await expect(runRender({ components: ['nope', 'alsoNope'] })).rejects.toThrow(StepError);
    expect(warnings.join('\n')).toContain('nope');
    expect(warnings.join('\n')).toContain('alsoNope');
  });

  it('refuses before contacting the bridge — a wrong name is not a network problem', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // No bridge is running in this test, and the thrown error says what is
    // actually wrong rather than reporting a connection failure.
    await expect(runRender({ components: ['nope'] })).rejects.toThrow(/none of the named components exist/);
  });

  it('stops when there is no specs directory to render from', async () => {
    fs.removeSync(path.join(root, 'specs'));
    await expect(runRender({ components: ['dsButton'] })).rejects.toThrow(/specs directory not found/);
  });
});
