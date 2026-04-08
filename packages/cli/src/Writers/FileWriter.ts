import yaml from 'yaml';
import type { OutputFormat } from '../Types/OutputConfig.js';

/**
 * Result of a file writing operation
 */
export interface WriteResult {
  /** Paths of successfully written files (relative to output directory) */
  filesWritten: string[];

  /** Non-fatal issues encountered during write (e.g., "Overwriting existing file") */
  warnings: string[];

  /** Fatal errors that prevented writing */
  errors: string[];
}

/** Shared YAML stringify options for deterministic output */
const YAML_OPTIONS: yaml.DocumentOptions & yaml.SchemaOptions & yaml.ToStringOptions = {
  indent: 2,
  lineWidth: 0,
  defaultStringType: 'PLAIN',
  defaultKeyType: 'PLAIN',
  aliasDuplicateObjects: false
};

/**
 * Strategy interface for writing file manifests to the filesystem
 *
 * Implementations:
 * - SingleFileWriter: Writes all components to one file
 * - ComponentFileWriter: Writes one file per component
 * - ConcernFileWriter: Writes separate api/variants files
 * - CombinedFileWriter: Writes component/api and component/variants files
 */
export abstract class FileWriter {
  /**
   * Serialize content to the specified format
   */
  static serialize(content: Record<string, unknown>, format: OutputFormat): string {
    return format === 'json'
      ? JSON.stringify(content, null, 2)
      : yaml.stringify(content, YAML_OPTIONS);
  }

  /**
   * Write files according to the manifest
   * @param manifest File manifest containing entries to write
   * @returns Result containing written files, warnings, and errors
   */
  abstract write(manifest: any): Promise<WriteResult>;
}
