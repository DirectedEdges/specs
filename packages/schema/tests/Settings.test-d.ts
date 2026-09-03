/**
 * Type-level tests for Settings, ResolvedSettings, and Pipeline.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  Settings,
  ResolvedSettings,
  ColorFormat,
  SourceEntry,
  Pipeline,
  ResolvedPipeline,
  TransformEntry,
  AnalysisEntry,
} from '../types/index.js';
import { DEFAULT_SETTINGS, DEFAULT_PIPELINE } from '../types/index.js';

// ─── Empty settings are valid — every member is defaulted or consumer-supplied ─

const empty: Settings = {};

// ─── A workspace declaring everything ─────────────────────────────────────────

const full: Settings = {
  author: 'Nathan Curtis',
  data: {
    directory: './data',
    sources: {
      library: { key: 'FILE_KEY', fetch: ['file', 'variables', 'styles', 'icons'] },
    },
  },
  spec: {
    directory: './specs',
    format: 'YAML',
    keys: 'CAMEL',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
    color: 'HEXA',
    variantDepth: 9999,
    details: 'LAYERED',
    collapsePrimitiveWrapper: true,
    promotePrimitives: true,
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
    defaultSlotContent: true,
    splitComponents: true,
    splitConcerns: true,
    useSubfolders: true,
  },
  assets: { directory: './assets' },
};

// ─── Sources ──────────────────────────────────────────────────────────────────

const source: SourceEntry = { key: 'abc123' };

// @ts-expect-error — key is required
const keylessSource: SourceEntry = { fetch: ['file'] };

// ─── Closed value sets ────────────────────────────────────────────────────────

const color: ColorFormat = 'OKLCH';

// @ts-expect-error — not a supported color format
const badColor: ColorFormat = 'CMYK';

// @ts-expect-error — variantDepth is a closed set
const badDepth: Settings = { spec: { variantDepth: 4 } };

// @ts-expect-error — conventions do not live in settings
const conventionInSettings: Settings = { spec: { glyphNamePattern: 'DS Icon Glyph / {i}' } };

// ─── Defaults are fully resolved on the spec concern ──────────────────────────

const defaults: ResolvedSettings = DEFAULT_SETTINGS;
const format: 'JSON' | 'YAML' = DEFAULT_SETTINGS.spec.format;
const depth: 1 | 2 | 3 | 9999 = DEFAULT_SETTINGS.spec.variantDepth;

// Consumer-supplied members stay optional after resolution
const dir: string | undefined = DEFAULT_SETTINGS.spec.directory;

// ─── Pipeline ─────────────────────────────────────────────────────────────────

const pipeline: Pipeline = {
  transformers: [{ name: 'react' }, { name: 'css' }, { name: 'contract' }],
  analyses: [{ name: 'dependencies' }],
};

const emptyPipeline: Pipeline = {};
const resolvedPipeline: ResolvedPipeline = DEFAULT_PIPELINE;

const transformer: TransformEntry = { name: 'react', someOption: true };
const analysis: AnalysisEntry = { name: 'dependencies' };

// @ts-expect-error — name is required
const namelessTransformer: TransformEntry = { someOption: true };

export {
  empty, full, source, keylessSource, color, badColor, badDepth, conventionInSettings,
  defaults, format, depth, dir, pipeline, emptyPipeline, resolvedPipeline,
  transformer, analysis, namelessTransformer,
};
