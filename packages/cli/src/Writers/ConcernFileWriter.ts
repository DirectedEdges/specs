import fs from 'fs-extra';
import type { FileManifest } from './FileManifest.js';
import { FileWriter, WriteResult } from './FileWriter.js';

/**
 * Writer for per-concern mode: creates api and variants files
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

      // Process each file in the manifest
      for (const entry of manifest.entries) {
        const filePath = entry.path;

        // Check if file exists and warn
        const exists = await fs.pathExists(filePath);
        if (exists) {
          result.warnings.push(`Warning: Overwriting existing file: ${filePath}`);
        }

        // Serialize in the configured format
        const content = FileWriter.serialize(entry.content, manifest.format);

        // Write file
        await fs.writeFile(filePath, content, 'utf-8');
        result.filesWritten.push(filePath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to write concern files: ${errorMessage}`);
    }

    return result;
  }
}
