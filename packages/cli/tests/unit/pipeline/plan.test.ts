// The two decisions `specs build` and `specs run` make before doing anything
// (ADR-101): which steps this workspace has, and which step a changed file
// belongs to.
//
// Both are invisible when wrong. A run that silently skipped a step looks like
// a transform bug, and a change matched to the wrong step looks like stale
// output — which is the failure the chain exists to remove.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { resolvePlan, entryFor, fromEntry, watchPaths, writtenBy } from '../../../src/pipeline/plan.js';
import { StepError } from '../../../src/pipeline/StepError.js';
import type { Workspace } from '../../../src/storybook/workspace.js';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'specs-plan-'));
});

afterEach(() => fs.removeSync(root));

/**
 * A workspace shaped like the real one, built on disk so the steps' own
 * existence checks are exercised rather than mocked around.
 */
function workspace(parts: {
  data?: string[];
  manifest?: boolean;
  specs?: boolean;
  react?: boolean;
  webcomponents?: boolean;
  storybook?: boolean;
  config?: boolean;
  /** Sources also fetch variables and styles — the token universe analyze reads. */
  foundations?: boolean;
  preserveManualSelections?: boolean;
} = {}): Workspace {
  const dataDir = path.join(root, 'data');
  const specsDir = path.join(root, 'specs');
  const configDir = path.join(root, 'config');

  for (const alias of parts.data ?? []) {
    fs.ensureDirSync(path.join(dataDir, `${alias}.file`));
    fs.writeFileSync(path.join(dataDir, `${alias}.file`, 'root.json'), '{}');
    if (parts.manifest) fs.writeFileSync(path.join(dataDir, `${alias}.manifest.md`), '# manifest\n');
  }
  if (parts.specs) fs.ensureDirSync(path.join(specsDir, 'components', 'Alert'));
  if (parts.react) fs.ensureDirSync(path.join(root, 'react', 'src'));
  if (parts.webcomponents) fs.ensureDirSync(path.join(root, 'webcomponents', 'src'));
  if (parts.storybook) fs.ensureDirSync(path.join(root, 'storybook', '.storybook'));
  if (parts.config) fs.ensureDirSync(configDir);

  return {
    root,
    // The real config directory. `config.configDir` below is deliberately the
    // workspace root, because that is what the loader puts there — the two are
    // different values and conflating them is what made the watcher cover the
    // whole tree.
    configDir: parts.config ? configDir : null,
    config: {
      configDir: root,
      settings: {
        curation: { preserveManualSelections: parts.preserveManualSelections ?? false },
        data: { sources: {} },
      },
    },
    specsDir,
    dataDir,
    assetsDir: path.join(root, 'assets'),
    storybookDir: path.join(root, 'storybook'),
    sources: (parts.data ?? []).map(alias => ({
      alias,
      fetch: parts.foundations ? ['file', 'variables', 'styles'] : ['file'],
    })),
    hasReact: !!parts.react,
    hasWebComponents: !!parts.webcomponents,
    hasSpecs: !!parts.specs,
    componentKeys: [],
    compositionKeys: [],
    scaffolded: !!parts.storybook,
  } as unknown as Workspace;
}

describe('resolvePlan — which steps this workspace has', () => {
  it('includes only the platform trees that exist', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    expect(resolvePlan(ws).steps.map(s => s.id)).toEqual(['scan', 'generate', 'analyze', 'react', 'storybook']);
  });

  it('leaves out generate until a manifest exists — scan writes it first', () => {
    const ws = workspace({ data: ['ds'], specs: true, react: true });
    expect(resolvePlan(ws).steps.map(s => s.id)).toEqual(['scan', 'analyze', 'react']);
  });

  it('keeps dependency order regardless of which steps are present', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, webcomponents: true, storybook: true });
    expect(resolvePlan(ws).steps.map(s => s.id)).toEqual([
      'scan', 'generate', 'analyze', 'react', 'webcomponents', 'storybook',
    ]);
  });

  it('puts analyze after generate and before the targets — storybook publishes its reports', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    const ids = resolvePlan(ws).steps.map(s => s.id);
    expect(ids.indexOf('analyze')).toBeGreaterThan(ids.indexOf('generate'));
    expect(ids.indexOf('analyze')).toBeLessThan(ids.indexOf('react'));
    expect(ids.indexOf('analyze')).toBeLessThan(ids.indexOf('storybook'));
  });

  it('--only runs exactly what it names', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    const plan = resolvePlan(ws, { only: ['react'] });
    expect(plan.steps.map(s => s.id)).toEqual(['react']);
    expect(plan.excluded.map(s => s.id)).toEqual(['scan', 'generate', 'analyze', 'storybook', 'render']);
  });

  it('--skip drops a step and keeps the rest in order', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    expect(resolvePlan(ws, { skip: ['scan'] }).steps.map(s => s.id)).toEqual(['generate', 'analyze', 'react', 'storybook']);
  });

  it('--skip analyze leaves the chain otherwise intact — the targets read no report', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    expect(resolvePlan(ws, { skip: ['analyze'] }).steps.map(s => s.id)).toEqual(['scan', 'generate', 'react', 'storybook']);
  });

  it('refuses --only and --skip together rather than picking one', () => {
    const ws = workspace({ data: ['ds'], manifest: true, react: true });
    expect(() => resolvePlan(ws, { only: ['react'], skip: ['scan'] })).toThrow(StepError);
  });

  it('names the step it did not recognise, and lists the ones it does', () => {
    const ws = workspace({ data: ['ds'], manifest: true, react: true });
    expect(() => resolvePlan(ws, { only: ['reactt'] })).toThrow(/unknown step reactt/);
    expect(() => resolvePlan(ws, { only: ['reactt'] })).toThrow(StepError);
  });

  it('leaves render out unless it is asked for — it writes to a live Figma file', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    expect(plan.steps.map(s => s.id)).not.toContain('render');
    expect(plan.excluded.map(s => s.id)).toContain('render');
  });

  it('adds render on --render, last, after everything that writes to disk', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    const plan = resolvePlan(ws, { render: true });
    expect(plan.steps.map(s => s.id)).toEqual(['scan', 'generate', 'analyze', 'react', 'storybook', 'render']);
  });

  it('accepts render named in --only, which is as explicit as the flag', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    expect(resolvePlan(ws, { only: ['render'] }).steps.map(s => s.id)).toEqual(['render']);
  });

  it('says there is nothing to do rather than reporting an empty success', () => {
    expect(() => resolvePlan(workspace())).toThrow(/nothing to do/);
  });
});

describe('entryFor — which step a changed file belongs to', () => {
  it('starts at scan for new data, so the manifest is rewritten first', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.dataDir, 'ds.file', 'root.json'));
    expect(entry?.step.id).toBe('scan');
  });

  it('starts at generate when the manifest itself is edited — ticking a checkbox is a change', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.dataDir, 'ds.manifest.md'));
    expect(entry?.step.id).toBe('generate');
  });

  it('starts at the first step that reads specs, not at the publish that also watches them', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'));
    expect(entry?.step.id).toBe('analyze');
  });

  it('narrows a spec change to the one component it is inside', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'));
    expect(entry?.components).toEqual(['Alert']);
  });

  it('still narrows a spec change now that analyze is the entry — the targets need the key', () => {
    // analyze ignores the scope and always runs whole, but it is the step a spec
    // change lands on. Declaring its specs input unscoped would widen every spec
    // edit into a full re-emit of both platform trees.
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, webcomponents: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'))!;
    expect(entry.step.id).toBe('analyze');
    expect(entry.components).toEqual(['Alert']);
  });

  it('enters at analyze when fetched variables change — the unused-token report reads them', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, foundations: true });
    const variables = path.join(ws.dataDir, 'ds.variables.json');
    fs.writeJsonSync(variables, {});
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, variables);
    expect(entry?.step.id).toBe('analyze');
    expect(entry?.components).toEqual([]);
  });

  it('does not narrow a config change — one file there decides every component\'s output', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, config: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(root, 'config', 'conventions', 'figma.yaml'));
    expect(entry?.step.id).toBe('analyze');
    expect(entry?.components).toEqual([]);
  });

  it('ignores emitted code — nothing in the chain reads it', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    expect(entryFor(plan, ws, path.join(root, 'react', 'src', 'components', 'Alert', 'Alert.tsx'))).toBeNull();
  });

  it('does NOT ignore specs/ just because generate writes it — downstream flow is the point', () => {
    // The obvious-looking rule, "skip anything a step declares as an output",
    // silently breaks the chain here: specs/ is generate's output and the
    // targets' input, so a spec edit would emit nothing at all.
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    expect(entryFor(plan, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'))?.step.id).toBe('analyze');
  });

  it('ignores a change nothing watches', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    expect(entryFor(plan, ws, path.join(root, 'README.md'))).toBeNull();
  });
});

describe('fromEntry — what runs after the entry step', () => {
  it('runs the entry step and everything downstream, nothing before it', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, webcomponents: true, storybook: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'))!;
    expect(fromEntry(plan, entry).map(s => s.id)).toEqual(['analyze', 'react', 'webcomponents', 'storybook']);
  });

  it('runs the whole chain when the change lands at the head of it', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true });
    const plan = resolvePlan(ws);
    const entry = entryFor(plan, ws, path.join(ws.dataDir, 'ds.file', 'root.json'))!;
    expect(fromEntry(plan, entry).map(s => s.id)).toEqual(['scan', 'generate', 'analyze', 'react', 'storybook']);
  });
});

describe('writtenBy — telling the chain\'s own writes from a person\'s', () => {
  it('reports specs/ as written by a pass that includes generate', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    const pass = plan.steps; // scan → generate → react
    expect(writtenBy(pass, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'))).toBe(true);
  });

  it('does not claim specs/ when the running pass starts after generate', () => {
    // A spec someone saves while a react-only pass is in flight is theirs, and
    // dropping it would lose the edit until they saved again.
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    const reactOnward = plan.steps.filter(s => s.id === 'react');
    expect(writtenBy(reactOnward, ws, path.join(ws.specsDir, 'components', 'Alert', 'api.yaml'))).toBe(false);
  });

  it('reports the manifest as written by a pass that includes scan', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const plan = resolvePlan(ws);
    expect(writtenBy(plan.steps, ws, path.join(ws.dataDir, 'ds.manifest.md'))).toBe(true);
  });
});

describe('watchPaths', () => {
  it('lists each watched path once, however many steps read it', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, webcomponents: true, storybook: true, config: true });
    const paths = watchPaths(resolvePlan(ws), ws);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain(ws.specsDir);
    expect(paths).toContain(path.join(root, 'config'));
  });

  it('never watches the workspace root', () => {
    // It once did: `config.configDir` holds the directory *containing*
    // config/, so reading it as the config directory put node_modules, .git
    // and every emitted tree under the watcher. Hand-editing a generated file
    // then kicked off a full re-emit that overwrote the edit.
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, webcomponents: true, storybook: true, config: true });
    expect(watchPaths(resolvePlan(ws), ws)).not.toContain(root);
  });

  it('never watches an emitted tree — nothing in the chain reads one', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, webcomponents: true, storybook: true, config: true });
    const paths = watchPaths(resolvePlan(ws), ws);
    for (const emitted of ['react', 'webcomponents', 'storybook']) {
      expect(paths.some(p => p === path.join(root, emitted) || p.startsWith(path.join(root, emitted) + path.sep))).toBe(false);
    }
  });

  it('watches the manifest as a file, not as a directory to join names onto', () => {
    // The watcher callback gives a name relative to the watched directory. For a
    // file target that name is the file itself, so joining produced
    // `…/manifest.md/manifest.md` — a path nothing could stat, which disabled
    // duplicate-event detection while still matching by prefix. One edit then
    // ran the whole chain twice.
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true });
    const manifest = path.join(ws.dataDir, 'ds.manifest.md');
    expect(watchPaths(resolvePlan(ws), ws)).toContain(manifest);
    expect(fs.statSync(manifest).isFile()).toBe(true);
    expect(entryFor(resolvePlan(ws), ws, path.join(manifest, 'ds.manifest.md'))?.step.id).toBe('generate');
  });

  it('does not treat a change in emitted output as something to act on', () => {
    const ws = workspace({ data: ['ds'], manifest: true, specs: true, react: true, storybook: true, config: true });
    const plan = resolvePlan(ws);
    expect(entryFor(plan, ws, path.join(root, 'react', 'src', 'components', 'DsButton', 'scaffold.tsx'))).toBeNull();
    expect(entryFor(plan, ws, path.join(root, 'storybook', 'content', 'components', 'tabs.json'))).toBeNull();
  });
});
