export interface TransformerContext {
  /** Absolute path to the component's output subfolder. */
  outputDir: string;
  /** camelCase component folder name (e.g. `egdsButton`). */
  componentKey: string;
  /** Token format from config.format.tokens. Drives CSS variable resolution. */
  tokensFormat: string;
}

export interface Transformer {
  readonly name: string;
  run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void>;
  /** Called once after all components have been processed. Use for cross-component aggregate output. */
  finalize?(outputDir: string): Promise<void>;
}
