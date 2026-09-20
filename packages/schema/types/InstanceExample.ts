import { SlotContentRef } from "./SlotContentRef.js";

/**
 * A pre-configured usage of a whole component (ADR-048).
 *
 * Scalar props are set directly; slot props are filled via `SlotContentRef`
 * pointing into the component's `slotContentExamples` registry. Slot fills
 * encountered inside an example instance are contributed to that shared
 * registry (deduplicated against existing entries), so an `InstanceExample`
 * holds no slot content of its own. `PropBinding` is not accepted — an
 * `InstanceExample` is a documented configuration for human readers and
 * tooling, not a live data flow.
 */
export type InstanceExample = {
  /** Human-readable label for this example. */
  title?: string;

  /**
   * Prop values for this example. Scalar types for scalar props;
   * `SlotContentRef` (into `Component.slotContentExamples`) for slot props;
   * `null` when the prop is unset in this example (ADR-080).
   * `PropBinding` is not permitted here.
   */
  propConfigurations?: Record<string, string | number | boolean | null | SlotContentRef>;
};

/**
 * Named record of `InstanceExample` entries on `Component.instanceExamples`.
 * Keys are plain identifier strings (`^[a-zA-Z0-9_-]+$`).
 */
export type InstanceExamples = Record<string, InstanceExample>;
