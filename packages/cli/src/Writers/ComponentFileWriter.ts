/**
 * ComponentFileWriter - Writes one file per component
 * 
 * Supports both flat and subfolder modes:
 * - Flat: Button.yaml, Alert.yaml
 * - Subfolders: Button/Button.yaml, Alert/Alert.yaml
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { FileWriter, type WriteResult } from './FileWriter.js';
import type { FileManifest } from './FileManifest.js';

export class ComponentFileWriter extends FileWriter {
  /**
   * @param _useSubfolders Whether to organize files in component subdirectories (handled by manifest)
   */
  constructor(_useSubfolders = false) {
    super();
  }

  /**
   * Write one file per component
   * @param manifest File manifest containing entries to write
   * @returns Result containing written files, warnings, and errors
   */
  async write(manifest: FileManifest): Promise<WriteResult> {
    const result: WriteResult = {
      filesWritten: [],
      warnings: [],
      errors: []
    };

    try {
      // Create all directories first (batch operation)
      const directories = new Set<string>();
      for (const entry of manifest.entries) {
        const dir = path.dirname(path.join(manifest.baseDir, entry.path));
        directories.add(dir);
      }

      for (const dir of directories) {
        await fs.ensureDir(dir);
      }

      // Write all files
      for (const entry of manifest.entries) {
        const outputPath = path.join(manifest.baseDir, entry.path);

        // Check if file exists and warn before overwriting
        if (await fs.pathExists(outputPath)) {
          result.warnings.push(`Overwriting existing file: ${entry.path}`);
        }

        // Serialize to YAML with consistent formatting
        const yamlContent = yaml.stringify(entry.content, {
          indent: 2,
          lineWidth: 0, // Don't wrap long lines
          defaultStringType: 'PLAIN',
          defaultKeyType: 'PLAIN',
          aliasDuplicateObjects: false
        });

        // Write file
        await fs.writeFile(outputPath, yamlContent, 'utf-8');
        result.filesWritten.push(entry.path);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to write files: ${message}`);
    }

    return result;
  }
}
