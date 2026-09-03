import type { PropConfigurations } from './PropConfigurations.js';

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
 * The spec element types that can be promoted to a design system component.
 *
 * A closed vocabulary, and a strict subset of `ElementType`: every kind's trigger is
 * the element's own declared `type`, so nothing is inferred and no kind can fail to
 * correspond to something a spec contains. A misspelled kind is a validation error
 * rather than a silently-ignored key. Widening the set later is additive.
 *
 * An image is deliberately absent — it is a paint on an element that is already
 * something else, not a kind of node, so it is bound through `images.component`
 * instead (ADR-077).
 *
 * @since 0.31.0
 */
export type PrimitiveKind = 'text' | 'glyph' | 'container';

/**
 * One rule turning something a captured layer carries into props on the component it
 * promotes to.
 *
 * `source` names what is read. The honoured set is closed per {@link PrimitiveKind} and
 * is documented rather than enumerated in the schema, so that the validation surface does
 * not track the `Styles` key set and renaming a style member does not churn a conventions
 * file:
 *
 * - `text` — `typography`, `typography.fontSize`, `typography.fontFamily`,
 *   `typography.fontStyle`, `textColor`, `content`
 * - `glyph` — `width`, `height`, `fillColor`, `content`
 * - `container` — `layoutMode`
 *
 * The dotted typography sources address inside the `Typography` composite.
 * `Styles.typography` is `TokenReference | Typography`, so a layer wearing a text style
 * carries the token and a layer styled ad hoc carries the composite: `typography` and the
 * `typography.*` sources can never both resolve, and declaring both is how one entry
 * serves either authoring style.
 *
 * Exactly one of `prop` and `values` is given. A source outside the honoured set, or one
 * the element does not carry, simply does not resolve — its value stays in `styles` and
 * reaches output as passed styling.
 *
 * @since 0.31.0
 */
export interface PrimitiveRule {
  /** What is read from the captured layer — a `Styles` member, a dotted path into `typography`, or `content`. */
  source: string;
  /** The prop this source's value is written to, as-is. Mutually exclusive with `values`. */
  prop?: string;
  /**
   * Literal lookup from what the source carries to the props it writes.
   *
   * A key is a full token path (`"Color/Critical"`) or a raw scalar (`16`) — never a
   * fragment, and never matched partially. The value is the props that key produces, so
   * one source may write several props at once, and a source may reach a prop whose
   * meaning differs from its own (a fill colour producing an intent enum).
   *
   * Mutually exclusive with `prop`.
   */
  values?: Record<string, PropConfigurations>;
}

/**
 * One component a captured primitive layer can be promoted to, and how its styles become
 * that component's props.
 *
 * Promotion runs during capture, over composed example content only (ADR-074). Several
 * entries may share a `kind`: a design system with a text, a heading and a body component
 * is three entries, and selection between them is by score — how many of an entry's rules
 * resolve against the element. At least one rule must resolve, so `kind` alone never
 * promotes.
 *
 * The target need not itself be a primitive. `kind` describes the layer shape a promotion
 * starts *from*, not the component it lands on: a component with its own internal anatomy
 * is a legitimate target for a single drawn layer.
 *
 * @since 0.31.0
 */
export interface PrimitiveEntry {
  /** The primitive kind this component can be promoted from. */
  kind: PrimitiveKind;
  /**
   * The rules turning the layer's styles into this component's props, in precedence
   * order. When two rules write the same prop, the first that resolves wins.
   */
  map: PrimitiveRule[];
}

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
 * - **Vocabulary** — `stylesProp`, `images.match`, `images.component`. These say which of
 *   this platform's components implements a spec concept, and how it is authored.
 *
 * Neither group belongs to a direction or to a platform: a name pattern is decoded when
 * reading a platform's artifacts and applied when writing them, and knowing which prop
 * carries passed styling is required to read a platform into a spec as much as to write
 * it out. The shape is deliberately permissive — nothing stops a code
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
  /**
   * Prop that receives styling no promotion mapped, for every promoted component on this
   * platform (e.g. `sx`, `style`, `modifier`). A **name only** — what is placed in it is
   * the generator's decision (Constitution II).
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
  /**
   * Component-keyed promotion entries, keyed by the design system's own component name.
   *
   * Platform-neutral, and deliberately not under `platforms`: a component's props are the
   * same whichever platform renders it, so the table is stated once. Optional; absence
   * means no component is described and nothing is promoted.
   *
   * @since 0.31.0
   */
  primitives?: Record<string, PrimitiveEntry>;
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
  /** Prop that receives styling no promotion mapped. Optional; absence means unmapped styling is dropped. */
  stylesProp?: string;
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
  /** Component-keyed promotion entries. Optional; absence means nothing is promoted. @since 0.31.0 */
  primitives?: Record<string, PrimitiveEntry>;
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
