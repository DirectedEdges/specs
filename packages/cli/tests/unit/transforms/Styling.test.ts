import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { StylingTransformer } from '../../../src/transforms/Styling.js';

const transformer = new StylingTransformer();

function makeContext(dir: string) {
  return { outputDir: dir, componentKey: 'dsButton' };
}

async function run(dir: string, apiYaml: Record<string, unknown>): Promise<string> {
  await transformer.run(apiYaml, makeContext(dir));
  return fs.readFile(path.join(dir, 'styling.ts'), 'utf-8');
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

  it('writes a styling.ts with header and type declarations', async () => {
    const out = await run(tmpDir, {});
    expect(out).toContain('// Generated. Do not edit');
    expect(out).toContain("export type StylingCategory =");
    expect(out).toContain('export interface StylingRow {');
    expect(out).toContain('DsButtonStyling');
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
    expect(out).toContain("category: 'VARIABLES'");
    expect(out).toContain("name: 'DS Color.Surface.Primary'");
    expect(out).toContain("appliedAs: 'Background color'");
    expect(out).toContain("'root': 1");
  });

  it('classifies typography tokens as TEXT_STYLES', async () => {
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
    expect(out).toContain("category: 'TEXT_STYLES'");
    expect(out).toContain("name: 'DS Type.Body.Default'");
    expect(out).toContain("appliedAs: 'Text style'");
  });

  it('classifies shadow tokens as EFFECT_STYLES', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              effects: { $token: 'DS Shadow.Elevation.1', $type: 'shadow' },
            },
          },
        },
      },
    });
    expect(out).toContain("category: 'EFFECT_STYLES'");
    expect(out).toContain("name: 'DS Shadow.Elevation.1'");
    expect(out).toContain("appliedAs: 'Effect style'");
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
    expect(out).toContain("'root': 2");
  });

  it('deduplicates the same token applied across multiple variants', async () => {
    await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: { styles: { backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' } } },
        },
      },
      variants: [
        {
          elements: {
            root: { styles: { backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' } } },
          },
        },
        {
          elements: {
            root: { styles: { backgroundColor: { $token: 'DS Color.Surface.Primary', $type: 'color' } } },
          },
        },
      ],
    });
    const out = await fs.readFile(path.join(tmpDir, 'styling.ts'), 'utf-8');
    const occurrences = (out.match(/DS Color\.Surface\.Primary/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('uses fillColor appliedAs for glyph elements', async () => {
    const out = await run(tmpDir, {
      anatomy: { icon: { type: 'glyph' } },
      default: {
        elements: {
          icon: {
            styles: {
              backgroundColor: { $token: 'DS Color.Icon.Primary', $type: 'color' },
            },
          },
        },
      },
    });
    expect(out).toContain("appliedAs: 'Fill color'");
  });

  it('uses Text color for text elements with fills/backgroundColor', async () => {
    const out = await run(tmpDir, {
      anatomy: { label: { type: 'text' } },
      default: {
        elements: {
          label: {
            styles: {
              backgroundColor: { $token: 'DS Color.Text.Primary', $type: 'color' },
            },
          },
        },
      },
    });
    expect(out).toContain("appliedAs: 'Text color'");
  });

  it('humanizes unknown style keys', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              cornerRadius: { $token: 'DS Shape.Radius.Medium', $type: 'dimension' },
            },
          },
        },
      },
    });
    expect(out).toContain("appliedAs: 'Corner radius'");
  });

  it('skips non-token style values', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' } },
      default: {
        elements: {
          root: {
            styles: {
              visible: true,
              width: 48,
              strokes: '#FF0000',
            },
          },
        },
      },
    });
    expect(out).toMatch(/DsButtonStyling: readonly StylingRow\[\] = \[\s*\];/);
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
      expect(out1).toBe(out2);
    } finally {
      await fs.remove(tmpDir2);
    }
  });

  it('sorts rows: VARIABLES before TEXT_STYLES, then alphabetical by name', async () => {
    const out = await run(tmpDir, {
      anatomy: { root: { type: 'container' }, label: { type: 'text' } },
      default: {
        elements: {
          root: { styles: { backgroundColor: { $token: 'DS Color.Zebra', $type: 'color' } } },
          label: { styles: { typography: { $token: 'DS Type.Body', $type: 'typography' } } },
        },
      },
    });
    const varIdx = out.indexOf("'VARIABLES'");
    const textIdx = out.indexOf("'TEXT_STYLES'");
    expect(varIdx).toBeGreaterThan(-1);
    expect(textIdx).toBeGreaterThan(varIdx);
  });
});
