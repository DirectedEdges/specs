import { ElementType } from "./Element.js";

/**
 * Represents the anatomy of a component.
 */
export type Anatomy = Record<string, AnatomyElement>;

/**
 * Reference to an external element type definition.
 * Used when element types are linked to a foundations schema
 * rather than using plain string identifiers.
 */
export type ElementTypeRef = {
  /** URI reference to an external element type definition (e.g. "foundations#/definitions/glyph"). */
  $ref: string;
};

/**
 * Reference to a subcomponent definition within the same spec.
 * Used when an anatomy item or element is an instance of a sibling subcomponent.
 * @since 0.15.0
 */
export type SubcomponentRef = {
  /** JSON Pointer to a subcomponent (e.g. "#/subcomponents/formLabel"). */
  $ref: string;
};

/**
 * Represents an element within the anatomy of a component.
 */
export type AnatomyElement = {
  /**
   * The mapped element type. Either a plain string identifier (e.g. "glyph", "text")
   * or an `ElementTypeRef` object referencing an external definition.
   */
  type: ElementType | ElementTypeRef;
  detectedIn?: string;
  /** The component or component set name that this instance element references, or a subcomponent reference. */
  instanceOf?: string | SubcomponentRef;
  /**
   * DTCG §5.2.3 platform-specific extensions. Open-shape passthrough —
   * processing packages (e.g. `specs-from-figma`) may attach reverse-domain
   * keys (such as `'com.figma'`) carrying provenance metadata. The schema
   * does not constrain the inner structure.
   * @since 0.22.0
   */
  $extensions?: Record<string, unknown>;
};
