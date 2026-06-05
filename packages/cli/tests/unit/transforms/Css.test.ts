import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { CssTransformer } from '../../../src/transforms/Css.js';

const transformer = new CssTransformer();

import type { ProcessingStates } from '../../../src/transforms/states.js';

function makeContext(dir: string, componentKey = 'dsButton', tokensFormat = 'TOKEN', processingStates?: ProcessingStates) {
  return { outputDir: dir, componentKey, tokensFormat, processingStates };
}

async function writeVariants(dir: string, data: Record<string, unknown>) {
  await fs.writeFile(path.join(dir, 'variants.yaml'), yaml.stringify(data), 'utf-8');
}

async function run(dir: string, variantsData: Record<string, unknown>, componentKey = 'dsButton', tokensFormat = 'TOKEN', processingStates?: ProcessingStates) {
  await writeVariants(dir, variantsData);
  await transformer.run({}, makeContext(dir, componentKey, tokensFormat, processingStates));
  return fs.readFile(path.join(dir, 'styles.css'), 'utf-8');
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
    expect(fs.existsSync(path.join(tmpDir, 'styles.css'))).toBe(false);
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

    it('emits :hover selector for hover concept', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button:hover {');
    });

    it('emits :active selector for active concept mapped to Figma value "pressed"', async () => {
      const out = await run(tmpDir, variantsWithStates, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button:active {');
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

    it('combines data-* and state selectors in compound variants', async () => {
      const out = await run(tmpDir, {
        default: { elements: {} },
        variants: [
          {
            configuration: { appearance: 'outline', state: 'hover' },
            elements: { root: { styles: { layoutMode: 'HORIZONTAL' } } },
          },
        ],
      }, 'dsButton', 'TOKEN', states);
      expect(out).toContain('.ds-button[data-appearance="outline"]:hover {');
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
});
