---
title: "Infer Number Props"
description: "Automatically emit numeric code-only props as NumberProp instead of StringProp"
---

When enabled, TEXT code-only props whose default and all examples parse as valid numbers (no leading zeros) are emitted as `NumberProp` instead of `StringProp`. The example below uses a Text Area that exposes [code-only props](/specs/settings/code-only-props/) whose values are purely numeric strings — `minRows` = `"2"`, `maxRows` = `"6"`, `minLength` = `"3"`.

:::tip[Guide]
See [Number Inference](/specs/guides/number-inference/) for how inference works and when to use it.
:::

## Configuration

```yaml
config:
  processing:
    inferNumberProps: true  # Infer numeric code-only props as NumberProp
```

## Result

**Without** inference (`false`) the numeric values stay string props:

```json
{
  "props": {
    "minRows": { "type": "string", "default": "2" },
    "maxRows": { "type": "string", "examples": ["6"] },
    "minLength": { "type": "string", "examples": ["3"] }
  }
}
```

**With** inference (`true`) they are emitted as number props:

```json
{
  "props": {
    "minRows": { "type": "number", "default": 2 },
    "maxRows": { "type": "number", "examples": [6] },
    "minLength": { "type": "number", "examples": [3] }
  }
}
```

Text code-only props whose values aren't purely numeric (e.g. `value` = `"{Value}"`) are unaffected and remain string props.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, text code-only props with purely numeric values are inferred as number props. When `false`, all text code-only props remain string props.

## Path

`config.processing.inferNumberProps`
