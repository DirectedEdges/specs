/**
 * Configuration Defaults
 * 
 * Default values for optional CLI configuration fields.
 * These apply when config file is not present or fields are omitted.
 */

import { DEFAULT_OUTPUT_CONFIG } from '../Types/OutputConfig.js';

export const CONFIG_DEFAULTS = {
  /** Default location where fetch writes payloads and where generate/batch read from */
  sourceDirectory: './data',

  /** Default location for generated spec files */
  outputDirectory: './specs',

  /** Default output file organization settings */
  output: DEFAULT_OUTPUT_CONFIG,
} as const;

export type ConfigDefaults = typeof CONFIG_DEFAULTS;
