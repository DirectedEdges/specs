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
 * A source the workspace reads from, keyed by source name.
 *
 * @since 0.31.0
 */
export interface SourceEntry {
  /** Figma file key the source reads from. */
  key: string;
  /** Artifacts to download for this source (e.g. `file`, `variables`, `styles`, `icons`). */
  fetch?: string[];
}

/**
 * Choices about a run rather than facts about a library.
 *
 * Changing a setting produces **different** output, never incorrect output: a
 * different team reading the same library may set every one of these differently
 * and each result is correct. Members are grouped by concern — `data`, `spec`,
 * `assets` — and each concern carries its own `directory`.
 *
 * @since 0.31.0
 */
export interface Settings {
  /** Author recorded in generated spec metadata. */
  author?: string;
  /** Source acquisition: what to fetch, and where fetched artifacts, computed caches, and extracted assets are kept. */
  data?: {
    /** Directory holding fetched downloads, computed caches, extracted assets, and authored inputs. */
    directory?: string;
    /** Sources the workspace reads from, keyed by source name. */
    sources?: Record<string, SourceEntry>;
  };
  /** The generated spec: where it lands, how it is split, what it contains, and how values are serialized. */
  spec?: {
    /** Directory the generated spec is written to. */
    directory?: string;
    /** Serialization format. Optional; defaults to JSON. */
    format?: 'JSON' | 'YAML';
    /**
     * Key naming convention applied to anatomy keys, prop keys, and every reference
     * to them. Every value other than SAFE is a lossy projection of the Figma name;
     * names outside the safe key grammar are preserved in `$extensions['com.figma'].name`.
     * Optional; defaults to SAFE.
     */
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
    /** Depth of variant expansion: 1-3 or 9999 for unlimited. Optional; defaults to 9999. */
    variantDepth?: 1 | 2 | 3 | 9999;
    /** Level of detail in output. Optional; defaults to LAYERED. */
    details?: 'FULL' | 'LAYERED';
    /**
     * When true, a component whose root is a plain container wrapping a single `text` or
     * `glyph` element (no meaningful container styles, no slot bindings) is collapsed:
     * the wrapper is stripped and the leaf becomes the spec root. All-or-nothing across
     * variants — if any variant fails eligibility, no collapse occurs. Defaults to false.
     * @since 0.26.0
     */
    collapsePrimitiveWrapper?: boolean;
    /** Include invalid variants. Optional; defaults to false. */
    invalidVariants?: boolean;
    /** Include invalid combinations. Optional; defaults to true. */
    invalidCombinations?: boolean;
    /** Include layered variants that contain no elements. Optional; defaults to false. */
    emptyVariants?: boolean;
    /** Include slot content examples in output (ADR-050). Optional; defaults to false. @since 0.21.0 */
    defaultSlotContent?: boolean;
    /** Write one file per component rather than a single combined file. */
    splitComponents?: boolean;
    /** Write one file per concern (api, styling, variants) rather than a single component file. */
    splitConcerns?: boolean;
    /** Nest each component's files in a subfolder named for the component. */
    useSubfolders?: boolean;
  };
  /** Shared resources every code output points at, whatever the platform: icons, images, generated CSS, fonts. */
  assets?: {
    /** Directory holding shared assets. */
    directory?: string;
  };
}

/**
 * Fully-resolved settings with every defaultable property guaranteed present.
 * Produced by merging a partial `Settings` with `DEFAULT_SETTINGS`.
 *
 * Rule: every property with a default in `DEFAULT_SETTINGS` is required here.
 * Members with no schema-level default — directories, sources, author, and the
 * split flags — remain optional, because the value is supplied by the consumer
 * rather than by this package.
 *
 * @since 0.31.0
 */
export interface ResolvedSettings {
  /** Author recorded in generated spec metadata. */
  author?: string;
  /** Source acquisition settings. */
  data?: {
    directory?: string;
    sources?: Record<string, SourceEntry>;
  };
  /** The generated spec. */
  spec: {
    directory?: string;
    /** Serialization format. */
    format: 'JSON' | 'YAML';
    /** Key naming convention. */
    keys: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';
    /** Layout representation format. */
    layout: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH';
    /** Token reference serialization profile. */
    tokens: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM' | 'FIGMA_SYNTAX_WEB' | 'FIGMA_SYNTAX_IOS' | 'FIGMA_SYNTAX_ANDROID';
    /** Color value output format. */
    color: ColorFormat;
    /** Depth of variant expansion. */
    variantDepth: 1 | 2 | 3 | 9999;
    /** Level of detail in output. */
    details: 'FULL' | 'LAYERED';
    /** Plain container wrappers around a single text/glyph child are stripped. */
    collapsePrimitiveWrapper: boolean;
    /** Include invalid variants. */
    invalidVariants: boolean;
    /** Include invalid combinations. */
    invalidCombinations: boolean;
    /** Include layered variants that contain no elements. */
    emptyVariants: boolean;
    /** Include slot content examples in output. */
    defaultSlotContent: boolean;
    splitComponents?: boolean;
    splitConcerns?: boolean;
    useSubfolders?: boolean;
  };
  /** Shared resources every code output points at. */
  assets?: {
    directory?: string;
  };
}

/**
 * Default Settings
 *
 * Used by both CLI and Plugin to ensure identical behavior with same settings.
 *
 * Rationale for defaults:
 * - spec.format: JSON matches historical behaviour
 * - spec.keys: SAFE prevents corruption of special characters while maintaining readability
 * - spec.layout: LAYOUT provides tree structure with layout properties
 * - spec.tokens: TOKEN provides platform-neutral token references with $token path and $type
 * - spec.color: HEX matches historical v1 behaviour and maximises human readability
 * - spec.variantDepth: 9999 (no limit) allows full variant combination exploration
 * - spec.details: LAYERED reduces output size by only showing differences from default
 * - spec.collapsePrimitiveWrapper: false — opt-in feature, off by default
 * - spec.invalidVariants: false excludes variants that can't be instantiated
 * - spec.invalidCombinations: true helps designers identify property conflicts
 * - spec.emptyVariants: false reduces output size by excluding semantically empty layered variants
 * - spec.defaultSlotContent: false — opt-in (ADR-050); off by default so unannotated components are unchanged
 *
 * Directories, sources, author, and the split flags carry no default here: the
 * consumer supplies them, and this package has no basis for choosing one.
 */
export const DEFAULT_SETTINGS: ResolvedSettings = {
  spec: {
    format: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
    color: 'HEX',
    variantDepth: 9999,
    details: 'LAYERED',
    collapsePrimitiveWrapper: false,
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
    defaultSlotContent: false,
  },
};
