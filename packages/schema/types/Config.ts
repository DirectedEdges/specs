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
 * Classifies a Figma variant prop as a semantic state concept for deterministic
 * use by transformers and plugin output.
 *
 * The map key is the concept name (e.g. `hover`, `disabled`, `focus-within`).
 * `prop` names the Figma variant prop; `value` is the enum value that activates
 * the concept (defaults to `"true"` for boolean props). `contract` overrides the
 * concept's canonical browser-driven / consumer-controlled default — rarely needed.
 *
 * @since 0.24.0
 */
export interface VariantStateEntry {
  /** Figma variant prop name (e.g. `state`, `isDisabled`, `focused`). */
  prop: string;
  /**
   * Figma variant value that activates this concept (e.g. `"hover"`, `"pressed"`).
   * Omit for boolean props — defaults to `"true"`.
   */
  value?: string;
  /**
   * Contract generation behavior override.
   * - `'omit'` — browser-driven state; exclude this prop from generated Props interfaces.
   * - `'keep'` — consumer-controlled state; retain this prop in generated Props interfaces.
   * When absent, the concept's canonical default applies (omit for pseudo-class concepts,
   * keep for ARIA-attribute concepts).
   */
  contract?: 'omit' | 'keep';
}

/**
 * A single transformer to run via `specs transform`, identified by name.
 * Transformer-specific options sit inline alongside `name`.
 *
 * @since 0.24.0
 */
export interface TransformEntry {
  /** Transformer name (e.g. `contract`, `css`, `tokens`). */
  name: string;
  [option: string]: unknown;
}

/**
 * Model configuration used to generate the component spec.
 * Full structure matches the transformer's configuration options.
 *
 * @property processing - Processing options for component transformation.
 * @property format - Output format and key naming conventions.
 * @property include - Feature flags for what to include in output.
 * @property transformers - Transformer selection and options for `specs transform`.
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
    /** Whether to consolidate slot constraints (anyOf, minChildren, maxChildren) from code-only props into the slot property. Optional; defaults to false. @since 0.14.0 */
    slotConstraints?: boolean;
    /**
     * When true, a component whose root is a plain container wrapping a single `text` or
     * `glyph` element (no meaningful container styles, no slot bindings) is collapsed:
     * the wrapper is stripped and the leaf becomes the spec root. All-or-nothing across
     * variants — if any variant fails eligibility, no collapse occurs. Defaults to false.
     * @since 0.26.0
     */
    collapsePrimitiveWrapper?: boolean;
    /** Depth of variant expansion: 1-3 or 9999 for unlimited. Optional; defaults to 9999. */
    variantDepth?: 1 | 2 | 3 | 9999;
    /** Level of detail in output. Optional; defaults to LAYERED. */
    details?: 'FULL' | 'LAYERED';
    /** When true, TEXT code-only props whose default and all examples parse as valid numbers (no leading zeros) are emitted as NumberProp instead of StringProp */
    inferNumberProps?: boolean;
    /** Instance example detection settings (ADR-050): named frames demonstrating pre-configured whole-component usage. Optional; absence means no instance example detection. @since 0.21.0 */
    instanceExamples?: {
      /** Search boundary. PAGE = current Figma page only (default); FILE = all pages in the file. */
      scope?: 'PAGE' | 'FILE';
      /** Optional name patterns narrowing which instance frames qualify. Uses {C} (component name) placeholder. Absence = every in-scope instance of the component qualifies (subject to exclude/parentNames). */
      match?: string[];
      /** Name patterns for frames to exclude. Same {C} syntax as match. */
      exclude?: string[];
      /** Immediate-parent frame or section names a candidate must be contained within. Absence = no parent-name filtering. */
      parentNames?: string[];
    };
    /** Concept-keyed map classifying Figma variant props as semantic states. Key = concept name (e.g. `hover`, `disabled`). Optional; absence means all variant props emit as data-* attribute selectors and all props are retained in contracts. @since 0.24.0 */
    states?: Record<string, VariantStateEntry>;
  };
  format: {
    /** Output format. Optional; defaults to JSON. */
    output?: 'JSON' | 'YAML';
    /** Key naming convention. Optional; defaults to SAFE. */
    keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';
    /** Layout representation format. Optional; defaults to LAYOUT. */
    layout?: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH';
    /**
     * Token reference serialization profile. Optional; defaults to TOKEN.
     * `FIGMA_SYNTAX_WEB`, `FIGMA_SYNTAX_IOS`, and `FIGMA_SYNTAX_ANDROID` emit the
     * token's Figma `codeSyntax` for that platform, falling back to the `TOKEN`
     * profile's output when no code syntax is defined for the platform. @since 0.21.0
     */
    tokens?: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM' | 'FIGMA_SYNTAX_WEB' | 'FIGMA_SYNTAX_IOS' | 'FIGMA_SYNTAX_ANDROID';
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
    /** Include slot content examples in output (ADR-050). Optional; defaults to false. @since 0.21.0 */
    defaultSlotContent?: boolean;
  };
  /** Transformers to run via `specs transform`, each with optional inline options. Optional; absence means CLI defaults apply. @since 0.24.0 */
  transformers?: TransformEntry[];
}

/**
 * Fully-resolved model configuration with all defaultable properties guaranteed present.
 * Produced by merging a partial `Config` with `DEFAULT_CONFIG`.
 *
 * Rule: every property with a default in `DEFAULT_CONFIG` is required here.
 * Only true feature toggles (where absence = feature disabled) remain optional:
 * `subcomponents` (the block), `instanceExamples` (the block), `glyphNamePattern`,
 * `codeOnlyPropsPattern`.
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
    /** When true, plain container wrappers around a single text/glyph child are stripped and the leaf is promoted to spec root. */
    collapsePrimitiveWrapper: boolean;
    /** Depth of variant expansion: 1-3 or 9999 for unlimited. */
    variantDepth: 1 | 2 | 3 | 9999;
    /** Level of detail in output. */
    details: 'FULL' | 'LAYERED';
    /** When true, TEXT code-only props whose default and all examples parse as valid numbers are emitted as NumberProp instead of StringProp. */
    inferNumberProps: boolean;
    /** Instance example detection settings (ADR-050). Optional; absence means no instance example detection. When present, `scope` is required (defaults to PAGE). */
    instanceExamples?: {
      scope: 'PAGE' | 'FILE';
      match?: string[];
      exclude?: string[];
      parentNames?: string[];
    };
    /** Concept-keyed map classifying Figma variant props as semantic states. Key = concept name (e.g. `hover`, `disabled`). Optional; absence means all variant props emit as data-* attribute selectors and all props are retained in contracts. @since 0.24.0 */
    states?: Record<string, VariantStateEntry>;
  };
  format: {
    /** Output format. */
    output: 'JSON' | 'YAML';
    /** Key naming convention. */
    keys: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';
    /** Layout representation format. */
    layout: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH';
    /** Token reference serialization profile. */
    tokens: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM' | 'FIGMA_SYNTAX_WEB' | 'FIGMA_SYNTAX_IOS' | 'FIGMA_SYNTAX_ANDROID';
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
    /** Include slot content examples in output. */
    defaultSlotContent: boolean;
  };
  /** Transformers to run via `specs transform`. @since 0.24.0 */
  transformers: TransformEntry[];
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
 * - include.defaultSlotContent: false — opt-in (ADR-050); off by default so unannotated components are unchanged
 *   (instanceExamples have no include flag — presence of processing.instanceExamples is the on-switch, like subcomponents)
 */
export const DEFAULT_CONFIG: ResolvedConfig = {
  processing: {
    slotConstraints: false,
    collapsePrimitiveWrapper: false,
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
    defaultSlotContent: false,
  },
  transformers: [],
};