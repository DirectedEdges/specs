---
title: "Slot Constraints"
description: "Consolidate slot constraints from code-only props into the slot property"
---

Consolidate slot constraints (`anyOf`, `minItems`, `maxItems`) from code-only props into the slot property.

:::tip[Guide]
See the [Slot Constraints](/specs/guides/slot-constraints/) guide as well as the [Figma Slots for Repeating Items](https://nathanacurtis.substack.com/p/figma-slots-for-repeating-items) blog post for how constraint consolidation works.
:::

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, slot constraint metadata discovered in code-only props is merged into the corresponding slot property. When `false`, slot constraints are not consolidated.

## Path

`config.processing.slotConstraints`

### Example

```yaml
config:
  processing:
    slotConstraints: true  # Consolidate slot constraints from code-only props
```
