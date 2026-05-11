/**
 * Color value output format.
 *
 * Controls how `ColorObject` objects are serialized in the spec output.
 * `HEX` (default) emits a 6-digit hex string. `OBJECT` emits the full
 * `ColorObject` object. All other values emit a formatted color string
 * in the named notation.
 *
 * Tier 1 — Figma UI formats: `HEX`, `HEXA`, `RGB`, `RGBA`, `HSLA`, `HSB`
 * Tier 2 — Modern CSS (Level 4): `OKLCH`, `OKLAB`
 * Tier 3 — Structured object: `OBJECT`
 *
 * @since 0.20.0
 */
export type ColorFormat = 'HEX' | 'HEXA' | 'RGB' | 'RGBA' | 'HSLA' | 'HSB' | 'OKLCH' | 'OKLAB' | 'OBJECT';

/**
 * Model configuration used to generate the component spec.
 * Full structure matches the transformer's configuration options.
 *
 * @property processing - Processing options for component transformation.
 * @property format - Output format and key naming conventions.
 * @property include - Feature flags for what to include in output.
 */
export interface Config {
  processing: {
    /** Subcomponent discovery settings: scope, match patterns, and exclusion patterns. Optional; absence means no subcomponent detection. @since 0.15.0 */
    subcomponents?: {
      /** Where to search for subcomponents. NESTED = anatomy only (default); PAGE = also search the Figma page. */
      scope?: 'NESTED' | 'PAGE';
      /** Template patterns defining which assets are subcomponents. Uses {C} (component name) and {S} (subcomponent name) placeholders. */
      match: string[];
      /** Template patterns defining which matched assets to exclude. Same {C}/{S} syntax as match. */
      exclude?: string[];
    };
    /** Naming pattern used to detect glyph content assets (e.g. "DS Icon Glyph /"). Optional; absence means no glyph detection. */
    glyphNamePattern?: string;
    /** Naming pattern used to detect the code-only props container layer (e.g. "Code only props"). Optional; absence means no code-only prop extraction. */
    codeOnlyPropsPattern?: string;
    /** Whether to consolidate slot constraints (anyOf, minItems, maxItems) from code-only props into the slot property. Optional; defaults to false. @since 0.14.0 */
    slotConstraints?: boolean;
    /** Depth of variant expansion: 1-3 or 9999 for unlimited. Optional; defaults to 9999. */
    variantDepth?: 1 | 2 | 3 | 9999;
    /** Level of detail in output. Optional; defaults to LAYERED. */
    details?: 'FULL' | 'LAYERED';
    /** When true, TEXT code-only props whose default and all examples parse as valid numbers (no leading zeros) are emitted as NumberProp instead of StringProp */
    inferNumberProps?: boolean;
  };
  format: {
    /** Output format. Optional; defaults to JSON. */
    output?: 'JSON' | 'YAML';
    /** Key naming convention. Optional; defaults to SAFE. */
    keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';
    /** Layout representation format. Optional; defaults to LAYOUT. */
    layout?: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH';
    /** Token reference serialization profile. Optional; defaults to TOKEN. */
    tokens?: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM';
    /** Color value output format. Optional; defaults to HEX. @since 0.20.0 */
    color?: ColorFormat;
  };
  include: {
    /** Include invalid variants. Optional; defaults to false. */
    invalidVariants?: boolean;
    /** Include invalid combinations. Optional; defaults to true. */
    invalidCombinations?: boolean;
    /** Include layered variants that contain no elements. When false (default), exclude empty variants from output. When true, include all variants regardless of element presence. Optional; defaults to false. @since 1.0.0 */
    emptyVariants?: boolean;
  };
}

/**
 * Fully-resolved model configuration with all defaultable properties guaranteed present.
 * Produced by merging a partial `Config` with `DEFAULT_CONFIG`.
 *
 * Rule: every property with a default in `DEFAULT_CONFIG` is required here.
 * Only true feature toggles (where absence = feature disabled) remain optional:
 * `subcomponents` (the block), `glyphNamePattern`, `codeOnlyPropsPattern`.
 *
 * @since 0.17.0
 */
export interface ResolvedConfig {
  processing: {
    /** Subcomponent discovery settings. Optional; absence means no subcomponent detection. */
    subcomponents?: {
      /** Where to search for subcomponents. NESTED = anatomy only; PAGE = also search the Figma page. */
      scope: 'NESTED' | 'PAGE';
      /** Template patterns defining which assets are subcomponents. Uses {C} (component name) and {S} (subcomponent name) placeholders. */
      match: string[];
      /** Template patterns defining which matched assets to exclude. Same {C}/{S} syntax as match. */
      exclude?: string[];
    };
    /** Naming pattern used to detect glyph content assets. Optional; absence means no glyph detection. */
    glyphNamePattern?: string;
    /** Naming pattern used to detect the code-only props container layer. Optional; absence means no code-only prop extraction. */
    codeOnlyPropsPattern?: string;
    /** Whether to consolidate slot constraints from code-only props into the slot property. */
    slotConstraints: boolean;
    /** Depth of variant expansion: 1-3 or 9999 for unlimited. */
    variantDepth: 1 | 2 | 3 | 9999;
    /** Level of detail in output. */
    details: 'FULL' | 'LAYERED';
    /** When true, TEXT code-only props whose default and all examples parse as valid numbers are emitted as NumberProp instead of StringProp. */
    inferNumberProps: boolean;
  };
  format: {
    /** Output format. */
    output: 'JSON' | 'YAML';
    /** Key naming convention. */
    keys: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';
    /** Layout representation format. */
    layout: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH';
    /** Token reference serialization profile. */
    tokens: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM';
    /** Color value output format. */
    color: ColorFormat;
  };
  include: {
    /** Include invalid variants. */
    invalidVariants: boolean;
    /** Include invalid combinations. */
    invalidCombinations: boolean;
    /** Include layered variants that contain no elements. */
    emptyVariants: boolean;
  };
}

/**
 * Default Model Configuration
 *
 * Used by both CLI and Plugin to ensure identical behavior with same settings.
 *
 * Rationale for defaults:
 * - processing.slotConstraints: false — opt-in feature, off by default
 * - processing.variantDepth: 9999 (no limit) allows full variant combination exploration
 * - processing.details: LAYERED reduces output size by only showing differences from default
 * - processing.inferNumberProps: false — opt-in feature, off by default
 * - format.keys: SAFE prevents corruption of special characters while maintaining readability
 * - format.layout: LAYOUT provides tree structure with layout properties
 * - format.tokens: TOKEN provides platform-neutral token references with $token path and $type
 * - format.color: HEX matches historical v1 behaviour and maximises human readability
 * - include.invalidVariants: false excludes variants that can't be instantiated
 * - include.invalidCombinations: true helps designers identify property conflicts
 * - include.emptyVariants: false reduces output size by excluding semantically empty layered variants
 */
export const DEFAULT_CONFIG: ResolvedConfig = {
  processing: {
    slotConstraints: false,
    variantDepth: 9999,
    details: 'LAYERED',
    inferNumberProps: false,
  },
  format: {
    output: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
    color: 'HEX',
  },
  include: {
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
  },
};