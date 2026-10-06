// The chain itself (ADR-101): which steps exist, what each one reads and writes,
// and when a workspace has something for it to do.
//
// This is the single place the order lives. It used to live in the order a
// person typed commands, which is why a forgotten `specs react` left Storybook
// showing the previous emission with nothing to say so.
//
// `specs fetch` is deliberately absent. Its input is the Figma file, which the
// CLI cannot watch, so no change could ever start it — it is something a person
// runs, and what it writes into `data/` is picked up from `scan` onward.
import fs from 'fs-extra';
import path from 'path';
import type { Step, StepContext, StepInput } from './types.js';
import { StepError } from './types.js';
import type { Workspace } from '../storybook/workspace.js';
import { resolveSpecsLayout, SPEC_KINDS, dirNameFor } from '../utilities/specsLayout.js';

/**
 * The component key a changed spec file belongs to, or null when the change is
 * not confined to one component.
 *
 * Only paths *inside* a spec folder scope. A file sitting loose at the specs
 * root belongs to no component, and guessing one would emit the wrong thing.
 */
function specScope(specsDir: string, changed: string): string[] | null {
  const relative = path.relative(specsDir, changed);
  if (!relative || relative.startsWith('..')) return null;

  const segments = relative.split(path.sep);
  const layout = resolveSpecsLayout(specsDir);

  if (layout.legacy) {
    // Flat layout: specs/<key>/api.yaml
    return segments.length >= 2 ? [segments[0]] : null;
  }

  // specs/<kind>/<key>/api.yaml
  const kindDirs = SPEC_KINDS.map(dirNameFor);
  if (segments.length >= 3 && kindDirs.includes(segments[0])) return [segments[1]];
  return null;
}

/** Data sources with a file payload on disk, in either the split or single-file shape. */
function filePayloads(ws: Workspace): Array<{ alias: string; input: string; manifest: string }> {
  return ws.sources
    .filter(source => source.fetch.includes('file'))
    .map(source => {
      const splitDir = path.join(ws.dataDir, `${source.alias}.file`);
      const single = path.join(ws.dataDir, `${source.alias}.file.json`);
      return {
        alias: source.alias,
        input: fs.existsSync(splitDir) ? splitDir : single,
        manifest: path.join(ws.dataDir, `${source.alias}.manifest.md`),
      };
    })
    .filter(entry => fs.existsSync(entry.input));
}

/** `config/`, watched by every step that reads conventions or settings. */
function configInput(ws: Workspace): StepInput[] {
  const dir = ws.config.configDir;
  // A config change decides the shape of every component's output, so it is
  // never scoped to one of them.
  return dir && fs.existsSync(dir) ? [{ path: dir, scope: () => null }] : [];
}

const scan: Step = {
  id: 'scan',
  label: 'scan',
  active: ws => filePayloads(ws).length > 0,
  inputs: ws => filePayloads(ws).map(p => ({ path: p.input, scope: () => null })),
  // The manifest is this step's output, so writing it must not start it again.
  // It is also `generate`'s input, which is what makes ticking a checkbox
  // regenerate what it selected.
  outputs: ws => filePayloads(ws).map(p => p.manifest),
  async run(context) {
    const { runScan } = await import('../commands/ScanCommand.js');
    const payloads = filePayloads(context.workspace);
    for (const payload of payloads) {
      await runScan(undefined, {
        source: payload.alias,
        config: context.configPath,
        verbose: context.verbose,
        includeAll: false,
        keepChecks: false,
        resetChecks: false,
      });
    }
    return { detail: `${payloads.length} source${payloads.length === 1 ? '' : 's'}` };
  },
};

const generate: Step = {
  id: 'generate',
  label: 'generate',
  active: ws => filePayloads(ws).some(p => fs.existsSync(p.manifest)),
  inputs: ws => filePayloads(ws).map(p => ({ path: p.manifest, scope: () => null })),
  outputs: ws => [ws.specsDir],
  async run(context) {
    const { runGenerate } = await import('../commands/GenerateCommand.js');
    const result = await runGenerate(undefined, {
      config: context.configPath,
      verbose: context.verbose,
      component: context.components.length === 1 ? context.components[0] : undefined,
    });
    return { detail: result.detail };
  },
};

/** `react` and `webcomponents` differ only in which tree they emit into. */
function targetStep(id: 'react' | 'webcomponents', tree: string): Step {
  return {
    id,
    label: id,
    active: ws => (id === 'react' ? ws.hasReact : ws.hasWebComponents),
    inputs: ws => [
      { path: ws.specsDir, scope: changed => specScope(ws.specsDir, changed) },
      ...configInput(ws),
    ],
    outputs: ws => [path.join(ws.root, tree, 'src')],
    async run(context) {
      const { emitTarget } = await import('../commands/TargetCommands.js');
      const result = await emitTarget(id, {
        config: context.configPath,
        components: context.components.length > 0 ? context.components : undefined,
        verbose: context.verbose,
      });
      if (result.failed > 0) {
        throw new StepError(`${result.failed} component${result.failed === 1 ? '' : 's'} failed to emit`);
      }
      return { detail: `${result.succeeded} component${result.succeeded === 1 ? '' : 's'}` };
    },
  };
}

const storybook: Step = {
  id: 'storybook',
  label: 'storybook publish',
  active: ws => ws.scaffolded,
  inputs: ws => [
    { path: ws.specsDir, scope: () => null },
    ...configInput(ws),
    ...(fs.existsSync(ws.assetsDir) ? [{ path: ws.assetsDir, scope: () => null }] : []),
  ],
  outputs: ws => [path.join(ws.storybookDir, 'content')],
  async run(context) {
    const { publish } = await import('../storybook/publish.js');
    const result = await publish(context.workspace);
    const changed = Object.values(result.concerns).reduce((sum, counts) => sum + counts.changed, 0);
    return { detail: changed > 0 ? `${changed} file${changed === 1 ? '' : 's'} changed` : 'already current' };
  },
};

/**
 * Rendering specs back into the connected Figma file.
 *
 * The only step that writes somewhere other than disk, which is why it is off
 * unless asked for. Two consequences follow from that, and both are deliberate:
 *
 *  - It is last. Nothing reads what it writes, so nothing depends on it.
 *  - It does not overwrite in a one-shot build. Overwriting deletes an existing
 *    same-titled page component first, which is the normal case when a watch
 *    loop re-renders the component you just edited, and a destructive surprise
 *    in a build someone ran once. `specs render --overwrite` is still there for
 *    doing it on purpose.
 */
const render: Step = {
  id: 'render',
  label: 'render',
  active: ws => ws.hasSpecs,
  inputs: ws => [{ path: ws.specsDir, scope: changed => specScope(ws.specsDir, changed) }],
  // Writes to Figma, not to disk. Nothing local to suppress.
  outputs: () => [],
  async run(context) {
    const { runRender } = await import('../commands/RenderCommand.js');
    const result = await runRender({
      config: context.configPath,
      components: context.components.length > 0 ? context.components : undefined,
      overwrite: context.watching,
      file: context.fileKey,
    });
    if (result.skipped) return { skipped: true, detail: result.skipped };
    return { detail: `${result.rendered} component${result.rendered === 1 ? '' : 's'}` };
  },
};

/** Every step, in dependency order. */
export const STEPS: readonly Step[] = [
  scan,
  generate,
  targetStep('react', 'react'),
  targetStep('webcomponents', 'webcomponents'),
  storybook,
  render,
];

/** The steps off unless asked for by name — see `render` above. */
export const OPT_IN: ReadonlySet<string> = new Set<string>(['render']);

export function stepById(id: string): Step | undefined {
  return STEPS.find(step => step.id === id);
}

export type { Step, StepContext };
