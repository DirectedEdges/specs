---
title: "Code-Only Props Pattern"
description: "Naming pattern used to detect the code-only props container layer"
---

Naming pattern used to detect the code-only props container layer. When absent, no code-only prop extraction is performed. A `Code only props` layer is a tiny, clipped container parked at `(0,0)` that holds child layers bound to behavioral component properties with no visual representation — for example, a Text Area's `minRows`/`maxRows` sizing bounds and a `minLength` constraint.

:::tip[Guide]
See the [Code-Only Props](/specs/guides/code-only-props/) guide as well as the [Code-Only Props in Figma](https://nathanacurtis.substack.com/p/code-only-props-in-figma) blog post for how detection and extraction works.
:::

## Configuration

```yaml
config:
  processing:
    codeOnlyPropsPattern: 'Code only props'
```

## Result

When the pattern matches, the container **and all of its children are omitted from `anatomy` and `elements`** (they are metadata, not formal layout), while the properties they were bound to **still surface in `props`**:

```json
{
  "title": "DS Text Area",
  "anatomy": {
    "root": { "type": "container" },
    "label": { "type": "text" },
    "control": { "type": "text" }
  },
  "props": {
    "value": { "type": "string", "examples": ["{Value}"] },
    "minRows": { "type": "string", "default": "2" },
    "maxRows": { "type": "string", "examples": ["6"] },
    "minLength": { "type": "string", "examples": ["3"] }
  }
}
```

`minRows`, `maxRows`, and `minLength` appear in `props` but **not** in `anatomy` — the only trace of the code-only props layer is the props themselves.

Their numeric values (`"2"`, `"6"`, `"3"`) remain strings here. Pair this with [`inferNumberProps`](/specs/config/infer-number-props/) to emit them as `NumberProp` (`2`, `6`, `3`) instead.

Without `codeOnlyPropsPattern`, the container and its children are treated as ordinary layout elements — they appear in `anatomy`/`elements` and no props are extracted.

## Options

- **Type**: string
- **Default**: absent (disabled)
- **Effect**: When set, layers whose names match the pattern are treated as code-only prop containers and their children are extracted as props. The matched layer and its children are excluded from layout and element styling evaluation. When absent, code-only prop extraction is skipped entirely.

## Path

`config.processing.codeOnlyPropsPattern`
