// Pure types + slot signatures. No framework imports.

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'invisible';
export type ButtonSize    = 'small' | 'medium' | 'large';
export type ButtonState   = 'rest' | 'focus' | 'hover' | 'pressed' | 'disabled' | 'inactive';
export type ButtonAlign   = 'center' | 'start';

export interface ButtonProps {
  variant?:        ButtonVariant;
  size?:           ButtonSize;
  state?:          ButtonState;
  alignContent?:   ButtonAlign;
  counter?:        boolean;
  dropdown?:       boolean;
  leadingVisual?:  string | null;
  trailingVisual?: string | null;
}

// `as const` preserves literal types; `satisfies Required<…>` ensures every
// prop has a default and every value matches its declared union — compile-time
// enforcement instead of comments that can drift.
export const ButtonDefaults = {
  variant:        'secondary',
  size:           'medium',
  state:          'rest',
  alignContent:   'center',
  counter:        false,
  dropdown:       false,
  leadingVisual:  null,
  trailingVisual: null,
} as const satisfies Required<ButtonProps>;

export interface ButtonSlots {
  search?:         unknown;
  button:          string;
  counterLabel?:   unknown;
  trailingVisual?: unknown;
  dropdown?:       unknown;
}

// ---------------------------------------------------------------------------
// Slot visibility rules
// ---------------------------------------------------------------------------
//
// SOURCE OF TRUTH
// ---------------
// These rules are DERIVED from Figma via Specs (specs-from-figma). They are
// not authored or maintained by hand — this file is (re)generated. Do not
// edit SlotVisibilityRules directly; regenerate from the component spec.
//
// WHY THIS EXISTS
// ---------------
// React developers need to know when to conditionally render each slot.
// Without this, that logic is inferred from convention or buried in the
// component source. Making it machine-readable enables:
//   - Generated JSX conditionals
//   - Storybook controls that hide irrelevant slots
//   - Runtime prop validators
//   - Documentation
//
// HOW SPECS PROVIDES THE DATA
// ----------------------------
// Slot visibility comes through two channels in the Specs schema:
//
//   1. styles.visible on the slot element — already a typed Style value:
//        - PropBinding  → the prop value IS the visibility (boolean prop gate)
//        - Conditional  → visibility is derived from a condition on a prop
//                         (e.g. isNotNull / isNull on a nullable string prop)
//        - true/false   → always visible or always hidden
//
//   2. Variant presence — a slot absent from a variant's `elements` record is
//      structurally excluded for that PropConfigurations (a flat map of
//      prop name → value). The controlling prop can be recovered by correlating
//      which PropConfigurations include vs. exclude the slot element.
//
// Variants also change slot bindings and content per PropConfigurations,
// but that does not affect visibility rules here.
//
// MAPPING FROM SPECS DATA TO SlotVisibility
// ------------------------------------------
//   styles.visible = PropBinding (boolean prop)     → { kind: 'whenTrue', prop: '...' }
//   styles.visible = Conditional { isNotNull }      → { kind: 'whenNotNull', prop: '...' }
//   styles.visible = true  /  always in layout      → { kind: 'always' }
//   absent from variant elements (structural)       → see open question below
//
// The consumer (React dev) never sees raw PropBinding or Conditional shapes —
// those are internal Specs schema types. SlotVisibility is the projected,
// consumer-facing form.
//
// OPEN QUESTION — structural absence
// ------------------------------------
// When a slot is absent from layout in some variants (not hidden via
// styles.visible, but structurally excluded from the element tree), the
// controlling prop must be inferred by correlating PropConfigurations across
// variants. This is deterministic when variants fully enumerate the absent
// case, but it is not yet confirmed whether that correlation is always
// recoverable or whether some structural-absence cases require a fallback
// rule kind (e.g. { kind: 'structurallyAbsent' } with no prop reference).
// Resolve before implementing the generation script.

type BooleanPropKey  = { [K in keyof ButtonProps]-?: NonNullable<ButtonProps[K]> extends boolean ? K : never }[keyof ButtonProps];
type NullablePropKey = { [K in keyof ButtonProps]-?: null extends ButtonProps[K] ? K : never }[keyof ButtonProps];

export type SlotVisibility =
  | { kind: 'always' }
  | { kind: 'whenTrue';    prop: BooleanPropKey  }
  | { kind: 'whenNotNull'; prop: NullablePropKey };

// `satisfies Record<keyof ButtonSlots, SlotVisibility>` ensures every slot has
// a rule and every prop reference is valid — a missing or mistyped prop name
// fails at compile time.
export const ButtonSlotRules = {
  search:         { kind: 'whenNotNull', prop: 'leadingVisual'  },
  button:         { kind: 'always'                              },
  counterLabel:   { kind: 'whenTrue',    prop: 'counter'        },
  trailingVisual: { kind: 'whenNotNull', prop: 'trailingVisual' },
  dropdown:       { kind: 'whenTrue',    prop: 'dropdown'       },
} as const satisfies Record<keyof ButtonSlots, SlotVisibility>;
