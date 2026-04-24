---
title: "Code-Only Props Pattern"
description: "Naming pattern used to detect the code-only props container layer"
---

Naming pattern used to detect the code-only props container layer. When absent, no code-only prop extraction is performed.

:::tip[Guide]
See the [Code-Only Props](/specs/guides/code-only-props/) guide as well as the [Code-Only Props in Figma](https://nathanacurtis.substack.com/p/code-only-props-in-figma) blog post for how detection and extraction works.
:::

## Options

- **Type**: string
- **Default**: absent (disabled)
- **Effect**: When set, layers whose names match the pattern are treated as code-only prop containers and their children are extracted as props. The matched layer and its children are excluded from layout and element styling evaluation. When absent, code-only prop extraction is skipped entirely.

## Path

`config.processing.codeOnlyPropsPattern`

### Example

```yaml
config:
  processing:
    codeOnlyPropsPattern: 'Code only props'
```
