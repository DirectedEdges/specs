export interface CssRule {
  name: string;
  apply(
    variantsYaml: Record<string, unknown>,
    context: { tokensFormat: string | undefined },
  ): Record<string, unknown>;
}
