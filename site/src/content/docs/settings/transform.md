---
title: "Transform"
description: "Configure which transformers specs transform runs"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The `transformers` list in `config/pipeline.yaml` controls which transformers `specs transform` runs. Pipeline entries name *work to run* — neither a fact about the library nor a choice about output shape — so they live in their own artifact, apart from `conventions.yaml` and `settings.yaml`. The list is optional — omitting it entirely means the CLI default applies.

## Configuration

```yaml
# config/pipeline.yaml
transformers:
  - name: contract
  - name: css
  - name: react
  - name: stories
```

## `transformers`

An array of `{ name }` entries identifying which transformers to run. Names must match a registered transformer. The order of entries is the run order. When this list is absent, the CLI default (`contract`) runs. `pipeline.yaml` also accepts an `analyses` list of the same shape, naming analyses for `specs analyze` — see the [Pipeline schema reference](/schema/pipeline/).

## Available Transformers

| Name | Output |
|------|--------|
| `contract` *(default)* | TypeScript Props interface and defaults, plus Slots/SlotRules per component |
| `css` | CSS custom property rules per component |
| `react` | A working React component scaffold, seeded once into an authored file |
| `stories` | A Storybook CSF page per component |

`react` and `stories` both require `variants.yaml` and expect `contract` and `css` to run first, since they import `generated/{Component}.contract.ts` and `generated/{Component}.styles.css`.

## Default

Omitting `transformers` entirely is equivalent to running `specs transform contract`. No configuration is required to use the default transformer.

## Path

`transformers` in `config/pipeline.yaml`

**Legacy name**: in the pre-split `specs.config.yaml`, this list was `config.transformers`. The legacy file still loads, migrating it to `pipeline.yaml`'s `transformers` in memory.

## See Also

- [`transform` command](/cli/commands/transform/) — CLI usage, arguments, and options
- [tokens config](/settings/tokens/) — control how token references are serialized in spec output
