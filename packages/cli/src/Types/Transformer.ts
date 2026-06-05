export interface TransformerContext {
  /** Absolute path to the component's output subfolder. */
  outputDir: string;
  /** camelCase component folder name (e.g. `egdsButton`). */
  componentKey: string;
}

export interface Transformer {
  readonly name: string;
  run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void>;
}
