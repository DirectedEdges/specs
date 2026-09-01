import type { ResolvedPlatformConventions } from '@directededges/specs-schema';
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
  /**
   * The conventions of the platform this transformer emits for (ADR-073), from
   * `config/conventions/<platform>.yaml`. Carries `primitives` — which component
   * means text, glyph or container here.
   *
   * Absent, or absent of `primitives`, means this platform declares no bindings and
   * elements emit as host elements exactly as before.
   */
  platform?: ResolvedPlatformConventions;
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
  /**
   * The `conventions.platforms` key this transformer reads (ADR-073 Decision 3).
   * Fixed by the transformer, not configured: React and Web Components are peer
   * implementations with different vocabularies, so each names its own key.
   */
  readonly platformId?: string;
  run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void>;
  /** Called once after all components have been processed. Use for cross-component aggregate output. */
  finalize?(outputDir: string, analysisDir?: string, foundations?: AnalyzerFoundations): Promise<void>;
}
