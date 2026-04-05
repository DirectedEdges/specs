/**
 * Type-level tests for Config.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Config } from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';

// ─── Helper: minimal valid processing + format + include ──────────────────────

const minProcessing: Config['processing'] = {
  variantDepth: 9999,
  details: 'LAYERED',
};
const minFormat: Config['format'] = { output: 'JSON', keys: 'SAFE', layout: 'LAYOUT' };
const minInclude: Config['include'] = { variantNames: false, invalidVariants: false, invalidCombinations: true };

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
    variantNames: false,
    invalidVariants: false,
    invalidCombinations: true,
  },
};

// ─── Minimal Config — only required fields ────────────────────────────────────

const minimalConfig: Config = {
  processing: minProcessing,
  format: minFormat,
  include: minInclude,
};

// ─── subcomponents.scope is optional, defaults to NESTED ──────────────────────

const configWithoutScope: Config = {
  processing: {
    subcomponents: { match: ['{C} / _ / {S}'] },
    variantDepth: 9999,
    details: 'FULL',
  },
  format: { output: 'YAML', keys: 'CAMEL', layout: 'PARENT_CHILDREN' },
  include: { variantNames: true, invalidVariants: true, invalidCombinations: false },
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

// ─── include no longer has subcomponents field ────────────────────────────────

// @ts-expect-error — subcomponents was removed from include
const _badInclude: Config['include']['subcomponents'] = true;

// ─── processing no longer has subcomponentNamePattern ─────────────────────────

// @ts-expect-error — subcomponentNamePattern was replaced by subcomponents object
const _badProcessing: Config['processing']['subcomponentNamePattern'] = '{C} / _ / {S}';

// ─── All tokens enum values are valid ─────────────────────────────────────────

const tokenConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'TOKEN' } };
const tokenNameConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'TOKEN_NAME' } };
const tokenFigmaExtConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'TOKEN_FIGMA_EXTENSIONS' } };
const figmaNameConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'FIGMA_NAME' } };
const customConfig: Config = { ...fullConfig, format: { ...fullConfig.format, tokens: 'CUSTOM' } };

// ─── DEFAULT_CONFIG is a valid Config ─────────────────────────────────────────

const defaultIsValid: Config = DEFAULT_CONFIG;

// ─── DEFAULT_CONFIG.format.tokens should be 'TOKEN' ──────────────────────────

const defaultTokensValue: typeof DEFAULT_CONFIG.format.tokens = 'TOKEN';

// ─── glyphNamePattern is optional ─────────────────────────────────────────────

const _glyphUndefined: Config['processing']['glyphNamePattern'] = undefined;

// ─── inferNumberProps is optional ─────────────────────────────────────────────

const _inferUndefined: Config['processing']['inferNumberProps'] = undefined;

// ─── slotConstraints is optional ──────────────────────────────────────────────

const _slotConstraintsUndefined: Config['processing']['slotConstraints'] = undefined;
