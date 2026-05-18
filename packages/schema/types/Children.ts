import { PropBinding } from './PropBinding.js';

/**
 * Figma-specific extension on a `SlotBinding`. Carries Figma authoring
 * metadata for the slot — not honored by code consumers.
 */
export interface FigmaSlotBindingExtension {
  /**
   * JSON Pointer — Figma's authoring default for this slot (the content
   * placed inside the slot layer in the design file). Resolves into
   * `Component.slotContentExamples` (component-scoped, e.g.
   * `"#/components/pill/slotContentExamples/composedLabel"`) or into a
   * `Composition` entry or its bundled `slotContent` (system-scoped). All
   * pointer targets yield `anatomy + elements + layout`. Code consumers
   * handle missing slots through component logic and ignore this field.
   */
  default?: string;
  [key: string]: unknown;
}

/** Open extension bag on a `SlotBinding` for platform-specific metadata. */
export interface SlotBindingExtensions {
  'com.figma'?: FigmaSlotBindingExtension;
  [key: string]: unknown;
}

/**
 * A slot binding: a `PropBinding` to a slot prop, with optional platform
 * extensions. Used in `Element.children` for slot-bound containers.
 */
export interface SlotBinding extends PropBinding {
  $extensions?: SlotBindingExtensions;
}

/**
 * Data output for children. Either an array of child element names or a
 * `SlotBinding` when bound to a slot prop. Because `SlotBinding extends
 * PropBinding`, existing `{ $binding }` values still validate.
 */
export type Children = string[] | SlotBinding;
