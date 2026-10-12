import { describe, it, expect } from 'vitest';
import { resolveKindScope, describeKindScope, KindScopeConflict } from '../../../src/utilities/kindScope.js';

/**
 * `--compositions` / `--no-compositions` (specs#661). Read from the raw arguments rather
 * than the parsed options, because Commander maps the negated form onto the same key its
 * positive form sets — so passing both leaves one value and the conflict is invisible.
 */
describe('resolveKindScope', () => {
  const argv = (...flags: string[]) => ['node', 'specs', 'generate', ...flags];

  it('covers both kinds when neither flag is passed', () => {
    expect(resolveKindScope(argv())).toEqual({
      kinds: ['component', 'composition'],
      excluded: [],
      scoped: false,
    });
  });

  it('--compositions produces compositions only, and excludes components', () => {
    expect(resolveKindScope(argv('--compositions'))).toEqual({
      kinds: ['composition'],
      excluded: ['component'],
      scoped: true,
    });
  });

  it('--no-compositions produces components only, and excludes compositions', () => {
    expect(resolveKindScope(argv('--no-compositions'))).toEqual({
      kinds: ['component'],
      excluded: ['composition'],
      scoped: true,
    });
  });

  it('refuses both, naming the conflict and both ways forward', () => {
    expect(() => resolveKindScope(argv('--compositions', '--no-compositions'))).toThrow(KindScopeConflict);
    // Order must not decide it — the point is that there is no defensible reading.
    expect(() => resolveKindScope(argv('--no-compositions', '--compositions'))).toThrow(KindScopeConflict);

    try {
      resolveKindScope(argv('--compositions', '--no-compositions'));
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('--compositions');
      expect(message).toContain('--no-compositions');
      expect(message).toContain('cannot be combined');
    }
  });

  it('is unaffected by other flags, including --components', () => {
    const scope = resolveKindScope(argv('--components', 'dsCard', 'dsButton', '--verbose'));
    expect(scope).toEqual({ kinds: ['component', 'composition'], excluded: [], scoped: false });
  });

  it('never reports the excluded kind as covered', () => {
    for (const flag of ['--compositions', '--no-compositions']) {
      const scope = resolveKindScope(argv(flag));
      expect(scope.kinds.some((k) => scope.excluded.includes(k))).toBe(false);
    }
  });
});

describe('describeKindScope', () => {
  const argv = (...flags: string[]) => ['node', 'specs', 'generate', ...flags];

  it('says nothing for an unscoped run', () => {
    expect(describeKindScope(resolveKindScope(argv()))).toBeUndefined();
  });

  it('names what was covered, what was not, and that nothing was removed', () => {
    const only = describeKindScope(resolveKindScope(argv('--compositions')))!;
    expect(only).toContain('compositions');
    expect(only).toContain('components were not produced');
    // The pruning promise is the one with teeth, so it is in the message.
    expect(only).toContain('none of their output was removed');

    const without = describeKindScope(resolveKindScope(argv('--no-compositions')))!;
    expect(without).toContain('Scoped to components');
    expect(without).toContain('compositions were not produced');
  });
});
