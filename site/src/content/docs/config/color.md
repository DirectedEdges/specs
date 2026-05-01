---
title: "Color"
description: "Control how color values are formatted in the spec output"
---

Color value output format.

## Options

- **Default**: `HEX`
- **Values**:
  - `HEX` - 6-digit hex string (`#FF6600`). Default — matches historical behaviour and maximises human readability
  - `HEXA` - 8-digit hex string with alpha (`#FF6600FF`)
  - `RGB` - CSS `rgb()` functional notation (`rgb(255, 102, 0)`)
  - `RGBA` - CSS `rgba()` functional notation with alpha (`rgba(255, 102, 0, 1)`). This is what Figma labels "CSS" in its colour picker
  - `HSLA` - CSS `hsla()` functional notation (`hsla(24, 100%, 50%, 1)`)
  - `HSB` - Figma's native colour model (`hsb(24, 100%, 100%)`), also known as HSV. Not a CSS function
  - `OKLCH` - CSS Color Level 4 perceptually uniform cylindrical model (`oklch(0.7 0.15 50 / 1)`)
  - `OKLAB` - CSS Color Level 4 perceptually uniform rectangular model (`oklab(0.7 0.1 0.1 / 1)`)
  - `OBJECT` - Full `ColorObject` with `colorSpace`, `components`, `alpha`, and optional `hex`. Preserves colour space fidelity with no lossy conversion

## Path

`config.format.color`

### Example

```yaml
config:
  format:
    color: HEX  # Default — 6-digit hex strings
```

## See Also

- [Config schema reference](/specs/schema/config/) - Full configuration documentation
