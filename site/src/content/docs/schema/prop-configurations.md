---
title: "PropConfigurations"
description: "Prop value maps for variant activation and invalid combinations"
---

A flat map of prop names to the values they must hold for a condition to apply, or to the references and bindings that resolve their values at the call site.

```ts
type PropConfigurations = Record<
  string,
  string | number | boolean | PropBinding | CompositionRef
>;
```

| Arm | Where it applies | Description |
|-----|------------------|-------------|
| `string \| number \| boolean` | Anywhere `PropConfigurations` is used | Static scalar prop value |
| `PropBinding` (`{ $binding }`) | `Element.propConfigurations` only | Pass-through binding to a parent prop |
| `CompositionRef` (`{ $composition }`) | `Element.propConfigurations` only, under a slot-prop key | JSON Pointer to a named `Composition` (in `Component.slotContent` or in an external composition file) used to fill a nested instance's slot |

`InstanceExample.propConfigurations` is scalar-only by design — `PropBinding` and `CompositionRef` are not permitted there.

## Usage

PropConfigurations appear in four places:

- **Variant `configuration`** — declares which prop combination activates a [variant](/specs/schema/variants.md/#variant). When all listed props match their specified values, the variant's overrides are applied.
- **`invalidVariantCombinations`** — an array on the [Component](/specs/schema/component/) root that declares prop combinations which should never occur together.
- **`Element.propConfigurations`** — sets prop values on a nested instance element; accepts the full union (scalars, `PropBinding`, `CompositionRef`).
- **`InstanceExample.propConfigurations`** — documents a complete scalar-prop configuration; scalars only.

## Example

```yaml
size: large
disabled: true
```

This configuration matches when the `size` prop equals `"large"` **and** the `disabled` prop is `true`.
