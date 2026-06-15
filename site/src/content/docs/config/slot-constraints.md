---
title: "Slot Constraints"
description: "Consolidate slot constraints from code-only props into the slot property"
---

Consolidate slot constraints (`anyOf`, `minItems`, `maxItems`) from code-only props into the slot property. In the example below, the `DS Alert / Actions` subcomponent carries its constraints as code-only props named `childrenAnyof`, `childrenMinitems`, and `childrenMaxitems`.

:::tip[Guide]
See the [Slot Constraints](/specs/guides/slot-constraints/) guide as well as the [Figma Slots for Repeating Items](https://nathanacurtis.substack.com/p/figma-slots-for-repeating-items) blog post for how constraint consolidation works.
:::

## Configuration

```yaml
config:
  processing:
    slotConstraints: true  # Consolidate slot constraints from code-only props
```

## Result

**Without** consolidation (`false`) the constraints remain standalone string props alongside the slot:

```json
{
  "props": {
    "children": { "type": "slot" },
    "childrenAnyof": { "type": "string", "examples": ["DS Button"] },
    "childrenMaxitems": { "type": "string", "examples": ["2"] },
    "childrenMinitems": { "type": "string", "examples": ["1"] }
  }
}
```

**With** consolidation (`true`) they collapse into the `children` slot as `anyOf`/`minItems`/`maxItems`, and the standalone props are removed:

```json
{
  "props": {
    "children": {
      "type": "slot",
      "anyOf": ["DS Button"],
      "minItems": 1,
      "maxItems": 2
    }
  }
}
```

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, slot constraint metadata discovered in code-only props is merged into the corresponding slot property. When `false`, slot constraints are not consolidated.

## Path

`config.processing.slotConstraints`
