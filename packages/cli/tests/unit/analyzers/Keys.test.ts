import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { KeysAnalyzer } from '../../../src/analyzers/Keys.js';

type KeysYaml = {
  summary: {
    totalComponents: number;
    componentsWithDivergence: number;
    totalNames: number;
    divergentNames: number;
    causeDistribution: Record<string, number>;
  };
  byComponent: Record<string, {
    divergent: number;
    props?: Array<{ key: string; figmaName: string; cause: string }>;
    anatomy?: Array<{ key: string; figmaName: string; cause: string }>;
  }>;
  byCause: Array<{ cause: string; occurrences: number; names: string[] }>;
  byName: Array<{ figmaName: string; occurrences: number; components: string[]; cause: string }>;
};

/** An anatomy or prop entry carrying a recorded Figma name. */
const withName = (type: string, figmaName: string) => ({
  type,
  $extensions: { 'com.figma': { name: figmaName } },
});

describe('KeysAnalyzer', () => {
  let outputDir: string;
  let analysisDir: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keys-test-'));
    analysisDir = path.join(outputDir, '_analysis');
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  /**
   * @param figmaKeys The convention the specs declare in `metadata.config`. Defaults to
   *   SENTENCE; pass undefined to model a catalog generated under the NONE default.
   */
  async function runAnalyzer(
    components: Record<string, Record<string, unknown>>,
    figmaKeys: 'SENTENCE' | 'TITLE' | undefined = 'SENTENCE',
  ) {
    const a = new KeysAnalyzer();
    for (const [componentKey, apiYaml] of Object.entries(components)) {
      const compDir = path.join(outputDir, componentKey);
      await fs.ensureDir(compDir);
      const spec = figmaKeys
        ? { ...apiYaml, metadata: { config: { format: { keys: 'CAMEL', figmaKeys } } } }
        : apiYaml;
      await a.run(spec, { outputDir: compDir, componentKey, outputFormat: 'YAML', tokensFormat: 'TOKEN' });
    }
    await a.finalize!(outputDir, analysisDir);
    const file = path.join(analysisDir, 'keys.yaml');
    if (!await fs.pathExists(file)) return null;
    return yaml.parse(await fs.readFile(file, 'utf-8')) as KeysYaml;
  }

  it('reports nothing for a catalog generated under the NONE default', async () => {
    const result = await runAnalyzer({
      dsBody: { anatomy: { root: withName('text', 'Text') } },
    }, undefined);
    expect(result!.summary.divergentNames).toBe(0);
    expect(result!.byComponent).toEqual({});
  });

  it('ignores a recorded name that satisfies the grammar — wrapper-collapse provenance', async () => {
    // $extensions['com.figma'].name has two triggers. ADR-058 wrapper collapse records
    // the pre-collapse layer name on `root` whether or not it diverges, so a safe name
    // like 'Text' or 'Icon glyph' must not be reported as a naming problem.
    const result = await runAnalyzer({
      dsBody: { anatomy: { root: withName('text', 'Text') } },
      dsIcon: { anatomy: { root: withName('glyph', 'Icon glyph') } },
      dsText: { anatomy: { root: withName('text', 'Text'), urlField: withName('text', 'URL field') } },
    });
    expect(result!.summary.divergentNames).toBe(1);
    expect(Object.keys(result!.byComponent)).toEqual(['dsText']);
    expect(result!.byComponent.dsText.anatomy).toEqual([
      { key: 'urlField', figmaName: 'URL field', cause: 'casing' },
    ]);
  });

  it('reports nothing when no name was recorded', async () => {
    const result = await runAnalyzer({
      dsButton: { anatomy: { label: { type: 'text' } }, props: { size: { type: 'string' } } },
    });
    expect(result!.summary.divergentNames).toBe(0);
    expect(result!.byComponent).toEqual({});
  });

  it('groups divergent names under their component', async () => {
    const result = await runAnalyzer({
      dsAlert: {
        anatomy: { root: { type: 'container' }, iconLeading: withName('glyph', 'Icon Leading') },
        props: { fullBleed: { type: 'boolean', $extensions: { 'com.figma': { name: 'Full Bleed' } } } },
      },
    });

    expect(result!.byComponent.dsAlert.divergent).toBe(2);
    expect(result!.byComponent.dsAlert.props).toEqual([
      { key: 'fullBleed', figmaName: 'Full Bleed', cause: 'casing' },
    ]);
    expect(result!.byComponent.dsAlert.anatomy).toEqual([
      { key: 'iconLeading', figmaName: 'Icon Leading', cause: 'casing' },
    ]);
  });

  it('omits a surface array entirely when it is empty', async () => {
    const result = await runAnalyzer({
      dsBadge: { props: { fullBleed: withName('boolean', 'Full Bleed') } },
    });
    expect(result!.byComponent.dsBadge).not.toHaveProperty('anatomy');
    expect(result!.byComponent.dsBadge.props).toHaveLength(1);
  });

  it('counts every name, not only divergent ones', async () => {
    const result = await runAnalyzer({
      dsButton: {
        anatomy: { root: { type: 'container' }, label: { type: 'text' }, urlField: withName('text', 'URL field') },
        props: { size: { type: 'string' } },
      },
    });
    expect(result!.summary.totalNames).toBe(4);
    expect(result!.summary.divergentNames).toBe(1);
    expect(result!.summary.componentsWithDivergence).toBe(1);
    expect(result!.summary.totalComponents).toBe(1);
  });

  it('aggregates a repeated name across components — one decision, not many', async () => {
    const props = { a11yLabel: withName('string', 'A11y label') };
    const result = await runAnalyzer({
      dsAvatar: { props }, dsBadge: { props }, dsButton: { props },
    });

    const entry = result!.byName.find(n => n.figmaName === 'A11y label')!;
    expect(entry.occurrences).toBe(3);
    expect(entry.components).toEqual(['dsAvatar', 'dsBadge', 'dsButton']);
  });

  it('walks anatomy nested in slot content and compositions', async () => {
    const result = await runAnalyzer({
      dsCard: {
        anatomy: { root: { type: 'container' } },
        slotContentExamples: { basic: { anatomy: { urlField: withName('text', 'URL field') } } },
        compositions: { hero: { anatomy: { cutPaste: withName('container', 'Cut & paste') } } },
      },
    });
    expect(result!.byComponent.dsCard.divergent).toBe(2);
  });

  it('collects subcomponents under a dot-path key', async () => {
    const result = await runAnalyzer({
      dsList: {
        anatomy: { root: { type: 'container' } },
        subcomponents: { item: { anatomy: { startIcon: withName('glyph', 'Start Icon') } } },
      },
    });
    expect(result!.byComponent['dsList.item'].divergent).toBe(1);
  });

  describe('cause classification', () => {
    it.each([
      ['Label   ', 'separator'],
      ['Cut & paste', 'symbol'],
      ['Étiquette', 'non-ascii'],
      ['A11y label', 'mixed-letter-digit'],
      ['0000 0000', 'digit-initial'],
      ['Start Icon', 'casing'],
      ['x-figmacollapse', 'already-a-key'],
    ])('classifies %s as %s', async (figmaName, expected) => {
      const result = await runAnalyzer({
        dsX: { anatomy: { k: withName('text', figmaName as string) } },
      });
      expect(result!.byComponent.dsX.anatomy![0].cause).toBe(expected);
    });

    it('ranks causes by frequency', async () => {
      const result = await runAnalyzer({
        dsA: { anatomy: { a: withName('text', 'Start Icon'), b: withName('text', 'End Icon') } },
        dsB: { anatomy: { c: withName('text', 'Cut & paste') } },
      });
      expect(result!.byCause[0]).toEqual({ cause: 'casing', occurrences: 2, names: ['End Icon', 'Start Icon'] });
      expect(result!.byCause[1].cause).toBe('symbol');
    });
  });
});
