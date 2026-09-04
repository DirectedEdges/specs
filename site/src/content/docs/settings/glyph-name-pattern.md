---
title: "glyphs"
description: "Naming pattern used to detect glyph content assets"
---

Naming pattern used to detect glyph content assets (e.g. icon glyphs). A library fact, declared in `config/conventions/figma.yaml`: every consumer reading the same library must declare the same pattern — a wrong or missing one leaves icon assets undetected. Absence means the library has no glyph naming convention, and no glyph detection is performed.

:::tip[Guide]
See [Icon Glyphs](/guides/glyph-name-pattern/) for naming strategies and worked examples.
:::

## Configuration

```yaml
glyphs:
  match: 'DS Icon Glyph / {i}'
```

## Result

When the pattern matches, the layer is typed as a `glyph` in the anatomy and its matched name is captured as the element's `content`. From the `DS Alert` output, the `decorativeIcon` glyph carries the resolved icon name:

```json
{
  "anatomy": {
    "decorativeIcon": { "type": "glyph" }
  },
  "default": {
    "elements": {
      "decorativeIcon": {
        "styles": {
          "width": 20,
          "height": 20,
          "fillColor": { "$token": "DS Color/Alert/Info/Element", "$type": "color" }
        },
        "content": "info"
      }
    }
  }
}
```

Without a `glyphs` block, the layer is treated as an ordinary element and no `content` glyph name is extracted.

## Options

- **Type**: block with a single `match` string
- **Default**: absent (no glyph convention)
- **Effect**: When declared, layers whose names match the pattern are detected as glyph assets. When absent, glyph detection is skipped entirely.

The `match` pattern must include the `{i}` placeholder, which marks where the glyph name appears in the component name. Internally `{i}` becomes a `(.+)` capture group and the matched text is used as the glyph's `content` value. See [Icon Glyphs](/guides/glyph-name-pattern/) for the full pattern syntax.

## Path

`glyphs.match` in `config/conventions/figma.yaml`

**Legacy name**: in the pre-split `specs.config.yaml`, this option was the scalar `config.processing.glyphNamePattern`. That file is no longer read — [`specs migrate config`](/cli/commands/migrate/) converts it, moving that member to `figma.glyphs.match`.
