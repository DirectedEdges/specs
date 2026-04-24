---
title: "Infer Number Props"
description: "Automatically emit numeric code-only props as NumberProp instead of StringProp"
---

When enabled, TEXT code-only props whose default and all examples parse as valid numbers (no leading zeros) are emitted as `NumberProp` instead of `StringProp`.

:::tip[Guide]
See [Number Inference](/specs/guides/number-inference/) for how inference works and when to use it.
:::

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, text code-only props with purely numeric values are inferred as number props. When `false`, all text code-only props remain string props.

## Path

`config.processing.inferNumberProps`

### Example

```yaml
config:
  processing:
    inferNumberProps: true  # Infer numeric code-only props as NumberProp
```
