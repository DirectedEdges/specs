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
  PrimitiveKind,
  ContainerBinding,
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
      states: { hover: { prop: 'state', value: 'hover' } },
      defaultFillWidth: 375,
    },
  },
};

// Platform ids are free-form implementation names, not a closed set (ADR-073 Decision 3A)
const codePlatforms: Conventions = {
  platforms: {
    react: {
      stylesProp: 'sx',
      primitives: {
        text: { component: 'DsText', props: { color: 'color', typography: 'typography' } },
        glyph: { component: 'DsIcon', props: { content: 'name' } },
        container: { component: { HORIZONTAL: 'DsRow', VERTICAL: 'DsColumn', NONE: 'DsBox' } },
      },
      images: { component: 'DsImage' },
      defaultFillWidth: 375,
    },
    'web-components': { primitives: { text: { component: 'ds-text' } } },
    swiftui: { primitives: { text: { component: 'Text' } }, stylesProp: 'modifier' },
  },
};

// The shape is deliberately permissive — a code platform may declare an encoding member
const permissive: PlatformConventions = { states: { hover: { prop: 'state' } }, stylesProp: 'sx' };

// Figma may take a vocabulary member — the reason it is not special-cased
const figmaVocabulary: PlatformConventions = { primitives: { text: { component: 'DS Text' } } };

// @ts-expect-error — platforms is a map, not the old figma scope
const oldShape: Conventions = { figma: { naming: 'NONE' } };

// ─── Primitive bindings (ADR-074 – ADR-076) ───────────────────────────────────

const kinds: PrimitiveKind[] = ['text', 'glyph', 'container'];

// @ts-expect-error — PrimitiveKind is closed; an image is not a node kind (ADR-077)
const imageKind: PrimitiveKind = 'image';

// @ts-expect-error — primitives keys are constrained to PrimitiveKind
const unknownPrimitive: PlatformConventions = { primitives: { icon: { component: 'DsIcon' } } };

// @ts-expect-error — component is required on a declared binding
const bindingWithoutComponent: PlatformConventions = { primitives: { text: { props: { color: 'c' } } } };

// props is closed per kind — typography is a text concept, not a glyph one
// @ts-expect-error — typography is not mappable for a glyph
const glyphTypography: PlatformConventions = { primitives: { glyph: { component: 'DsIcon', props: { typography: 'type' } } } };

// @ts-expect-error — direction is a container concept, not a text one
const textDirection: PlatformConventions = { primitives: { text: { component: 'DsText', props: { direction: 'dir' } } } };

// null means "no prop for this concept", and suppresses the default
const suppressed: PlatformConventions = {
  primitives: { text: { component: 'DsText', props: { color: null } } },
};

// A container takes a plain component or a LayoutMode-keyed map (ADR-076)
const plainContainer: ContainerBinding = { component: 'DsBox' };
const keyedContainer: ContainerBinding = { component: { HORIZONTAL: 'DsRow' } };

// @ts-expect-error — the map is keyed by LayoutMode, not free-form
const badLayoutKey: ContainerBinding = { component: { DIAGONAL: 'DsDiagonal' } };

// The keyed form is legal only for a container — nothing would select from it elsewhere
// @ts-expect-error — a text component is a plain string
const keyedText: PlatformConventions = { primitives: { text: { component: { HORIZONTAL: 'DsText' } } } };

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

// A declared binding carries its resolved concept prop names
const textColor: string | null | undefined = platform.primitives?.text?.props.color;
const glyphContent: string | null | undefined = platform.primitives?.glyph?.props.content;

// stylesProp is folded into each primitive during resolution — one level, not two (ADR-076)
const primitiveStyles: string | undefined = platform.primitives?.text?.stylesProp;

// @ts-expect-error — the platform baseline does not survive resolution
const platformStyles: string | undefined = platform.stylesProp;

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

export {
  none, noPlatforms, emptyPlatform, figmaEncoding, codePlatforms, permissive, figmaVocabulary,
  oldShape, kinds, imageKind, unknownPrimitive, bindingWithoutComponent, glyphTypography,
  textDirection, suppressed, plainContainer, keyedContainer, badLayoutKey, keyedText, imageBoth,
  width, stringWidth, platformMayBeAbsent, naming, constraints, numbers, scope, sourceProps,
  textColor, glyphContent, primitiveStyles, platformStyles, underResolved, meta,
  metaWithoutPlatforms, defaults, defaultedPlatform, booleanState, enumState, noProp, badContract,
};
