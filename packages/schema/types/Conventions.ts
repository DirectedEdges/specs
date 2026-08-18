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
 * Facts about the Figma library a spec was generated from.
 *
 * Every consumer reading the same library declares the same values. Differing
 * values produce **incorrect** output rather than merely different output: a
 * mismatched pattern leaves a whole class of assets undetected, and a mismatched
 * state entry lands a concept on the wrong prop.
 *
 * Absence of a member means the library declares no such convention, and the
 * capability it enables does not apply. There is no separate on-switch.
 *
 * @since 0.31.0
 */
export interface Conventions {
  figma: {
    /**
     * Naming convention the Figma file uses for layer names and component property
     * names — the reversal target for `Settings.spec.keys`. A renderer reconstructs
     * a Figma name by re-formatting the spec key into this convention.
     *
     * NONE declares no convention: the safe key grammar is not evaluated, no
     * `$extensions['com.figma'].name` is emitted for format divergence, and reversal
     * is undefined. Optional; defaults to NONE.
     */
    naming?: 'NONE' | 'SENTENCE' | 'TITLE';
    /** Glyph content assets. Optional; absence means the library has no glyph naming convention and glyphs are not detected. */
    glyphs?: {
      /** Naming pattern identifying glyph assets, using the `{i}` icon-name placeholder (e.g. `"DS Icon Glyph / {i}"`). */
      match: string;
    };
    /** The code-only props container layer. Optional; absence means the library has no such convention and code-only props are not extracted. */
    codeOnlyProps?: {
      /** Literal layer name identifying the container (e.g. `"Code only props"`). */
      match: string;
    };
    /** Subcomponent organization and naming. Optional; absence means the library has no subcomponent convention. */
    subcomponents?: {
      /** Where the library keeps subcomponents. NESTED = anatomy only (default); PAGE = also the Figma page. */
      scope?: 'NESTED' | 'PAGE';
      /** Naming patterns identifying subcomponents, using `{C}` (component name) and `{S}` (subcomponent name) placeholders. */
      match: string[];
      /** Naming patterns for matched assets the library excludes. Same `{C}`/`{S}` syntax as `match`. */
      exclude?: string[];
    };
    /** Instance example organization and naming (ADR-050). Optional; absence means the library has no such convention. */
    instanceExamples?: {
      /** Where the library keeps instance examples. PAGE = current Figma page (default); FILE = all pages. */
      scope?: 'PAGE' | 'FILE';
      /** Naming patterns narrowing which instance frames qualify, using the `{C}` placeholder. Absence = every in-scope instance qualifies. */
      match?: string[];
      /** Naming patterns for frames the library excludes. Same `{C}` syntax as `match`. */
      exclude?: string[];
      /** Immediate-parent frame or section names a candidate must sit within. Absence = no parent-name filtering. */
      parentNames?: string[];
    };
    /** How the library expresses images (ADR-063). Optional; absence means the library has no image convention. */
    images?: {
      /** The library expresses images as container fills, emitted as `Styles.backgroundImage`. Optional; defaults to false. */
      backgroundImage?: boolean;
      /** Name of the library's designated image component (e.g. `"DS Image"`). Requires a non-empty `sourceProps`. */
      match?: string;
      /** Code-only prop names (raw Figma names) carrying image sources. The FIRST entry is the designated component's own source prop — the forwarding target. */
      sourceProps?: string[];
    };
    /** The library authors slot constraints (anyOf, minChildren, maxChildren) as code-only props, to be consolidated into the slot property. Optional; defaults to false. @since 0.14.0 */
    slotConstraints?: boolean;
    /** The library authors numeric props as Figma `TEXT` props whose default and examples parse as valid numbers, to be emitted as NumberProp rather than StringProp. Optional; defaults to false. */
    inferNumberProps?: boolean;
    /** Concept-keyed map classifying Figma variant props as semantic states. Key = concept name (e.g. `hover`, `disabled`). Optional; absence means all variant props emit as data-* attribute selectors. @since 0.24.0 */
    states?: Record<string, VariantStateEntry>;
  };
}

/**
 * Fully-resolved conventions, with defaults applied **inside** any declared block.
 *
 * The blocks themselves stay optional: absence means the library declares no such
 * convention, and nothing can supply that. What resolution guarantees is that a
 * block, once present, has every defaultable member — `scope`, `backgroundImage`,
 * `sourceProps` — so consumers need no null checks within it.
 *
 * @since 0.31.0
 */
export interface ResolvedConventions {
  figma: {
    /** Naming convention the Figma file uses. */
    naming: 'NONE' | 'SENTENCE' | 'TITLE';
    /** Glyph content assets. Optional; absence means no glyph convention. */
    glyphs?: {
      match: string;
    };
    /** The code-only props container layer. Optional; absence means no such convention. */
    codeOnlyProps?: {
      match: string;
    };
    /** Subcomponent organization and naming. Optional; absence means no subcomponent convention. */
    subcomponents?: {
      scope: 'NESTED' | 'PAGE';
      match: string[];
      exclude?: string[];
    };
    /** Instance example organization and naming. Optional; absence means no such convention. */
    instanceExamples?: {
      scope: 'PAGE' | 'FILE';
      match?: string[];
      exclude?: string[];
      parentNames?: string[];
    };
    /** How the library expresses images. Optional; absence means no image convention. */
    images?: {
      backgroundImage: boolean;
      match?: string;
      sourceProps: string[];
    };
    /** Slot constraints are authored as code-only props. */
    slotConstraints: boolean;
    /** Numeric props are authored as Figma `TEXT` props. */
    inferNumberProps: boolean;
    /** Concept-keyed map classifying Figma variant props as semantic states. Optional; absence means no state convention. */
    states?: Record<string, VariantStateEntry>;
  };
}
