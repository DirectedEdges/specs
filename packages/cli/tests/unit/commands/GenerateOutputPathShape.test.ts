// `-o` names the specs root, and a split run writes a tree beneath it (ADR-096).
// A path ending in a spec extension is therefore an authoring mistake: honouring it
// produced a directory named `button.yaml`. Refused before anything is generated.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DEFAULT_SETTINGS } from '@directededges/specs-schema';
import { assertOutputPathShape } from '../../../src/commands/GenerateCommand.js';
import type { CLIConfig } from '../../../src/Types/CLIConfig.js';

/** A config whose split flags are the shipped defaults: both splits on. */
function configWith(overrides: Partial<typeof DEFAULT_SETTINGS.spec> = {}): CLIConfig {
  return {
    settings: { ...DEFAULT_SETTINGS, spec: { ...DEFAULT_SETTINGS.spec, ...overrides } },
  } as unknown as CLIConfig;
}

afterEach(() => vi.restoreAllMocks());

/** Run the guard, reporting whether it exited and what it said. */
function guard(options: Record<string, unknown>, config: CLIConfig): { exited: boolean; output: string } {
  const lines: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void lines.push(args.join(' ')));
  let exited = false;
  vi.spyOn(process, 'exit').mockImplementation(((): never => {
    exited = true;
    throw new Error('exit');
  }) as never);
  try {
    assertOutputPathShape(options as never, config);
  } catch (e) {
    if (!exited) throw e;
  }
  return { exited, output: lines.join('\n') };
}

describe('assertOutputPathShape', () => {
  it('refuses a .yaml path on a split run, naming the directory to pass instead', () => {
    const { exited, output } = guard({ output: 'specs/button.yaml' }, configWith());
    expect(exited).toBe(true);
    expect(output).toContain('names a directory');
    expect(output).toContain('-o specs/');
    expect(output).toContain('--combine-as-library');
  });

  it.each(['.yml', '.json'])('refuses %s too — the mistake is the extension, not one spelling', (ext) => {
    expect(guard({ output: `specs/button${ext}` }, configWith()).exited).toBe(true);
  });

  it('accepts a directory', () => {
    expect(guard({ output: 'specs/' }, configWith()).exited).toBe(false);
  });

  it('accepts a filename once both splits are off — then it is meaningful', () => {
    const singleFile = configWith({ splitComponents: false, splitConcerns: false });
    expect(guard({ output: 'specs/library.yaml' }, singleFile).exited).toBe(false);
  });

  it('accepts a filename when the combine flags turn the splits off for this run', () => {
    const options = { output: 'specs/library.yaml', combineAsLibrary: true, combineConcerns: true };
    expect(guard(options, configWith()).exited).toBe(false);
  });

  it('refuses a filename when only one split is turned off — the run still writes a tree', () => {
    const options = { output: 'specs/library.yaml', combineConcerns: true };
    expect(guard(options, configWith()).exited).toBe(true);
  });

  it('says nothing when no -o was passed', () => {
    expect(guard({}, configWith()).exited).toBe(false);
  });
});
