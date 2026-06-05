import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { StylingTransformer } from '../../../src/transforms/Styling.js';

const transformer = new StylingTransformer();

function makeContext(dir: string) {
  return { outputDir: dir, componentKey: 'dsButton' };
}

async function run(dir: string, apiYaml: Record<string, unknown>) {
  await transformer.run(apiYaml, makeContext(dir));
  const raw = await fs.readFile(path.join(dir, 'styling.json'), 'utf-8');
  return JSON.parse(raw) as {
    variables: Array<{ name: string; appliedAs: string; rawValue?: unknown; appliedTo: Record<string, number> }>;
    colorStyles: Array<{ name: string; appliedAs: string; rawValue?: unknown; appliedTo: Record<string, number> }>;
    textStyles: Array<{ name: string; appliedAs: string; rawValue?: unknown; appliedTo: Record<string, number> }>;
    effectStyles: Array<{ name: string; appliedAs: string; rawValue?: unknown; appliedTo: Record<string, number> }>;
  };
}

describe('StylingTransformer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'styling-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('has name "styling"', () => {
    expect(transformer.name).toBe('styling');
  });

  it('writes styling.json with all four category groups', async () => {
    const out = await run(tmpDir, {});
    expect(out).toHaveProperty('variables');
    expect(out).toHaveProperty('colorStyles');
    expect(out).toHaveProperty('textStyles');
    expect(out).toHaveProperty('effectStyles');
  });

  it('collects variable tokens from default elements', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' },
            },
          },
        },
      },
    });
    expect(out.variables).toHaveLength(1);
    expect(out.variables[0].name).toBe('DS Color.Surface.Primary');
    expect(out.variables[0].appliedAs).toBe('backgroundColor');
    expect(out.variables[0].appliedTo).toEqual({ root: 1 });
  });

  it('classifies typography tokens as textStyles', async () => {
    const out = await run(tmpDir, {
      anatomy: { label: { type: 'text' } },
      default: {
        elements: {
          label: {
            styles: {
              typography: { $token: 'DS Type.Body.Default', $type: 'typography' },
            },
          },
        },
      },
    });
    expect(out.textStyles).toHaveLength(1);
    expect(out.textStyles[0].name).toBe('DS Type.Body.Default');
    expect(out.textStyles[0].appliedAs).toBe('typography');
  });

  it('classifies effects tokens as effectStyles', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              effects: { $token: 'DS Shadow.Elevation.1', $type: 'effects' },
            },
          },
        },
      },
    });
    expect(out.effectStyles).toHaveLength(1);
    expect(out.effectStyles[0].name).toBe('DS Shadow.Elevation.1');
    expect(out.effectStyles[0].appliedAs).toBe('effects');
  });

  it('accumulates appliedTo counts across variants', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' },
            },
          },
        },
      },
      variants: [
        {
          configuration: { appearance: 'secondary' },
          elements: {
            root: {
              styles: {
                backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' },
              },
            },
          },
        },
      ],
    });
    expect(out.variables[0].appliedTo).toEqual({ root: 2 });
  });

  it('deduplicates the same token applied across multiple variants', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: { styles: { backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' } } },
        },
      },
      variants: [
        { elements: { root: { styles: { backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' } } } } },
        { elements: { root: { styles: { backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' } } } } },
      ],
    });
    expect(out.variables).toHaveLength(1);
  });

  it('uses the dot-joined key path as appliedAs for nested tokens', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              padding: {
                start: { $token: 'DS Space.3x', $type: 'dimension' },
                end: { $token: 'DS Space.3x', $type: 'dimension' },
                top: 0,
                bottom: 0,
              },
            },
          },
        },
      },
    });
    const appliedAs = out.variables.map(r => r.appliedAs).sort();
    expect(appliedAs).toEqual(['padding.end', 'padding.start']);
  });

  it('uses dot-joined path for per-corner radii', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              cornerRadius: {
                topStart: { $token: 'DS Shape.Radius.XL', $type: 'dimension' },
                topEnd: { $token: 'DS Shape.Radius.XL', $type: 'dimension' },
                bottomStart: 0,
                bottomEnd: 0,
              },
            },
          },
        },
      },
    });
    const appliedAs = out.variables.map(r => r.appliedAs).sort();
    expect(appliedAs).toEqual(['cornerRadius.topEnd', 'cornerRadius.topStart']);
  });

  it('skips non-token style values', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: { visible: true, width: 48, strokes: '#FF0000' },
          },
        },
      },
    });
    expect(out.variables).toHaveLength(0);
    expect(out.colorStyles).toHaveLength(0);
    expect(out.textStyles).toHaveLength(0);
    expect(out.effectStyles).toHaveLength(0);
  });

  it('includes rawValue when present in $extensions', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              backgroundColor: {
                $token: 'DS Color.Primary',
                $type: 'color',
                $extensions: { 'com.figma': { rawValue: '#FF0000' } },
              },
            },
          },
        },
      },
    });
    expect(out.variables[0].rawValue).toBe('#FF0000');
  });

  it('omits rawValue when $extensions are absent', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              backgroundColor: { $token: 'DS Color.Primary', $type: 'color' },
            },
          },
        },
      },
    });
    expect('rawValue' in out.variables[0]).toBe(false);
  });

  it('output is deterministic for the same input', async () => {
    const apiYaml = {
      anatomy: { root: { type: 'container' }, label: { type: 'text' } },
      default: {
        elements: {
          root: { styles: { backgroundColor: { $token: 'DS Color.B', $type: 'color' } } },
          label: { styles: { backgroundColor: { $token: 'DS Color.A', $type: 'color' } } },
        },
      },
    };
    const tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'styling-det-'));
    try {
      const out1 = await run(tmpDir, apiYaml);
      const out2 = await run(tmpDir2, apiYaml);
      expect(JSON.stringify(out1)).toBe(JSON.stringify(out2));
    } finally {
      await fs.remove(tmpDir2);
    }
  });

  it('sorts rows alphabetically by name within each category', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              backgroundColor: { $token: 'DS Color.Zebra', $type: 'color' },
              strokes: { $token: 'DS Color.Alpha', $type: 'color' },
            },
          },
        },
      },
    });
    const names = out.variables.map(r => r.name);
    expect(names).toEqual([...names].sort());
  });
});

describe('StylingTransformer.finalize', () => {
  const TOKEN_A = { $token: 'Color/Primary', $type: 'color' };
  const TOKEN_B = { $token: 'Typography/Body', $type: 'typography' };

  const COMP_A = {
    anatomy: { root: { type: 'container' } },
    default: { elements: { root: { styles: { backgroundColor: TOKEN_A } } } },
  };
  const COMP_B = {
    anatomy: { root: { type: 'container' }, label: { type: 'text' } },
    default: {
      elements: {
        root: { styles: { backgroundColor: TOKEN_A } },
        label: { styles: { typography: TOKEN_B } },
      },
    },
  };

  let outputDir: string;
  let compDirA: string;
  let compDirB: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'styling-dict-'));
    compDirA = path.join(outputDir, 'compA');
    compDirB = path.join(outputDir, 'compB');
    await fs.ensureDir(compDirA);
    await fs.ensureDir(compDirB);
  });

  afterEach(async () => {
    await fs.remove(outputDir);
  });

  async function runFinalize() {
    const t = new StylingTransformer();
    await t.run(COMP_A, { outputDir: compDirA, componentKey: 'compA' });
    await t.run(COMP_B, { outputDir: compDirB, componentKey: 'compB' });
    await t.finalize!(outputDir);
    const byComp = JSON.parse(await fs.readFile(path.join(outputDir, '_dictionary', 'styling.byComponent.json'), 'utf-8'));
    const byToken = JSON.parse(await fs.readFile(path.join(outputDir, '_dictionary', 'styling.byToken.json'), 'utf-8'));
    return { byComp, byToken };
  }

  it('creates _dictionary folder with both files', async () => {
    await runFinalize();
    expect(fs.existsSync(path.join(outputDir, '_dictionary', 'styling.byComponent.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, '_dictionary', 'styling.byToken.json'))).toBe(true);
  });

  it('byComponent keys match component names in alphabetical order', async () => {
    const { byComp } = await runFinalize();
    expect(Object.keys(byComp)).toEqual(['compA', 'compB']);
  });

  it('byComponent entries mirror per-component file structure', async () => {
    const { byComp } = await runFinalize();
    expect(byComp.compA.variables).toHaveLength(1);
    expect(byComp.compA.variables[0].name).toBe('Color/Primary');
    expect(byComp.compB.textStyles).toHaveLength(1);
    expect(byComp.compB.textStyles[0].name).toBe('Typography/Body');
  });

  it('byComponent omits rawValue even when present in per-component file', async () => {
    const t = new StylingTransformer();
    const withRaw = {
      anatomy: { root: { type: 'container' } },
      default: { elements: { root: { styles: { backgroundColor: { $token: 'DS/X', $type: 'color', $extensions: { 'com.figma': { rawValue: '#FF0000' } } } } } } },
    };
    const compDir = path.join(outputDir, 'compRaw');
    await fs.ensureDir(compDir);
    await t.run(withRaw, { outputDir: compDir, componentKey: 'compRaw' });
    await t.finalize!(outputDir);
    const byComp = JSON.parse(await fs.readFile(path.join(outputDir, '_dictionary', 'styling.byComponent.json'), 'utf-8'));
    expect('rawValue' in byComp.compRaw.variables[0]).toBe(false);
  });

  it('byToken groups usages by token name across components', async () => {
    const { byToken } = await runFinalize();
    expect(byToken.variables['Color/Primary']).toHaveLength(2);
    const components = byToken.variables['Color/Primary'].map((e: { component: string }) => e.component).sort();
    expect(components).toEqual(['compA', 'compB']);
  });

  it('byToken entries have component, appliedAs, appliedTo — no rawValue', async () => {
    const { byToken } = await runFinalize();
    const entry = byToken.variables['Color/Primary'][0];
    expect(entry).toHaveProperty('component');
    expect(entry).toHaveProperty('appliedAs');
    expect(entry).toHaveProperty('appliedTo');
    expect(entry).not.toHaveProperty('rawValue');
  });

  it('byToken textStyles contains token from only the component that uses it', async () => {
    const { byToken } = await runFinalize();
    expect(byToken.textStyles['Typography/Body']).toHaveLength(1);
    expect(byToken.textStyles['Typography/Body'][0].component).toBe('compB');
  });

  it('does nothing when no components were processed', async () => {
    const t = new StylingTransformer();
    await t.finalize!(outputDir);
    expect(fs.existsSync(path.join(outputDir, '_dictionary'))).toBe(false);
  });
});
