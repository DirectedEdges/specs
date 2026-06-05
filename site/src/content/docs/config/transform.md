---
title: "Transform"
description: "Configure which transformers specs transform runs"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The `config.transform` block controls which transformers `specs transform` runs. It is optional — omitting it entirely means the CLI default applies.

## Configuration

```yaml
config:
  transform:
    transformers:
      - name: contract
      - name: css
      - name: styling
```

## `transformers`

An array of `{ name }` entries identifying which transformers to run. Names must match a registered transformer. The order of entries is the run order. When this block is absent, the CLI default (`contract`) runs.

## Available Transformers

| Name | Output |
|------|--------|
| `contract` *(default)* | TypeScript Props interface and defaults per component |
| `css` | CSS custom property rules per component |
| `styling` | Token inventory per component |

## Default

Omitting `config.transform` entirely is equivalent to running `specs transform contract`. No configuration is required to use the default transformer.

## Path

`config.transform`

## See Also

- [`transform` command](/specs/cli/commands/transform/) — CLI usage, arguments, and options
- [tokens config](/specs/config/tokens/) — control how token references are serialized in spec output
