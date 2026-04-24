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

## Path

`config.processing.glyphNamePattern`

### Example

```yaml
config:
  processing:
    glyphNamePattern: 'DS Icon Glyph /'
```
