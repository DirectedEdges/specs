/**
 * Output configuration for CLI writers
 */

export type OutputFormat = 'yaml';

export interface OutputConfig {
  splitComponents: boolean;
  splitConcerns: boolean;
  useSubfolders: boolean;
  defaultFormat: OutputFormat;
}

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  splitComponents: false,
  splitConcerns: false,
  useSubfolders: false,
  defaultFormat: 'yaml'
};
