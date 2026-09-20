/**
 * Type-level tests for `PropConfigurationValue`'s `null` arm (ADR-080).
 *
 * `null` means the prop is unset in this configuration — a value, not an
 * absence. These files are intentionally never executed; they are compiled
 * with tsc to assert the type shape is correct.
 */
import type {
  PropConfigurationValue,
  PropConfigurations,
  NestedPropConfiguration,
  Element,
  InstanceExample,
  Variant,
} from '../types/index.js';

// ─── null is a PropConfigurationValue ───────────────────────────────────────

const unset: PropConfigurationValue = null;
const scalar: PropConfigurationValue = 'Surface';
const flag: PropConfigurationValue = false;
const count: PropConfigurationValue = 3;
const bound: PropConfigurationValue = { $binding: '#/props/label' };
const filled: PropConfigurationValue = {
  $slotContent: '#/components/card/slotContentExamples/cardHeader',
};

// A value union member that was never valid stays invalid.
// @ts-expect-error: undefined is not a PropConfigurationValue — an absent key is
// how a configuration says nothing, and it is not the same as an explicit null.
const absent: PropConfigurationValue = undefined;

// ─── null under a prop key, in every position PropConfigurations occupies ───

// A configuration that leaves a nullable slot unset.
const unsetSlot: PropConfigurations = { header: null };

// The same prop, set.
const setSlot: PropConfigurations = {
  header: { $slotContent: '#/components/card/slotContentExamples/cardHeader' },
};

// Element — a nested instance.
const element: Element = {
  instanceOf: 'card',
  propConfigurations: { header: null, bordered: 'Solid' },
};

// InstanceExample — a whole-component example.
const example: InstanceExample = {
  title: 'Card without a header',
  propConfigurations: { header: null },
};

// Variant.configuration.
const variant: Variant = {
  configuration: { header: null },
};

// NestedPropConfiguration — a path-addressed descendant ($nested).
const nested: NestedPropConfiguration = {
  path: ['contentContainer', 'badge'],
  children: null,
};

const withNested: PropConfigurations = { $nested: [nested] };

// ─── Layering: absent and null are distinct ─────────────────────────────────

// A base that binds the slot.
const base: PropConfigurations = {
  header: { $slotContent: '#/components/card/slotContentExamples/cardHeader' },
};

// A layer that unsets it — an explicit value, which overrides.
const overridesWithUnset: PropConfigurations = { header: null };

// A layer that omits it — inherits whatever the base carried.
const inherits: PropConfigurations = { bordered: 'Solid' };

export type {};
