---
title: "Glyph Name Pattern"
description: "Naming pattern used to detect glyph content assets"
---

Naming pattern used to detect glyph content assets (e.g. icon glyphs). When absent, no glyph detection is performed.

:::tip[Guide]
See [Icon Glyphs](/specs/guides/glyph-name-pattern/) for naming strategies and worked examples.
:::

## Options

- **Type**: string
- **Default**: absent (disabled)
- **Effect**: When set, layers whose names match the pattern are detected as glyph assets. When absent, glyph detection is skipped entirely.

The pattern must include the `{i}` placeholder, which marks where the glyph name appears in the component name. Internally `{i}` becomes a `(.+)` capture group and the matched text is used as the glyph's `content` value. See [Icon Glyphs](/specs/guides/glyph-name-pattern/) for the full pattern syntax.

## Path

`config.processing.glyphNamePattern`

### Example

```yaml
config:
  processing:
    glyphNamePattern: 'DS Icon Glyph / {i}'
```
