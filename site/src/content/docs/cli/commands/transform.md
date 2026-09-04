---
title: "transform"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Fans component spec files out into derived artifacts — contracts, styles, React components, and Storybook stories.

## Usage

```bash
specs transform [transformers...] [options]
```

## Arguments

### `[transformers...]`

One or more transformer names to run. When omitted, uses `transformers` from `config/pipeline.yaml`, then falls back to the CLI default (`contract`).

```bash
specs transform contract css react stories
```

## Options

### `-o, --output <path>`
Override the output directory for generated artifacts.

### `--config <path>`
Use a specific `config/` directory.

### `--components <keys...>`
Only transform the named component folders instead of every component discovered in the output directory. Unknown component keys log a warning and are skipped.

```bash
specs transform react stories --components dsAlert dsBadge
```

### `--verbose`
Show detailed output during transformation.

## Transformers

| Name | Output |
|------|--------|
| `contract` *(default)* | TypeScript Props interface and defaults, plus Slots/SlotRules per component |
| `css` | CSS custom property rules per component |
| `react` | A working React component scaffold, seeded once into an authored file |
| `stories` | A Storybook CSF page per component |

## See Also

- [Pipeline](/schema/pipeline/) — configure which transformers run by default in `config/pipeline.yaml`
- [tokens config](/settings/tokens/) — control how token references are serialized in spec output
