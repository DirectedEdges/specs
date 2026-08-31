/**
 * Type-level tests for Conventions and ResolvedConventions.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Conventions, ResolvedConventions, VariantStateEntry } from '../types/index.js';
import { DEFAULT_CONVENTIONS } from '../types/index.js';

// ─── A library declaring no conventions ───────────────────────────────────────

const none: Conventions = { figma: {} };

// ─── A library declaring every convention ─────────────────────────────────────

const full: Conventions = {
  figma: {
    naming: 'SENTENCE',
    glyphs: { match: 'DS Icon Glyph / {i}' },
    codeOnlyProps: { match: 'Code only props' },
    subcomponents: {
      scope: 'PAGE',
      match: ['{C} / {S}', '{C} / _ / {S}'],
      exclude: ['{C} / Examples / {S}'],
    },
    instanceExamples: {
      scope: 'PAGE',
      match: ['{C}*'],
      exclude: ['{C} / Draft'],
      parentNames: ['Examples'],
    },
    images: {
      backgroundImage: true,
      match: 'DS Image',
      sourceProps: ['Image'],
    },
    slotConstraints: true,
    inferNumberProps: true,
    states: {
      hover: { prop: 'state', value: 'hover' },
      active: { prop: 'state', value: 'pressed' },
      disabled: { prop: 'disabled' },
      readonly: { prop: 'readOnly' },
      invalid: { prop: 'validation', value: 'invalid', contract: 'keep' },
    },
  },
};

// ─── State entries ────────────────────────────────────────────────────────────

const booleanState: VariantStateEntry = { prop: 'disabled' };
const enumState: VariantStateEntry = { prop: 'state', value: 'pressed' };

// @ts-expect-error — prop is required
const noProp: VariantStateEntry = { value: 'pressed' };

// @ts-expect-error — contract is a closed set
const badContract: VariantStateEntry = { prop: 'focused', contract: 'inherit' };

// ─── Resolution guarantees members inside a declared block ────────────────────

declare const resolved: ResolvedConventions;

// Defaults inside a present block are guaranteed — no null check needed
const scope: 'NESTED' | 'PAGE' | undefined = resolved.figma.subcomponents?.scope;
const naming: 'NONE' | 'SENTENCE' | 'TITLE' = resolved.figma.naming;
const constraints: boolean = resolved.figma.slotConstraints;
const numbers: boolean = resolved.figma.inferNumberProps;

// The block itself stays optional — absence means the library declares nothing
const blockMayBeAbsent: ResolvedConventions = { figma: { naming: 'NONE', slotConstraints: false, inferNumberProps: false } };

// @ts-expect-error — a resolved block must carry its defaulted members
const underResolved: ResolvedConventions = { figma: { naming: 'NONE' } };

// @ts-expect-error — match is required once a glyph convention is declared
const glyphsWithoutMatch: Conventions = { figma: { glyphs: {} } };

// @ts-expect-error — figma namespace is required
const noNamespace: Conventions = {};

// ─── Defaults ─────────────────────────────────────────────────────────────────

// A library that declares nothing: the three defaultable members, no blocks.
const defaults: ResolvedConventions = DEFAULT_CONVENTIONS;
const defaultNaming: 'NONE' | 'SENTENCE' | 'TITLE' = DEFAULT_CONVENTIONS.figma.naming;

// @ts-expect-error — no block is defaulted; absence means the library declares none
const defaultedBlock: object = DEFAULT_CONVENTIONS.figma.subcomponents.match;

export { defaults, defaultNaming, defaultedBlock };

// ─── defaultExampleWidth (ADR-081) ────────────────────────────────────────────

// Optional on the authored shape — absence means the library declares no width
const noWidth: Conventions = { figma: {} };
const withWidth: Conventions = { figma: { defaultExampleWidth: 375 } };

// @ts-expect-error — a width is a number, not a CSS length string
const stringWidth: Conventions = { figma: { defaultExampleWidth: '375px' } };

// Stays optional after resolution — nothing can supply a width the library never declared
const resolvedWidth: number | undefined = resolved.figma.defaultExampleWidth;

// @ts-expect-error — not defaulted; there is no universal example width
const defaultedWidth: number = DEFAULT_CONVENTIONS.figma.defaultExampleWidth;

export { noWidth, withWidth, stringWidth, resolvedWidth, defaultedWidth };

export { none, full, booleanState, enumState, noProp, badContract, scope, naming, constraints, numbers, blockMayBeAbsent, underResolved, glyphsWithoutMatch, noNamespace };
