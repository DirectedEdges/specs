import { Anatomy } from "./Anatomy.js";
import { Props } from "./Props.js";
import { Subcomponents } from "./Subcomponent.js";
import { Variant, Variants } from "./Variant.js";
import { Metadata } from "./Metadata.js";
import { PropConfigurations } from "./PropConfigurations.js";
import { InstanceExamples } from "./InstanceExample.js";
import { SlotContent } from "./SlotContent.js";

/**
 * Represents a component specification in the Specs format.
 *
 * This is the top-level structure produced by the specs-from-figma transformer
 * and validated against the Specs JSON schema.
 */
export type Component = {
  /**
   * The title of the component.
   */
  title: string;

  /**
   * The anatomy of the component.
   */
  anatomy: Anatomy;

  /**
   * The properties of the component.
   */
  props?: Props;

  /**
   * The subcomponents of the component.
   */
  subcomponents?: Subcomponents;

  /**
   * The default variant of the component.
   */
  default: Variant;

  /**
   * The variants of the component.
   */
  variants?: Variants;

  /**
   * Invalid variant combinations for the component.
   */
  invalidVariantCombinations?: PropConfigurations[];

  /**
   * Metadata associated with the component.
   */
  metadata?: Metadata;

  /**
   * Named instance examples (documented usages) for this component.
   * Each entry is a pre-configured scalar-prop usage of the whole component.
   * Slot fills live on `Element.propConfigurations`, not here.
   */
  instanceExamples?: InstanceExamples;

  /**
   * Named slot-content examples for this component (ADR-047). Each entry is a
   * `SlotContent` — a flat `anatomy + elements + layout` triplet usable as a
   * named slot fill. Entries are referenced via `SlotContentRef` (e.g.
   * `"#/components/pill/slotContentExamples/composedLabel"`) from
   * `SlotBinding.$extensions['com.figma'].default` (Figma authoring defaults)
   * and from `Element.propConfigurations` slot-prop entries (ADR-049).
   *
   * specs-from-figma de-duplicates entries by structural equality across
   * variants and slots — identical fills share one entry.
   */
  slotContentExamples?: Record<string, SlotContent>;
};
