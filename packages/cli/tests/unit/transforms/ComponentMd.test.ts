import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { ComponentMdTransformer } from '../../../src/transforms/ComponentMd.js';
import type { ProcessingStates } from '../../../src/transforms/states.js';

const transformer = new ComponentMdTransformer();

function makeContext(dir: string, componentKey = 'dsButton', processingStates?: ProcessingStates) {
  return { outputDir: dir, componentKey, tokensFormat: 'TOKEN', outputFormat: 'YAML' as const, processingStates };
}

async function run(
  dir: string,
  apiYaml: Record<string, unknown>,
  variantsYaml?: Record<string, unknown>,
  processingStates?: ProcessingStates,
) {
  if (variantsYaml) {
    await fs.writeFile(path.join(dir, 'variants.yaml'), yaml.stringify(variantsYaml), 'utf-8');
  }
  await transformer.run(apiYaml, makeContext(dir, 'dsButton', processingStates));
  return fs.readFile(path.join(dir, 'component.md'), 'utf-8');
}

describe('ComponentMdTransformer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'component-md-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('has name "component-md"', () => {
    expect(transformer.name).toBe('component-md');
  });

  it('writes component.md with the title as H1 and a regeneration note', async () => {
    const out = await run(tmpDir, { title: 'DS Button' });
    expect(out).toContain('# DS Button');
    expect(out).toContain('specs transform component-md');
  });

  it('falls back to componentKey when there is no title', async () => {
    const out = await run(tmpDir, {});
    expect(out).toContain('# dsButton');
  });

  it('emits an overview with counts and variant axes', async () => {
    const out = await run(
      tmpDir,
      {
        title: 'DS Button',
        anatomy: { root: { type: 'container' }, label: { type: 'text' } },
        props: {
          variant: { type: 'string', default: 'primary', enum: ['primary', 'secondary'] },
          disabled: { type: 'boolean', default: false },
        },
      },
      { default: {}, variants: [{ configuration: { disabled: true } }] },
    );
    expect(out).toContain('2 props, 2 anatomy elements, 1 variant delta');
    expect(out).toContain('**Variant axes.**');
    expect(out).toContain('`variant` (primary · secondary; default `primary` — no style impact recorded)');
    expect(out).toContain('`disabled` (boolean; default `false`)');
    expect(out).toContain('**Contents.** 1 variant deltas · 1 layout tree · configuration space 4');
  });

  it('emits the props table with enum values and defaults', async () => {
    const out = await run(tmpDir, {
      props: { size: { type: 'string', default: 'medium', enum: ['small', 'medium', 'large'] } },
    });
    expect(out).toContain('| `size` | enum | `medium` | `small` `medium` `large` |');
  });

  it('marks browser-driven state props as omitted from the contract', async () => {
    const states: ProcessingStates = { hover: { prop: 'state', value: 'hover' } };
    const out = await run(
      tmpDir,
      { props: { state: { type: 'string', default: 'rest', enum: ['rest', 'hover'] } } },
      undefined,
      states,
    );
    expect(out).toContain('browser-driven state — omitted from `contract.ts`');
    expect(out).toContain('## States');
    expect(out).toContain('| `hover` | `state` | `hover` | `:hover` | omitted — browser-driven |');
  });

  it('excludes state concepts whose value cannot match the enum', async () => {
    const states: ProcessingStates = {
      hover: { prop: 'state', value: 'hover' },
      'focus-within': { prop: 'state', value: 'focused' },
    };
    const out = await run(
      tmpDir,
      { props: { state: { type: 'string', default: 'rest', enum: ['rest', 'hover'] } } },
      undefined,
      states,
    );
    expect(out).toContain('`:hover`');
    expect(out).not.toContain('focus-within');
  });

  it('renders anatomy with $ref instanceOf as the pointer basename', async () => {
    const out = await run(tmpDir, {
      anatomy: { icon: { type: 'instance', instanceOf: { $ref: '#/subcomponents/startVisual' } } },
    });
    expect(out).toContain('| `icon` | instance | `startVisual` |');
  });

  it('notes detectedIn anatomy elements', async () => {
    const out = await run(tmpDir, {
      anatomy: { focusRing: { type: 'container', detectedIn: 'State=Focus' } },
    });
    expect(out).toContain('detected in `State=Focus`');
  });

  it('renders the default layout tree and deduplicates identical variant layouts', async () => {
    const out = await run(
      tmpDir,
      { anatomy: { root: { type: 'container' } } },
      {
        default: { layout: [{ root: ['icon'] }] },
        variants: [
          { configuration: { state: 'hover' }, layout: [{ root: ['leftIcon'] }] },
          { configuration: { state: 'active' }, layout: [{ root: ['leftIcon'] }] },
        ],
      },
    );
    expect(out).toContain('### Default');
    expect(out).toContain('- root\n  - icon');
    expect(out).toContain('**`state: hover`** · **`state: active`**');
    // The shared tree renders once
    expect(out.match(/- root\n {2}- leftIcon/g)).toHaveLength(1);
  });

  it('renders token references verbatim with their $type', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {
          elements: {
            root: { styles: { backgroundColor: { $token: 'DS Color/Action/Initial', $type: 'color' } } },
          },
        },
      },
    );
    expect(out).toContain('`DS Color/Action/Initial` (color)');
  });

  it('flattens padding sides and effects shadows', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {
          elements: {
            root: {
              styles: {
                padding: { top: 0, start: 8 },
                effects: { shadows: [{ visible: true, offsetX: 0, offsetY: 1, blur: 3, spread: 1, color: '#000000' }] },
              },
            },
          },
        },
      },
    );
    expect(out).toContain('| `padding.top` | `0` |');
    expect(out).toContain('| `padding.start` | `8` |');
    expect(out).toContain('| `effects.shadows` | `0 1 3 1 #000000` |');
  });

  it('builds the color inversion table with variant overrides', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {
          elements: { root: { styles: { backgroundColor: { $token: 'Color/Initial', $type: 'color' } } } },
        },
        variants: [
          {
            configuration: { state: 'hover' },
            elements: { root: { styles: { backgroundColor: { $token: 'Color/Hover', $type: 'color' } } } },
          },
        ],
      },
    );
    expect(out).toContain('## Color');
    expect(out).toContain('`state: hover` → `Color/Hover` (color)');
  });

  it('keeps color deltas out of the variant deltas section', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: { elements: {} },
        variants: [
          {
            configuration: { state: 'hover' },
            elements: {
              root: {
                styles: {
                  backgroundColor: { $token: 'Color/Hover', $type: 'color' },
                  height: 36,
                },
              },
            },
          },
        ],
      },
    );
    const deltas = out.slice(out.indexOf('## Variant deltas'));
    expect(deltas).toContain('| `root` | `height` | `36` |');
    expect(deltas).not.toContain('Color/Hover');
  });

  it('documents prop bindings, including conditional visibility', async () => {
    const out = await run(
      tmpDir,
      {
        props: {
          label: { type: 'string' },
          children: { type: 'slot', default: null },
        },
      },
      {
        default: {
          elements: {
            label: { content: { $binding: '#/props/label' } },
            children: {
              styles: {
                visible: {
                  if: {
                    condition: { operation: 'isNull', args: { value: { $binding: '#/props/children' } } },
                    then: false,
                    else: true,
                  },
                },
              },
            },
          },
        },
      },
    );
    expect(out).toContain('## Bindings');
    expect(out).toContain('| `label` | `content` | `label` | direct |');
    expect(out).toContain('| `children` | `visible` | `children` | `children` isNull |');
    // Conditional style value carries the then/else outcome
    expect(out).toContain('if `children` isNull → false : true');
  });

  it('lists invalid variant combinations', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {},
        variants: [],
        invalidVariantCombinations: [{ disabled: true, state: 'hover' }],
      },
    );
    expect(out).toContain('## Invalid combinations');
    expect(out).toContain('- `disabled: true, state: hover`');
  });

  it('writes subcomponent component.md files and links them', async () => {
    const out = await run(tmpDir, {
      title: 'DS Button',
      subcomponents: {
        counter: { title: 'DS Counter', props: { count: { type: 'number', default: 0 } } },
      },
    });
    expect(out).toContain('## Subcomponents');
    expect(out).toContain('[`counter`](counter/component.md)');
    const sub = await fs.readFile(path.join(tmpDir, 'counter', 'component.md'), 'utf-8');
    expect(sub).toContain('# DS Counter');
    expect(sub).toContain('Subcomponent of `dsButton`');
    expect(sub).toContain('| `count` | number | `0` |');
  });

  it('summarizes instance examples with non-default configurations', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'examples.yaml'),
      yaml.stringify({
        instanceExamples: {
          primaryExample: { propConfigurations: { size: 'l', label: 'Book now' } },
        },
      }),
      'utf-8',
    );
    const out = await run(tmpDir, {
      props: { size: { type: 'string', default: 'm', enum: ['s', 'm', 'l'] }, label: { type: 'string' } },
    });
    expect(out).toContain('## Examples');
    expect(out).toContain('| `primaryExample` | `size: l, label: Book now` |');
  });

  it('filters default-valued props out of example configurations', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'examples.yaml'),
      yaml.stringify({
        instanceExamples: {
          plain: { propConfigurations: { size: 'm' } },
        },
      }),
      'utf-8',
    );
    const out = await run(tmpDir, {
      props: { size: { type: 'string', default: 'm', enum: ['s', 'm', 'l'] } },
    });
    expect(out).toContain('| `plain` | `(all defaults)` |');
  });

  it('renders provenance from metadata', async () => {
    const out = await run(tmpDir, {
      metadata: {
        author: 'Nathan',
        lastUpdated: '2026-07-01T00:00:00.000Z',
        generator: { name: 'specs-cli', version: '0.24.0' },
        schema: { version: '0.23.0' },
        source: { nodeId: '1:2' },
      },
    });
    expect(out).toContain('author Nathan');
    expect(out).toContain('generator specs-cli v0.24.0');
    expect(out).toContain('schema 0.23.0');
    expect(out).toContain('source node 1:2');
  });

  it('emits content and instanceOf rows in element styles and variant deltas', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {
          elements: { decorativeIcon: { content: 'info', styles: { width: 16 } } },
        },
        variants: [
          {
            configuration: { appearance: 'success' },
            elements: { decorativeIcon: { content: 'check' } },
          },
          {
            configuration: { size: 'l' },
            elements: { startVisual: { instanceOf: 'startVisualL' } },
          },
        ],
      },
    );
    expect(out).toContain('| `content` | `info` |');
    expect(out).toContain('| `decorativeIcon` | `content` | `check` |');
    expect(out).toContain('| `startVisual` | `instanceOf` | `startVisualL` |');
  });

  it('includes variant-scoped bindings with a When column', async () => {
    const out = await run(
      tmpDir,
      { props: { value: { type: 'string' } } },
      {
        default: { elements: {} },
        variants: [
          {
            configuration: { focused: true },
            elements: { value: { content: { $binding: '#/props/value' } } },
          },
        ],
      },
    );
    expect(out).toContain('| `value` | `content` | `value` | direct | `focused: true` |');
    expect(out).toContain('bound to `value.content` (when `focused: true`)');
  });

  it('filters impossible boolean state values and adds unclassified enum rows', async () => {
    const states: ProcessingStates = {
      hover: { prop: 'state', value: 'hover' },
      indeterminate: { prop: 'selected', value: 'indeterminate' },
    };
    const out = await run(
      tmpDir,
      {
        props: {
          state: { type: 'string', default: 'Rest', enum: ['Rest', 'Hover', 'Focus'] },
          selected: { type: 'boolean', default: false },
        },
      },
      undefined,
      states,
    );
    // Boolean prop cannot be activated by a non-boolean value
    expect(out).not.toContain('indeterminate');
    // Value casing follows the enum
    expect(out).toContain('| `hover` | `state` | `Hover` |');
    // Unmapped non-default enum value surfaces as unclassified
    expect(out).toContain('| — | `state` | `Focus` | — | unclassified — no concept mapping |');
  });

  it('renders token-valued effects as a single token row', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  $token: 'Shadow theme/Medium elevation',
                  $type: 'effects',
                  $extensions: { 'com.figma': { id: 'x', name: 'Medium elevation' } },
                },
              },
            },
          },
        },
      },
    );
    expect(out).toContain('| `effects` | `Shadow theme/Medium elevation` (effects) |');
    expect(out).not.toContain('$extensions');
  });

  it('appends rawValue to token references when present', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: {
          elements: {
            root: {
              styles: {
                strokes: {
                  $token: 'Color/Outline',
                  $type: 'color',
                  $extensions: { 'com.figma': { rawValue: { hex: '#818494' } } },
                },
                itemSpacing: {
                  $token: 'Constants/Spacing/1x',
                  $type: 'dimension',
                  $extensions: { 'com.figma': { rawValue: 4 } },
                },
              },
            },
          },
        },
      },
    );
    expect(out).toContain('`Color/Outline` (color, #818494)');
    expect(out).toContain('`Constants/Spacing/1x` (dimension, 4)');
  });

  it('renders null style values as unset', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: { elements: {} },
        variants: [
          { configuration: { size: 'm' }, elements: { root: { styles: { width: null } } } },
        ],
      },
    );
    expect(out).toContain('| `root` | `width` | unset |');
  });

  it('normalizes detectedIn to prop vocabulary', async () => {
    const out = await run(tmpDir, {
      props: {
        appearance: { type: 'string', default: 'solid', enum: ['solid', 'outline'] },
        disabled: { type: 'boolean', default: false },
      },
      anatomy: { focusRing: { type: 'container', detectedIn: 'Appearance=Solid, Disabled=False' } },
    });
    expect(out).toContain('detected in `appearance: solid, disabled: false`');
  });

  it('adds a Presence column to the anatomy table', async () => {
    const out = await run(
      tmpDir,
      {
        anatomy: {
          root: { type: 'container' },
          icon: { type: 'instance' },
          leftIcon: { type: 'instance' },
        },
      },
      {
        default: { layout: [{ root: ['icon'] }] },
        variants: [
          { configuration: { state: 'hover' }, layout: [{ root: ['leftIcon'] }] },
          { configuration: { state: 'active' }, layout: [{ root: ['leftIcon'] }] },
        ],
      },
    );
    expect(out).toContain('| `root` | container | — | always |');
    expect(out).toContain('| `icon` | instance | — | default only |');
    expect(out).toContain('| `leftIcon` | instance | — | all variant layouts (not default) |');
  });

  it('summarizes variant layout changes as diffs against the default', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: { layout: [{ root: ['icon'] }] },
        variants: [
          { configuration: { state: 'focus' }, layout: [{ root: ['leftIcon', 'focusRing'] }] },
        ],
      },
    );
    expect(out).toContain('_vs default: + leftIcon, focusRing · − icon_');
    expect(out).toContain('_Layout: + leftIcon, focusRing · − icon — see [Layout](#layout)._');
  });

  it('cross-references hoisted color changes from variant deltas', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: { elements: {} },
        variants: [
          {
            configuration: { state: 'hover' },
            elements: { root: { styles: { backgroundColor: { $token: 'Color/Hover', $type: 'color' } } } },
          },
        ],
      },
    );
    expect(out).toContain('_Color: `root.backgroundColor` — see [Color](#color)._');
  });

  it('states the delta resolution rule', async () => {
    const out = await run(
      tmpDir,
      {},
      {
        default: { elements: {} },
        variants: [{ configuration: { size: 'l' }, elements: { root: { styles: { height: 42 } } } }],
      },
    );
    expect(out).toContain('Deltas apply on top of Element styles (default), in the order listed; later values win per property.');
    expect(out).toContain('### 1. `size: l`');
  });

  it('normalizes and subsumption-reduces invalid combinations', async () => {
    const out = await run(
      tmpDir,
      {
        props: {
          disabled: { type: 'boolean', default: false },
          state: { type: 'string', default: 'Rest', enum: ['Rest', 'Hover'] },
          size: { type: 'string', default: 'M', enum: ['S', 'M'] },
        },
      },
      {
        default: {},
        variants: [],
        invalidVariantCombinations: [
          { disabled: 'True', state: 'hover' },
          { disabled: 'True', state: 'hover', size: 'S' },
        ],
      },
    );
    expect(out).toContain('- `disabled: true, state: Hover`');
    expect(out).not.toContain('size: S');
    expect(out).toContain('_Reduced from 2 spec entries; these patterns cover exactly the same configurations._');
  });

  it('collapses cross-product invalid expansions into a minimal pattern', async () => {
    // elevated:true is invalid across ALL states — the spec enumerates each state.
    const out = await run(
      tmpDir,
      {
        props: {
          state: { type: 'string', default: 'Rest', enum: ['Rest', 'Hover', 'Pressed'] },
          elevated: { type: 'boolean', default: false },
        },
      },
      {
        default: {},
        variants: [],
        invalidVariantCombinations: [
          { state: 'Rest', elevated: true },
          { state: 'Hover', elevated: true },
          { state: 'Pressed', elevated: true },
        ],
      },
    );
    expect(out).toContain('- `elevated: true`');
    expect(out).not.toContain('state: Rest, elevated');
    expect(out).toContain('_Reduced from 3 spec entries; these patterns cover exactly the same configurations._');
  });

  it('emits slot constraints and code-only markers in prop notes', async () => {
    const out = await run(tmpDir, {
      props: {
        children: { type: 'slot', minChildren: 1, maxChildren: 2, anyOf: ['dsButton'] },
        a11yLabel: {
          type: 'string',
          examples: ['A11y label'],
          $extensions: { 'com.figma': { type: 'TEXT', source: { kind: 'codeOnlyProp', layer: 'A11y label' } } },
        },
      },
    });
    expect(out).toContain('slot (min 1, max 2, accepts `dsButton`)');
    expect(out).toContain('code-only prop — not rendered in Figma');
    expect(out).toContain('e.g. `A11y label`');
  });

  it('is deterministic — identical input produces identical output', async () => {
    const apiYaml = {
      title: 'DS Button',
      props: { size: { type: 'string', default: 'm', enum: ['s', 'm'] } },
    };
    const first = await run(tmpDir, apiYaml);
    const second = await run(tmpDir, apiYaml);
    expect(second).toBe(first);
  });
});
