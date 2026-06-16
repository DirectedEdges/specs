export interface ConceptEntry {
  selector: string;
  contract: 'omit' | 'keep';
}

export const CONCEPT_TABLE: Record<string, ConceptEntry> = {
  hover:               { selector: ':hover', contract: 'omit' },
  active:              { selector: ':active', contract: 'omit' },
  focus:               { selector: ':focus-visible', contract: 'omit' },
  'focus-visible':     { selector: ':focus-visible', contract: 'omit' },
  'focus-within':      { selector: ':focus-within', contract: 'omit' },
  'placeholder-shown': { selector: ':placeholder-shown', contract: 'omit' },
  disabled:            { selector: ':disabled, [aria-disabled="true"]', contract: 'keep' },
  readonly:            { selector: '[readonly], [aria-readonly="true"]', contract: 'keep' },
  required:            { selector: '[required], [aria-required="true"]', contract: 'keep' },
  invalid:             { selector: '[aria-invalid="true"]', contract: 'keep' },
  valid:               { selector: '[aria-invalid="false"]', contract: 'keep' },
  selected:            { selector: '[aria-selected="true"]', contract: 'keep' },
  checked:             { selector: ':checked, [aria-checked="true"]', contract: 'keep' },
  indeterminate:       { selector: ':indeterminate, [aria-checked="mixed"]', contract: 'keep' },
  expanded:            { selector: '[aria-expanded="true"]', contract: 'keep' },
  collapsed:           { selector: '[aria-expanded="false"]', contract: 'keep' },
  pressed:             { selector: '[aria-pressed="true"]', contract: 'keep' },
  busy:                { selector: '[aria-busy="true"]', contract: 'keep' },
  current:             { selector: '[aria-current="true"]', contract: 'keep' },
};

export type { VariantStateEntry } from '@directededges/specs-schema';

export type ProcessingStates = Record<string, import('@directededges/specs-schema').VariantStateEntry>;

/**
 * Builds a lookup map from "${prop}::${value}" → concept name,
 * and a set of all prop names that appear in any state entry.
 */
export function buildStateLookup(states: ProcessingStates): {
  lookup: Map<string, string>;
  classifiedProps: Set<string>;
} {
  const lookup = new Map<string, string>();
  const classifiedProps = new Set<string>();
  for (const [concept, entry] of Object.entries(states)) {
    const v = entry.value ?? 'true';
    lookup.set(`${entry.prop}::${v}`, concept);
    // When no value is configured, the concept name itself may serve as the enum
    // value (e.g. selected: { prop: selected } should match Selected=Selected).
    // Register a lowercase key so Css.ts can find it via case-insensitive fallback.
    if (!entry.value) {
      lookup.set(`${entry.prop}::${concept}`, concept);
    }
    classifiedProps.add(entry.prop);
  }
  return { lookup, classifiedProps };
}

/**
 * Returns the set of prop names to omit from generated contracts.
 * A prop is omitted only when every concept entry referencing it resolves to contract: 'omit'.
 */
export function buildOmittedProps(states: ProcessingStates): Set<string> {
  const propContracts = new Map<string, Array<'omit' | 'keep'>>();
  for (const [concept, entry] of Object.entries(states)) {
    const conceptDef = CONCEPT_TABLE[concept];
    const effective = entry.contract ?? conceptDef?.contract ?? 'keep';
    const list = propContracts.get(entry.prop) ?? [];
    list.push(effective);
    propContracts.set(entry.prop, list);
  }
  const omitted = new Set<string>();
  for (const [prop, contracts] of propContracts) {
    if (contracts.every(c => c === 'omit')) omitted.add(prop);
  }
  return omitted;
}
