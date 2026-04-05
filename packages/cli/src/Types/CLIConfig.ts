/**
 * CLI configuration structure
 */

import type { Config as ModelConfig } from '@directededges/specs-schema';
import type { OutputConfig } from './OutputConfig.js';

export type CliSourceDataKind = 'file' | 'variables' | 'styles';

export interface CliSourceConfig {
  key: string;
  data: CliSourceDataKind[];
}

export interface CLIConfig {
  sourceDirectory?: string;
  outputDirectory?: string;
  author?: string;
  model: ModelConfig;
  output?: OutputConfig;
  sources?: Record<string, CliSourceConfig>;
}
