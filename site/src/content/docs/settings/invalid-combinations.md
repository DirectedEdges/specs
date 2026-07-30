---
title: "Invalid Combinations"
description: "Calculate and include invalid property combinations"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

:::tip[Guide]
See [Invalid Variant Combinations](/guides/invalid-variant-combinations/) for what invalid combinations are, why they matter, and worked examples.
:::

Calculate and include invalid property combinations.

## Options

- **Type**: boolean
- **Default**: `true`
- **Effect**: When `true`, computes which prop combinations are invalid

## Path

`config.include.invalidCombinations`

### Example

```yaml
config:
  include:
    invalidCombinations: true  # Show invalid combinations (default)
```
