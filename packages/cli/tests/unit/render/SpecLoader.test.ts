import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { stringify } from 'yaml';
import { loadSpec } from '../../../src/Render/SpecLoader';
import { splitComponentByConcern } from '../../../src/Writers/DataTransformers';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'specloader-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const COMPONENT = {
  title: 'DE Button',
  anatomy: { root: { type: 'container' } },
  props: { appearance: { type: 'string', default: 'Filled' } },
  default: { appearance: 'Filled' },
  variants: [{ appearance: 'Filled' }, { appearance: 'Outline' }],
  slotContentExamples: { label: 'Click me' },
  metadata: { generatedAt: '2026-01-01T00:00:00.000Z' },
};

describe('loadSpec — single file', () => {
  it('parses a combined .yaml spec', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'deButton.yaml');
    fs.writeFileSync(file, stringify(COMPONENT), 'utf8');

    const { spec, resolvePath } = loadSpec(file);

    expect(resolvePath).toBe(path.resolve(file));
    expect(spec.title).toBe('DE Button');
    expect(spec.variants).toEqual(COMPONENT.variants);
  });

  it('parses a combined .json spec', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'deButton.json');
    fs.writeFileSync(file, JSON.stringify(COMPONENT), 'utf8');

    const { spec } = loadSpec(file);

    expect(spec.title).toBe('DE Button');
    expect(spec.props).toEqual(COMPONENT.props);
  });

  it('throws a clear error for an unsupported extension', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'deButton.txt');
    fs.writeFileSync(file, 'title: X', 'utf8');

    expect(() => loadSpec(file)).toThrow(/Unsupported spec file extension/);
  });

  it('throws when the path does not exist', () => {
    expect(() => loadSpec('/nonexistent/path/to/spec.yaml')).toThrow(/not found/);
  });
});

describe('loadSpec — split-concerns folder', () => {
  it('merges api.yaml + variants.yaml + examples.yaml back into one component', () => {
    const dir = makeTmpDir();
    const { api, variants, examples } = splitComponentByConcern(COMPONENT);

    fs.writeFileSync(path.join(dir, 'api.yaml'), stringify(api), 'utf8');
    fs.writeFileSync(path.join(dir, 'variants.yaml'), stringify(variants), 'utf8');
    fs.writeFileSync(path.join(dir, 'examples.yaml'), stringify(examples), 'utf8');

    const { spec, resolvePath } = loadSpec(dir);

    expect(resolvePath).toBe(path.resolve(dir));
    expect(spec.title).toBe(COMPONENT.title);
    expect(spec.anatomy).toEqual(COMPONENT.anatomy);
    expect(spec.props).toEqual(COMPONENT.props);
    expect(spec.default).toEqual(COMPONENT.default);
    expect(spec.variants).toEqual(COMPONENT.variants);
    expect(spec.slotContentExamples).toEqual(COMPONENT.slotContentExamples);
  });

  it('supports mixed extensions across concern files', () => {
    const dir = makeTmpDir();
    const { api, variants } = splitComponentByConcern(COMPONENT);

    fs.writeFileSync(path.join(dir, 'api.json'), JSON.stringify(api), 'utf8');
    fs.writeFileSync(path.join(dir, 'variants.yaml'), stringify(variants), 'utf8');

    const { spec } = loadSpec(dir);

    expect(spec.title).toBe(COMPONENT.title);
    expect(spec.variants).toEqual(COMPONENT.variants);
    expect(spec.slotContentExamples).toBeUndefined();
  });

  it('works without an examples file (optional concern)', () => {
    const dir = makeTmpDir();
    const noExamples = { ...COMPONENT, slotContentExamples: undefined };
    const { api, variants } = splitComponentByConcern(noExamples);

    fs.writeFileSync(path.join(dir, 'api.yaml'), stringify(api), 'utf8');
    fs.writeFileSync(path.join(dir, 'variants.yaml'), stringify(variants), 'utf8');

    const { spec } = loadSpec(dir);

    expect(spec.title).toBe(COMPONENT.title);
    expect(spec.slotContentExamples).toBeUndefined();
  });

  it('throws when the folder is missing a required concern file', () => {
    const dir = makeTmpDir();
    const { api } = splitComponentByConcern(COMPONENT);
    fs.writeFileSync(path.join(dir, 'api.yaml'), stringify(api), 'utf8');

    expect(() => loadSpec(dir)).toThrow(/Expected api\.\(yaml\|json\) and variants\.\(yaml\|json\)/);
  });

  it('merges subcomponents recursively', () => {
    const dir = makeTmpDir();
    const withSub = {
      ...COMPONENT,
      subcomponents: {
        icon: {
          title: 'Icon',
          anatomy: {},
          props: { size: { type: 'number' } },
          default: { size: 16 },
          variants: [{ size: 16 }],
          metadata: {},
        },
      },
    };
    const { api, variants, examples } = splitComponentByConcern(withSub);

    fs.writeFileSync(path.join(dir, 'api.yaml'), stringify(api), 'utf8');
    fs.writeFileSync(path.join(dir, 'variants.yaml'), stringify(variants), 'utf8');
    fs.writeFileSync(path.join(dir, 'examples.yaml'), stringify(examples), 'utf8');

    const { spec } = loadSpec(dir);
    const sub = (spec.subcomponents as any).icon;

    expect(sub.title).toBe('Icon');
    expect(sub.props).toEqual({ size: { type: 'number' } });
    expect(sub.default).toEqual({ size: 16 });
  });
});
