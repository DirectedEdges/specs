import { describe, it, expect } from 'vitest';
import { analyzeVariants } from '../../../src/transforms/react/variantAnalysis.js';

const STATES = {
  hover: { prop: 'state', value: 'hover' },
  active: { prop: 'state', value: 'pressed' },
  disabled: { prop: 'disabled' },
};

function api(overrides: Record<string, unknown> = {}) {
  return {
    anatomy: {
      root: { type: 'container' },
      label: { type: 'text' },
      icon: { type: 'container' },
      children: { type: 'slot' },
      caption: { type: 'text' },
      ...((overrides.anatomy as Record<string, unknown>) ?? {}),
    },
    props: {
      label: { type: 'string' },
      iconVisible: { type: 'boolean', default: false },
      hint: { type: 'string', nullable: true, default: null },
      appearance: { type: 'string', enum: ['filled', 'outline'], default: 'filled' },
      elevated: { type: 'boolean', default: false },
      disabled: { type: 'boolean', default: false },
      state: { type: 'string', enum: ['rest', 'hover', 'pressed'], default: 'rest' },
      children: { type: 'slot' },
      ...((overrides.props as Record<string, unknown>) ?? {}),
    },
  };
}

function variants(overrides: Record<string, unknown> = {}) {
  return {
    default: {
      layout: [{ root: ['icon', 'label', 'children'] }],
      elements: {
        root: { styles: {} },
        icon: { styles: { visible: { $binding: '#/props/iconVisible' } } },
        label: { content: { $binding: '#/props/label' }, styles: {} },
        children: { children: { $binding: '#/props/children' }, styles: {} },
      },
      ...((overrides.default as Record<string, unknown>) ?? {}),
    },
    variants: (overrides.variants as unknown[]) ?? [],
  };
}

describe('analyzeVariants', () => {
  it('resolves whenTrue visibility from a boolean prop binding', () => {
    const result = analyzeVariants(api(), variants(), STATES);
    expect(result.visibility.get('icon')).toEqual({ kind: 'whenTrue', prop: 'iconVisible' });
  });

  it('resolves whenNotNull visibility from a nullable string prop binding', () => {
    const v = variants();
    (v.default.elements as Record<string, Record<string, unknown>>).icon = {
      styles: { visible: { $binding: '#/props/hint' } },
    };
    const result = analyzeVariants(api(), v, STATES);
    expect(result.visibility.get('icon')).toEqual({ kind: 'whenNotNull', prop: 'hint' });
  });

  it('collects slot-typed and bound-text elements as slots, skipping unbound text', () => {
    const v = variants();
    (v.default.elements as Record<string, Record<string, unknown>>).caption = { content: 'static', styles: {} };
    const result = analyzeVariants(api(), v, STATES);
    const keys = result.slots.map(s => s.elementKey);
    expect(keys).toContain('label');
    expect(keys).toContain('children');
    expect(keys).not.toContain('caption'); // static text — not a slot
    expect(result.slots.find(s => s.elementKey === 'label')).toMatchObject({
      slotType: 'text',
      prop: 'label',
      rule: { kind: 'always' },
    });
  });

  it('infers whenValue for an element added by a single enum configuration', () => {
    const result = analyzeVariants(api({ anatomy: { extra: { type: 'container' } } }), variants({
      variants: [
        { configuration: { appearance: 'outline' }, layout: [{ root: ['extra', 'icon', 'label', 'children'] }] },
      ],
    }), STATES);
    const extra = findLayout(result.layout, 'extra');
    expect(extra?.conditions).toEqual([{ appearance: 'outline' }]);
  });

  it('infers whenTrue slot rule for a slot added by a boolean configuration', () => {
    const apiYaml = api({ anatomy: { badge: { type: 'slot' } } });
    const v = variants({
      variants: [
        { configuration: { elevated: true }, layout: [{ root: ['icon', 'label', 'children', 'badge'] }] },
      ],
    });
    (v.default.elements as Record<string, Record<string, unknown>>).badge = {
      children: { $binding: '#/props/children' },
    };
    const result = analyzeVariants(apiYaml, v, STATES);
    const badge = result.slots.find(s => s.elementKey === 'badge');
    expect(badge?.rule).toEqual({ kind: 'whenTrue', prop: 'elevated' });
  });

  it('falls back to always with a warning when structural presence is ambiguous', () => {
    const apiYaml = api({ anatomy: { badge: { type: 'slot' } } });
    const v = variants({
      variants: [
        { configuration: { elevated: true }, layout: [{ root: ['icon', 'label', 'children', 'badge'] }] },
        { configuration: { appearance: 'outline' }, layout: [{ root: ['icon', 'label', 'children', 'badge'] }] },
      ],
    });
    const result = analyzeVariants(apiYaml, v, STATES);
    const badge = result.slots.find(s => s.elementKey === 'badge');
    expect(badge?.rule).toEqual({ kind: 'always' });
    expect(badge?.warning).toContain('ambiguous');
  });

  it('renders always when a state-only variant adds the element (browser-driven)', () => {
    const result = analyzeVariants(api({ anatomy: { glow: { type: 'container' } } }), variants({
      variants: [
        { configuration: { state: 'hover' }, layout: [{ root: ['glow', 'icon', 'label', 'children'] }] },
      ],
    }), STATES);
    const glow = findLayout(result.layout, 'glow');
    expect(glow?.conditions).toEqual([]);
  });

  it('strips browser-driven props from conditions but keeps contract-kept ones', () => {
    const result = analyzeVariants(api({ anatomy: { veil: { type: 'container' } } }), variants({
      variants: [
        { configuration: { disabled: true, state: 'hover' }, layout: [{ root: ['veil', 'icon', 'label', 'children'] }] },
      ],
    }), STATES);
    const veil = findLayout(result.layout, 'veil');
    expect(veil?.conditions).toEqual([{ disabled: true }]);
  });

  it('drops subsumed OR conditions', () => {
    const result = analyzeVariants(api({ anatomy: { extra: { type: 'container' } } }), variants({
      variants: [
        { configuration: { appearance: 'outline' }, layout: [{ root: ['extra', 'icon', 'label', 'children'] }] },
        { configuration: { appearance: 'outline', elevated: true }, layout: [{ root: ['extra', 'icon', 'label', 'children'] }] },
      ],
    }), STATES);
    const extra = findLayout(result.layout, 'extra');
    expect(extra?.conditions).toEqual([{ appearance: 'outline' }]);
  });

  it('marks variants with omitted props inexpressible and keeps disabled expressible', () => {
    const result = analyzeVariants(api(), variants({
      variants: [
        { configuration: { state: 'hover' }, elements: {} },
        { configuration: { disabled: true }, elements: {} },
        { configuration: { appearance: 'outline' }, elements: {} },
      ],
    }), STATES);
    expect(result.propVariants.map(v => v.configuration)).toEqual([
      { disabled: true },
      { appearance: 'outline' },
    ]);
  });

  it('excludes state-classified props from data attributes', () => {
    const result = analyzeVariants(api(), variants({
      variants: [
        { configuration: { state: 'hover' }, elements: {} },
        { configuration: { disabled: true }, elements: {} },
        { configuration: { appearance: 'outline', elevated: true }, elements: {} },
      ],
    }), STATES);
    expect(result.dataAttrProps).toEqual(['appearance', 'elevated']);
  });
});

function findLayout(nodes: Array<{ key: string; children: unknown[]; conditions?: unknown }>, key: string):
  { key: string; conditions?: unknown } | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const found = findLayout(node.children as Array<{ key: string; children: unknown[] }>, key);
    if (found) return found;
  }
  return undefined;
}
