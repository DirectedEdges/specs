import { Children } from "./Children.js";
import { Styles } from "./Styles.js";
import { PropConfigurations } from "./PropConfigurations.js";
import { PropBinding } from "./PropBinding.js";
import { SubcomponentRef } from "./Anatomy.js";

/**
 * Represents elements within a component.
 */
export type Elements = Record<string, Element>;

/**
 * Represents a single element within a component.
 */
export type Element = {
  children?: Children;
  parent?: string | null;
  styles?: Styles;
  propConfigurations?: PropConfigurations;
  /** The component or component set name, a prop binding for instance swaps, or a subcomponent reference. */
  instanceOf?: string | PropBinding | SubcomponentRef;
  /** The content for content-bearing elements: text string for text elements, glyph name for glyph elements, or a PropBinding reference. */
  content?: string | PropBinding;
  /** Platform extensions; `com.figma` carries capture provenance. @since 0.31.0 */
  $extensions?: ElementExtensions;
};

/**
 * Figma capture provenance for an element.
 *
 * Written when a primitive layer in composed example content is promoted to an instance
 * of a design system component (ADR-074). Both members are optional and independent: a
 * promotion that consumed no styles records the flag alone.
 *
 * @since 0.31.0
 */
export interface FigmaElementExtension {
  /**
   * This element was a primitive layer promoted to a component instance, rather than an
   * instance the designer placed.
   *
   * Declared rather than inferred from the presence of `styles`: a promotion may consume
   * nothing — a glyph whose name maps to a prop while no style rule resolves — and an
   * absent residue would then read as a placed instance.
   */
  promotedPrimitive?: boolean;
  /**
   * The styles the promotion consumed, recorded verbatim as captured.
   *
   * A prop value cannot be inverted back to the style that produced it, because two
   * sources may map to one value. Recording the original is what lets a promoted layer be
   * rendered back as a layer rather than as an instance.
   */
  styles?: Styles;
}

/**
 * DTCG-style platform extensions for an element.
 *
 * @since 0.31.0
 */
export interface ElementExtensions {
  'com.figma'?: FigmaElementExtension;
}

/**
 * Element types derived from Figma node analysis
 */
export type ElementType =
  | 'text'
  | 'glyph'
  | 'vector'
  | 'container'
  | 'slot'
  | 'instance'
  | 'line'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'star';
