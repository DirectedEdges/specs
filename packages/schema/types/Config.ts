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
    /** Depth of variant expansion: 1-3 or 9999 for unlimited */
    variantDepth: 1 | 2 | 3 | 9999;
    /** Level of detail in output */
    details: 'FULL' | 'LAYERED';
    /** When true, TEXT code-only props whose default and all examples parse as valid numbers (no leading zeros) are emitted as NumberProp instead of StringProp */
    inferNumberProps?: boolean;
  };
  format: {
    /** Output format */
    output: 'JSON' | 'YAML';
    /** Key naming convention */
    keys: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';
    /** Layout representation format */
    layout: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH';
    /** Token reference serialization profile. Optional; defaults to TOKEN. */
    tokens?: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM';
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
 * Default Model Configuration
 *
 * Used by both CLI and Plugin to ensure identical behavior with same settings.
 *
 * Rationale for defaults:
 * - processing.subcomponents.match: Standard "{C} / _ / {S}" pattern for identifying subcomponents
 * - processing.variantDepth: 9999 (no limit) allows full variant combination exploration
 * - processing.details: LAYERED reduces output size by only showing differences from default
 * - format.keys: SAFE prevents corruption of special characters while maintaining readability
 * - format.layout: LAYOUT provides tree structure with layout properties
 * - format.tokens: TOKEN provides platform-neutral token references with $token path and $type
 * - include.invalidVariants: false excludes variants that can't be instantiated
 * - include.invalidCombinations: true helps designers identify property conflicts
 * - include.emptyVariants: false reduces output size by excluding semantically empty layered variants
 */
export const DEFAULT_CONFIG: Config = {
  processing: {
    subcomponents: {
      match: ['{C} / _ / {S}'],
    },
    variantDepth: 9999,
    details: 'LAYERED',
  },
  format: {
    output: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
  },
  include: {
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
  },
};