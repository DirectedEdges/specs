import { PropBinding } from './PropBinding.js';
import { SlotContentRef } from './SlotContentRef.js';

/**
 * A slot binding: a `PropBinding` to a slot prop, optionally carrying authored
 * example fills for the slot in `examples`.
 *
 * Each `examples[i]` is a `SlotContentRef` (ADR-046) pointing into
 * `Component.slotContentExamples` (component-scoped, e.g.
 * `"#/components/pill/slotContentExamples/composedLabel"`) or into a
 * `Composition` entry or its bundled `slotContent` (system-scoped). All
 * pointer targets yield `anatomy + elements + layout`.
 *
 * Emitters currently write at most one entry — `examples[0]` is Figma's
 * authoring default for the slot layer in the design file. The array shape
 * leaves room for additional authored example fills without further schema
 * change.
 *
 * `examples` is non-contractual reference material — parallel to
 * `StringProp.examples` and `NumberProp.examples`. Code consumers handle
 * missing slots through component logic and need not honor it.
 */
export interface SlotBinding extends PropBinding {
  examples?: SlotContentRef[];
}

/**
 * Data output for children. Either an array of child element names or a
 * `SlotBinding` when bound to a slot prop. Because `SlotBinding extends
 * PropBinding`, existing `{ $binding }` values still validate.
 */
export type Children = string[] | SlotBinding;
