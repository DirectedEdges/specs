import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ContractTransformer } from '../../../src/transforms/Contract.js';

const transformer = new ContractTransformer();

function makeContext(dir: string, componentKey = 'dsButton') {
  return { outputDir: dir, componentKey, tokensFormat: 'TOKEN' };
}

async function run(dir: string, apiYaml: Record<string, unknown>, componentKey = 'dsButton') {
  await transformer.run(apiYaml, makeContext(dir, componentKey));
  return fs.readFile(path.join(dir, 'contract.ts'), 'utf-8');
}

describe('ContractTransformer', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contract-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('has name "contract"', () => {
    expect(transformer.name).toBe('contract');
  });

  it('writes contract.ts with generated header', async () => {
    const out = await run(tmpDir, {});
    expect(out).toContain('// Generated. Do not edit');
  });

  it('emits an empty Props interface when there are no props', async () => {
    const out = await run(tmpDir, {});
    expect(out).toContain('export interface DsButtonProps {');
    expect(out).toContain('}');
  });

  it('emits a boolean prop', async () => {
    const out = await run(tmpDir, {
      props: { disabled: { type: 'boolean', default: false } },
    });
    expect(out).toContain('disabled?: boolean;');
    expect(out).toContain('disabled: false,');
  });

  it('emits a number prop', async () => {
    const out = await run(tmpDir, {
      props: { maxItems: { type: 'number', default: 3 } },
    });
    expect(out).toContain('maxItems?: number;');
    expect(out).toContain('maxItems: 3,');
  });

  it('emits a plain string prop', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string' } },
    });
    expect(out).toContain('label?: string;');
  });

  it('emits a nullable string prop as string | null', async () => {
    const out = await run(tmpDir, {
      props: { icon: { type: 'string', nullable: true, default: null } },
    });
    expect(out).toContain('icon?: string | null;');
    expect(out).toContain('icon: null,');
  });

  it('emits an enum prop as a union type + reference in interface', async () => {
    const out = await run(tmpDir, {
      props: {
        appearance: { type: 'string', enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
      },
    });
    expect(out).toContain("export type DsButtonAppearance =");
    expect(out).toContain("| 'primary'");
    expect(out).toContain("| 'secondary'");
    expect(out).toContain("| 'ghost';");
    expect(out).toContain('appearance?: DsButtonAppearance;');
    expect(out).toContain('appearance: "primary",');
  });

  it('emits a nullable enum prop as TypeName | null', async () => {
    const out = await run(tmpDir, {
      props: {
        variant: { type: 'string', enum: ['a', 'b'], nullable: true, default: null },
      },
    });
    expect(out).toContain('variant?: DsButtonVariant | null;');
  });

  it('skips slot props', async () => {
    const out = await run(tmpDir, {
      props: {
        children: { type: 'slot' },
        label: { type: 'string' },
      },
    });
    expect(out).not.toContain('children');
    expect(out).toContain('label?: string;');
  });

  it('omits the Defaults const when no props have defaults', async () => {
    const out = await run(tmpDir, {
      props: { label: { type: 'string' } },
    });
    expect(out).not.toContain('Defaults');
  });

  it('emits Defaults only for props that declare a default', async () => {
    const out = await run(tmpDir, {
      props: {
        label: { type: 'string' },
        disabled: { type: 'boolean', default: false },
      },
    });
    expect(out).toContain('export const DsButtonDefaults = {');
    expect(out).toContain('disabled: false,');
    expect(out).not.toContain('label:');
  });

  it('uses the componentKey for PascalCase type prefix', async () => {
    const out = await run(tmpDir, { props: { size: { type: 'string', enum: ['sm', 'md'] } } }, 'dsAlert');
    expect(out).toContain('export type DsAlertSize =');
    expect(out).toContain('export interface DsAlertProps {');
  });

  it('emits multiple enum types before the Props interface', async () => {
    const out = await run(tmpDir, {
      props: {
        size: { type: 'string', enum: ['sm', 'lg'], default: 'sm' },
        appearance: { type: 'string', enum: ['filled', 'outline'], default: 'filled' },
      },
    });
    const sizeIdx = out.indexOf('export type DsButtonSize');
    const appearanceIdx = out.indexOf('export type DsButtonAppearance');
    const propsIdx = out.indexOf('export interface DsButtonProps');
    expect(sizeIdx).toBeGreaterThanOrEqual(0);
    expect(appearanceIdx).toBeGreaterThanOrEqual(0);
    expect(Math.max(sizeIdx, appearanceIdx)).toBeLessThan(propsIdx);
  });

  it('ends with a satisfies clause on the Defaults const', async () => {
    const out = await run(tmpDir, {
      props: { active: { type: 'boolean', default: true } },
    });
    expect(out).toContain('} satisfies DsButtonProps;');
  });
});
