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
  PackageIdentity,
  PlatformSettings,
} from '../types/index.js';
import { DEFAULT_SETTINGS } from '../types/index.js';

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
  platforms: {
    react: { package: { name: '@example/library-react', version: '0.1.0' } },
    'web-components': { package: { name: '@example/library-wc', version: '0.1.0' } },
  },
};

// ─── Package identity ─────────────────────────────────────────────────────────

// Both members are optional — a workspace may name a package and defer versioning
const nameOnly: PackageIdentity = { name: '@example/library-react' };
const emptyIdentity: PackageIdentity = {};

// A platform may declare no package at all
const emptyPlatform: PlatformSettings = {};

// @ts-expect-error — version is a dotted string, not a number
const numericVersion: PackageIdentity = { version: 1 };

// @ts-expect-error — the emitter owns dependencies; they are not declared here
const withDependencies: PackageIdentity = { name: '@example/x', peerDependencies: { react: '^18' } };

// Platform keys are free-form implementation ids
const swiftui: Settings = { platforms: { swiftui: { package: { name: 'ExampleLibrary' } } } };

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

// platforms has no default — it stays optional after resolution
const resolvedPlatforms: Record<string, PlatformSettings> | undefined = DEFAULT_SETTINGS.platforms;

export {
  empty, full, source, keylessSource, color, badColor, badDepth, conventionInSettings,
  defaults, format, depth, dir,
  nameOnly, emptyIdentity, emptyPlatform, numericVersion, withDependencies, swiftui,
  resolvedPlatforms,
};
