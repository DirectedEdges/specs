import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { PropsTransformer } from '../../../src/transforms/Props.js';

const transformer = new PropsTransformer();

function makeContext(dir: string, componentKey = 'dsButton') {
  return { outputDir: dir, componentKey };
}

async function run(dir: string, apiYaml: Record<string, unknown>, componentKey = 'dsButton') {
  await transformer.run(apiYaml, makeContext(dir, componentKey));
  const raw = await fs.readFile(path.join(dir, 'props.yaml'), 'utf-8');
  return yaml.parse(raw) as Record<string, Array<{
    component: string;
    name: string;
    type: string;
    hasEnum: boolean;
    enumValues: string[] | null;
    enumCount: number;
    default: unknown;
    nullable: boolean;
    slotAnyOf: unknown[] | null;
    slotMinItems: number | null;
    slotMaxItems: number | null;
    figmaType: string | null;
  }>>;
}

describe('PropsTransformer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'props-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('has name "props"', () => {
    expect(transformer.name).toBe('props');
  });

  it('writes props.yaml keyed by componentKey', async () => {
    const out = await run(tmpDir, {});
    expect(out).toHaveProperty('dsButton');
    expect(Array.isArray(out.dsButton)).toBe(true);
  });

  it('emits an empty array when there are no props', async () => {
    const out = await run(tmpDir, {});
    expect(out.dsButton).toHaveLength(0);
  });

  it('extracts a string prop with type and default', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string', default: 'Click me' } },
    });
    const entry = out.dsButton.find(p => p.name === 'label');
    expect(entry?.type).toBe('string');
    expect(entry?.default).toBe('Click me');
    expect(entry?.nullable).toBe(false);
    expect(entry?.hasEnum).toBe(false);
    expect(entry?.enumValues).toBeNull();
    expect(entry?.enumCount).toBe(0);
  });

  it('extracts a boolean prop', async () => {
    const out = await run(tmpDir, {
      props: { disabled: { type: 'boolean', default: false } },
    });
    const entry = out.dsButton.find(p => p.name === 'disabled');
    expect(entry?.type).toBe('boolean');
    expect(entry?.default).toBe(false);
  });

  it('extracts an enum prop with hasEnum, enumValues, and enumCount', async () => {
    const out = await run(tmpDir, {
      props: { size: { type: 'string', enum: ['sm', 'md', 'lg'], default: 'md' } },
    });
    const entry = out.dsButton.find(p => p.name === 'size');
    expect(entry?.hasEnum).toBe(true);
    expect(entry?.enumValues).toEqual(['sm', 'md', 'lg']);
    expect(entry?.enumCount).toBe(3);
  });

  it('marks nullable props correctly', async () => {
    const out = await run(tmpDir, {
      props: { icon: { type: 'string', nullable: true, default: null } },
    });
    const entry = out.dsButton.find(p => p.name === 'icon');
    expect(entry?.nullable).toBe(true);
    expect(entry?.default).toBeNull();
  });

  it('extracts a slot prop with anyOf, minItems, maxItems', async () => {
    const out = await run(tmpDir, {
      props: {
        children: { type: 'slot', anyOf: [{ type: 'string' }], minItems: 1, maxItems: 3 },
      },
    });
    const entry = out.dsButton.find(p => p.name === 'children');
    expect(entry?.type).toBe('slot');
    expect(entry?.slotAnyOf).toEqual([{ type: 'string' }]);
    expect(entry?.slotMinItems).toBe(1);
    expect(entry?.slotMaxItems).toBe(3);
  });

  it('sets slotAnyOf/minItems/maxItems to null when absent on a non-slot prop', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string' } },
    });
    const entry = out.dsButton.find(p => p.name === 'label');
    expect(entry?.slotAnyOf).toBeNull();
    expect(entry?.slotMinItems).toBeNull();
    expect(entry?.slotMaxItems).toBeNull();
  });

  it('extracts figmaType from $extensions["com.figma"].type', async () => {
    const out = await run(tmpDir, {
      props: {
        size: {
          type: 'string',
          $extensions: { 'com.figma': { type: 'VARIANT' } },
        },
      },
    });
    const entry = out.dsButton.find(p => p.name === 'size');
    expect(entry?.figmaType).toBe('VARIANT');
  });

  it('sets figmaType to null when $extensions are absent', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string' } },
    });
    const entry = out.dsButton.find(p => p.name === 'label');
    expect(entry?.figmaType).toBeNull();
  });

  it('includes the componentKey on each prop entry', async () => {
    const out = await run(tmpDir, { props: { label: { type: 'string' } } }, 'dsAlert');
    expect(out.dsAlert[0].component).toBe('dsAlert');
  });

  it('emits separate keys for component and subcomponent', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string' } },
      subcomponents: {
        item: { props: { active: { type: 'boolean' } } },
      },
    });
    expect(out).toHaveProperty('dsButton');
    expect(out).toHaveProperty('dsButton.item');
  });

  it('subcomponent props use the dot-path scope key as component', async () => {
    const out = await run(tmpDir, {
      subcomponents: {
        item: { props: { active: { type: 'boolean' } } },
      },
    });
    expect(out['dsButton.item'][0].component).toBe('dsButton.item');
  });

  it('subcomponent props do not appear in the top-level scope', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string' } },
      subcomponents: {
        item: { props: { active: { type: 'boolean' } } },
      },
    });
    const topNames = out.dsButton.map(p => p.name);
    expect(topNames).not.toContain('active');
  });

  it('output is deterministic for the same input', async () => {
    const apiYaml = {
      props: {
        size: { type: 'string', enum: ['sm', 'md'], default: 'md' },
        disabled: { type: 'boolean', default: false },
      },
    };
    const tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'props-det-'));
    try {
      const out1 = await run(tmpDir, apiYaml);
      const out2 = await run(tmpDir2, apiYaml);
      expect(JSON.stringify(out1)).toBe(JSON.stringify(out2));
    } finally {
      await fs.remove(tmpDir2);
    }
  });
});

describe('PropsTransformer.finalize', () => {
  const COMP_A = {
    props: {
      size:     { type: 'string', enum: ['sm', 'md', 'lg'], default: 'md' },
      disabled: { type: 'boolean', default: false },
    },
  };
  const COMP_B = {
    props: {
      size:     { type: 'string', enum: ['sm', 'md', 'lg'], default: 'md' },
      label:    { type: 'string' },
      children: { type: 'slot', minItems: 1 },
    },
  };

  let outputDir: string;
  let compDirA: string;
  let compDirB: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'props-dict-'));
    compDirA = path.join(outputDir, 'compA');
    compDirB = path.join(outputDir, 'compB');
    await fs.ensureDir(compDirA);
    await fs.ensureDir(compDirB);
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  async function runFinalize() {
    const t = new PropsTransformer();
    await t.run(COMP_A, { outputDir: compDirA, componentKey: 'compA' });
    await t.run(COMP_B, { outputDir: compDirB, componentKey: 'compB' });
    await t.finalize!(outputDir);
    const raw = await fs.readFile(path.join(outputDir, '_dictionary', 'props.aggregate.yaml'), 'utf-8');
    return yaml.parse(raw) as {
      summary: { totalProps: number; totalComponents: number; uniquePropNames: number; typeDistribution: Record<string, number> };
      propNameFrequency: Array<{ name: string; occurrences: number; components: string[]; types: string[] }>;
      enumDiscordance: Array<{ propName: string; valueSets: Array<{ values: string[]; components: string[] }> }>;
      booleanNamingPatterns: Record<string, number>;
      apiSurface: Array<{ component: string; props: number; enumValues: number; slots: number; booleans: number }>;
      slots: Array<{ component: string; name: string; anyOf: unknown; minItems: number | null; maxItems: number | null; nullable: boolean }>;
    };
  }

  it('creates _dictionary/props.aggregate.yaml', async () => {
    await runFinalize();
    expect(fs.existsSync(path.join(outputDir, '_dictionary', 'props.aggregate.yaml'))).toBe(true);
  });

  it('summary.totalProps counts all props across all scopes', async () => {
    const { summary } = await runFinalize();
    // compA: size + disabled = 2; compB: size + label + children = 3
    expect(summary.totalProps).toBe(5);
  });

  it('summary.totalComponents counts unique scope keys', async () => {
    const { summary } = await runFinalize();
    expect(summary.totalComponents).toBe(2);
  });

  it('summary.uniquePropNames counts distinct names', async () => {
    const { summary } = await runFinalize();
    // size, disabled, label, children = 4
    expect(summary.uniquePropNames).toBe(4);
  });

  it('summary.typeDistribution counts by type', async () => {
    const { summary } = await runFinalize();
    expect(summary.typeDistribution.string).toBe(3); // size×2 + label
    expect(summary.typeDistribution.boolean).toBe(1);
    expect(summary.typeDistribution.slot).toBe(1);
  });

  it('propNameFrequency is sorted by occurrences descending', async () => {
    const { propNameFrequency } = await runFinalize();
    const counts = propNameFrequency.map(p => p.occurrences);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('propNameFrequency lists all components that share a prop name', async () => {
    const { propNameFrequency } = await runFinalize();
    const sizeEntry = propNameFrequency.find(p => p.name === 'size');
    expect(sizeEntry?.occurrences).toBe(2);
    expect(sizeEntry?.components.sort()).toEqual(['compA', 'compB']);
  });

  it('enumDiscordance is empty when all same-named enum props share identical value sets', async () => {
    const { enumDiscordance } = await runFinalize();
    const sizeDiscord = enumDiscordance.find(e => e.propName === 'size');
    expect(sizeDiscord).toBeUndefined();
  });

  it('enumDiscordance reports props whose enum value sets diverge across components', async () => {
    const t = new PropsTransformer();
    const dirA = path.join(outputDir, 'discA');
    const dirB = path.join(outputDir, 'discB');
    await fs.ensureDir(dirA);
    await fs.ensureDir(dirB);
    await t.run({ props: { size: { type: 'string', enum: ['sm', 'md'] } } }, { outputDir: dirA, componentKey: 'discA' });
    await t.run({ props: { size: { type: 'string', enum: ['xs', 'sm', 'md'] } } }, { outputDir: dirB, componentKey: 'discB' });
    await t.finalize!(outputDir);
    const raw = await fs.readFile(path.join(outputDir, '_dictionary', 'props.aggregate.yaml'), 'utf-8');
    const agg = yaml.parse(raw);
    const discord = agg.enumDiscordance.find((e: { propName: string }) => e.propName === 'size');
    expect(discord).toBeDefined();
    expect(discord.valueSets).toHaveLength(2);
  });

  it('booleanNamingPatterns counts isPrefix correctly', async () => {
    const t = new PropsTransformer();
    const dir = path.join(outputDir, 'boolComp');
    await fs.ensureDir(dir);
    await t.run({
      props: {
        isDisabled:  { type: 'boolean' },
        hasIcon:     { type: 'boolean' },
        canExpand:   { type: 'boolean' },
        loading:     { type: 'boolean' },
      },
    }, { outputDir: dir, componentKey: 'boolComp' });
    await t.finalize!(outputDir);
    const raw = await fs.readFile(path.join(outputDir, '_dictionary', 'props.aggregate.yaml'), 'utf-8');
    const agg = yaml.parse(raw);
    expect(agg.booleanNamingPatterns.isPrefix).toBe(1);
    expect(agg.booleanNamingPatterns.hasPrefix).toBe(1);
    expect(agg.booleanNamingPatterns.canPrefix).toBe(1);
    expect(agg.booleanNamingPatterns.bare).toBe(1);
  });

  it('apiSurface is sorted by props count descending', async () => {
    const { apiSurface } = await runFinalize();
    const counts = apiSurface.map(e => e.props);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('apiSurface counts slots and booleans per component', async () => {
    const { apiSurface } = await runFinalize();
    const a = apiSurface.find(e => e.component === 'compA');
    const b = apiSurface.find(e => e.component === 'compB');
    expect(a?.booleans).toBe(1);
    expect(a?.slots).toBe(0);
    expect(b?.slots).toBe(1);
    expect(b?.booleans).toBe(0);
  });

  it('apiSurface.enumValues counts total enum values per component', async () => {
    const { apiSurface } = await runFinalize();
    const a = apiSurface.find(e => e.component === 'compA');
    expect(a?.enumValues).toBe(3); // size has 3 enum values
  });

  it('slots lists all slot props with their constraints', async () => {
    const { slots } = await runFinalize();
    const slot = slots.find(s => s.name === 'children');
    expect(slot?.component).toBe('compB');
    expect(slot?.minItems).toBe(1);
    expect(slot?.maxItems).toBeNull();
    expect(slot?.nullable).toBe(false);
  });

  it('includes subcomponent scope keys in apiSurface and propNameFrequency', async () => {
    const t = new PropsTransformer();
    const dir = path.join(outputDir, 'withSub');
    await fs.ensureDir(dir);
    await t.run({
      props: { label: { type: 'string' } },
      subcomponents: {
        item: { props: { active: { type: 'boolean' } } },
      },
    }, { outputDir: dir, componentKey: 'withSub' });
    await t.finalize!(outputDir);
    const raw = await fs.readFile(path.join(outputDir, '_dictionary', 'props.aggregate.yaml'), 'utf-8');
    const agg = yaml.parse(raw);
    const keys = agg.apiSurface.map((e: { component: string }) => e.component);
    expect(keys).toContain('withSub');
    expect(keys).toContain('withSub.item');
  });

  it('does nothing when no components were processed', async () => {
    const t = new PropsTransformer();
    await t.finalize!(outputDir);
    expect(fs.existsSync(path.join(outputDir, '_dictionary'))).toBe(false);
  });
});
