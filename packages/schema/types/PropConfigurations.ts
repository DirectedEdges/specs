import { PropBinding } from "./PropBinding.js";
import { SlotContentRef } from "./SlotContentRef.js";

/**
 * Per-element prop configurations (ADR-049).
 *
 * - Scalar values (`string | number | boolean`) — static prop values.
 * - `PropBinding` — pass-through binding to a parent prop, e.g.
 *   `{ $binding: "#/props/label" }`. Forwards a parent prop value into a
 *   nested instance's prop.
 * - `SlotContentRef` — reference to a named slot fill, e.g.
 *   `{ $slotContent: "#/components/pill/slotContentExamples/composedLabel" }`.
 *   Used under a slot-prop key to fill a nested instance's slot with named
 *   content.
 *
 * `InstanceExample.propConfigurations` accepts `SlotContentRef` but not
 * `PropBinding` — documented configurations are not live bindings.
 */
export type PropConfigurations = Record<
  string,
  string | number | boolean | PropBinding | SlotContentRef
>;
