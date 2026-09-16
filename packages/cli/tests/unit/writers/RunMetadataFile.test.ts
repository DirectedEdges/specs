import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';
import { DEFAULT_SETTINGS, type RunMetadata as SchemaRunMetadata } from '@directededges/specs-schema';
import { RunMetadataFile, RunMetadataReader, RUN_METADATA_BASENAME } from '../../../src/Writers/RunMetadataFile.js';

const run = (): SchemaRunMetadata => ({
  author: 'Design Systems Team',
  lastUpdated: '2026-09-15T00:00:00.000Z',
  generator: { url: 'https://example.com', version: '0.30.0', name: 'specs-cli' },
  schema: { url: 'https://example.com/schema', version: '0.33.0' },
  conventions: { platforms: { figma: { naming: 'SENTENCE', slotConstraints: false, inferNumberProps: false } } },
  settings: structuredClone(DEFAULT_SETTINGS),
});

const source = (nodeId: string) => ({ pageId: 'p1', nodeId, nodeType: 'COMPONENT' as const });

const spec = (nodeId: string, extra: Record<string, unknown> = {}) => ({
  title: 'Button',
  metadata: { ...run(), source: source(nodeId) },
  ...extra,
});

describe('RunMetadataFile.separate', () => {
  it('lifts the run facts out and leaves source alone on each spec', () => {
    const specs = [
      { name: 'Button', spec: spec('n1') },
      { name: 'Card', spec: spec('n2') },
    ];
    const lifted = RunMetadataFile.separate(specs);

    expect(lifted).toEqual(run());
    expect(specs[0].spec.metadata).toEqual({ source: source('n1') });
    expect(specs[1].spec.metadata).toEqual({ source: source('n2') });
  });

  it('reduces nested subcomponent metadata too', () => {
    const specs = [{
      name: 'Button',
      spec: spec('n1', {
        subcomponents: {
          icon: spec('n2', { subcomponents: { glyph: spec('n3') } }),
        },
      }),
    }];
    RunMetadataFile.separate(specs);

    const sub = (specs[0].spec as any).subcomponents.icon;
    expect(sub.metadata).toEqual({ source: source('n2') });
    expect(sub.subcomponents.glyph.metadata).toEqual({ source: source('n3') });
  });

  it('drops writer-added keys that describe the document, not the component', () => {
    const specs = [{
      name: 'Button',
      spec: { metadata: { ...run(), source: source('n1'), concern: 'api', generatedAt: 'x' } },
    }];
    RunMetadataFile.separate(specs);
    expect(specs[0].spec.metadata).toEqual({ source: source('n1') });
  });

  it('leaves specs untouched when they disagree on the run', () => {
    const diverged = spec('n2');
    diverged.metadata.generator = { url: 'https://example.com', version: '0.29.0', name: 'specs-cli' };
    const specs = [{ name: 'Button', spec: spec('n1') }, { name: 'Card', spec: diverged }];

    expect(RunMetadataFile.separate(specs)).toBeUndefined();
    expect(specs[0].spec.metadata).toHaveProperty('settings');
    expect(specs[1].spec.metadata).toHaveProperty('settings');
  });

  it('tolerates a timestamp that moved during the run', () => {
    const later = spec('n2');
    later.metadata.lastUpdated = '2026-09-15T23:59:59.000Z';
    const specs = [{ name: 'Button', spec: spec('n1') }, { name: 'Card', spec: later }];

    expect(RunMetadataFile.separate(specs)).toEqual(run());
    expect(specs[1].spec.metadata).toEqual({ source: source('n2') });
  });

  it('leaves specs untouched when none state a complete run', () => {
    const specs = [{ name: 'Button', spec: { metadata: { source: source('n1') } } }];
    expect(RunMetadataFile.separate(specs)).toBeUndefined();
    expect(specs[0].spec.metadata).toEqual({ source: source('n1') });
  });
});

describe('RunMetadataFile.write and RunMetadataReader.find', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-metadata-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('writes the run document beside the specs', () => {
    const written = RunMetadataFile.write(run(), dir, 'yaml');
    expect(path.basename(written)).toBe(`${RUN_METADATA_BASENAME}.yaml`);
    expect(yaml.parse(fs.readFileSync(written, 'utf8'))).toEqual(run());
  });

  it('carries no per-component data', () => {
    const written = RunMetadataFile.write(run(), dir, 'yaml');
    expect(yaml.parse(fs.readFileSync(written, 'utf8'))).not.toHaveProperty('source');
  });

  it('finds the document from a spec file in the same directory', () => {
    RunMetadataFile.write(run(), dir, 'yaml');
    fs.writeFileSync(path.join(dir, 'button.yaml'), 'title: Button\n');
    expect(RunMetadataReader.find(path.join(dir, 'button.yaml'))).toEqual(run());
  });

  it('finds the document one level up, from inside a component folder', () => {
    RunMetadataFile.write(run(), dir, 'yaml');
    const folder = path.join(dir, 'button');
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, 'api.yaml'), 'title: Button\n');
    expect(RunMetadataReader.find(path.join(folder, 'api.yaml'))).toEqual(run());
  });

  it('finds a JSON document for a JSON run', () => {
    RunMetadataFile.write(run(), dir, 'json');
    expect(RunMetadataReader.find(dir)).toEqual(run());
  });

  it('returns undefined when no document is present', () => {
    expect(RunMetadataReader.find(path.join(dir, 'button.yaml'))).toBeUndefined();
  });

  it('skips a malformed document rather than throwing', () => {
    fs.writeFileSync(path.join(dir, `${RUN_METADATA_BASENAME}.yaml`), '{{{ not yaml');
    expect(RunMetadataReader.find(dir)).toBeUndefined();
  });
});
