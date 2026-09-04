import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { CssTransformer } from '../../../src/transforms/Css.js';
import { drainNameWarnings } from '../../../src/transforms/css/values.js';

const transformer = new CssTransformer();

import type { ProcessingStates } from '../../../src/transforms/states.js';

function makeContext(dir: string, componentKey = 'dsButton', tokensFormat = 'TOKEN', processingStates?: ProcessingStates) {
  return { outputDir: dir, componentKey, tokensFormat, outputFormat: 'JSON' as const, processingStates };
}

async function writeVariants(dir: string, data: Record<string, unknown>) {
  await fs.writeFile(path.join(dir, 'variants.yaml'), yaml.stringify(data), 'utf-8');
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function run(dir: string, variantsData: Record<string, unknown>, componentKey = 'dsButton', tokensFormat = 'TOKEN', processingStates?: ProcessingStates, transformerOptions?: Record<string, unknown>) {
  await writeVariants(dir, variantsData);
  await transformer.run({}, { ...makeContext(dir, componentKey, tokensFormat, processingStates), transformerOptions });
  return fs.readFile(path.join(dir, 'generated', `${toPascalCase(componentKey)}.styles.css`), 'utf-8');
}

// Minimal helpers to build spec-format style objects
function tokenRef(token: string, type = 'color') {
  return { $token: token, $type: type };
}

describe('CssTransformer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'css-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('has name "css"', () => {
    expect(transformer.name).toBe('css');
  });

  it('skips and warns when no variants.yaml exists', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await transformer.run({}, makeContext(tmpDir));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no variants.yaml'));
    expect(fs.existsSync(path.join(tmpDir, 'generated', 'DsButton.styles.css'))).toBe(false);
    warnSpy.mockRestore();
  });

  it('writes styles.css with generated header', async () => {
    const out = await run(tmpDir, {});
    expect(out).toContain('/* Generated. Do not edit');
  });

  it('emits root selector from componentKey', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          root: { styles: { layoutMode: 'HORIZONTAL' } },
        },
      },
    });
    expect(out).toContain('.ds-button {');
  });

  it('kebabizes camelCase element keys into BEM child selectors', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          startIcon: { styles: { layoutMode: 'HORIZONTAL' } },
        },
      },
    });
    expect(out).toContain('.ds-button__start-icon {');
  });

  it('emits layout declarations from layoutMode HORIZONTAL', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          root: { styles: { layoutMode: 'HORIZONTAL' } },
        },
      },
    });
    expect(out).toContain('display: flex;');
    expect(out).toContain('flex-direction: row;');
  });

  it('emits layout declarations from layoutMode VERTICAL', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          root: { styles: { layoutMode: 'VERTICAL' } },
        },
      },
    });
    expect(out).toContain('flex-direction: column;');
  });

  it('resolves TOKEN format token references to kebab var(--)', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          root: { styles: { backgroundColor: tokenRef('Color/Surface/Primary') } },
        },
      },
    });
    expect(out).toContain('background: var(--color-surface-primary);');
  });

  it('resolves FIGMA_SYNTAX_WEB tokens that start with -- verbatim', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          root: { styles: { backgroundColor: '--color-brand-primary' } },
        },
      },
    }, 'dsButton', 'FIGMA_SYNTAX_WEB');
    expect(out).toContain('background: var(--color-brand-primary);');
  });

  it('emits single-prop variant as [data-*] attribute selector on root', async () => {
    const out = await run(tmpDir, {
      default: { elements: {} },
      variants: [
        {
          configuration: { appearance: 'outline' },
          elements: {
            root: { styles: { backgroundColor: tokenRef('Color/Transparent') } },
          },
        },
      ],
    });
    expect(out).toContain('.ds-button[data-appearance="outline"] {');
  });

  it('kebabizes camelCase prop keys in variant [data-*] selectors', async () => {
    const out = await run(tmpDir, {
      default: { elements: {} },
      variants: [
        {
          configuration: { fullBleed: 'true' },
          elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
        },
      ],
    });
    expect(out).toContain('[data-full-bleed="true"]');
  });

  it('scopes variant child elements under the component variant selector', async () => {
    const out = await run(tmpDir, {
      default: { elements: {} },
      variants: [
        {
          configuration: { size: 'sm' },
          elements: {
            label: { styles: { backgroundColor: tokenRef('Color/Surface/Neutral') } },
          },
        },
      ],
    });
    expect(out).toContain('.ds-button[data-size="sm"] .ds-button__label {');
  });

  it('emits compound variant selector for multi-prop configurations', async () => {
    const out = await run(tmpDir, {
      default: { elements: {} },
      variants: [
        {
          configuration: { appearance: 'outline', disabled: 'true' },
          elements: { root: { styles: { backgroundColor: tokenRef('Color/Disabled') } } },
        },
      ],
    });
    expect(out).toContain('[data-appearance="outline"][data-disabled="true"]');
  });

  describe('processing.states — concept-based selectors', () => {
    const states: ProcessingStates = {
      hover:          { prop: 'state', value: 'hover' },
      active:         { prop: 'state', value: 'pressed' },
      'focus-within': { prop: 'focused' },
      disabled:       { prop: 'isDisabled' },
      invalid:        { prop: 'validation', value: 'invalid' },
    };

    const variantsWithStates = {
      default: { elements: {} },
      variants: [
        { configuration: { state: 'hover' },     elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        { configuration: { state: 'pressed' },   elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        { configuration: { state: 'rest' },      elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        { configuration: { focused: 'true' },    elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        { configuration: { isDisabled: 'true' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        { configuration: { validation: 'invalid' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
      ],
    };

    it('emits :hover selector for hover concept (with :not(:disabled) guard since disabled is configured)', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button:hover:not(:disabled):not([aria-disabled="true"]) {');
    });

    it('emits :active selector for active concept mapped to Figma value "pressed" (with :not(:disabled) guard)', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button:active:not(:disabled):not([aria-disabled="true"]) {');
    });

    it('skips the base/rest value — no data-state="rest" or :rest selector', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).not.toContain('rest');
    });

    it('emits :focus-within for focus-within concept (boolean prop, value defaults to "true")', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button:focus-within {');
    });

    it('emits :disabled, [aria-disabled="true"] for disabled concept', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button:disabled,');
      expect(out).toContain('.ds-button[aria-disabled="true"] {');
    });

    it('emits [aria-invalid="true"] for invalid concept', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button[aria-invalid="true"] {');
    });

    it('emits no data-* selectors for classified props', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).not.toContain('data-state=');
      expect(out).not.toContain('data-focused=');
      expect(out).not.toContain('data-is-disabled=');
      expect(out).not.toContain('data-validation=');
    });

    it('still emits data-* for unclassified props', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { size: 'lg' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', states);
      expect(out).toContain('[data-size="lg"]');
    });

    it('combines data-* and state selectors in compound variants (with :not(:disabled) guard since disabled is configured)', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { appearance: 'outline', state: 'hover' },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      }, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button[data-appearance="outline"]:hover:not(:disabled):not([aria-disabled="true"]) {');
    });

    it('emits [aria-selected="true"] for enum-valued selected prop (Selected=Selected case)', async () => {
      // Checkbox: selected: { prop: 'selected' } — no value → concept name is the enum value
      const enumStates: ProcessingStates = {
        selected: { prop: 'selected' },
        indeterminate: { prop: 'selected', value: 'Indeterminate' },
      };
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          // Enum value matching concept name (title-cased, as Figma produces)
          { configuration: { selected: 'Selected' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
          // Explicit value mapping
          { configuration: { selected: 'Indeterminate' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
          // Rest value — should be skipped
          { configuration: { selected: 'Unselected' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsCheckbox', 'TOKEN', enumStates);
      expect(out).toContain('[aria-selected="true"]');
      expect(out).toContain(':indeterminate,');
      expect(out).not.toContain('Unselected');
      expect(out).not.toContain('data-selected=');
    });

    it('does not regress boolean state props (disabled::true still matches)', async () => {
      const boolStates: ProcessingStates = {
        disabled: { prop: 'disabled' },
      };
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { disabled: 'true' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', boolStates);
      expect(out).toContain('.ds-button:disabled,');
      expect(out).not.toContain('data-disabled=');
    });

    it('produces no state-related selectors when processingStates is absent', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { state: 'hover' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      });
      expect(out).toContain('[data-state="hover"]');
      expect(out).not.toContain(':hover');
    });
  });

  describe('presence selectors for boolean true variant values', () => {
    it('emits [data-x] presence selector when variant value is boolean true', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { disabled: true },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      });
      expect(out).toContain('[data-disabled]');
      expect(out).not.toContain('[data-disabled="');
    });

    it('emits [data-x="value"] value selector when variant value is a string', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { checked: 'checked' },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      });
      expect(out).toContain('[data-checked="checked"]');
    });

    it('emits distinct value selectors for multi-value string props', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { checked: 'checked' },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
          {
            configuration: { checked: 'indeterminate' },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      });
      expect(out).toContain('[data-checked="checked"]');
      expect(out).toContain('[data-checked="indeterminate"]');
      expect(out).not.toContain('[data-checked]');
    });

    it('emits presence selector for boolean true alongside a string data-attr in compound variants', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { appearance: 'outline', selected: true },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      });
      expect(out).toContain('[data-appearance="outline"][data-selected]');
    });
  });

  describe(':not(:disabled) guard on hover and active', () => {
    const statesWithDisabled: ProcessingStates = {
      hover:    { prop: 'state', value: 'hover' },
      active:   { prop: 'state', value: 'pressed' },
      disabled: { prop: 'isDisabled' },
    };

    it('appends :not(:disabled):not([aria-disabled="true"]) to :hover selector', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { state: 'hover' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', statesWithDisabled);
      expect(out).toContain('.ds-button:hover:not(:disabled):not([aria-disabled="true"]) {');
    });

    it('appends :not(:disabled):not([aria-disabled="true"]) to :active selector', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { state: 'pressed' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', statesWithDisabled);
      expect(out).toContain('.ds-button:active:not(:disabled):not([aria-disabled="true"]) {');
    });

    it('does not add the guard when disabled concept is absent from processingStates', async () => {
      const statesNoDisabled: ProcessingStates = {
        hover: { prop: 'state', value: 'hover' },
      };
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { state: 'hover' }, elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', statesNoDisabled);
      expect(out).toContain('.ds-button:hover {');
      expect(out).not.toContain(':not(:disabled)');
    });

    it('applies the guard to compound variants combining data-attr and :hover', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { appearance: 'outline', state: 'hover' },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      }, 'dsButton', 'TOKEN', statesWithDisabled);
      expect(out).toContain('.ds-button[data-appearance="outline"]:hover:not(:disabled):not([aria-disabled="true"]) {');
    });

    it('does not add the guard to :focus-within or :disabled selectors', async () => {
      const statesAll: ProcessingStates = {
        hover:          { prop: 'state', value: 'hover' },
        'focus-within': { prop: 'focused' },
        disabled:       { prop: 'isDisabled' },
      };
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          { configuration: { focused: 'true' },    elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
          { configuration: { isDisabled: 'true' },  elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', statesAll);
      expect(out).not.toContain(':focus-within:not(');
      expect(out).not.toContain(':disabled:not(');
    });
  });

  describe('subcomponent styles', () => {
    async function runAndReadSub(dir: string, variantsData: Record<string, unknown>, subKey: string, componentKey = 'dsActionList') {
      await writeVariants(dir, variantsData);
      await transformer.run({}, makeContext(dir, componentKey));
      return fs.readFile(path.join(dir, subKey, 'generated', `${toPascalCase(subKey)}.styles.css`), 'utf-8');
    }

    it('emits {Sub}.styles.css in a subfolder for each subcomponent', async () => {
      await writeVariants(tmpDir, {
        subcomponents: {
          group: {
            default: { elements: { root: { styles: { layoutMode: 'VERTICAL' } } } },
            variants: [],
          },
        },
      });
      await transformer.run({}, makeContext(tmpDir, 'dsActionList'));
      expect(fs.existsSync(path.join(tmpDir, 'group', 'generated', 'Group.styles.css'))).toBe(true);
    });

    it('scopes subcomponent BEM selectors to the subcomponent key, not the parent', async () => {
      const out = await runAndReadSub(tmpDir, {
        subcomponents: {
          group: {
            default: {
              elements: {
                root: { styles: { layoutMode: 'VERTICAL' } },
                text: { styles: { layoutMode: 'HORIZONTAL' } },
              },
            },
            variants: [],
          },
        },
      }, 'group');
      expect(out).toContain('.group {');
      expect(out).toContain('.group__text {');
      expect(out).not.toContain('ds-action-list');
    });

    it('emits subcomponent variant selectors scoped to the subcomponent class', async () => {
      const out = await runAndReadSub(tmpDir, {
        subcomponents: {
          item: {
            default: { elements: {} },
            variants: [
              {
                configuration: { size: 'medium' },
                elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
              },
            ],
          },
        },
      }, 'item');
      expect(out).toContain('.item[data-size="medium"] {');
    });

    it('emits multiple subcomponent subfolders independently', async () => {
      await writeVariants(tmpDir, {
        subcomponents: {
          group: {
            default: { elements: { root: { styles: { layoutMode: 'VERTICAL' } } } },
            variants: [],
          },
          header: {
            default: { elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
            variants: [],
          },
        },
      });
      await transformer.run({}, makeContext(tmpDir, 'dsActionList'));
      expect(fs.existsSync(path.join(tmpDir, 'group', 'generated', 'Group.styles.css'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'header', 'generated', 'Header.styles.css'))).toBe(true);
      const groupOut = await fs.readFile(path.join(tmpDir, 'group', 'generated', 'Group.styles.css'), 'utf-8');
      const headerOut = await fs.readFile(path.join(tmpDir, 'header', 'generated', 'Header.styles.css'), 'utf-8');
      expect(groupOut).toContain('flex-direction: column');
      expect(headerOut).toContain('flex-direction: row');
    });
  });

  it('omits elements with no declarations', async () => {
    const out = await run(tmpDir, {
      default: {
        elements: {
          root: { styles: {} },
        },
      },
    });
    expect(out).not.toContain('.ds-button {');
  });

  describe('border-shift-inset-shadow rule', () => {
    const rules = { rules: ['border-shift-inset-shadow'] };

    it('is a no-op when no variants change strokeWeight or strokes', async () => {
      const out = await run(tmpDir, {
        default: { elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        variants: [
          { configuration: { size: 'lg' }, elements: { root: { styles: { layoutMode: 'VERTICAL' } } } },
        ],
      }, 'dsButton', 'TOKEN', undefined, rules);
      expect(out).not.toContain('box-shadow');
      expect(out).not.toContain('border-color: transparent');
    });

    it('replaces variant strokeWeight+strokes with box-shadow: inset, not border-width in the variant block', async () => {
      const out = await run(tmpDir, {
        default: { elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        variants: [
          {
            configuration: { selected: true },
            elements: { root: { styles: { strokeWeight: 2, strokes: tokenRef('Color/Border/Selected') } } },
          },
        ],
      }, 'dsButton', 'TOKEN', undefined, rules);
      expect(out).toContain('box-shadow: inset 0 0 0 2px var(--color-border-selected)');
      // Variant block should not re-declare border-width (it's handled by box-shadow)
      const variantBlock = out.split('.ds-button[data-selected]')[1] ?? '';
      expect(variantBlock).not.toContain('border-width');
    });

    it('reserves space in the default block with a transparent border at the variant width', async () => {
      const out = await run(tmpDir, {
        default: { elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } } },
        variants: [
          {
            configuration: { selected: true },
            elements: { root: { styles: { strokeWeight: 2, strokes: tokenRef('Color/Border/Selected') } } },
          },
        ],
      }, 'dsButton', 'TOKEN', undefined, rules);
      expect(out).toContain('border-width: 2px');
      expect(out).toContain('border-color: transparent');
      expect(out).toContain('border-style: solid');
    });

    it('uses the default strokeWeight as reservation when already present in default', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: { styles: { strokeWeight: 1, strokes: tokenRef('Color/Border/Default') } },
          },
        },
        variants: [
          {
            configuration: { selected: true },
            elements: { root: { styles: { strokes: tokenRef('Color/Border/Selected') } } },
          },
        ],
      }, 'dsButton', 'TOKEN', undefined, rules);
      expect(out).toContain('border-width: 1px');
      expect(out).toContain('border-color: transparent');
      expect(out).toContain('box-shadow: inset 0 0 0 1px var(--color-border-selected)');
    });

    it('resolves token refs for both weight and color in the box-shadow value', async () => {
      const out = await run(tmpDir, {
        default: { elements: { root: { styles: {} } } },
        variants: [
          {
            configuration: { selected: true },
            elements: {
              root: {
                styles: {
                  strokeWeight: tokenRef('Border/Width/Focus', 'dimension'),
                  strokes: tokenRef('Color/Focus/Ring'),
                },
              },
            },
          },
        ],
      }, 'dsButton', 'TOKEN', undefined, rules);
      expect(out).toContain('box-shadow: inset 0 0 0 var(--border-width-focus) var(--color-focus-ring)');
    });

    it('does not apply to OUTSIDE strokes (those use outline, not border)', async () => {
      const out = await run(tmpDir, {
        default: { elements: { root: { styles: {} } } },
        variants: [
          {
            configuration: { focused: true },
            elements: {
              root: { styles: { strokeWeight: 2, strokes: tokenRef('Color/Border/Focus'), strokeAlign: 'OUTSIDE' } },
            },
          },
        ],
      }, 'dsButton', 'TOKEN', undefined, rules);
      expect(out).not.toContain('box-shadow: inset');
      expect(out).toContain('outline-width: 2px');
    });

    it('throws for unknown rule names', async () => {
      await expect(
        run(tmpDir, { default: { elements: {} }, variants: [] }, 'dsButton', 'TOKEN', undefined, { rules: ['nonexistent-rule'] })
      ).rejects.toThrow('Unknown CSS rule: "nonexistent-rule"');
    });

    it('applies the rule to subcomponent styles.css', async () => {
      await writeVariants(tmpDir, {
        subcomponents: {
          item: {
            default: { elements: { root: { styles: {} } } },
            variants: [
              {
                configuration: { selected: true },
                elements: { root: { styles: { strokeWeight: 2, strokes: tokenRef('Color/Border/Selected') } } },
              },
            ],
          },
        },
      });
      await transformer.run({}, {
        ...makeContext(tmpDir, 'dsActionList'),
        transformerOptions: rules,
      });
      const subOut = await fs.readFile(path.join(tmpDir, 'item', 'generated', 'Item.styles.css'), 'utf-8');
      expect(subOut).toContain('box-shadow: inset 0 0 0 2px var(--color-border-selected)');
      expect(subOut).toContain('border-color: transparent');
    });
  });

  describe('structural layout presence', () => {
    const structuralVariants = {
      default: {
        layout: [{ root: ['label'] }],
        elements: {
          root: { styles: { layoutMode: 'HORIZONTAL' } },
          label: { styles: {} },
          background: {
            styles: { position: 'ABSOLUTE', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: tokenRef('Color/Primary') },
          },
        },
      },
      variants: [
        {
          configuration: { appearance: 'overlay' },
          layout: [{ root: ['background', 'label'] }],
        },
      ],
    };

    it('adds position: relative to the layout parent of an absolute element', async () => {
      const out = await run(tmpDir, structuralVariants);
      const rootBlock = out.match(/\.ds-button \{[^}]*\}/)?.[0];
      expect(rootBlock).toContain('position: relative');
    });

    it('positions non-absolute siblings so painting follows layout order (last on top)', async () => {
      const out = await run(tmpDir, structuralVariants);
      const labelBlock = out.match(/\.ds-button__label \{[^}]*\}/)?.[0];
      expect(labelBlock).toContain('position: relative');
    });

    it('does not position siblings when no absolute element shares the parent', async () => {
      const out = await run(tmpDir, {
        default: {
          layout: [{ root: ['icon', 'label'] }],
          elements: {
            root: { styles: {} },
            icon: { styles: { layoutSizingHorizontal: 'HUG' } },
            label: { styles: { layoutSizingHorizontal: 'HUG' } },
          },
        },
        variants: [],
      });
      expect(out.match(/\.ds-button__label \{[^}]*\}/)?.[0]).not.toContain('position: relative');
    });

    it('hides elements absent from the default layout and un-hides them under including variants', async () => {
      const out = await run(tmpDir, structuralVariants);
      const baseBlock = out.match(/\.ds-button__background \{[^}]*\}/)?.[0];
      expect(baseBlock).toContain('display: none');
      expect(out).toContain('.ds-button[data-appearance="overlay"] .ds-button__background {');
      const overlayBlock = out.match(/\.ds-button\[data-appearance="overlay"\] \.ds-button__background \{[^}]*\}/)?.[0];
      expect(overlayBlock).toContain('display: block');
    });

    it('hides default elements dropped by a variant layout', async () => {
      const out = await run(tmpDir, {
        default: {
          layout: [{ root: ['icon', 'label'] }],
          elements: { root: { styles: {} }, icon: { styles: {} }, label: { styles: {} } },
        },
        variants: [
          { configuration: { compact: true }, layout: [{ root: ['label'] }] },
        ],
      });
      const compactIcon = out.match(/\.ds-button\[data-compact\] \.ds-button__icon \{[^}]*\}/)?.[0];
      expect(compactIcon).toContain('display: none');
    });

    it('does not hide elements present in the default layout', async () => {
      const out = await run(tmpDir, structuralVariants);
      const labelBlock = out.match(/\.ds-button__label \{[^}]*\}/)?.[0];
      expect(labelBlock ?? '').not.toContain('display: none');
    });
  });

  describe('inline effects', () => {
    it('maps a single drop shadow to box-shadow', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  shadows: [{ visible: true, offsetX: 0, offsetY: 4, blur: 4, spread: 0, color: '#00000040' }],
                },
              },
            },
          },
        },
      });
      expect(out).toContain('box-shadow: 0 4px 4px 0 #00000040');
    });

    it('joins multiple shadows, marks inset, and drops invisible entries', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  shadows: [
                    { visible: false, offsetX: 0, offsetY: 1, blur: 1, spread: 0, color: '#00000010' },
                    { visible: true, offsetX: 0, offsetY: 4, blur: 4, spread: 0, color: '#00000040' },
                    { visible: true, offsetX: 0, offsetY: 2, blur: 3, spread: 1, color: '#00000020', inset: true },
                  ],
                },
              },
            },
          },
        },
      });
      expect(out).toContain('box-shadow: 0 4px 4px 0 #00000040, inset 0 2px 3px 1px #00000020');
      expect(out).not.toContain('#00000010');
    });

    it('resolves token refs in shadow dimensions and color', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  shadows: [{
                    visible: true,
                    offsetX: tokenRef('DS Color/Shadow/Elevated/x', 'dimension'),
                    offsetY: tokenRef('DS Color/Shadow/Elevated/y', 'dimension'),
                    blur: tokenRef('DS Color/Shadow/Elevated/blur', 'dimension'),
                    spread: 0,
                    color: tokenRef('DS Color/Shadow/Elevated/Color'),
                  }],
                },
              },
            },
          },
        },
      });
      expect(out).toContain(
        'box-shadow: var(--ds-color-shadow-elevated-x) var(--ds-color-shadow-elevated-y) var(--ds-color-shadow-elevated-blur) 0 var(--ds-color-shadow-elevated-color)'
      );
    });

    it('maps layerBlur to filter and backgroundBlur to backdrop-filter with /* effects */ trace comments on fan-out', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  shadows: [{ visible: true, offsetX: 0, offsetY: 4, blur: 4, spread: 0, color: '#00000040' }],
                  layerBlur: { visible: true, radius: 4 },
                  backgroundBlur: { visible: true, radius: tokenRef('DS Color/Shadow/Elevated/blur', 'dimension') },
                },
              },
            },
          },
        },
      });
      expect(out).toContain('box-shadow: 0 4px 4px 0 #00000040 /* effects */');
      expect(out).toContain('filter: blur(4px) /* effects */');
      expect(out).toContain('backdrop-filter: blur(var(--ds-color-shadow-elevated-blur)) /* effects */');
    });

    it('omits the trace comment when effects yields a single declaration', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: { layerBlur: { visible: true, radius: 2 } },
              },
            },
          },
        },
      });
      expect(out).toContain('filter: blur(2px);');
      expect(out).not.toContain('/* effects */');
    });

    it('emits box-shadow: none when every shadow in the list is invisible', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  shadows: [{ visible: false, offsetX: 0, offsetY: 4, blur: 4, spread: 0, color: '#00000040' }],
                },
              },
            },
          },
        },
      });
      expect(out).toContain('box-shadow: none');
    });

    it('resets all effect properties when a variant sets effects: null', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: {
                  shadows: [{ visible: true, offsetX: 0, offsetY: 4, blur: 4, spread: 0, color: '#00000040' }],
                },
              },
            },
          },
        },
        variants: [
          { configuration: { flat: true }, elements: { root: { styles: { effects: null } } } },
        ],
      });
      const flatBlock = out.match(/\.ds-button\[data-flat\] \{[^}]*\}/)?.[0] ?? '';
      expect(flatBlock).toContain('box-shadow: none');
      expect(flatBlock).toContain('filter: none');
      expect(flatBlock).toContain('backdrop-filter: none');
    });

    it('expands effect-style token refs into role vars with none fallbacks, sanitizing invalid name characters', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: { styles: { effects: tokenRef('Effect Style 1 (Shadow)', 'effects') } },
          },
        },
      });
      expect(out).toContain('box-shadow: var(--effect-style-1-shadow-shadows, none) /* effects */');
      expect(out).toContain('filter: var(--effect-style-1-shadow-layer-blur, none) /* effects */');
      expect(out).toContain('backdrop-filter: var(--effect-style-1-shadow-background-blur, none) /* effects */');
    });

    it('records dropped-character name warnings for the end-of-run summary', async () => {
      drainNameWarnings(); // reset anything collected by earlier tests
      await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                effects: tokenRef('Effect Style 1 (Shadow)', 'effects'),
                backgroundColor: tokenRef('Color/Brand 50%'),
              },
            },
          },
        },
      });
      const warnings = drainNameWarnings();
      expect(warnings.size).toBe(1);
      const names = [...warnings.values()][0];
      expect(names.get('Effect Style 1 (Shadow)')).toBe(1);
      expect(names.get('Color/Brand 50%')).toBe(1);
      // Drained — a second drain is empty.
      expect(drainNameWarnings().size).toBe(0);
    });
  });

  describe('gradients', () => {
    const linear = {
      type: 'LINEAR',
      angle: 45,
      stops: [
        { position: 0, color: '#FFFFFFFF' },
        { position: 0.95, color: '#FF0000FF' },
      ],
    };

    it('maps a linear gradient backgroundColor to background: linear-gradient()', async () => {
      const out = await run(tmpDir, {
        default: { elements: { root: { styles: { backgroundColor: linear } } } },
      });
      expect(out).toContain('background: linear-gradient(45deg, #FFFFFFFF 0%, #FF0000FF 95%)');
    });

    it('resolves token-ref stop colors to var()', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: {
              styles: {
                backgroundColor: {
                  type: 'LINEAR',
                  angle: 0,
                  stops: [
                    { position: 0, color: tokenRef('DS Color/Surface/Primary') },
                    { position: 1, color: tokenRef('DS Color/Line/Brand') },
                  ],
                },
              },
            },
          },
        },
      });
      expect(out).toContain('background: linear-gradient(0deg, var(--ds-color-surface-primary) 0%, var(--ds-color-line-brand) 100%)');
    });

    it('maps RADIAL to radial-gradient(at …) and ANGULAR to conic-gradient(from 90deg …)', async () => {
      const stops = [
        { position: 0, color: '#FF0000FF' },
        { position: 1, color: '#0000FFFF' },
      ];
      const out = await run(tmpDir, {
        default: {
          elements: {
            root: { styles: { backgroundColor: { type: 'RADIAL', center: { x: 0.5, y: 0.25 }, stops } } },
            halo: { styles: { backgroundColor: { type: 'ANGULAR', center: { x: 0.5, y: 0.5 }, stops } } },
          },
        },
      });
      expect(out).toContain('background: radial-gradient(at 50% 25%, #FF0000FF 0%, #0000FFFF 100%)');
      expect(out).toContain('background: conic-gradient(from 90deg at 50% 50%, #FF0000FF 0%, #0000FFFF 100%)');
    });

    it('maps gradient strokes to border-image and resets it when a variant restores a solid stroke', async () => {
      const out = await run(tmpDir, {
        default: {
          elements: { root: { styles: { strokes: '#000000FF', strokeWeight: 1 } } },
        },
        variants: [
          {
            configuration: { a: '2' },
            elements: {
              root: {
                styles: {
                  strokes: {
                    type: 'ANGULAR',
                    center: { x: 0.5, y: 0.5 },
                    stops: [
                      { position: 0, color: '#FF0000FF' },
                      { position: 0.74, color: '#B1F836FF' },
                    ],
                  },
                },
              },
            },
          },
          {
            configuration: { a: '2', b: '2' },
            elements: { root: { styles: { strokes: '#000000FF' } } },
          },
        ],
      });
      const gradientBlock = out.match(/\.ds-button\[data-a="2"\] \{[^}]*\}/)?.[0] ?? '';
      expect(gradientBlock).toContain('border-image: conic-gradient(from 90deg at 50% 50%, #FF0000FF 0%, #B1F836FF 74%) 1');
      expect(gradientBlock).toContain('border-style: solid');
      const solidBlock = out.match(/\.ds-button\[data-a="2"\]\[data-b="2"\] \{[^}]*\}/)?.[0] ?? '';
      expect(solidBlock).toContain('border-color: #000000FF');
      expect(solidBlock).toContain('border-image: none');
      // The reset is per-element: every solid-stroke layer of this element
      // carries it, including the default block (harmless — none is initial).
      const baseBlock = out.match(/\.ds-button \{[^}]*\}/)?.[0] ?? '';
      expect(baseBlock).toContain('border-color: #000000FF');
      expect(baseBlock).toContain('border-image: none');
    });

    it('paints gradient textColor as background clipped to the glyphs', async () => {
      const out = await run(tmpDir, {
        default: { elements: { label: { styles: { textColor: linear } } } },
      });
      const block = out.match(/\.ds-button__label \{[^}]*\}/)?.[0] ?? '';
      expect(block).toContain('background: linear-gradient(45deg, #FFFFFFFF 0%, #FF0000FF 95%)');
      expect(block).toContain('background-clip: text');
      expect(block).toContain('color: transparent');
    });
  });
});
