import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { PropsAnalyzer } from '../../../src/analyzers/Props.js';

type AggregateYaml = {
  summary: { totalProps: number; totalComponents: number; uniquePropNames: number; typeDistribution: Record<string, number> };
  propNameFrequency: Array<{ name: string; occurrences: number; components: string[]; types: string[] }>;
  enumDiscordance: Array<{ propName: string; valueSets: Array<{ values: string[]; components: string[] }> }>;
  booleanNamingPatterns: Record<string, number>;
  apiSurface: Array<{ component: string; props: number; enumValues: number; slots: number; booleans: number }>;
  slots: Array<{ component: string; name: string; anyOf: unknown; minItems: number | null; maxItems: number | null; nullable: boolean }>;
};

describe('PropsAnalyzer', () => {
  let outputDir: string;
  let analysisDir: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'props-test-'));
    analysisDir = path.join(outputDir, '_analysis');
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  async function runAnalyzer(components: Record<string, Record<string, unknown>>) {
    const a = new PropsAnalyzer();
    for (const [componentKey, apiYaml] of Object.entries(components)) {
      const compDir = path.join(outputDir, componentKey);
      await fs.ensureDir(compDir);
      await a.run(apiYaml, { outputDir: compDir, componentKey });
    }
    await a.finalize!(outputDir, analysisDir);
    const raw = await fs.readFile(path.join(analysisDir, 'props.yaml'), 'utf-8');
    return yaml.parse(raw) as AggregateYaml;
  }

  it('has name "props"', () => {
    expect(new PropsAnalyzer().name).toBe('props');
  });

  it('writes _analysis/props.yaml after finalize', async () => {
    await runAnalyzer({ compA: { props: { label: { type: 'string' } } } });
    expect(fs.existsSync(path.join(analysisDir, 'props.yaml'))).toBe(true);
  });

  it('does not write per-component files', async () => {
    const compDir = path.join(outputDir, 'compA');
    await fs.ensureDir(compDir);
    const a = new PropsAnalyzer();
    await a.run({ props: { label: { type: 'string' } } }, { outputDir: compDir, componentKey: 'compA' });
    expect(fs.existsSync(path.join(compDir, 'props.yaml'))).toBe(false);
  });

  it('does nothing when no components were processed', async () => {
    const a = new PropsAnalyzer();
    await a.finalize!(outputDir, analysisDir);
    expect(fs.existsSync(analysisDir)).toBe(false);
  });

  it('summary.totalProps counts all props across all scopes', async () => {
    const { summary } = await runAnalyzer({
      compA: { props: { size: { type: 'string' }, disabled: { type: 'boolean' } } },
      compB: { props: { size: { type: 'string' }, label: { type: 'string' }, children: { type: 'slot' } } },
    });
    expect(summary.totalProps).toBe(5);
  });

  it('summary.totalComponents counts unique scope keys', async () => {
    const { summary } = await runAnalyzer({
      compA: { props: { label: { type: 'string' } } },
      compB: { props: { label: { type: 'string' } } },
    });
    expect(summary.totalComponents).toBe(2);
  });

  it('summary.uniquePropNames counts distinct names', async () => {
    const { summary } = await runAnalyzer({
      compA: { props: { size: { type: 'string' }, disabled: { type: 'boolean' } } },
      compB: { props: { size: { type: 'string' }, label: { type: 'string' } } },
    });
    // size, disabled, label = 3
    expect(summary.uniquePropNames).toBe(3);
  });

  it('summary.typeDistribution counts by type', async () => {
    const { summary } = await runAnalyzer({
      compA: { props: { size: { type: 'string' }, disabled: { type: 'boolean' }, children: { type: 'slot' } } },
    });
    expect(summary.typeDistribution.string).toBe(1);
    expect(summary.typeDistribution.boolean).toBe(1);
    expect(summary.typeDistribution.slot).toBe(1);
  });

  it('includes the componentKey on each prop entry', async () => {
    const agg = await runAnalyzer({
      dsAlert: { props: { label: { type: 'string' } } },
    });
    expect(agg.apiSurface[0].component).toBe('dsAlert');
  });

  it('subcomponent props accumulate under dot-path scope keys', async () => {
    const { apiSurface } = await runAnalyzer({
      compA: {
        props: { label: { type: 'string' } },
        subcomponents: { item: { props: { active: { type: 'boolean' } } } },
      },
    });
    const keys = apiSurface.map(e => e.component);
    expect(keys).toContain('compA');
    expect(keys).toContain('compA.item');
  });

  it('subcomponent props do not appear in the top-level scope', async () => {
    const { propNameFrequency } = await runAnalyzer({
      compA: {
        props: { label: { type: 'string' } },
        subcomponents: { item: { props: { active: { type: 'boolean' } } } },
      },
    });
    const labelEntry = propNameFrequency.find(p => p.name === 'label');
    expect(labelEntry?.components).not.toContain('compA.item');
  });

  it('propNameFrequency is sorted by occurrences descending', async () => {
    const { propNameFrequency } = await runAnalyzer({
      compA: { props: { size: { type: 'string' }, disabled: { type: 'boolean' } } },
      compB: { props: { size: { type: 'string' }, label: { type: 'string' } } },
    });
    const counts = propNameFrequency.map(p => p.occurrences);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('propNameFrequency lists all components sharing a prop name', async () => {
    const { propNameFrequency } = await runAnalyzer({
      compA: { props: { size: { type: 'string' } } },
      compB: { props: { size: { type: 'string' } } },
    });
    const sizeEntry = propNameFrequency.find(p => p.name === 'size');
    expect(sizeEntry?.occurrences).toBe(2);
    expect(sizeEntry?.components.sort()).toEqual(['compA', 'compB']);
  });

  it('enumDiscordance is empty when same-named enum props share identical value sets', async () => {
    const { enumDiscordance } = await runAnalyzer({
      compA: { props: { size: { type: 'string', enum: ['sm', 'md', 'lg'] } } },
      compB: { props: { size: { type: 'string', enum: ['sm', 'md', 'lg'] } } },
    });
    expect(enumDiscordance.find(e => e.propName === 'size')).toBeUndefined();
  });

  it('enumDiscordance reports props whose enum value sets diverge', async () => {
    const { enumDiscordance } = await runAnalyzer({
      compA: { props: { size: { type: 'string', enum: ['sm', 'md'] } } },
      compB: { props: { size: { type: 'string', enum: ['xs', 'sm', 'md'] } } },
    });
    const discord = enumDiscordance.find(e => e.propName === 'size');
    expect(discord).toBeDefined();
    expect(discord?.valueSets).toHaveLength(2);
  });

  it('booleanNamingPatterns counts prefixes and bare names', async () => {
    const { booleanNamingPatterns } = await runAnalyzer({
      compA: { props: {
        isDisabled: { type: 'boolean' },
        hasIcon:    { type: 'boolean' },
        canExpand:  { type: 'boolean' },
        loading:    { type: 'boolean' },
      } },
    });
    expect(booleanNamingPatterns.isPrefix).toBe(1);
    expect(booleanNamingPatterns.hasPrefix).toBe(1);
    expect(booleanNamingPatterns.canPrefix).toBe(1);
    expect(booleanNamingPatterns.bare).toBe(1);
  });

  it('apiSurface is sorted by props count descending', async () => {
    const { apiSurface } = await runAnalyzer({
      compA: { props: { a: { type: 'string' } } },
      compB: { props: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } } },
    });
    const counts = apiSurface.map(e => e.props);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('apiSurface counts booleans and slots per scope', async () => {
    const { apiSurface } = await runAnalyzer({
      compA: { props: { disabled: { type: 'boolean' } } },
      compB: { props: { children: { type: 'slot' } } },
    });
    expect(apiSurface.find(e => e.component === 'compA')?.booleans).toBe(1);
    expect(apiSurface.find(e => e.component === 'compB')?.slots).toBe(1);
  });

  it('apiSurface.enumValues counts total enum values per scope', async () => {
    const { apiSurface } = await runAnalyzer({
      compA: { props: { size: { type: 'string', enum: ['sm', 'md', 'lg'] } } },
    });
    expect(apiSurface.find(e => e.component === 'compA')?.enumValues).toBe(3);
  });

  it('slots lists all slot props with their constraints', async () => {
    const { slots } = await runAnalyzer({
      compA: { props: { children: { type: 'slot', minItems: 1, maxItems: 3, anyOf: ['DsButton'] } } },
    });
    const slot = slots.find(s => s.name === 'children');
    expect(slot?.component).toBe('compA');
    expect(slot?.minItems).toBe(1);
    expect(slot?.maxItems).toBe(3);
    expect(slot?.anyOf).toEqual(['DsButton']);
    expect(slot?.nullable).toBe(false);
  });

  it('output is deterministic for the same input', async () => {
    const outputDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'props-det-'));
    try {
      const out1 = await runAnalyzer({ compA: { props: { size: { type: 'string', enum: ['sm', 'md'] }, disabled: { type: 'boolean' } } } });
      const a2 = new PropsAnalyzer();
      const compDir2 = path.join(outputDir2, 'compA');
      await fs.ensureDir(compDir2);
      await a2.run({ props: { size: { type: 'string', enum: ['sm', 'md'] }, disabled: { type: 'boolean' } } }, { outputDir: compDir2, componentKey: 'compA' });
      const analysisDir2 = path.join(outputDir2, '_analysis');
      await a2.finalize!(outputDir2, analysisDir2);
      const raw2 = await fs.readFile(path.join(analysisDir2, 'props.yaml'), 'utf-8');
      const out2 = yaml.parse(raw2);
      expect(JSON.stringify(out1)).toBe(JSON.stringify(out2));
    } finally {
      await fs.remove(outputDir2);
    }
  });

  it('respects an explicit analysisDir override', async () => {
    const customDir = path.join(outputDir, 'custom-out');
    const a = new PropsAnalyzer();
    const compDir = path.join(outputDir, 'compA');
    await fs.ensureDir(compDir);
    await a.run({ props: { label: { type: 'string' } } }, { outputDir: compDir, componentKey: 'compA' });
    await a.finalize!(outputDir, customDir);
    expect(fs.existsSync(path.join(customDir, 'props.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, '_analysis', 'props.yaml'))).toBe(false);
  });
});
