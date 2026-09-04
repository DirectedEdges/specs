/**
 * Type-level tests for Conventions and ResolvedConventions.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  Conventions,
  ResolvedConventions,
  MetadataConventions,
  PlatformConventions,
  SpecsConventions,
  PrimitiveKind,
  PrimitiveEntry,
  PrimitiveRule,
  VariantStateEntry,
} from '../types/index.js';
import { DEFAULT_CONVENTIONS } from '../types/index.js';

// ─── A workspace declaring no conventions (ADR-073) ───────────────────────────

const none: Conventions = {};
const noPlatforms: Conventions = { platforms: {} };
const emptyPlatform: Conventions = { platforms: { figma: {} } };

// ─── Figma is a key like any other ────────────────────────────────────────────

const figmaEncoding: Conventions = {
  platforms: {
    figma: {
      naming: 'SENTENCE',
      glyphs: { match: 'DS Icon Glyph / {i}' },
      codeOnlyProps: { match: 'Code only props' },
      subcomponents: { scope: 'PAGE', match: ['{C} / _ / {S}'], exclude: ['{C} / Examples / {S}'] },
      instanceExamples: { scope: 'FILE', match: ['{C} Example'], parentNames: ['Examples'] },
      images: { backgroundImage: true, match: 'DS Image', sourceProps: ['imageSource'] },
      slotConstraints: true,
      inferNumberProps: true,
      defaultFillWidth: 375,
    },
  },
};

// Platform ids are free-form implementation names, not a closed set (ADR-073 Decision 3A)
const codePlatforms: Conventions = {
  platforms: {
    react: {
      stylesProp: 'sx',
      images: { component: 'DsImage' },
      defaultFillWidth: 375,
    },
    'web-components': { stylesProp: 'style' },
    swiftui: { stylesProp: 'modifier' },
  },
};

// The shape is deliberately permissive — a code platform may declare an encoding member
const permissive: PlatformConventions = { inferNumberProps: true, stylesProp: 'sx' };

// Figma may take a vocabulary member — the reason it is not special-cased
const figmaVocabulary: PlatformConventions = { images: { match: 'DS Image' } };

// @ts-expect-error — platforms is a map, not the old figma scope
const oldShape: Conventions = { figma: { naming: 'NONE' } };

// ─── Promotion entries (ADR-074 – ADR-076) ────────────────────────────────────

const kinds: PrimitiveKind[] = ['text', 'glyph', 'container'];

// @ts-expect-error — PrimitiveKind is closed; an image is not a node kind (ADR-077)
const imageKind: PrimitiveKind = 'image';

// primitives sits at the root of Conventions, not under a platform: a component's props
// are the same whichever platform renders it (ADR-075)
const promotion: Conventions = {
  primitives: {
    dsHeading: {
      elementType: 'text',
      map: [
        { source: 'typography', values: { 'Typography theme/Headline/M': { appearance: 'Headline M' } } },
        { source: 'content', prop: 'text' },
      ],
    },
    // One source may write several props, and a source may reach a prop of another meaning
    dsTypography: {
      elementType: 'text',
      map: [{ source: 'typography', values: { 'Typography/font__200__medium': { size: 200, weight: 'Medium' } } }],
    },
    dsIcon: {
      elementType: 'glyph',
      map: [
        { source: 'fillColor', values: { 'Color/Critical': { appearance: 'error' } } },
        { source: 'height', values: { 16: { size: 'XS' } } }, // raw scalars are keys too
        { source: 'content', prop: 'name' },
      ],
    },
    // A Row/Column/Box trio is three entries; an empty props object promotes without writing
    dsRow: { elementType: 'container', map: [{ source: 'layoutMode', values: { HORIZONTAL: {} } }] },
    dsColumn: { elementType: 'container', map: [{ source: 'layoutMode', values: { VERTICAL: {} } }] },
  },
};

// @ts-expect-error — primitives is not a platform member (ADR-074)
const platformPrimitives: PlatformConventions = { primitives: { dsText: { elementType: 'text', map: [] } } };

// @ts-expect-error — elementType is required
const entryWithoutKind: PrimitiveEntry = { map: [] };

// @ts-expect-error — map is required
const entryWithoutMap: PrimitiveEntry = { elementType: 'text' };

// @ts-expect-error — elementType is closed
const entryBadKind: PrimitiveEntry = { elementType: 'image', map: [] };

// source is a plain string — the honoured set is documented and implemented, not validated
// here, so renaming a Styles member never churns a conventions file (ADR-075)
const dottedSource: PrimitiveRule = { source: 'typography.fontStyle', values: { Bold: { weight: 'Bold' } } };

// @ts-expect-error — source is required
const ruleWithoutSource: PrimitiveRule = { prop: 'text' };

// ─── Images: encoding and vocabulary in one block (ADR-077) ───────────────────

const imageBoth: PlatformConventions = {
  images: { backgroundImage: true, match: 'DS Image', component: 'DsImage', sourceProps: ['imageSource'] },
};

// ─── defaultFillWidth (ADR-081) ───────────────────────────────────────────────

const width: PlatformConventions = { defaultFillWidth: 375 };

// @ts-expect-error — a width is a number, not a CSS length string
const stringWidth: PlatformConventions = { defaultFillWidth: '375px' };

// ─── Resolution guarantees members inside a declared block ────────────────────

declare const resolved: ResolvedConventions;

// platforms and each key stay optional — absence is a statement nothing can supply
const platformMayBeAbsent: number | undefined = resolved.platforms?.figma?.defaultFillWidth;

declare const platform: NonNullable<ResolvedConventions['platforms']>[string];

// Defaults inside a declared platform entry are guaranteed — no null check needed
const naming: 'NONE' | 'SENTENCE' | 'TITLE' = platform.naming;
const constraints: boolean = platform.slotConstraints;
const numbers: boolean = platform.inferNumberProps;
const scope: 'NESTED' | 'PAGE' | undefined = platform.subcomponents?.scope;
const sourceProps: string[] | undefined = platform.images?.sourceProps;

// stylesProp survives resolution as a platform member — promotion targets are named by the
// spec, so there is no per-primitive block to fold it into (ADR-076)
const platformStyles: string | undefined = platform.stylesProp;

// Promotion entries resolve at the root, beside platforms rather than within one
declare const resolvedRoot: ResolvedConventions;
const resolvedEntry: PrimitiveEntry | undefined = resolvedRoot.primitives?.dsHeading;

// @ts-expect-error — a resolved platform entry must carry its defaulted members
const underResolved: ResolvedConventions = { platforms: { figma: { naming: 'NONE' } } };

// ─── MetadataConventions — exactly one platform (ADR-079) ─────────────────────

declare const producing: NonNullable<ResolvedConventions['platforms']>[string];

const meta: MetadataConventions = { platforms: { figma: producing } };

// @ts-expect-error — platforms is required in metadata; absence is not expressible
const metaWithoutPlatforms: MetadataConventions = {};

// ─── Defaults ─────────────────────────────────────────────────────────────────

// A workspace that declares nothing. Every default belongs inside a platform entry,
// so there is nothing left to default at the root (ADR-073).
const defaults: ResolvedConventions = DEFAULT_CONVENTIONS;

// @ts-expect-error — no platform is defaulted; absence means none is declared
const defaultedPlatform: object = DEFAULT_CONVENTIONS.platforms.figma;

// ─── VariantStateEntry (unchanged) ────────────────────────────────────────────

const booleanState: VariantStateEntry = { prop: 'disabled' };
const enumState: VariantStateEntry = { prop: 'state', value: 'hover', contract: 'keep' };

// @ts-expect-error — prop is required
const noProp: VariantStateEntry = { value: 'pressed' };

// @ts-expect-error — contract is a closed set
const badContract: VariantStateEntry = { prop: 'focused', contract: 'inherit' };

// ─── Spec-side conventions (ADR-073 amendment) ────────────────────────────────

// props.states classifies variant props as semantic states
const specStates: SpecsConventions = {
  props: { states: { disabled: { prop: 'disabled' }, hover: { prop: 'state', value: 'Hover' } } },
};

// props.accessibility.label names the prop carrying an accessible name
const specAccessibility: SpecsConventions = {
  props: { accessibility: { label: { prop: 'accessibilityLabel' } } },
};

// props.value names the prop carrying a value no element represents
const specValue: SpecsConventions = { props: { value: { prop: 'progress' } } };

// All three compose, and every block is optional
const specAll: SpecsConventions = {
  props: {
    states: { disabled: { prop: 'disabled' } },
    accessibility: { label: { prop: 'accessibilityLabel' } },
    value: { prop: 'progress' },
  },
};
const specNone: SpecsConventions = {};

// @ts-expect-error — a prop reference is an object, so it can grow fields later
const specBareString: SpecsConventions = { props: { accessibility: { label: 'accessibilityLabel' } } };

// @ts-expect-error — states no longer live on a platform
const platformStates: PlatformConventions = { states: { disabled: { prop: 'disabled' } } };


export {
  none, noPlatforms, emptyPlatform, figmaEncoding, codePlatforms, permissive, figmaVocabulary,
  oldShape, kinds, imageKind, promotion, platformPrimitives, entryWithoutKind, entryWithoutMap,
  entryBadKind, dottedSource, ruleWithoutSource, imageBoth,
  width, stringWidth, platformMayBeAbsent, naming, constraints, numbers, scope, sourceProps,
  platformStyles, resolvedEntry, underResolved, meta,
  metaWithoutPlatforms, defaults, defaultedPlatform, booleanState, enumState, noProp, badContract,
  specStates, specAccessibility, specValue, specAll, specNone, specBareString, platformStates,
};
