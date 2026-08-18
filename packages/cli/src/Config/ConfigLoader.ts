/**
 * Configuration File Loader
 *
 * Loads and validates the workspace's split configuration (ADR-071):
 * a `config/` directory holding `conventions.yaml`, `settings.yaml`, and
 * `pipeline.yaml` (each optional, `.json` also accepted). A pre-split
 * `specs.config.yaml` / `specs.config.json` still loads via an in-memory
 * migration with a one-time deprecation warning.
 *
 * Priority order: CLI flags > file > defaults.
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PIPELINE,
  type ResolvedConventions,
  type ResolvedSettings,
  type ResolvedPipeline,
  type Settings,
  type SourceEntry,
} from '@directededges/specs-schema';
import { CONFIG_DEFAULTS } from './ConfigDefaults.js';
import type { CLIConfig } from '../Types/CLIConfig.js';

/** Base names of the three split-configuration files inside `config/`. */
const CONFIG_DIR_FILES = ['conventions', 'settings', 'pipeline'] as const;

/** Extensions accepted for each split-configuration file, in priority order. */
const CONFIG_FILE_EXTENSIONS = ['yaml', 'json'] as const;

type ConfigSource =
  | { kind: 'directory'; dir: string }
  | { kind: 'legacy'; file: string };

export class ConfigLoader {
  constructor() {
    // Config loader with runtime type checking instead of schema validation
  }

  /**
   * Load configuration from the split `config/` directory, a legacy file,
   * or defaults.
   *
   * @param configPath - Optional explicit path: either a `config/` directory
   *   holding split files or a legacy `specs.config.yaml`/`.json` file
   * @returns Complete CLI configuration
   */
  public load(configPath?: string): CLIConfig {
    const source = configPath
      ? this.classifyExplicitPath(configPath)
      : this.findConfigSource();

    if (!source) {
      return this.getDefaultConfig();
    }

    try {
      return source.kind === 'directory'
        ? this.loadFromDirectory(source.dir)
        : this.loadFromLegacyFile(source.file);
    } catch (error) {
      const location = source.kind === 'directory' ? source.dir : source.file;
      console.error(`Error loading config from ${location}:`, error);
      console.error('Falling back to default configuration');
      return this.getDefaultConfig();
    }
  }

  /**
   * Classify an explicit `configPath` argument as either a split-config
   * directory or a legacy file.
   */
  private classifyExplicitPath(configPath: string): ConfigSource | null {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    if (fs.statSync(configPath).isDirectory()) {
      return { kind: 'directory', dir: path.resolve(configPath) };
    }
    return { kind: 'legacy', file: path.resolve(configPath) };
  }

  /**
   * Find configuration in standard locations.
   *
   * Checks in order:
   * 1. ./config/ containing any of conventions|settings|pipeline .yaml/.json
   * 2. ./specs.config.yaml
   * 3. ./specs.config.json
   * 4. ~/.specs/config.yaml
   */
  private findConfigSource(): ConfigSource | null {
    const configDir = path.join(process.cwd(), 'config');
    if (fs.existsSync(configDir) && fs.statSync(configDir).isDirectory()) {
      const hasSplitFile = CONFIG_DIR_FILES.some(base =>
        CONFIG_FILE_EXTENSIONS.some(ext => fs.existsSync(path.join(configDir, `${base}.${ext}`)))
      );
      if (hasSplitFile) {
        return { kind: 'directory', dir: configDir };
      }
    }

    const legacyLocations = [
      path.join(process.cwd(), 'specs.config.yaml'),
      path.join(process.cwd(), 'specs.config.json'),
      path.join(process.env.HOME || '~', '.specs', 'config.yaml'),
    ];
    for (const location of legacyLocations) {
      if (fs.existsSync(location)) {
        return { kind: 'legacy', file: location };
      }
    }

    return null;
  }

  /**
   * Load the split configuration from a `config/` directory. Missing files
   * are fine — each half defaults independently.
   *
   * Relative directories resolve against the directory that *contains*
   * `config/` (the workspace root), matching where a legacy root-level
   * `specs.config.yaml` resolved them.
   */
  private loadFromDirectory(dir: string): CLIConfig {
    const conventions = this.resolveConventions(this.readPart(dir, 'conventions'));
    const settings = this.resolveSettings(this.readPart(dir, 'settings'));
    const pipeline = this.resolvePipeline(this.readPart(dir, 'pipeline'));

    const configDir = path.dirname(dir);
    this.resolveSettingsDirectories(settings, configDir);

    return { conventions, settings, pipeline, configDir };
  }

  /**
   * Load a pre-split `specs.config.yaml`-style file, migrating it into the
   * split shape in memory. The user's file is not rewritten.
   */
  private loadFromLegacyFile(file: string): CLIConfig {
    const parsed = this.parseFile(file);
    const migrated = this.migrateLegacy(parsed);

    console.warn(
      "Warning: the single-file specs.config format is deprecated — split it into 'config/conventions.yaml' and 'config/settings.yaml'. Loaded via in-memory migration this run."
    );

    const conventions = this.resolveConventions(migrated.conventions);
    const settings = this.resolveSettings(migrated.settings);
    const pipeline = this.resolvePipeline(migrated.pipeline);

    const configDir = path.dirname(file);
    this.resolveSettingsDirectories(settings, configDir);

    return { conventions, settings, pipeline, configDir };
  }

  /**
   * Read one split-configuration file (`<base>.yaml` or `<base>.json`) from
   * the config directory. Returns undefined when the file is absent.
   */
  private readPart(dir: string, base: string): unknown {
    for (const ext of CONFIG_FILE_EXTENSIONS) {
      const file = path.join(dir, `${base}.${ext}`);
      if (fs.existsSync(file)) {
        return this.parseFile(file);
      }
    }
    return undefined;
  }

  private parseFile(file: string): unknown {
    const raw = fs.readFileSync(file, 'utf-8');
    return file.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw);
  }

  /**
   * Map a pre-split config file into the three split shapes, in memory.
   */
  private migrateLegacy(parsed: unknown): { conventions: unknown; settings: unknown; pipeline: unknown } {
    const raw = (parsed ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const figma: Record<string, any> = {};
    const spec: Record<string, any> = {};
    const data: Record<string, any> = {};
    const settings: Record<string, any> = {};
    const pipeline: Record<string, any> = {};
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Support deprecated 'sourceDirectory' with warning (predates the split)
    let dataDirectory = raw.dataDirectory;
    if (!dataDirectory && raw.sourceDirectory) {
      console.warn("Warning: 'sourceDirectory' is deprecated, use 'dataDirectory' instead");
      dataDirectory = raw.sourceDirectory;
    }
    if (dataDirectory !== undefined) {
      data.directory = dataDirectory;
    }
    if (raw.outputDirectory !== undefined) {
      spec.directory = raw.outputDirectory;
    }
    if (raw.author !== undefined) {
      settings.author = raw.author;
    }

    // sources -> settings.data.sources, renaming each source's `data` to `fetch`
    if (raw.sources && typeof raw.sources === 'object') {
      const sources: Record<string, SourceEntry> = {};
      for (const [name, entry] of Object.entries(raw.sources as Record<string, unknown>)) {
        if (!entry || typeof entry !== 'object') continue;
        const src = entry as Record<string, unknown>;
        const fetch = Array.isArray(src.data) ? src.data : (Array.isArray(src.fetch) ? src.fetch : undefined);
        sources[name] = {
          key: src.key as string,
          ...(fetch && { fetch: fetch as string[] }),
        };
      }
      data.sources = sources;
    }

    // output.{splitComponents,splitConcerns,useSubfolders} -> settings.spec
    if (raw.output && typeof raw.output === 'object') {
      for (const flag of ['splitComponents', 'splitConcerns', 'useSubfolders'] as const) {
        if (raw.output[flag] !== undefined) {
          spec[flag] = raw.output[flag];
        }
      }
    }

    const cfg = (raw.config && typeof raw.config === 'object' ? raw.config : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

    // config.format -> settings.spec (output->format) + conventions.figma.naming
    if (cfg.format && typeof cfg.format === 'object') {
      if (cfg.format.output !== undefined) spec.format = cfg.format.output;
      for (const key of ['keys', 'layout', 'tokens', 'color'] as const) {
        if (cfg.format[key] !== undefined) spec[key] = cfg.format[key];
      }
      if (cfg.format.figmaKeys !== undefined) figma.naming = cfg.format.figmaKeys;
    }

    // config.processing -> settings.spec + conventions.figma
    if (cfg.processing && typeof cfg.processing === 'object') {
      const proc = cfg.processing;
      for (const key of ['variantDepth', 'details', 'collapsePrimitiveWrapper'] as const) {
        if (proc[key] !== undefined) spec[key] = proc[key];
      }
      for (const key of ['subcomponents', 'instanceExamples', 'states', 'slotConstraints', 'inferNumberProps'] as const) {
        if (proc[key] !== undefined) figma[key] = proc[key];
      }
      if (proc.glyphNamePattern !== undefined) {
        figma.glyphs = { match: proc.glyphNamePattern };
      }
      if (proc.codeOnlyPropsPattern !== undefined) {
        figma.codeOnlyProps = { match: proc.codeOnlyPropsPattern };
      }
      if (proc.images && typeof proc.images === 'object') {
        figma.images = {
          ...(proc.images.imageComponent !== undefined && { match: proc.images.imageComponent }),
          ...(proc.images.backgroundImage !== undefined && { backgroundImage: proc.images.backgroundImage }),
          ...(proc.images.sourceProps !== undefined && { sourceProps: proc.images.sourceProps }),
        };
      }
    }

    // config.include -> settings.spec
    if (cfg.include && typeof cfg.include === 'object') {
      for (const key of ['invalidVariants', 'invalidCombinations', 'emptyVariants', 'defaultSlotContent'] as const) {
        if (cfg.include[key] !== undefined) spec[key] = cfg.include[key];
      }
    }

    // config.transformers -> pipeline.transformers
    if (cfg.transformers !== undefined) {
      pipeline.transformers = cfg.transformers;
    }

    if (Object.keys(data).length > 0) settings.data = data;
    if (Object.keys(spec).length > 0) settings.spec = spec;

    return {
      conventions: Object.keys(figma).length > 0 ? { figma } : undefined,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
      pipeline: Object.keys(pipeline).length > 0 ? pipeline : undefined,
    };
  }

  /**
   * Resolve conventions: apply the three top-level defaults, and the inner
   * defaults of any declared block, validating members as the pre-split
   * loader did. Absence of a block means the library declares no such
   * convention — no default can supply it.
   */
  private resolveConventions(parsed: unknown): ResolvedConventions {
    const rawRoot = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    const raw = (rawRoot.figma && typeof rawRoot.figma === 'object' ? rawRoot.figma : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

    const figma: ResolvedConventions['figma'] = {
      naming: 'NONE',
      slotConstraints: raw.slotConstraints === true,
      inferNumberProps: raw.inferNumberProps === true,
    };

    // naming
    const validNaming = ['NONE', 'SENTENCE', 'TITLE'];
    const naming = typeof raw.naming === 'string' ? raw.naming.toUpperCase() : undefined;
    if (naming && validNaming.includes(naming)) {
      figma.naming = naming as ResolvedConventions['figma']['naming'];
    }

    // glyphs — a non-empty match string, else the block is dropped
    if (raw.glyphs !== undefined && raw.glyphs !== null) {
      const match = typeof raw.glyphs === 'object' ? raw.glyphs.match : undefined;
      if (typeof match === 'string' && match.trim() !== '') {
        figma.glyphs = { match };
      }
    }

    // codeOnlyProps — a non-empty match string, else the block is dropped
    if (raw.codeOnlyProps !== undefined && raw.codeOnlyProps !== null) {
      const match = typeof raw.codeOnlyProps === 'object' ? raw.codeOnlyProps.match : undefined;
      if (typeof match === 'string' && match.trim() !== '') {
        figma.codeOnlyProps = { match };
      }
    }

    // subcomponents
    if (raw.subcomponents !== undefined && raw.subcomponents !== null && typeof raw.subcomponents === 'object') {
      const subs = raw.subcomponents;
      const validScopes = ['NESTED', 'PAGE'];
      if (!Array.isArray(subs.match) || subs.match.length === 0) {
        console.warn('Invalid conventions.figma.subcomponents.match: must be a non-empty array of strings. Removing subcomponents convention.');
      } else {
        figma.subcomponents = {
          scope: validScopes.includes(subs.scope) ? subs.scope : 'NESTED',
          match: subs.match,
          ...(Array.isArray(subs.exclude) && { exclude: subs.exclude }),
        };
      }
    }

    // instanceExamples (ADR-050). The on-switch is the presence of the block;
    // match is an OPTIONAL name filter — when invalid, drop just the filter.
    if (raw.instanceExamples !== undefined && raw.instanceExamples !== null && typeof raw.instanceExamples === 'object') {
      const ie = raw.instanceExamples;
      const validIeScopes = ['PAGE', 'FILE'];
      let match = ie.match;
      if (match !== undefined && (!Array.isArray(match) || match.length === 0)) {
        console.warn('Invalid conventions.figma.instanceExamples.match: when provided, must be a non-empty array of strings. Ignoring match filter.');
        match = undefined;
      }
      figma.instanceExamples = {
        scope: validIeScopes.includes(ie.scope) ? ie.scope : 'PAGE',
        ...(match !== undefined && { match }),
        ...(Array.isArray(ie.exclude) && { exclude: ie.exclude }),
        ...(Array.isArray(ie.parentNames) && { parentNames: ie.parentNames }),
      };
    }

    // images (ADR-063). Presence of the block is the on-switch; each member
    // is an independent representation trigger.
    if (raw.images !== undefined) {
      const img = raw.images as Record<string, unknown>;
      if (img === null || typeof img !== 'object') {
        console.warn('Invalid conventions.figma.images: expected an object. Removing images convention.');
      } else {
        if (img.backgroundImage !== undefined && typeof img.backgroundImage !== 'boolean') {
          console.warn(`Invalid conventions.figma.images.backgroundImage: expected boolean, got ${typeof img.backgroundImage}. Using default: false`);
        }
        const sourceProps = Array.isArray(img.sourceProps)
          ? (img.sourceProps as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim() !== '').map(p => p.trim())
          : [];
        if (img.sourceProps !== undefined && (!Array.isArray(img.sourceProps) || sourceProps.length === 0)) {
          console.warn('Invalid conventions.figma.images.sourceProps: expected a non-empty array of strings. Ignoring sourceProps.');
        }
        let match = typeof img.match === 'string' && (img.match as string).trim() !== ''
          ? (img.match as string).trim()
          : undefined;
        if (img.match !== undefined && !match) {
          console.warn('Invalid conventions.figma.images.match: expected a non-empty string. Ignoring match.');
        }
        // The designated component needs a forwarding target: sourceProps[0].
        if (match && sourceProps.length === 0) {
          console.warn('conventions.figma.images.match requires a non-empty sourceProps (sourceProps[0] is its source prop). Ignoring match.');
          match = undefined;
        }
        figma.images = {
          backgroundImage: img.backgroundImage === true,
          ...(match && { match }),
          sourceProps,
        };
      }
    }

    // states — concept-keyed map, passed through when it is an object
    if (raw.states !== undefined && raw.states !== null && typeof raw.states === 'object' && !Array.isArray(raw.states)) {
      figma.states = raw.states;
    }

    return { figma };
  }

  /**
   * Resolve settings: deep-merge over DEFAULT_SETTINGS, then validate and
   * correct, replacing invalid enum values with defaults.
   */
  private resolveSettings(parsed: unknown): ResolvedSettings {
    const merged = parsed
      ? this.deepMerge(DEFAULT_SETTINGS, parsed as Partial<Settings>)
      : DEFAULT_SETTINGS;
    const corrected = JSON.parse(JSON.stringify(merged)) as ResolvedSettings;

    // Guard against null/undefined nested objects from YAML parsing
    // (YAML parsing of keys with only comments produces null instead of empty object)
    if (!corrected.spec || typeof corrected.spec !== 'object') {
      corrected.spec = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.spec));
    }
    if (corrected.data !== undefined && (corrected.data === null || typeof corrected.data !== 'object')) {
      delete corrected.data;
    }
    if (corrected.assets !== undefined && (corrected.assets === null || typeof corrected.assets !== 'object')) {
      delete corrected.assets;
    }

    const spec = corrected.spec;

    // Valid enum options (authoritative lists in schema Settings.ts)
    const validKeys = ['SAFE', 'CAMEL', 'SNAKE', 'KEBAB', 'PASCAL', 'TRAIN'];
    const validFormats = ['JSON', 'YAML'];
    const validLayouts = ['LAYOUT', 'PARENT_CHILDREN', 'BOTH'];
    const validTokens = ['TOKEN', 'TOKEN_NAME', 'TOKEN_FIGMA_EXTENSIONS', 'FIGMA_NAME', 'CUSTOM', 'FIGMA_SYNTAX_WEB', 'FIGMA_SYNTAX_IOS', 'FIGMA_SYNTAX_ANDROID'];
    const validColors = ['HEX', 'HEXA', 'RGB', 'RGBA', 'HSLA', 'HSB', 'OKLCH', 'OKLAB', 'OBJECT'];
    const validVariantDepths = [1, 2, 3, 9999];
    const validDetails = ['FULL', 'LAYERED'];

    // Normalize serialization values to uppercase before validation
    // (YAML configs commonly use lowercase; schema constants are uppercase)
    spec.keys = (spec.keys?.toUpperCase() ?? '') as typeof spec.keys;
    spec.format = (spec.format?.toUpperCase() ?? '') as typeof spec.format;
    spec.layout = (spec.layout?.toUpperCase() ?? '') as typeof spec.layout;
    if (spec.tokens) {
      spec.tokens = spec.tokens.toUpperCase() as typeof spec.tokens;
    }
    if (spec.color) {
      spec.color = spec.color.toUpperCase() as typeof spec.color;
    }

    if (!validKeys.includes(spec.keys)) {
      spec.keys = DEFAULT_SETTINGS.spec.keys;
    }
    if (!validFormats.includes(spec.format)) {
      spec.format = DEFAULT_SETTINGS.spec.format;
    }
    if (!validLayouts.includes(spec.layout)) {
      spec.layout = DEFAULT_SETTINGS.spec.layout;
    }
    if (spec.tokens && !validTokens.includes(spec.tokens)) {
      spec.tokens = DEFAULT_SETTINGS.spec.tokens;
    }
    if (!validColors.includes(spec.color)) {
      spec.color = DEFAULT_SETTINGS.spec.color;
    }
    if (!validVariantDepths.includes(spec.variantDepth)) {
      spec.variantDepth = DEFAULT_SETTINGS.spec.variantDepth;
    }
    if (!validDetails.includes(spec.details)) {
      spec.details = DEFAULT_SETTINGS.spec.details;
    }
    if (typeof spec.collapsePrimitiveWrapper !== 'boolean') {
      spec.collapsePrimitiveWrapper = false;
    }

    // defaultSlotContent activates only on a literal boolean `true`. Any other
    // value (e.g. the string "yes", a number, or undefined) is treated as off.
    const dsc = (spec as Record<string, unknown>).defaultSlotContent;
    if (dsc !== undefined && typeof dsc !== 'boolean') {
      console.warn(`Invalid settings.spec.defaultSlotContent: expected boolean, got ${typeof dsc}. Using default: false`);
    }
    if (dsc !== true) {
      spec.defaultSlotContent = false;
    }

    // Split flags: booleans only; invalid values warn and fall back to off
    for (const flag of ['splitComponents', 'splitConcerns', 'useSubfolders'] as const) {
      const value = (spec as Record<string, unknown>)[flag];
      if (value !== undefined && typeof value !== 'boolean') {
        console.warn(`Invalid settings.spec.${flag}: expected boolean, got ${typeof value}. Using default: false`);
        delete (spec as Record<string, unknown>)[flag];
      }
    }

    return corrected;
  }

  /**
   * Resolve pipeline: both lists guaranteed present; an empty list means
   * no work of that kind runs.
   */
  private resolvePipeline(parsed: unknown): ResolvedPipeline {
    const raw = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    return {
      transformers: Array.isArray(raw.transformers) ? raw.transformers : [...DEFAULT_PIPELINE.transformers],
      analyses: Array.isArray(raw.analyses) ? raw.analyses : [...DEFAULT_PIPELINE.analyses],
    };
  }

  /**
   * Resolve relative data/spec directories against the directory the
   * configuration was loaded from.
   */
  private resolveSettingsDirectories(settings: ResolvedSettings, configDir: string): void {
    if (settings.data?.directory && !path.isAbsolute(settings.data.directory)) {
      settings.data.directory = path.resolve(configDir, settings.data.directory);
    }
    if (settings.spec.directory && !path.isAbsolute(settings.spec.directory)) {
      settings.spec.directory = path.resolve(configDir, settings.spec.directory);
    }
  }

  /**
   * Deep merge two objects, with source overriding target
   * Null values from source are ignored to prevent YAML parsing issues
   * (empty sections with only comments parse as null, not empty objects)
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    if (!source || typeof source !== 'object') {
      return target;
    }

    const result = { ...target } as Record<string, unknown>;

    for (const key in source) {
      if (source[key] !== undefined && source[key] !== null) {
        const sourceValue = source[key];
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          result[key] = this.deepMerge((result[key] as T) || ({} as T), sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }

    return result as T;
  }

  /**
   * Get default configuration with convention-based defaults
   */
  private getDefaultConfig(): CLIConfig {
    const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as ResolvedSettings;
    settings.data = { directory: path.resolve(CONFIG_DEFAULTS.dataDirectory) };
    settings.spec.directory = path.resolve(CONFIG_DEFAULTS.outputDirectory);

    return {
      conventions: this.resolveConventions(undefined),
      settings,
      pipeline: {
        transformers: [...DEFAULT_PIPELINE.transformers],
        analyses: [...DEFAULT_PIPELINE.analyses],
      },
    };
  }
}
