/**
 * CLI configuration structure
 *
 * The three artifacts a workspace authors (ADR-071), fully resolved:
 * `config/conventions.yaml`, `config/settings.yaml`, `config/pipeline.yaml`.
 *
 * A pre-split `specs.config.yaml` still loads: `ConfigLoader` migrates it into
 * this shape in memory and warns once.
 */

import type {
  ResolvedConventions,
  ResolvedSettings,
  ResolvedPipeline,
} from '@directededges/specs-schema';

export type CliSourceDataKind = 'file' | 'variables' | 'styles';

export interface CLIConfig {
  /** Facts about the Figma library — every consumer of that library declares the same values. */
  conventions: ResolvedConventions;
  /** Choices about this run — sources, spec output, assets. */
  settings: ResolvedSettings;
  /** Work this workspace runs: transformers and analyses. */
  pipeline: ResolvedPipeline;
  /** Absolute path of the directory the configuration was loaded from, for resolving relative paths. */
  configDir?: string;
}
