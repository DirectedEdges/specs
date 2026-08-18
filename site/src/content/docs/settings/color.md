---
title: "Color"
description: "Control how color values are formatted in the spec output"
---

Controls how color values are serialized wherever a `Color` appears in spec output — including solid fill and stroke styles, text color, shadow color, and gradient stops. By default, colors are emitted as compact hex strings, but you can switch to any CSS functional notation, Figma's native HSB model, or a fully structured object that preserves the original color space without lossy conversion.

This is a formatting concern only — it doesn't affect which colors are extracted or how they're resolved from Figma. Token-bound colors are unaffected; `format.color` applies to literal, unbound color values.

## Default

`HEX`

## Values

| Option | Description | Example |
|--------|-------------|---------|
| `HEX` | 6-digit hex string. Default — matches historical behaviour and maximises human readability | `#FF6600` |
| `HEXA` | 8-digit hex string with alpha | `#FF6600FF` |
| `RGB` | CSS `rgb()` functional notation | `rgb(255, 102, 0)` |
| `RGBA` | CSS `rgba()` functional notation with alpha. This is what Figma labels "CSS" in its colour picker | `rgba(255, 102, 0, 1)` |
| `HSLA` | CSS `hsla()` functional notation | `hsla(24, 100%, 50%, 1)` |
| `HSB` | Figma's native colour model, also known as HSV. Not a CSS function | `hsb(24, 100%, 100%)` |
| `OKLCH` | CSS Color Level 4 perceptually uniform cylindrical model | `oklch(0.7 0.15 50 / 1)` |
| `OKLAB` | CSS Color Level 4 perceptually uniform rectangular model | `oklab(0.7 0.1 0.1 / 1)` |
| `OBJECT` | Full `ColorObject` with `colorSpace`, `components`, `alpha`, and optional `hex`. Preserves colour space fidelity with no lossy conversion | — |

## Path

`config.format.color`

### Example

```yaml
config:
  format:
    color: HEX  # Default — 6-digit hex strings
```

## See Also

- [Settings schema reference](/schema/settings/) - Full settings documentation
