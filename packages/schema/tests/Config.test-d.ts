/**
 * Type-level tests for Config and ResolvedConfig.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Config, ResolvedConfig } from '../types/index.js';
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
    variantDepth: 9999,
    details: 'LAYERED',
    inferNumberProps: true,
  },
  format: {
    output: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
  },
  include: {
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
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

// ─── DEFAULT_CONFIG is a valid ResolvedConfig ────────────────────────────────

const defaultIsResolved: ResolvedConfig = DEFAULT_CONFIG;

// ─── DEFAULT_CONFIG satisfies Config (ResolvedConfig extends Config) ─────────

const defaultIsValidConfig: Config = DEFAULT_CONFIG;

// ─── DEFAULT_CONFIG.format.tokens should be 'TOKEN' ──────────────────────────

const defaultTokensValue: typeof DEFAULT_CONFIG.format.tokens = 'TOKEN';

// ─── ResolvedConfig requires variantDepth, details, output, keys, layout ─────

const resolved: ResolvedConfig = {
  processing: { variantDepth: 9999, details: 'LAYERED' },
  format: { output: 'JSON', keys: 'SAFE', layout: 'LAYOUT' },
  include: {},
};

// ─── ResolvedConfig requires defaultable fields — cannot omit them ────────────

// variantDepth is required on ResolvedConfig.processing
type _VDRequired = ResolvedConfig['processing']['variantDepth'] extends (1 | 2 | 3 | 9999) ? true : never;
const _vdRequired: _VDRequired = true;

// details is required on ResolvedConfig.processing
type _DRequired = ResolvedConfig['processing']['details'] extends ('FULL' | 'LAYERED') ? true : never;
const _dRequired: _DRequired = true;

// output is required on ResolvedConfig.format
type _ORequired = ResolvedConfig['format']['output'] extends ('JSON' | 'YAML') ? true : never;
const _oRequired: _ORequired = true;

// keys is required on ResolvedConfig.format
type _KRequired = ResolvedConfig['format']['keys'] extends ('SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN') ? true : never;
const _kRequired: _KRequired = true;

// layout is required on ResolvedConfig.format
type _LRequired = ResolvedConfig['format']['layout'] extends ('LAYOUT' | 'PARENT_CHILDREN' | 'BOTH') ? true : never;
const _lRequired: _LRequired = true;

// ─── glyphNamePattern is optional ─────────────────────────────────────────────

const _glyphUndefined: Config['processing']['glyphNamePattern'] = undefined;

// ─── inferNumberProps is optional ─────────────────────────────────────────────

const _inferUndefined: Config['processing']['inferNumberProps'] = undefined;

// ─── slotConstraints is optional ──────────────────────────────────────────────

const _slotConstraintsUndefined: Config['processing']['slotConstraints'] = undefined;
