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

/**
 * Strategy interface for writing file manifests to the filesystem
 * 
 * Implementations:
 * - SingleFileWriter: Writes all components to one file
 * - ComponentFileWriter: Writes one file per component
 * - ConcernFileWriter: Writes separate api.yaml and variants.yaml
 * - CombinedFileWriter: Writes component/api.yaml and component/variants.yaml
 */
export abstract class FileWriter {
  /**
   * Write files according to the manifest
   * @param manifest File manifest containing entries to write
   * @returns Result containing written files, warnings, and errors
   */
  abstract write(manifest: any): Promise<WriteResult>;
}
