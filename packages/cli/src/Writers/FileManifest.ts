import fs from 'fs-extra';
import path from 'path';
import type { OutputConfig, OutputFormat } from '../Types/OutputConfig.js';
import { sortComponentsByName, splitComponentByConcern, hasExampleData } from './DataTransformers.js';

/**
 * Metadata for a file manifest entry
 */
export interface EntryMetadata {
  /** Component name if applicable */
  component?: string;
  
  /** Concern type if applicable */
  concern?: 'api' | 'variants' | 'examples';
  
  /** When the entry was created */
  timestamp: Date;
}

/**
 * Represents a single file to be written
 */
export interface FileManifestEntry {
  /** Relative file path from base directory (e.g., "button/api.yaml") */
  path: string;
  
  /** The data to serialize and write */
  content: Record<string, unknown>;
  
  /** Additional context about the entry */
  metadata: EntryMetadata;
}

/**
 * Collection of files to be written with their paths and content
 * 
 * Separates manifest generation from file writing for testability
 * and to enable dry-run validation.
 */
export class FileManifest {
  /** Array of files to be written */
  entries: FileManifestEntry[] = [];
  
  /** Base output directory path */
  baseDir: string;

  /** Output format for serialization */
  format: OutputFormat;

  /** Output filename for single-file mode */
  private outputFileName?: string;

  /** File extension derived from format */
  private ext: string;

  /**
   * Build file manifest from components and configuration
   * @param components Array of component entries with names and data to process
   * @param config Output configuration
   * @param baseDir Base output directory
   * @param outputFileName Optional filename for single-file mode
   */
  constructor(
    components: Array<{ name: string; spec?: Record<string, unknown> }>,
    config: OutputConfig,
    baseDir: string,
    outputFileName?: string
  ) {
    this.baseDir = baseDir;
    this.outputFileName = outputFileName;
    this.format = config.defaultFormat;
    this.ext = this.format === 'json' ? '.json' : '.yaml';
    
    // Sort components for deterministic output
    const sortedComponents = sortComponentsByName(components);
    
    // Determine output mode and build appropriate manifest
    const { splitComponents, splitConcerns, useSubfolders } = config;

    if (!splitComponents && !splitConcerns) {
      // Mode 1: Single library file
      this.buildSingleFileManifest(sortedComponents);
    } else if (splitComponents && !splitConcerns) {
      // Mode 2 & 3: Per-component (flat or subfolders)
      this.buildPerComponentManifest(sortedComponents, useSubfolders);
    } else if (!splitComponents && splitConcerns) {
      // Mode 4: Per-concern
      this.buildPerConcernManifest(sortedComponents);
    } else {
      // Mode 5: Combined (per-component + per-concern) — the default. Component
      // folders are structural here, so useSubfolders does not apply.
      this.buildCombinedManifest(sortedComponents);
    }
  }
  
  /**
   * Build manifest for single-file mode
   * Output: library.yaml with all components
   */
  private buildSingleFileManifest(components: Array<{ name: string; spec?: Record<string, unknown> }>): void {
    const componentsData: Record<string, Record<string, unknown>> = {};

    for (const item of components) {
      if (!item.spec) continue;

      const key = this.toCamelCase(item.name);
      componentsData[key] = item.spec;
    }
    
    this.entries.push({
      path: this.outputFileName || `library${this.ext}`,
      content: { components: componentsData },
      metadata: {
        timestamp: new Date()
      }
    });
  }
  
  /**
   * Build manifest for per-component mode
   * Output: Button.yaml, Alert.yaml OR Button/Button.yaml, Alert/Alert.yaml
   */
  private buildPerComponentManifest(components: Array<{ name: string; spec?: Record<string, unknown> }>, useSubfolders: boolean): void {
    for (const item of components) {
      if (!item.spec) continue;

      const camelName = this.toCamelCase(item.name);

      const fileName = `${camelName}${this.ext}`;
      const filePath = useSubfolders
        ? path.join(camelName, fileName)
        : fileName;

      this.entries.push({
        path: filePath,
        content: item.spec,
        metadata: {
          component: camelName,
          timestamp: new Date()
        }
      });
    }
  }
  
  /**
   * Build manifest for per-concern mode
   * Output: api.yaml, variants.yaml, and examples.yaml (the last only when at
   * least one component has slotContentExamples/instanceExamples).
   */
  private buildPerConcernManifest(components: Array<{ name: string; spec?: Record<string, unknown> }>): void {
    const apiComponents: Record<string, any> = {};
    const variantsComponents: Record<string, any> = {};
    const examplesComponents: Record<string, any> = {};

    for (const item of components) {
      if (!item.spec) continue;

      const { api, variants, examples } = splitComponentByConcern(item.spec as Record<string, any>);
      const key = this.toCamelCase(item.name);

      apiComponents[key] = api;
      variantsComponents[key] = variants;
      // Only components with actual examples appear in examples.yaml
      if (hasExampleData(examples)) examplesComponents[key] = examples;
    }

    // Create timestamp for metadata
    const timestamp = new Date();

    // Add api file entry
    this.entries.push({
      path: path.join(this.baseDir, `api${this.ext}`),
      content: {
        components: apiComponents,
        metadata: {
          generatedAt: timestamp.toISOString(),
          componentCount: components.length,
          concern: 'api'
        }
      },
      metadata: { timestamp }
    });

    // Add variants file entry
    this.entries.push({
      path: path.join(this.baseDir, `variants${this.ext}`),
      content: {
        components: variantsComponents,
        metadata: {
          generatedAt: timestamp.toISOString(),
          componentCount: components.length,
          concern: 'variants'
        }
      },
      metadata: { timestamp }
    });

    // Add examples file entry only when there is example data to emit, so runs
    // without examples don't produce an empty examples file.
    const exampleComponentCount = Object.keys(examplesComponents).length;
    if (exampleComponentCount > 0) {
      this.entries.push({
        path: path.join(this.baseDir, `examples${this.ext}`),
        content: {
          components: examplesComponents,
          metadata: {
            generatedAt: timestamp.toISOString(),
            componentCount: exampleComponentCount,
            concern: 'examples'
          }
        },
        metadata: { timestamp }
      });
    }
  }
  
  /**
   * Build manifest for combined mode
   * Output: Button/api.yaml, Button/variants.yaml, etc.
   */
  private buildCombinedManifest(components: Array<{ name: string; spec?: Record<string, unknown> }>): void {
    const timestamp = new Date();

    for (const item of components) {
      if (!item.spec) continue;

      const { api, variants, examples } = splitComponentByConcern(item.spec as Record<string, any>);
      const camelName = this.toCamelCase(item.name);

      // Create component directory path
      const componentDir = path.join(this.baseDir, camelName);

      // Add api file entry for this component
      this.entries.push({
        path: path.join(componentDir, `api${this.ext}`),
        content: {
          ...api,
          metadata: {
            ...api.metadata,
            generatedAt: timestamp.toISOString(),
            concern: 'api'
          }
        },
        metadata: {
          timestamp,
          component: camelName
        }
      });

      // Add variants file entry for this component
      this.entries.push({
        path: path.join(componentDir, `variants${this.ext}`),
        content: {
          ...variants,
          metadata: {
            ...variants.metadata,
            generatedAt: timestamp.toISOString(),
            concern: 'variants'
          }
        },
        metadata: {
          timestamp,
          component: camelName
        }
      });

      // Add examples file entry only for components that have examples
      if (hasExampleData(examples)) {
        this.entries.push({
          path: path.join(componentDir, `examples${this.ext}`),
          content: {
            ...examples,
            metadata: {
              ...examples.metadata,
              generatedAt: timestamp.toISOString(),
              concern: 'examples'
            }
          },
          metadata: {
            timestamp,
            component: camelName
          }
        });
      }
    }
  }
  
  /**
   * Convert name to camelCase key
   * Example: "DS Button" -> "dsButton"
   */
  private toCamelCase(name: string): string {
    // Ensure name is a string
    const nameStr = String(name || 'component');
    const cleaned = nameStr.replace(/[^a-zA-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) return 'component';
    
    return words[0].toLowerCase() + words.slice(1).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join('');
  }
  
  /**
   * Write all entries to filesystem
   * @returns Result containing written files, warnings, and errors
   */
  async write(): Promise<import('./FileWriter.js').WriteResult> {
    const result: import('./FileWriter.js').WriteResult = {
      filesWritten: [],
      warnings: [],
      errors: []
    };

    try {
      // Create all directories first (batch operation)
      const directories = new Set<string>();
      for (const entry of this.entries) {
        const dir = path.dirname(path.join(this.baseDir, entry.path));
        directories.add(dir);
      }

      for (const dir of directories) {
        await fs.ensureDir(dir);
      }

      // Write all files
      for (const entry of this.entries) {
        const outputPath = path.join(this.baseDir, entry.path);

        // Check if file exists and warn before overwriting
        if (await fs.pathExists(outputPath)) {
          result.warnings.push(`⚠️  Overwriting existing file: ${entry.path}`);
        }

        // Delegate to YAML serialization (will be done by writers)
        // For now, just track the write intent
        result.filesWritten.push(entry.path);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to write files: ${message}`);
    }

    return result;
  }
}
