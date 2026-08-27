import type { ProcessingStates } from '../transforms/states.js';

export interface TransformerContext {
  /** Absolute path to the component's output subfolder. */
  outputDir: string;
  /** camelCase component folder name (e.g. `dsButton`). */
  componentKey: string;
  /** Token format from config.format.tokens. Drives CSS variable resolution. */
  tokensFormat: string;
  /** Output format from config.format.output. Drives file extension and serialization for analyzers. */
  outputFormat: 'JSON' | 'YAML';
  /** Semantic state concept map from config.processing.states. */
  processingStates?: ProcessingStates;
  /** Raw options from the matching config.transformers entry (everything except `name`). */
  transformerOptions?: Record<string, unknown>;
  /** Absolute path to the workspace data directory (fetched library JSON), when configured. */
  dataDirectory?: string;
}

/**
 * Structural subset of the foundations maps produced by loadFoundations().
 * Gives analyzers the full token universe (variables, collections, styles)
 * without depending on @directededges/specs-from-figma types.
 */
export interface AnalyzerFoundations {
  variables: Map<string, { name: string; variableCollectionId: string; resolvedType?: string }>;
  collections: Map<string, { name: string }>;
  styles: Map<string, { id: string; name: string; type: string }>;
}

export interface Transformer {
  readonly name: string;
  run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void>;
  /** Called once after all components have been processed. Use for cross-component aggregate output. */
  finalize?(outputDir: string, analysisDir?: string, foundations?: AnalyzerFoundations): Promise<void>;
}
