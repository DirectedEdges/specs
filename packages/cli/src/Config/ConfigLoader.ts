/**
 * Configuration File Loader
 * 
 * Loads and validates specs.config.yaml or specs.config.json files
 * with sensible defaults and priority order: CLI flags > file > defaults
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { DEFAULT_CONFIG, type Config, type ResolvedConfig } from '@directededges/specs-schema';
import { CONFIG_DEFAULTS } from './ConfigDefaults.js';
import type { CLIConfig } from '../Types/CLIConfig.js';
import type { OutputConfig, OutputFormat } from '../Types/OutputConfig.js';

export class ConfigLoader {
  constructor() {
    // Config loader with runtime type checking instead of schema validation
  }
  
  /**
   * Load configuration from file or use defaults
   * 
   * @param configPath - Optional explicit config file path
   * @returns Complete CLI configuration
   */
  public load(configPath?: string): CLIConfig {
    const filePath = configPath || this.findConfigFile();
    
    if (!filePath || !fs.existsSync(filePath)) {
      // No config file, use defaults
      return this.getDefaultConfig();
    }
    
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = filePath.endsWith('.json') 
        ? JSON.parse(raw) 
        : yaml.parse(raw);
      
      // Validate and merge with defaults
      const config = this.validateAndMerge(parsed);

      // Resolve dataDirectory and outputDirectory relative to config file location
      const configDir = path.dirname(filePath);
      if (config.dataDirectory && !path.isAbsolute(config.dataDirectory)) {
        config.dataDirectory = path.resolve(configDir, config.dataDirectory);
      }
      if (config.outputDirectory && !path.isAbsolute(config.outputDirectory)) {
        config.outputDirectory = path.resolve(configDir, config.outputDirectory);
      }
      
      return config;
    } catch (error) {
      console.error(`Error loading config from ${filePath}:`, error);
      console.error('Falling back to default configuration');
      return this.getDefaultConfig();
    }
  }
  
  /**
   * Find config file in standard locations
   *
   * Checks in order:
   * 1. ./specs.config.yaml
   * 2. ./specs.config.json
   * 3. ~/.specs/config.yaml
   *
   * @returns Path to config file or null if not found
   */
  private findConfigFile(): string | null {
    const locations = [
      path.join(process.cwd(), 'specs.config.yaml'),
      path.join(process.cwd(), 'specs.config.json'),
      path.join(process.env.HOME || '~', '.specs', 'config.yaml'),
    ];
    
    for (const location of locations) {
      if (fs.existsSync(location)) {
        return location;
      }
    }
    
    return null;
  }
  
  /**
   * Validate and merge config file with defaults
   */
  private validateAndMerge(parsed: unknown): CLIConfig {
    // Support deprecated 'sourceDirectory' with warning
    const raw = parsed as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let dataDirectory = raw?.dataDirectory;
    if (!dataDirectory && raw?.sourceDirectory) {
      console.warn("Warning: 'sourceDirectory' is deprecated, use 'dataDirectory' instead");
      dataDirectory = raw.sourceDirectory;
    }

    const config: CLIConfig = {
      dataDirectory,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outputDirectory: (parsed as any)?.outputDirectory,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      author: (parsed as any)?.author,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: this.mergeConfig((parsed as any)?.config),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: this.mergeOutputConfig((parsed as any)?.output),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sources: (parsed as any)?.sources,
    };
    
    return config;
  }
  
  /**
   * Merge model config from file with defaults
   */
  private mergeConfig(fileModel: unknown): ResolvedConfig {
    if (!fileModel) {
      return DEFAULT_CONFIG;
    }
    
    // Deep merge user config over defaults
    const merged = this.deepMerge(DEFAULT_CONFIG, fileModel as Partial<Config>);
    
    // Validate and correct merged config, replacing invalid values with defaults
    return this.validateAndCorrectConfig(merged);
  }

  /**
   * Validate and correct model config, replacing invalid values with defaults
   */
  private validateAndCorrectConfig(config: Config): ResolvedConfig {
    const corrected = JSON.parse(JSON.stringify(config)) as ResolvedConfig;

    // Guard against null/undefined nested config objects from YAML parsing
    // (YAML parsing of keys with only comments produces null instead of empty object)
    if (!corrected.processing || typeof corrected.processing !== 'object') {
      corrected.processing = DEFAULT_CONFIG.processing;
    }
    if (!corrected.format || typeof corrected.format !== 'object') {
      corrected.format = DEFAULT_CONFIG.format;
    }
    if (!corrected.include || typeof corrected.include !== 'object') {
      corrected.include = DEFAULT_CONFIG.include;
    }

    // Valid processing options
    const validVariantDepths = [1, 2, 3, 9999];
    const validDetails = ['FULL', 'LAYERED'];

    // Validate processing
    if (!validVariantDepths.includes(corrected.processing.variantDepth)) {
      corrected.processing.variantDepth = DEFAULT_CONFIG.processing.variantDepth;
    }
    if (!validDetails.includes(corrected.processing.details)) {
      corrected.processing.details = DEFAULT_CONFIG.processing.details;
    }
    if (corrected.processing.glyphNamePattern !== undefined
        && (typeof corrected.processing.glyphNamePattern !== 'string'
            || corrected.processing.glyphNamePattern.trim() === '')) {
      delete corrected.processing.glyphNamePattern;
    }
    if (corrected.processing.codeOnlyPropsPattern !== undefined
        && (typeof corrected.processing.codeOnlyPropsPattern !== 'string'
            || corrected.processing.codeOnlyPropsPattern.trim() === '')) {
      delete corrected.processing.codeOnlyPropsPattern;
    }
    if (typeof corrected.processing.slotConstraints !== 'boolean') {
      corrected.processing.slotConstraints = false;
    }
    if (typeof corrected.processing.inferNumberProps !== 'boolean') {
      corrected.processing.inferNumberProps = false;
    }
    if (typeof corrected.processing.collapsePrimitiveWrapper !== 'boolean') {
      corrected.processing.collapsePrimitiveWrapper = false;
    }

    // Validate processing.subcomponents
    if (corrected.processing.subcomponents !== undefined) {
      const subs = corrected.processing.subcomponents;
      const validScopes = ['NESTED', 'PAGE'];
      if (subs.scope !== undefined && !validScopes.includes(subs.scope)) {
        subs.scope = 'NESTED';
      }
      if (!Array.isArray(subs.match) || subs.match.length === 0) {
        console.warn('Invalid processing.subcomponents.match: must be a non-empty array of strings. Removing subcomponents config.');
        delete corrected.processing.subcomponents;
      } else if (subs.exclude !== undefined && !Array.isArray(subs.exclude)) {
        delete subs.exclude;
      }
    }

    // Validate processing.images (ADR-063). Presence of the block is the
    // on-switch; each member is an independent representation trigger.
    if (corrected.processing.images !== undefined) {
      const img = corrected.processing.images as unknown as Record<string, unknown>;
      if (img === null || typeof img !== 'object') {
        console.warn('Invalid processing.images: expected an object. Removing images config.');
        delete corrected.processing.images;
      } else {
        if (img.backgroundImage !== undefined && typeof img.backgroundImage !== 'boolean') {
          console.warn(`Invalid processing.images.backgroundImage: expected boolean, got ${typeof img.backgroundImage}. Using default: false`);
        }
        const sourceProps = Array.isArray(img.sourceProps)
          ? (img.sourceProps as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim() !== '').map(p => p.trim())
          : [];
        if (img.sourceProps !== undefined && (!Array.isArray(img.sourceProps) || sourceProps.length === 0)) {
          console.warn('Invalid processing.images.sourceProps: expected a non-empty array of strings. Ignoring sourceProps.');
        }
        let imageComponent = typeof img.imageComponent === 'string' && (img.imageComponent as string).trim() !== ''
          ? (img.imageComponent as string).trim()
          : undefined;
        if (img.imageComponent !== undefined && !imageComponent) {
          console.warn('Invalid processing.images.imageComponent: expected a non-empty string. Ignoring imageComponent.');
        }
        // The designated component needs a forwarding target: sourceProps[0].
        if (imageComponent && sourceProps.length === 0) {
          console.warn('processing.images.imageComponent requires a non-empty sourceProps (sourceProps[0] is its source prop). Ignoring imageComponent.');
          imageComponent = undefined;
        }
        corrected.processing.images = {
          backgroundImage: img.backgroundImage === true,
          ...(imageComponent && { imageComponent }),
          sourceProps,
        };
      }
    }

    // Validate processing.instanceExamples (ADR-050)
    if (corrected.processing.instanceExamples !== undefined) {
      const ie = corrected.processing.instanceExamples;
      const validIeScopes = ['PAGE', 'FILE'];
      if (ie.scope !== undefined && !validIeScopes.includes(ie.scope)) {
        ie.scope = 'PAGE';
      }
      // match is an OPTIONAL name filter (ADR-050). The on-switch is the presence
      // of the instanceExamples block; the primary relevance test is structural
      // identity. When match is omitted, every in-scope instance qualifies
      // (subject to exclude/parentNames). When provided, it must be a non-empty
      // array of strings — otherwise drop just the match filter, not the block.
      if (ie.match !== undefined && (!Array.isArray(ie.match) || ie.match.length === 0)) {
        console.warn('Invalid processing.instanceExamples.match: when provided, must be a non-empty array of strings. Ignoring match filter.');
        delete ie.match;
      }
      if (ie.exclude !== undefined && !Array.isArray(ie.exclude)) {
        delete ie.exclude;
      }
      if (ie.parentNames !== undefined && !Array.isArray(ie.parentNames)) {
        delete ie.parentNames;
      }
    }

    // Valid format options
    const validKeys = ['SAFE', 'CAMEL', 'SNAKE', 'KEBAB', 'PASCAL', 'TRAIN'];
    const validOutputs = ['JSON', 'YAML'];
    const validLayouts = ['LAYOUT', 'PARENT_CHILDREN', 'BOTH'];
    const validTokens = ['TOKEN', 'TOKEN_NAME', 'TOKEN_FIGMA_EXTENSIONS', 'FIGMA_NAME', 'CUSTOM', 'FIGMA_SYNTAX_WEB', 'FIGMA_SYNTAX_IOS', 'FIGMA_SYNTAX_ANDROID'];
    const validColors = ['HEX', 'HEXA', 'RGB', 'RGBA', 'HSLA', 'HSB', 'OKLCH', 'OKLAB', 'OBJECT'];

    // Normalize format values to uppercase before validation
    // (YAML configs commonly use lowercase; schema constants are uppercase)
    corrected.format.keys = corrected.format.keys?.toUpperCase() ?? '';
    corrected.format.output = corrected.format.output?.toUpperCase() ?? '';
    corrected.format.layout = corrected.format.layout?.toUpperCase() ?? '';
    if (corrected.format.tokens) {
      corrected.format.tokens = corrected.format.tokens.toUpperCase();
    }
    if (corrected.format.color) {
      corrected.format.color = corrected.format.color.toUpperCase();
    }

    // Validate format
    if (!validKeys.includes(corrected.format.keys)) {
      corrected.format.keys = DEFAULT_CONFIG.format.keys;
    }
    if (!validOutputs.includes(corrected.format.output)) {
      corrected.format.output = DEFAULT_CONFIG.format.output;
    }
    if (!validLayouts.includes(corrected.format.layout)) {
      corrected.format.layout = DEFAULT_CONFIG.format.layout;
    }
    if (corrected.format.tokens && !validTokens.includes(corrected.format.tokens)) {
      corrected.format.tokens = DEFAULT_CONFIG.format.tokens;
    }
    if (!validColors.includes(corrected.format.color)) {
      corrected.format.color = DEFAULT_CONFIG.format.color;
    }

    // Strip EOLed include properties — subcomponent inclusion is controlled by
    // the presence of processing.subcomponents, and instanceExamples likewise by
    // the presence of processing.instanceExamples (so include.instanceExamples is
    // not a valid key).
    const validIncludeKeys = new Set(['invalidVariants', 'invalidCombinations', 'emptyVariants', 'defaultSlotContent']);
    for (const key of Object.keys(corrected.include)) {
      if (!validIncludeKeys.has(key)) {
        delete (corrected.include as Record<string, unknown>)[key];
      }
    }

    // defaultSlotContent activates only on a literal boolean `true`. Any other
    // value (e.g. the string "yes", a number, or undefined) is treated as off.
    const dsc = (corrected.include as Record<string, unknown>).defaultSlotContent;
    if (dsc !== undefined && typeof dsc !== 'boolean') {
      console.warn(`Invalid include.defaultSlotContent: expected boolean, got ${typeof dsc}. Using default: false`);
    }
    if (dsc !== true) {
      corrected.include.defaultSlotContent = false;
    }

    return corrected;
  }

  /**
   * Merge output config from file with defaults
   */
  private mergeOutputConfig(fileOutput: unknown): OutputConfig {
    if (!fileOutput) {
      return CONFIG_DEFAULTS.output;
    }
    
    // Validate types and provide warnings for invalid values
    const output = fileOutput as Record<string, unknown>;
    const result = { ...CONFIG_DEFAULTS.output };
    
    if (typeof output.splitComponents === 'boolean') {
      result.splitComponents = output.splitComponents;
    } else if (output.splitComponents !== undefined) {
      console.warn(`Invalid output.splitComponents: expected boolean, got ${typeof output.splitComponents}. Using default: false`);
    }
    
    if (typeof output.splitConcerns === 'boolean') {
      result.splitConcerns = output.splitConcerns;
    } else if (output.splitConcerns !== undefined) {
      console.warn(`Invalid output.splitConcerns: expected boolean, got ${typeof output.splitConcerns}. Using default: false`);
    }
    
    if (typeof output.useSubfolders === 'boolean') {
      result.useSubfolders = output.useSubfolders;
    } else if (output.useSubfolders !== undefined) {
      console.warn(`Invalid output.useSubfolders: expected boolean, got ${typeof output.useSubfolders}. Using default: false`);
    }
    
    if (output.defaultFormat === 'yaml' || output.defaultFormat === 'json') {
      result.defaultFormat = output.defaultFormat as OutputFormat;
    } else if (output.defaultFormat !== undefined) {
      console.warn(`Invalid output.defaultFormat: expected 'yaml' or 'json', got ${output.defaultFormat}. Using default: 'yaml'`);
    }
    
    return result;
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
    return {
      dataDirectory: path.resolve(CONFIG_DEFAULTS.dataDirectory),
      outputDirectory: path.resolve(CONFIG_DEFAULTS.outputDirectory),
      config: DEFAULT_CONFIG,
    };
  }
}
