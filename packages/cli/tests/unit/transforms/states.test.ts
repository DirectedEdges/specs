import { describe, it, expect } from 'vitest';
import { CONCEPT_TABLE, buildStateLookup, buildOmittedProps } from '../../../src/transforms/states.js';

describe('CONCEPT_TABLE', () => {
  it('resolves hover to :hover with omit contract', () => {
    expect(CONCEPT_TABLE['hover']).toEqual({ selector: ':hover', contract: 'omit' });
  });

  it('resolves active to :active with omit contract', () => {
    expect(CONCEPT_TABLE['active']).toEqual({ selector: ':active', contract: 'omit' });
  });

  it('resolves focus-within to :focus-within with omit contract', () => {
    expect(CONCEPT_TABLE['focus-within']).toEqual({ selector: ':focus-within', contract: 'omit' });
  });

  it('resolves disabled to :disabled, [aria-disabled="true"] with keep contract', () => {
    expect(CONCEPT_TABLE['disabled']).toEqual({
      selector: ':disabled, [aria-disabled="true"]',
      contract: 'keep',
    });
  });

  it('resolves invalid to [aria-invalid="true"] with keep contract', () => {
    expect(CONCEPT_TABLE['invalid']).toEqual({ selector: '[aria-invalid="true"]', contract: 'keep' });
  });

  it('resolves expanded to [aria-expanded="true"] with keep contract', () => {
    expect(CONCEPT_TABLE['expanded']).toEqual({ selector: '[aria-expanded="true"]', contract: 'keep' });
  });

  it('resolves pressed to [aria-pressed="true"] with keep contract (toggle button, not :active)', () => {
    expect(CONCEPT_TABLE['pressed']).toEqual({ selector: '[aria-pressed="true"]', contract: 'keep' });
  });

  it('has all 19 expected concepts', () => {
    const expected = [
      'hover', 'active', 'focus', 'focus-visible', 'focus-within', 'placeholder-shown',
      'disabled', 'readonly', 'required', 'invalid', 'valid',
      'selected', 'checked', 'indeterminate',
      'expanded', 'collapsed', 'pressed', 'busy', 'current',
    ];
    for (const name of expected) {
      expect(CONCEPT_TABLE).toHaveProperty(name);
    }
    expect(Object.keys(CONCEPT_TABLE)).toHaveLength(expected.length);
  });

  it('all omit-contract concepts are browser pseudo-classes (no ARIA attributes)', () => {
    const omitConcepts = Object.entries(CONCEPT_TABLE).filter(([, e]) => e.contract === 'omit');
    for (const [name, entry] of omitConcepts) {
      expect(entry.selector, `${name} should be a pseudo-class`).toMatch(/^:/);
    }
  });
});

describe('buildStateLookup', () => {
  it('returns empty lookup and classifiedProps for empty states', () => {
    const { lookup, classifiedProps } = buildStateLookup({});
    expect(lookup.size).toBe(0);
    expect(classifiedProps.size).toBe(0);
  });

  it('maps prop::value to concept name', () => {
    const { lookup, classifiedProps } = buildStateLookup({
      active: { prop: 'state', value: 'pressed' },
    });
    expect(lookup.get('state::pressed')).toBe('active');
    expect(classifiedProps.has('state')).toBe(true);
  });

  it('defaults value to "true" for boolean props', () => {
    const { lookup } = buildStateLookup({
      disabled: { prop: 'disabled' },
    });
    expect(lookup.get('disabled::true')).toBe('disabled');
  });

  it('maps multiple concepts to the same prop with different values', () => {
    const { lookup, classifiedProps } = buildStateLookup({
      hover: { prop: 'state', value: 'hover' },
      active: { prop: 'state', value: 'pressed' },
    });
    expect(lookup.get('state::hover')).toBe('hover');
    expect(lookup.get('state::pressed')).toBe('active');
    expect(classifiedProps.size).toBe(1);
    expect(classifiedProps.has('state')).toBe(true);
  });

  it('classifies multiple distinct props independently', () => {
    const { classifiedProps } = buildStateLookup({
      disabled: { prop: 'isDisabled' },
      invalid: { prop: 'validation', value: 'invalid' },
    });
    expect(classifiedProps.has('isDisabled')).toBe(true);
    expect(classifiedProps.has('validation')).toBe(true);
  });
});

describe('buildOmittedProps', () => {
  it('returns empty set for empty states', () => {
    expect(buildOmittedProps({}).size).toBe(0);
  });

  it('omits a prop where every concept is browser-driven (omit)', () => {
    const omitted = buildOmittedProps({
      hover: { prop: 'state', value: 'hover' },
      active: { prop: 'state', value: 'pressed' },
    });
    expect(omitted.has('state')).toBe(true);
  });

  it('keeps a prop where the concept is consumer-controlled (keep)', () => {
    const omitted = buildOmittedProps({
      disabled: { prop: 'isDisabled' },
    });
    expect(omitted.has('isDisabled')).toBe(false);
  });

  it('keeps a prop when any one of its concepts is keep', () => {
    // If somehow a prop had both omit and keep concepts, keep wins
    const omitted = buildOmittedProps({
      hover: { prop: 'interaction', value: 'hover' },      // omit
      disabled: { prop: 'interaction', value: 'disabled' }, // keep
    });
    expect(omitted.has('interaction')).toBe(false);
  });

  it('respects explicit contract override over concept default', () => {
    const omitted = buildOmittedProps({
      // disabled is normally keep, but explicitly overridden to omit
      disabled: { prop: 'isDisabled', contract: 'omit' },
    });
    expect(omitted.has('isDisabled')).toBe(true);
  });

  it('omits focused (boolean prop defaulting to "true") when mapped to focus-within', () => {
    const omitted = buildOmittedProps({
      'focus-within': { prop: 'focused' },
    });
    expect(omitted.has('focused')).toBe(true);
  });
});
