---
title: "Transform"
description: "Configure which transformers specs transform runs"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The `config.transform` block controls which transformers `specs transform` runs. It is optional — omitting it entirely means the CLI default applies.

## Configuration

```yaml
config:
  transformers:
    - name: contract
    - name: css
    - name: react
    - name: stories
```

## `transformers`

An array of `{ name }` entries identifying which transformers to run. Names must match a registered transformer. The order of entries is the run order. When this block is absent, the CLI default (`contract`) runs.

## Available Transformers

| Name | Output |
|------|--------|
| `contract` *(default)* | TypeScript Props interface and defaults, plus Slots/SlotRules per component |
| `css` | CSS custom property rules per component |
| `react` | A working React component scaffold, seeded once into an authored file |
| `stories` | A Storybook CSF page per component |

`react` and `stories` both require `variants.yaml` and expect `contract` and `css` to run first, since they import `generated/{Component}.contract.ts` and `generated/{Component}.styles.css`.

## Default

Omitting `config.transform` entirely is equivalent to running `specs transform contract`. No configuration is required to use the default transformer.

## Path

`config.transform`

## See Also

- [`transform` command](/cli/commands/transform/) — CLI usage, arguments, and options
- [tokens config](/settings/tokens/) — control how token references are serialized in spec output
