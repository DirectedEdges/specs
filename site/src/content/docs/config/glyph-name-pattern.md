---
title: "Glyph Name Pattern"
description: "Naming pattern used to detect glyph content assets"
---

Naming pattern used to detect glyph content assets (e.g. icon glyphs). When absent, no glyph detection is performed.

:::tip[Guide]
See [Icon Glyphs](/specs/guides/glyph-name-pattern/) for naming strategies and worked examples.
:::

## Configuration

```yaml
config:
  processing:
    glyphNamePattern: 'DS Icon Glyph / {i}'
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

Without `glyphNamePattern`, the layer is treated as an ordinary element and no `content` glyph name is extracted.

## Options

- **Type**: string
- **Default**: absent (disabled)
- **Effect**: When set, layers whose names match the pattern are detected as glyph assets. When absent, glyph detection is skipped entirely.

The pattern must include the `{i}` placeholder, which marks where the glyph name appears in the component name. Internally `{i}` becomes a `(.+)` capture group and the matched text is used as the glyph's `content` value. See [Icon Glyphs](/specs/guides/glyph-name-pattern/) for the full pattern syntax.

## Path

`config.processing.glyphNamePattern`
