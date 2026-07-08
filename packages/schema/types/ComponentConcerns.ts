import { Anatomy } from './Anatomy.js';
import { Props } from './Props.js';
import { Variant, Variants } from './Variant.js';
import { Metadata } from './Metadata.js';
import { PropConfigurations } from './PropConfigurations.js';
import { InstanceExamples } from './InstanceExample.js';
import { SlotContent } from './SlotContent.js';

/**
 * The `api` concern subset of a `Component` — title, anatomy, and props, the
 * fields needed to describe a component's public surface. Produced by
 * `specs-cli`'s `--split-concerns` output (`api.yaml` files).
 * @since 0.28.0
 */
export type ComponentApi = {
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
   * Metadata associated with the component.
   */
  metadata?: Metadata;

  /**
   * The api concern of this component's subcomponents, keyed by name.
   */
  subcomponents?: Record<string, Omit<ComponentApi, 'metadata' | 'subcomponents'>>;
};

/**
 * The `variants` concern subset of a `Component` — default variant, variants,
 * and invalid variant combinations. Produced by `specs-cli`'s
 * `--split-concerns` output (`variants.yaml` files).
 * @since 0.28.0
 */
export type ComponentVariants = {
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
   * The variants concern of this component's subcomponents, keyed by name.
   */
  subcomponents?: Record<string, Omit<ComponentVariants, 'metadata' | 'subcomponents'>>;
};

/**
 * The `examples` concern subset of a `Component` — instance examples and
 * slot-content examples. Produced by `specs-cli`'s `--split-concerns` output
 * (`examples.yaml` files), omitted for components with no example data.
 * @since 0.28.0
 */
export type ComponentExamples = {
  /**
   * Metadata associated with the component.
   */
  metadata?: Metadata;

  /**
   * Named slot-content examples for this component.
   */
  slotContentExamples?: Record<string, SlotContent>;

  /**
   * Named instance examples (documented usages) for this component.
   */
  instanceExamples?: InstanceExamples;

  /**
   * The examples concern of this component's subcomponents, keyed by name.
   */
  subcomponents?: Record<string, Omit<ComponentExamples, 'metadata' | 'subcomponents'>>;
};
