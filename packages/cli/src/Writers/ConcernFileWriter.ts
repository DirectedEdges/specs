import fs from 'fs-extra';
import yaml from 'yaml';
import type { FileManifest } from './FileManifest.js';
import { FileWriter, WriteResult } from './FileWriter.js';

/**
 * Writer for per-concern mode: creates api.yaml and variants.yaml files
 * Each concern file aggregates data from all components
 */
export class ConcernFileWriter extends FileWriter {
  async write(manifest: FileManifest): Promise<WriteResult> {
    const result: WriteResult = {
      filesWritten: [],
      warnings: [],
      errors: []
    };

    try {
      // Ensure output directory exists
      await fs.ensureDir(manifest.baseDir);

      // Process each file in the manifest (api.yaml and variants.yaml)
      for (const entry of manifest.entries) {
        const filePath = entry.path;

        // Check if file exists and warn
        const exists = await fs.pathExists(filePath);
        if (exists) {
          result.warnings.push(`Warning: Overwriting existing file: ${filePath}`);
        }

        // Serialize to YAML with deterministic formatting
        const yamlContent = yaml.stringify(entry.content, {
          indent: 2,
          lineWidth: 0, // Disable line wrapping
          sortMapEntries: false, // Preserve insertion order (metadata last)
          aliasDuplicateObjects: false
        });

        // Write file
        await fs.writeFile(filePath, yamlContent, 'utf-8');
        result.filesWritten.push(filePath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to write concern files: ${errorMessage}`);
    }

    return result;
  }
}
