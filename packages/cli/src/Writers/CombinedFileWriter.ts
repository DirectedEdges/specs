import fs from 'fs-extra';
import yaml from 'yaml';
import type { FileManifest } from './FileManifest.js';
import { FileWriter, WriteResult } from './FileWriter.js';

/**
 * Writer for combined mode: creates component/api.yaml and component/variants.yaml
 * Each component gets its own directory with separate concern files
 */
export class CombinedFileWriter extends FileWriter {
  async write(manifest: FileManifest): Promise<WriteResult> {
    const result: WriteResult = {
      filesWritten: [],
      warnings: [],
      errors: []
    };

    try {
      // Get unique directories that need to be created
      const directories = new Set(
        manifest.entries.map((entry: { path: string }) => {
          const lastSlash = entry.path.lastIndexOf('/');
          return lastSlash > 0 ? entry.path.substring(0, lastSlash) : '';
        }).filter((dir: string) => dir.length > 0)
      );

      // Create all directories in batch
      await Promise.all(
        Array.from(directories).map(dir => fs.ensureDir(dir))
      );

      // Process each file in the manifest
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
      result.errors.push(`Failed to write combined files: ${errorMessage}`);
    }

    return result;
  }
}
