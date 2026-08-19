/**
 * Configuration File Loader
 *
 * Loads and validates the workspace's split configuration (ADR-071):
 * a `config/` directory holding `conventions.yaml`, `settings.yaml`, and
 * `pipeline.yaml` (each optional, `.json` also accepted).
 *
 * A pre-split `specs.config.yaml` is refused, not read: `specs migrate config`
 * converts it. Loading runs inside read-only commands and in CI, so it never
 * writes to a workspace, and it never falls back to defaults when it finds a
 * configuration it cannot use.
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

/** Pre-split workspace files that `specs migrate config` can convert. */
const CONFIG_V1_BASENAMES = ['specs.config.yaml', 'specs.config.json'];

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

    // A pre-split file is a hard stop, not a load failure: falling back to
    // defaults would generate successfully and silently wrong, missing
    // everything the workspace's conventions declare.
    if (source.kind === 'legacy') {
      this.refuseLegacyFile(source.file);
    }

    try {
      return this.loadFromDirectory(source.dir);
    } catch (error) {
      console.error(`Error loading config from ${source.dir}:`, error);
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
   * Refuse a pre-split configuration file.
   *
   * ADR-071 made this a breaking change deliberately. Reading the old shape
   * would mean supporting two layouts indefinitely; ignoring it would be worse
   * — the run would fall through to defaults and generate specs missing
   * everything the conventions declare, without ever failing.
   */
  private refuseLegacyFile(file: string): never {
    // Name the full path: a workspace file and a home-directory one are refused
    // for the same reason but have different remedies, and `config.yaml` alone
    // does not tell the reader which file is being rejected.
    const home = process.env.HOME || '~';
    const isUserLevel = file.startsWith(path.join(home, '.specs'));
    const isDiscovered = CONFIG_V1_BASENAMES.includes(path.basename(file));

    const remedy = isUserLevel
      ? "  A user-level configuration has no equivalent in the split layout. Move what it declares into this workspace's config/ directory, then delete it."
      : isDiscovered
        ? '  Run `specs migrate config` to write config/conventions.yaml, config/settings.yaml and config/pipeline.yaml from it.'
        : `  Run \`specs migrate config --source ${path.basename(file)}\` to write config/conventions.yaml, config/settings.yaml and config/pipeline.yaml from it.`;

    throw new Error(
      `${file} is no longer read (ADR-071).\n` +
      `${remedy}\n` +
      `  Docs: https://specs.directededges.com/settings/`
    );
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
