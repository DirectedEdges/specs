/**
 * A single transformer to run via `specs transform`, identified by name.
 * Transformer-specific options sit inline alongside `name`.
 *
 * @since 0.24.0
 */
export interface TransformEntry {
  /** Transformer name (e.g. `contract`, `css`, `react`). */
  name: string;
  [option: string]: unknown;
}

/**
 * A single analysis to run via `specs analyze`, identified by name.
 * Analysis-specific options sit inline alongside `name`.
 *
 * @since 0.31.0
 */
export interface AnalysisEntry {
  /** Analysis name (e.g. `dependencies`). */
  name: string;
  [option: string]: unknown;
}

/**
 * Work a workspace runs over its specs.
 *
 * Separate from `Settings` because these name *work* rather than how work
 * behaves, and separate from `Conventions` because running a different set
 * produces different output rather than incorrect output. Entries carry no
 * output paths: transformers write into the spec structure, and analyses
 * write beside the specs they analyze.
 *
 * @since 0.31.0
 */
export interface Pipeline {
  /** Transformers to run via `specs transform`, each with optional inline options. */
  transformers?: TransformEntry[];
  /** Analyses to run via `specs analyze`, each with optional inline options. */
  analyses?: AnalysisEntry[];
}

/**
 * Fully-resolved pipeline with both lists guaranteed present.
 * An empty list means no work of that kind runs.
 *
 * @since 0.31.0
 */
export interface ResolvedPipeline {
  /** Transformers to run via `specs transform`. */
  transformers: TransformEntry[];
  /** Analyses to run via `specs analyze`. */
  analyses: AnalysisEntry[];
}

/**
 * Default Pipeline — no work declared.
 * A workspace that declares nothing runs nothing beyond command defaults.
 */
export const DEFAULT_PIPELINE: ResolvedPipeline = {
  transformers: [],
  analyses: [],
};
