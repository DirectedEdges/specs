---
title: PropConfigurations
order: 8
description: Prop value maps for variant activation and invalid combinations
---

# PropConfigurations

A flat map of prop names to the values they must hold for a condition to apply.

```ts
type PropConfigurations = Record<string, string | number | boolean>;
```

## Usage

PropConfigurations appear in two places:

- **Variant `configuration`** — declares which prop combination activates a [variant](variants.md#variant). When all listed props match their specified values, the variant's overrides are applied.
- **`invalidVariantCombinations`** — an array on the [Component](component.md) root that declares prop combinations which should never occur together.

## Example

```json
{ "size": "large", "disabled": true }
```

This configuration matches when the `size` prop equals `"large"` **and** the `disabled` prop is `true`.
