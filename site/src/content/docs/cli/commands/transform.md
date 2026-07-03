---
title: "transform"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Project component spec files into derived artifacts — contracts, styles, and token inventories.

## Usage

```bash
specs transform [transformers...] [options]
```

## Arguments

### `[transformers...]`

One or more transformer names to run. When omitted, uses `config.transform.transformers` from your config file, then falls back to the CLI default (`contract`).

```bash
specs transform contract css styling
```

## Options

### `-o, --output <path>`
Override the output directory for generated artifacts.

### `--config <path>`
Use a specific config file.

### `--verbose`
Show detailed output during transformation.

## Transformers

| Name | Output |
|------|--------|
| `contract` *(default)* | TypeScript Props interface and defaults per component |
| `css` | CSS custom property rules per component |
| `styling` | Token inventory per component |

## See Also

- [transform config](/specs/settings/transform/) — configure which transformers run by default
- [tokens config](/specs/settings/tokens/) — control how token references are serialized in spec output
