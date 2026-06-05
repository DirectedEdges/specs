import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { Transform } from '../../../src/commands/TransformCommand.js';
import * as transformers from '../../../src/transforms/index.js';
import type { Transformer, TransformerContext } from '../../../src/Types/Transformer.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeOutputDir(base: string, components: string[]) {
  for (const name of components) {
    const dir = path.join(base, name);
    await fs.ensureDir(dir);
    await fs.writeFile(path.join(dir, 'api.yaml'), yaml.stringify({ title: name }), 'utf-8');
  }
}

async function runTransform(args: string[]) {
  // Commander accumulates state; use parseAsync on a fresh copy of the command via re-import.
  // We invoke the action directly by calling parseAsync with a synthetic argv.
  await Transform.parseAsync(['node', 'specs', ...args]);
}

// ── Registration ──────────────────────────────────────────────────────────────

describe('TransformCommand registration', () => {
  it('registers name "transform"', () => {
    expect(Transform.name()).toBe('transform');
  });

  it('has [transformers...] variadic argument', () => {
    const arg = Transform.registeredArguments[0];
    expect(arg.name()).toBe('transformers');
    expect(arg.variadic).toBe(true);
    expect(arg.required).toBe(false);
  });

  it('registers --output, --config, --verbose options', () => {
    const longs = Transform.options.map(o => o.long);
    expect(longs).toContain('--output');
    expect(longs).toContain('--config');
    expect(longs).toContain('--verbose');
  });
});

// ── Transformer resolution ─────────────────────────────────────────────────

describe('resolveTransformers', () => {
  it('returns a known transformer by name', () => {
    const result = transformers.resolveTransformers(['contract']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('contract');
  });

  it('returns multiple transformers in order', () => {
    const result = transformers.resolveTransformers(['contract', 'css', 'styling']);
    expect(result.map(t => t.name)).toEqual(['contract', 'css', 'styling']);
  });

  it('warns and skips unknown transformer names', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = transformers.resolveTransformers(['contract', 'unknown-thing']);
    expect(result).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown transformer "unknown-thing"'));
    warnSpy.mockRestore();
  });

  it('returns empty array for all unknown names', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = transformers.resolveTransformers(['nope', 'also-nope']);
    expect(result).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('DEFAULT_TRANSFORMERS is ["contract"]', () => {
    expect(transformers.DEFAULT_TRANSFORMERS).toEqual(['contract']);
  });
});

// ── Action: run() and finalize() ─────────────────────────────────────────────

describe('TransformCommand action', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'transform-cmd-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.restoreAllMocks();
  });

  it('calls run() once per component and finalize() once after', async () => {
    await makeOutputDir(tmpDir, ['dsButton', 'dsAlert']);

    const runMock = vi.fn().mockResolvedValue(undefined);
    const finalizeMock = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(transformers, 'resolveTransformers').mockReturnValue([
      { name: 'contract', run: runMock, finalize: finalizeMock } as unknown as Transformer,
    ]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    await runTransform(['--output', tmpDir, 'contract']);

    expect(runMock).toHaveBeenCalledTimes(2);
    expect(finalizeMock).toHaveBeenCalledTimes(1);
    expect(finalizeMock).toHaveBeenCalledWith(tmpDir);
    exitSpy.mockRestore();
  });

  it('passes tokensFormat from config into TransformerContext', async () => {
    await makeOutputDir(tmpDir, ['dsButton']);

    const runMock = vi.fn().mockResolvedValue(undefined);
    let capturedContext: TransformerContext | undefined;
    runMock.mockImplementation((_api: unknown, ctx: TransformerContext) => {
      capturedContext = ctx;
      return Promise.resolve();
    });

    vi.spyOn(transformers, 'resolveTransformers').mockReturnValue([
      { name: 'contract', run: runMock } as unknown as Transformer,
    ]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    await runTransform(['--output', tmpDir, 'contract']);

    expect(capturedContext).toBeDefined();
    expect(capturedContext!.tokensFormat).toBeDefined();
    exitSpy.mockRestore();
  });

  it('skips finalize when transformer has no finalize method', async () => {
    await makeOutputDir(tmpDir, ['dsButton']);

    const runMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(transformers, 'resolveTransformers').mockReturnValue([
      { name: 'contract', run: runMock } as unknown as Transformer,
    ]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    // Should not throw even without finalize
    await expect(runTransform(['--output', tmpDir, 'contract'])).resolves.not.toThrow();
    exitSpy.mockRestore();
  });

  it('exits with error when output directory does not exist', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runTransform(['--output', path.join(tmpDir, 'nonexistent'), 'contract']);

    expect(exitSpy).toHaveBeenCalledWith(expect.any(Number));
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('exits with error when no component directories have api.yaml', async () => {
    // tmpDir exists but has no component subdirs
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runTransform(['--output', tmpDir, 'contract']);

    expect(exitSpy).toHaveBeenCalledWith(expect.any(Number));
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
