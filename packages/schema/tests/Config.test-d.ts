/**
 * Type-level tests for Config and ResolvedConfig.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Config, ResolvedConfig, ColorFormat, VariantStateEntry } from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';

// ─── Helper: minimal valid processing + format + include ──────────────────────

const minProcessing: Config['processing'] = {};
const minFormat: Config['format'] = {};
const minInclude: Config['include'] = {};

// ─── Full Config with all fields ──────────────────────────────────────────────

const fullConfig: Config = {
  processing: {
    subcomponents: {
      scope: 'PAGE',
      match: ['{C} / {S}', '{C} / _ / {S}'],
      exclude: ['{C} / Examples / {S}', '{C} / Text cases / {S}'],
    },
    glyphNamePattern: 'DS Icon Glyph /',
    codeOnlyPropsPattern: 'Code only props',
    slotConstraints: true,
    collapsePrimitiveWrapper: false,
    variantDepth: 9999,
    details: 'LAYERED',
    inferNumberProps: true,
    instanceExamples: {
      scope: 'FILE',
      match: ['{C} / *'],
      exclude: ['* / Deprecated / *'],
      parentNames: ['Examples'],
    },
  },
  format: {
    output: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
    color: 'HEX',
  },
  include: {
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
    defaultSlotContent: true,
  },
};

// ─── Minimal Config — only required fields (all empty blocks) ────────────────

const minimalConfig: Config = {
  processing: minProcessing,
  format: minFormat,
  include: minInclude,
};

// ─── Config with zero overrides — all defaultable fields omitted ─────────────

const bareConfig: Config = {
  processing: {},
  format: {},
  include: {},
};

// ─── processing.variantDepth is optional ─────────────────────────────────────

const _variantDepthUndefined: Config['processing']['variantDepth'] = undefined;

// ─── processing.details is optional ──────────────────────────────────────────

const _detailsUndefined: Config['processing']['details'] = undefined;

// ─── format.output is optional ───────────────────────────────────────────────

const _outputUndefined: Config['format']['output'] = undefined;

// ─── format.keys is optional ─────────────────────────────────────────────────

const _keysUndefined: Config['format']['keys'] = undefined;

// ─── format.layout is optional ───────────────────────────────────────────────

const _layoutUndefined: Config['format']['layout'] = undefined;

// ─── subcomponents.scope is optional, defaults to NESTED ──────────────────────

const configWithoutScope: Config = {
  processing: {
    subcomponents: { match: ['{C} / _ / {S}'] },
    variantDepth: 9999,
    details: 'FULL',
  },
  format: { output: 'YAML', keys: 'CAMEL', layout: 'PARENT_CHILDREN' },
  include: { invalidVariants: true, invalidCombinations: false },
};

// ─── processing.subcomponents is optional ────────────────────────────────────

const configWithoutSubcomponents: Config = {
  processing: { variantDepth: 9999, details: 'LAYERED' },
  format: minFormat,
  include: minInclude,
};

const _subcomponentsUndefined: Config['processing']['subcomponents'] = undefined;

// ─── subcomponents.scope enum values ──────────────────────────────────────────

type SubcomponentsScope = NonNullable<Config['processing']['subcomponents']>['scope'];
const scopeNested: SubcomponentsScope = 'NESTED';
const scopePage: SubcomponentsScope = 'PAGE';
const scopeUndefined: SubcomponentsScope = undefined;

// ─── subcomponents.exclude is optional ────────────────────────────────────────

const configWithExclude: Config = {
  processing: {
    subcomponents: {
      match: ['{C} / {S}'],
      exclude: ['{C} / Examples / {S}'],
    },
    variantDepth: 9999,
    details: 'LAYERED',
  },
  format: minFormat,
  include: minInclude,
};

const _excludeUndefined: NonNullable<Config['processing']['subcomponents']>['exclude'] = undefined;

// ─── include no longer has subcomponents or variantNames fields ──────────────

// @ts-expect-error — subcomponents was removed from include
const _badInclude: Config['include']['subcomponents'] = true;

// @ts-expect-error — variantNames was removed from include (ADR 034)
const _badVarNames: Config['include']['variantNames'] = false;

// ─── include fields are optional ────────────────────────────────────────────

const emptyInclude: Config['include'] = {};
const _emptyVariantsUndefined: Config['include']['emptyVariants'] = undefined;
const _invalidVariantsUndefined: Config['include']['invalidVariants'] = undefined;
const _invalidCombinationsUndefined: Config['include']['invalidCombinations'] = undefined;

// ─── processing no longer has subcomponentNamePattern ─────────────────────────

// @ts-expect-error — subcomponentNamePattern was replaced by subcomponents object
const _badProcessing: Config['processing']['subcomponentNamePattern'] = '{C} / _ / {S}';

// ─── All tokens enum values are valid ─────────────────────────────────────────

const tokenConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'TOKEN' } };
const tokenNameConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'TOKEN_NAME' } };
const tokenFigmaExtConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'TOKEN_FIGMA_EXTENSIONS' } };
const figmaNameConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'FIGMA_NAME' } };
const customConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'CUSTOM' } };
const figmaSyntaxWebConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'FIGMA_SYNTAX_WEB' } };
const figmaSyntaxIosConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'FIGMA_SYNTAX_IOS' } };
const figmaSyntaxAndroidConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'FIGMA_SYNTAX_ANDROID' } };

// @ts-expect-error — invalid tokens profile value
const _badTokens: Config['format']['tokens'] = 'FIGMA_SYNTAX_DESKTOP';

// ─── DEFAULT_CONFIG is a valid ResolvedConfig ────────────────────────────────

const defaultIsResolved: ResolvedConfig = DEFAULT_CONFIG;

// ─── DEFAULT_CONFIG satisfies Config (ResolvedConfig extends Config) ─────────

const defaultIsValidConfig: Config = DEFAULT_CONFIG;

// ─── DEFAULT_CONFIG.format.tokens should be 'TOKEN' ──────────────────────────

const defaultTokensValue: typeof DEFAULT_CONFIG.format.tokens = 'TOKEN';

// ─── ResolvedConfig requires all defaultable fields ──────────────────────────

const resolved: ResolvedConfig = {
  processing: { slotConstraints: false, collapsePrimitiveWrapper: false, variantDepth: 9999, details: 'LAYERED', inferNumberProps: false },
  format: { output: 'JSON', keys: 'SAFE', layout: 'LAYOUT', tokens: 'TOKEN', color: 'HEX' },
  include: { invalidVariants: false, invalidCombinations: true, emptyVariants: false, defaultSlotContent: false, imageData: false },
  transformers: [],
};

// ─── ResolvedConfig requires defaultable fields — cannot omit them ────────────

// processing
type _VDRequired = ResolvedConfig['processing']['variantDepth'] extends (1 | 2 | 3 | 9999) ? true : never;
const _vdRequired: _VDRequired = true;

type _DRequired = ResolvedConfig['processing']['details'] extends ('FULL' | 'LAYERED') ? true : never;
const _dRequired: _DRequired = true;

type _SCRequired = ResolvedConfig['processing']['slotConstraints'] extends boolean ? true : never;
const _scRequired: _SCRequired = true;

type _CPWRequired = ResolvedConfig['processing']['collapsePrimitiveWrapper'] extends boolean ? true : never;
const _cpwRequired: _CPWRequired = true;

type _INPRequired = ResolvedConfig['processing']['inferNumberProps'] extends boolean ? true : never;
const _inpRequired: _INPRequired = true;

// format
type _ORequired = ResolvedConfig['format']['output'] extends ('JSON' | 'YAML') ? true : never;
const _oRequired: _ORequired = true;

type _KRequired = ResolvedConfig['format']['keys'] extends ('SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN') ? true : never;
const _kRequired: _KRequired = true;

type _LRequired = ResolvedConfig['format']['layout'] extends ('LAYOUT' | 'PARENT_CHILDREN' | 'BOTH') ? true : never;
const _lRequired: _LRequired = true;

type _TRequired = ResolvedConfig['format']['tokens'] extends ('TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM' | 'FIGMA_SYNTAX_WEB' | 'FIGMA_SYNTAX_IOS' | 'FIGMA_SYNTAX_ANDROID') ? true : never;
const _tRequired: _TRequired = true;

// include
type _IVRequired = ResolvedConfig['include']['invalidVariants'] extends boolean ? true : never;
const _ivRequired: _IVRequired = true;

type _ICRequired = ResolvedConfig['include']['invalidCombinations'] extends boolean ? true : never;
const _icRequired: _ICRequired = true;

type _EVRequired = ResolvedConfig['include']['emptyVariants'] extends boolean ? true : never;
const _evRequired: _EVRequired = true;

// subcomponents.scope is required when subcomponents is present
type _ScopeRequired = NonNullable<ResolvedConfig['processing']['subcomponents']>['scope'] extends ('NESTED' | 'PAGE') ? true : never;
const _scopeRequired: _ScopeRequired = true;

// ─── glyphNamePattern is optional ─────────────────────────────────────────────

const _glyphUndefined: Config['processing']['glyphNamePattern'] = undefined;

// ─── inferNumberProps is optional ─────────────────────────────────────────────

const _inferUndefined: Config['processing']['inferNumberProps'] = undefined;

// ─── slotConstraints is optional ──────────────────────────────────────────────

const _slotConstraintsUndefined: Config['processing']['slotConstraints'] = undefined;

// ─── collapsePrimitiveWrapper is optional on Config ───────────────────────────

const _collapsePrimitiveWrapperUndefined: Config['processing']['collapsePrimitiveWrapper'] = undefined;

const configWithCollapse: Config = {
  processing: { collapsePrimitiveWrapper: true },
  format: {},
  include: {},
};

// @ts-expect-error — collapsePrimitiveWrapper must be boolean
const _badCollapse: Config['processing']['collapsePrimitiveWrapper'] = 'yes';

// ─── format.color is optional on Config ─────────────────────────────────────

const _colorUndefined: Config['format']['color'] = undefined;

// ─── All ColorFormat enum values are valid ──────────────────────────────────

const _cfHex: ColorFormat = 'HEX';
const _cfHexa: ColorFormat = 'HEXA';
const _cfRgb: ColorFormat = 'RGB';
const _cfRgba: ColorFormat = 'RGBA';
const _cfHsla: ColorFormat = 'HSLA';
const _cfHsb: ColorFormat = 'HSB';
const _cfOklch: ColorFormat = 'OKLCH';
const _cfOklab: ColorFormat = 'OKLAB';
const _cfObject: ColorFormat = 'OBJECT';

// @ts-expect-error — invalid ColorFormat value
const _cfBad: ColorFormat = 'CMYK';

// ─── format.color is required on ResolvedConfig ─────────────────────────────

import type { ColorFormat as _CF } from '../types/index.js';
type _CRequired = ResolvedConfig['format']['color'] extends _CF ? true : never;
const _cRequired: _CRequired = true;

// ─── DEFAULT_CONFIG.format.color should be 'HEX' ───────────────────────────

const defaultColorValue: typeof DEFAULT_CONFIG.format.color = 'HEX';

// ─── ADR-050: examples config ────────────────────────────────────────────────

// processing.instanceExamples is optional (feature toggle; absence = no detection)
const _instanceExamplesUndefined: Config['processing']['instanceExamples'] = undefined;

// processing.instanceExamples requires match; scope/exclude/parentNames optional
const configWithInstanceExamples: Config = {
  processing: {
    instanceExamples: { match: ['{C} / *'] },
  },
  format: {},
  include: {},
};

// instanceExamples.scope enum is PAGE | FILE (NESTED is inapplicable)
type InstanceExamplesScope = NonNullable<Config['processing']['instanceExamples']>['scope'];
const _ieScopePage: InstanceExamplesScope = 'PAGE';
const _ieScopeFile: InstanceExamplesScope = 'FILE';
const _ieScopeUndefined: InstanceExamplesScope = undefined;

// @ts-expect-error — NESTED is not a valid instanceExamples scope
const _ieScopeBad: InstanceExamplesScope = 'NESTED';

// instanceExamples.exclude and parentNames are optional
const _ieExcludeUndefined: NonNullable<Config['processing']['instanceExamples']>['exclude'] = undefined;
const _ieParentNamesUndefined: NonNullable<Config['processing']['instanceExamples']>['parentNames'] = undefined;
const _ieParentNames: NonNullable<Config['processing']['instanceExamples']>['parentNames'] = ['Examples', 'Demos'];

// include flags are optional on Config
const _includeSlotContentExamplesUndefined: Config['include']['defaultSlotContent'] = undefined;

// include flags are required on ResolvedConfig
type _SCERequired = ResolvedConfig['include']['defaultSlotContent'] extends boolean ? true : never;
const _sceRequired: _SCERequired = true;

// instanceExamples block stays optional on ResolvedConfig, but scope is required when present
type _IEScopeRequired = NonNullable<ResolvedConfig['processing']['instanceExamples']>['scope'] extends ('PAGE' | 'FILE') ? true : never;
const _ieScopeRequired: _IEScopeRequired = true;
const _resolvedInstanceExamplesUndefined: ResolvedConfig['processing']['instanceExamples'] = undefined;

// DEFAULT_CONFIG carries the new include flag, defaulting to false
const _defaultSlotContentExamples: typeof DEFAULT_CONFIG.include.defaultSlotContent = false;

// ─── ADR-055: processing.states ──────────────────────────────────────────────

// processing.states is optional
const _statesUndefined: Config['processing']['states'] = undefined;

// VariantStateEntry requires only prop
const minimalStateEntry: VariantStateEntry = {
  prop: 'state',
};

// value field is optional — the Figma enum value activating this concept
const stateEntryWithValue: VariantStateEntry = {
  prop: 'state',
  value: 'hover',
};

// contract field is optional — 'omit' or 'keep'
const stateEntryOmit: VariantStateEntry = {
  prop: 'state',
  value: 'pressed',
  contract: 'omit',
};
const stateEntryKeep: VariantStateEntry = {
  prop: 'isDisabled',
  contract: 'keep',
};
const stateEntryNoContract: VariantStateEntry = {
  prop: 'focused',
};

// @ts-expect-error — invalid contract value
const _badContract: VariantStateEntry = { prop: 'x', contract: 'ignore' };

// @ts-expect-error — prop is required
const _missingProp: VariantStateEntry = { value: 'hover' };

// Config.processing.states accepts a concept-keyed map
const configWithStates: Config = {
  processing: {
    states: {
      hover:    { prop: 'state', value: 'hover' },
      active:   { prop: 'state', value: 'pressed' },
      disabled: { prop: 'isDisabled' },
    },
  },
  format: {},
  include: {},
};

// ResolvedConfig.processing.states is optional (absence = all data-* attrs)
const _resolvedStatesUndefined: ResolvedConfig['processing']['states'] = undefined;

// DEFAULT_CONFIG has no states (correct default — absence means all data-* attrs)
const _defaultStates: typeof DEFAULT_CONFIG.processing.states = undefined;
