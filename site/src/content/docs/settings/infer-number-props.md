---
title: "Infer Number Props"
description: "Automatically emit numeric code-only props as NumberProp instead of StringProp"
---

When enabled, TEXT code-only props whose default and all examples parse as valid numbers (no leading zeros) are emitted as `NumberProp` instead of `StringProp`. A library fact, declared in `config/conventions/figma.yaml`: it states that the library authors numeric props as Figma `TEXT` props — a library that does, but leaves this off, gets worse typing for genuinely numeric props, not different typing. The example below uses a Text Area that exposes [code-only props](/settings/code-only-props-pattern/) whose values are purely numeric strings — `minRows` = `"2"`, `maxRows` = `"6"`, `minLength` = `"3"`.

:::tip[Guide]
See [Number Inference](/guides/number-inference/) for how inference works and when to use it.
:::

## Configuration

```yaml
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

`inferNumberProps` in `config/conventions/figma.yaml`
