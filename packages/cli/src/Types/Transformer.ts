import type { ProcessingStates } from '../transforms/states.js';

export interface TransformerContext {
  /** Absolute path to the component's output subfolder. */
  outputDir: string;
  /** camelCase component folder name (e.g. `egdsButton`). */
  componentKey: string;
  /** Token format from config.format.tokens. Drives CSS variable resolution. */
  tokensFormat: string;
  /** Output format from config.format.output. Drives file extension and serialization for analyzers. */
  outputFormat: 'JSON' | 'YAML';
  /** Semantic state concept map from config.processing.states. */
  processingStates?: ProcessingStates;
  /** Raw options from the matching config.transformers entry (everything except `name`). */
  transformerOptions?: Record<string, unknown>;
}

export interface Transformer {
  readonly name: string;
  run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void>;
  /** Called once after all components have been processed. Use for cross-component aggregate output. */
  finalize?(outputDir: string, analysisDir?: string): Promise<void>;
}
