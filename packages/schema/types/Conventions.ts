import type { LayoutMode } from './Styles.js';

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
 * Which of a platform's components implements the `text` primitive, and how the
 * spec's text concepts reach its props.
 *
 * `props` keys are **concepts**, not `Styles` members: `color` is fed by
 * `Styles.textColor` and `typography` by `Styles.typography`. Fixing the vocabulary
 * per primitive keeps the `Styles` key set out of this schema's validation surface,
 * so renaming a style member does not churn these keys.
 *
 * A prop name is a string belonging to the target library; the schema does not police
 * it. `null` means this platform's component has no prop for the concept, and
 * suppresses the concept's default prop name. Anything not mapped here is passed
 * styling and is routed to `stylesProp`.
 *
 * @since 0.31.0
 */
export interface TextBinding {
  /** The component that means "text" on this platform (e.g. `DsText`, `ds-text`, `Text`). */
  component: string;
  /** Concept-to-prop-name map. Closed: only the concepts below are mappable for text. */
  props?: {
    /** Prop carrying `Styles.textColor`. Defaults to `'color'`; `null` = no such prop. */
    color?: string | null;
    /** Prop carrying `Styles.typography`. No default; `null` = no such prop. */
    typography?: string | null;
  };
  /**
   * Prop that receives everything not mapped above, as passed styling. Overrides the
   * platform-level `stylesProp`. A **name only** — what is placed in it (an `sx` object,
   * a `Modifier` chain) is the generator's decision.
   */
  stylesProp?: string;
}

/**
 * Which of a platform's components implements the `glyph` primitive, and how the
 * spec's glyph concepts reach its props.
 *
 * See {@link TextBinding} for how `props` and `stylesProp` behave — the rules are
 * identical; only the mappable concepts differ.
 *
 * @since 0.31.0
 */
export interface GlyphBinding {
  /** The component that means "glyph" on this platform (e.g. `DsIcon`, `ds-icon`, `Image`). */
  component: string;
  /** Concept-to-prop-name map. Closed: only the concepts below are mappable for a glyph. */
  props?: {
    /** Prop carrying `Styles.fillColor`. Defaults to `'color'`; `null` = no such prop. */
    color?: string | null;
    /** Prop carrying `Element.content` — the glyph name. Defaults to `'content'`; `null` = no such prop. */
    content?: string | null;
  };
  /** Prop that receives unmapped styling. Overrides the platform-level `stylesProp`. */
  stylesProp?: string;
}

/**
 * Which of a platform's components implements the `container` primitive, and how the
 * spec's container concepts reach its props.
 *
 * `component` takes either one component for every layout, or a `LayoutMode`-keyed map
 * when the platform expresses direction by component choice rather than by a prop — a
 * `Row`/`Column`/`Box` trio. The map reuses `LayoutMode` so the two cannot drift and a
 * new layout mode extends the binding automatically. The keyed form is legal only here:
 * `direction` is not among text's or a glyph's mappable concepts, so nothing would
 * select from the map.
 *
 * @since 0.31.0
 */
export interface ContainerBinding {
  /**
   * One component for every layout, or a `LayoutMode`-keyed map selecting per direction
   * (e.g. `{ HORIZONTAL: 'DsRow', VERTICAL: 'DsColumn', NONE: 'DsBox' }`).
   */
  component: string | Partial<Record<LayoutMode, string>>;
  /** Concept-to-prop-name map. Closed: only the concepts below are mappable for a container. */
  props?: {
    /** Prop carrying `Styles.layoutMode`. No default; `null` = no such prop. */
    direction?: string | null;
  };
  /** Prop that receives unmapped styling. Overrides the platform-level `stylesProp`. */
  stylesProp?: string;
}

/**
 * A platform's primitive vocabulary — one optional entry per {@link PrimitiveKind}.
 *
 * Bindings are consulted at emit time. The spec keeps `type: text`; a generator
 * resolves it to this platform's component, so one spec serves every implementation
 * and no binding is ever written into a spec.
 *
 * @since 0.31.0
 */
export interface PrimitiveBindings {
  /** The component that means "text" on this platform. Absent = emit the host text element. */
  text?: TextBinding;
  /** The component that means "glyph" on this platform. Absent = emit the host element. */
  glyph?: GlyphBinding;
  /** The component that means "container" on this platform. Absent = emit the host element. */
  container?: ContainerBinding;
}

/**
 * The spec element types a platform may bind to one of its own components.
 *
 * A closed vocabulary, and a strict subset of `ElementType`: every kind's trigger is
 * the element's own declared `type`, so nothing is inferred and no kind can fail to
 * correspond to something a spec contains. A misspelled or unbindable kind is a
 * validation error rather than a silently-ignored key. Widening the set later is
 * additive.
 *
 * An image is deliberately absent — it is a paint on an element that is already
 * something else, not a kind of node, so it is bound through `images.component`
 * instead (ADR-077).
 *
 * Derived from {@link PrimitiveBindings} rather than written out beside it, so the
 * vocabulary and the block that enforces it cannot disagree.
 *
 * @since 0.31.0
 */
export type PrimitiveKind = keyof PrimitiveBindings;

/**
 * Facts about one platform's library — how it is authored, and what it calls things.
 *
 * One shape for every platform, with every member optional. Two groups of member live
 * in it:
 *
 * - **Encoding** — `naming`, `glyphs`, `codeOnlyProps`, `subcomponents`,
 *   `instanceExamples`, `images.backgroundImage`, `images.sourceProps`,
 *   `slotConstraints`, `inferNumberProps`, `states`. These say how this platform
 *   expresses something the spec models explicitly. A Figma library has no first-class
 *   notion of a subcomponent, so it encodes one in a layer-name pattern.
 * - **Vocabulary** — `primitives`, `stylesProp`, `images.match`, `images.component`.
 *   These say which of this platform's components implements a spec concept.
 *
 * Neither group belongs to a direction or to a platform: a name pattern is decoded when
 * reading a platform's artifacts and applied when writing them, and knowing that
 * `DsText` is the text primitive is required to read React into a spec as much as to
 * write React out of one. The shape is deliberately permissive — nothing stops a code
 * platform declaring `states` — because discriminating by key would type `figma`
 * differently from every other key, which is the special case the platform map removes.
 *
 * Absence of a member means this platform declares no such convention, and the
 * capability it enables does not apply. There is no separate on-switch.
 *
 * @since 0.31.0
 */
export interface PlatformConventions {
  /**
   * Naming convention this platform uses for layer names and component property names —
   * the reversal target for `Settings.spec.keys`. A renderer reconstructs a name by
   * re-formatting the spec key into this convention.
   *
   * NONE declares no convention: the safe key grammar is not evaluated, no
   * `$extensions['com.figma'].name` is emitted for format divergence, and reversal is
   * undefined. Optional; defaults to NONE inside a declared platform entry.
   */
  naming?: 'NONE' | 'SENTENCE' | 'TITLE';
  /** Glyph content assets. Optional; absence means no glyph naming convention and glyphs are not detected. */
  glyphs?: {
    /** Naming pattern identifying glyph assets, using the `{i}` icon-name placeholder (e.g. `"DS Icon Glyph / {i}"`). */
    match: string;
  };
  /** The code-only props container layer. Optional; absence means no such convention and code-only props are not extracted. */
  codeOnlyProps?: {
    /** Literal layer name identifying the container (e.g. `"Code only props"`). */
    match: string;
  };
  /** Subcomponent organization and naming. Optional; absence means no subcomponent convention. */
  subcomponents?: {
    /** Where this platform keeps subcomponents. NESTED = anatomy only (default); PAGE = also the Figma page. */
    scope?: 'NESTED' | 'PAGE';
    /** Naming patterns identifying subcomponents, using `{C}` (component name) and `{S}` (subcomponent name) placeholders. */
    match: string[];
    /** Naming patterns for matched assets this platform excludes. Same `{C}`/`{S}` syntax as `match`. */
    exclude?: string[];
  };
  /** Instance example organization and naming (ADR-050). Optional; absence means no such convention. */
  instanceExamples?: {
    /** Where this platform keeps instance examples. PAGE = current Figma page (default); FILE = all pages. */
    scope?: 'PAGE' | 'FILE';
    /** Naming patterns narrowing which instance frames qualify, using the `{C}` placeholder. Absence = every in-scope instance qualifies. */
    match?: string[];
    /** Naming patterns for frames this platform excludes. Same `{C}` syntax as `match`. */
    exclude?: string[];
    /** Immediate-parent frame or section names a candidate must sit within. Absence = no parent-name filtering. */
    parentNames?: string[];
  };
  /** How this platform expresses images (ADR-063, ADR-077). Optional; absence means no image convention. */
  images?: {
    /**
     * Encoding. This platform expresses images as container fills, emitted as
     * `Styles.backgroundImage`. A container's `backgroundImage` is always passed
     * styling and never a primitive trigger. Optional; defaults to false.
     */
    backgroundImage?: boolean;
    /**
     * Vocabulary. The Figma name of the designated image component (e.g. `"DS Image"`).
     * Requires a non-empty `sourceProps`.
     */
    match?: string;
    /**
     * Vocabulary. The same component's name on this platform (e.g. `"DsImage"`) — the
     * translation target for a `match` declared by whichever platform produced the spec.
     * It is not validated against that name; an unmatched `component` is inert.
     */
    component?: string;
    /**
     * Encoding. Code-only prop names (raw Figma names) carrying image sources. The FIRST
     * entry is the designated component's own source prop — the forwarding target.
     */
    sourceProps?: string[];
  };
  /** This platform authors slot constraints (anyOf, minChildren, maxChildren) as code-only props, to be consolidated into the slot property. Optional; defaults to false. @since 0.14.0 */
  slotConstraints?: boolean;
  /** This platform authors numeric props as Figma `TEXT` props whose default and examples parse as valid numbers, to be emitted as NumberProp rather than StringProp. Optional; defaults to false. */
  inferNumberProps?: boolean;
  /** Concept-keyed map classifying Figma variant props as semantic states. Key = concept name (e.g. `hover`, `disabled`). Optional; absence means all variant props emit as data-* attribute selectors. @since 0.24.0 */
  states?: Record<string, VariantStateEntry>;
  /** Which of this platform's components implements each spec primitive. Optional; absence means the generator's host-element behavior stands. @since 0.31.0 */
  primitives?: PrimitiveBindings;
  /**
   * Baseline prop that receives unmapped styling for every primitive on this platform
   * (e.g. `sx`, `style`, `modifier`). A primitive's own `stylesProp` overrides it.
   * A **name only** — what is placed in it is the generator's decision (Constitution II).
   * Optional; absence means unmapped styling has nowhere to go and is dropped.
   *
   * @since 0.31.0
   */
  stylesProp?: string;
  /**
   * Width in pixels of the container this platform places a component in when the
   * component's root resizes to fill its parent — a rendered Figma frame, a generated
   * story canvas.
   *
   * Applies **only** when the root's `layoutSizingHorizontal` is `FILL`. A root with a
   * fixed or hugging width already states its width and is unaffected, so this can never
   * override what a design declares. The number is the container's width, not the
   * instance's.
   *
   * Optional, and with no default at any level: absence means this platform declares no
   * width, and the rendering tool falls back to its own value.
   *
   * @since 0.31.0
   */
  defaultFillWidth?: number;
}

/**
 * Facts about the libraries a spec was generated from and is generated for, keyed by
 * platform.
 *
 * Every consumer reading the same libraries declares the same values. Differing values
 * produce **incorrect** output rather than merely different output: a mismatched pattern
 * leaves a whole class of assets undetected, a mismatched state entry lands a concept on
 * the wrong prop, and a mismatched primitive binding emits a component the design system
 * does not have.
 *
 * Figma is one platform key among `react`, `web-components`, `swiftui`, and whatever
 * else a workspace targets — the pipeline reads Figma to produce specs and writes specs
 * to produce Figma, so it is a peer rather than a special case. Keys name
 * *implementations*, not platform families: React and Web Components need different
 * vocabularies and get different keys.
 *
 * Absence of `platforms` means no conventions are declared at all; absence of one key
 * means that platform declares none.
 *
 * @since 0.31.0
 */
export interface Conventions {
  /** Platform-keyed conventions. The key is a free-form implementation id (`figma`, `react`, `swiftui`). */
  platforms?: Record<string, PlatformConventions>;
}

/** {@link TextBinding} with its concept defaults applied. @since 0.31.0 */
export interface ResolvedTextBinding {
  component: string;
  props: {
    /** Defaulted to `'color'` when the binding did not state it. `null` = no such prop. */
    color: string | null;
    /** No default; absent when the binding did not state it. */
    typography?: string | null;
  };
  /** The primitive's own `stylesProp`, or the platform baseline it inherits. */
  stylesProp?: string;
}

/** {@link GlyphBinding} with its concept defaults applied. @since 0.31.0 */
export interface ResolvedGlyphBinding {
  component: string;
  props: {
    /** Defaulted to `'color'`. `null` = no such prop. */
    color: string | null;
    /** Defaulted to `'content'`. `null` = no such prop. */
    content: string | null;
  };
  stylesProp?: string;
}

/** {@link ContainerBinding} with its concept defaults applied. @since 0.31.0 */
export interface ResolvedContainerBinding {
  component: string | Partial<Record<LayoutMode, string>>;
  props: {
    /** No default; absent when the binding did not state it. */
    direction?: string | null;
  };
  stylesProp?: string;
}

/** {@link PrimitiveBindings} with each declared binding resolved. @since 0.31.0 */
export interface ResolvedPrimitiveBindings {
  text?: ResolvedTextBinding;
  glyph?: ResolvedGlyphBinding;
  container?: ResolvedContainerBinding;
}

/**
 * One platform's conventions, with defaults applied **inside** any declared block.
 *
 * The blocks themselves stay optional: absence means this platform declares no such
 * convention, and nothing can supply that. What resolution guarantees is that a block,
 * once present, has every defaultable member — `scope`, `backgroundImage`,
 * `sourceProps`, a binding's concept prop names — so consumers need no null checks
 * within it.
 *
 * `stylesProp` does not appear here: the platform baseline is folded into each declared
 * primitive during resolution, so a consumer reads one level rather than two.
 *
 * **A resolver produces one of these for any platform it is asked about, declared or
 * not.** `naming`, `slotConstraints` and `inferNumberProps` are required here for that
 * reason: a consumer reading `figma` gets `NONE` whether or not a `figma.yaml` exists,
 * which is the guarantee ADR-071 gave when `figma` was a required key (ADR-073).
 *
 * @since 0.31.0
 */
export interface ResolvedPlatformConventions {
  /** Naming convention this platform uses. Defaulted to NONE inside a declared entry. */
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
  /** How this platform expresses images. Optional; absence means no image convention. */
  images?: {
    backgroundImage: boolean;
    match?: string;
    component?: string;
    sourceProps: string[];
  };
  /** Slot constraints are authored as code-only props. */
  slotConstraints: boolean;
  /** Numeric props are authored as Figma `TEXT` props. */
  inferNumberProps: boolean;
  /** Concept-keyed map classifying Figma variant props as semantic states. Optional; absence means no state convention. */
  states?: Record<string, VariantStateEntry>;
  /** Primitive bindings, each carrying its resolved concept prop names and `stylesProp`. Optional; absence means no primitive vocabulary. */
  primitives?: ResolvedPrimitiveBindings;
  /** Width of the container a fill-width root is placed in. Optional; no default — absence means the tool falls back to its own value. */
  defaultFillWidth?: number;
}

/**
 * Fully-resolved conventions, keyed by platform.
 *
 * `platforms` stays optional, and so does every key within it: absence is the statement
 * that nothing is declared, which no default can supply.
 *
 * @since 0.31.0
 */
export interface ResolvedConventions {
  platforms?: Record<string, ResolvedPlatformConventions>;
}

/**
 * The conventions a spec records in its metadata: the **one** platform entry that
 * produced it.
 *
 * Structurally identical to {@link ResolvedConventions}, and constrained to a single
 * key, but absence means something different here. In a workspace's conventions, a
 * missing platform declares no conventions for that platform. In a spec's metadata, a
 * missing platform did not produce this spec — so recording every platform a workspace
 * happens to configure would both leak vocabulary the spec has no bearing on and make a
 * drift check fire on unrelated changes.
 *
 * @since 0.31.0
 */
export interface MetadataConventions {
  /** Exactly one entry: the platform this spec was produced from. */
  platforms: Record<string, ResolvedPlatformConventions>;
}

/**
 * Default Conventions
 *
 * A workspace that declares nothing.
 *
 * This constant carries no members, because a platform-keyed map has no fixed key to
 * populate. That does **not** mean the defaults are gone: `naming`, `slotConstraints`
 * and `inferNumberProps` are still defaulted, by whoever resolves a platform, and
 * {@link ResolvedPlatformConventions} requires them for exactly that reason.
 *
 * What no default can supply is a convention *block* — `glyphs`, `subcomponents`,
 * `images`. Their absence is a statement about the library, and inventing one would
 * fabricate a fact nobody declared.
 */
export const DEFAULT_CONVENTIONS: ResolvedConventions = {};
