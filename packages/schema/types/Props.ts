import { ImageProp } from "./Image.js";

/**
 * Represents properties of a component.
 */
export type Props = Record<string, AnyProp>;

/**
 * Union of all supported property types
 */
export type AnyProp = BooleanProp | StringProp | EnumProp | SlotProp | NumberProp | ImageProp;

/**
 * Provenance metadata for props extracted from a Figma code-only container layer.
 * Code-only props are non-visual properties embedded in a hidden container layer
 * within the Figma component, used to encode accessibility labels, semantic
 * heading levels, ARIA roles, and similar concerns.
 * @since 0.14.0
 */
export interface FigmaCodeOnlySource {
  /** Discriminator identifying this prop as originating from a code-only container. */
  kind: 'codeOnlyProp';
  /** Sub-layer name within the code-only container tree corresponding to this prop. */
  layer: string;
  /** For enum code-only props: the component name of the nested instance whose variants define the enum values. */
  instanceOf?: string;
}

/**
 * DTCG §5.2.3 Figma-specific metadata for a prop definition.
 * @since 0.14.0
 */
export interface FigmaPropExtension {
  /** Figma-native property type (e.g., BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT). */
  type?: string;
  /** Provenance metadata — present only for props extracted from a code-only container layer. @since 0.14.0 */
  source?: FigmaCodeOnlySource;
  /**
   * The Figma component-property name (ADR-066). Recorded when the name fell outside
   * the safe key grammar, or when it was already written in the destination format and
   * passed through unformatted — in which case reversal is identity, not re-derivation.
   *
   * Both triggers require `format.figmaKeys` to be other than NONE. Under NONE no
   * source convention is declared, so divergence is not evaluated and this field is
   * absent however the key was derived.
   * @since 0.30.0
   */
  name?: string;
  /** Additional Figma-specific metadata passes through without type enforcement. */
  [key: string]: unknown;
}

/**
 * DTCG §5.2.3 platform-specific extensions for prop definitions.
 * Each property is a reverse-domain key whose value is a platform extension type.
 * @since 0.14.0
 */
export interface PropExtensions {
  /** Figma extraction provenance for this prop. */
  'com.figma'?: FigmaPropExtension;
  [key: string]: unknown;
}

/**
 * Boolean property definition
 */
export interface BooleanProp {
  type: 'boolean';
  default: boolean;
  /** DTCG §5.2.3 platform-specific extensions. @since 0.14.0 */
  $extensions?: PropExtensions;
}

/**
 * String property definition (text content, glyph/instance swap, or other string-valued props)
 */
export interface StringProp {
  type: 'string';
  /** @deprecated Use `examples` for demo content */
  default?: string | null;
  /**
   * Whether this prop accepts a null value.
   * Absent means `true` — a string prop has an open value set, so null is
   * accepted unless `false` explicitly asserts otherwise. @since 0.29.0
   */
  nullable?: boolean;
  /** Sample values demonstrating typical content for this prop */
  examples?: string[];
  /** DTCG §5.2.3 platform-specific extensions. @since 0.14.0 */
  $extensions?: PropExtensions;
}

/**
 * Enumeration property definition
 */
export interface EnumProp {
  type: 'string';
  default: string;
  enum: string[];
  /**
   * Whether this prop accepts a null value.
   * Absent means `false` — `enum` enumerates every accepted value, and null is
   * not among them unless `true` explicitly admits it. @since 0.29.0
   */
  nullable?: boolean;
  /** DTCG §5.2.3 platform-specific extensions. @since 0.14.0 */
  $extensions?: PropExtensions;
}

/**
 * Number property definition (numeric-valued props inferred from TEXT code-only props)
 */
export interface NumberProp {
  type: 'number';
  /** Default numeric value. Optional — omitted when no meaningful default exists. */
  default?: number;
  /**
   * Whether this prop accepts a null value.
   * Absent means `true` — a number prop has an open value set, so null is
   * accepted unless `false` explicitly asserts otherwise. @since 0.29.0
   */
  nullable?: boolean;
  /** Sample numeric values demonstrating typical content for this prop */
  examples?: number[];
  /** DTCG §5.2.3 platform-specific extensions. @since 0.30.0 */
  $extensions?: PropExtensions;
}

/**
 * Slot/nested content property definition
 */
export interface SlotProp {
  type: 'slot';
  /** Default slot content. Optional — omitted when no meaningful default exists. */
  default?: string | null;
  /**
   * Whether this slot prop accepts a null value.
   * Absent means `true` — a slot has an open content set and may be empty,
   * unless `false` explicitly asserts otherwise. @since 0.29.0
   */
  nullable?: boolean;
  /** Minimum number of children this slot accepts. @since 0.25.0 */
  minChildren?: number;
  /** Maximum number of children this slot accepts. @since 0.25.0 */
  maxChildren?: number;
  /** Component type names permitted in this slot. @since 0.14.0 */
  anyOf?: string[];
  /** DTCG §5.2.3 platform-specific extensions. @since 0.14.0 */
  $extensions?: PropExtensions;
}
