---
title: GradientValue
order: 15
description: Linear, radial, and angular gradient definitions
---

# GradientValue

A gradient fill value. Accepted by color properties (`backgroundColor`, `fillColor`, `strokes`, `textColor`) as an alternative to a solid color string or token reference.

```ts
type GradientValue = LinearGradient | RadialGradient | AngularGradient;
```

DIAMOND gradients are intentionally excluded — they have no native CSS, SwiftUI, or Compose equivalent.

## Properties

All three gradient types share the same base properties, with `LinearGradient` using `angle` and the others using `center`.

### LinearGradient

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'LINEAR'` | Yes | |
| `angle` | `number` | Yes | Gradient angle in degrees |
| `stops` | `GradientStop[]` | Yes | Color stops |

```yaml
type: LINEAR
angle: 180
stops:
  - position: 0
    color: "#FFFFFFFF"
  - position: 1
    color:
      $token: DS Color.Surface.Muted
      $type: color
```

### RadialGradient

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'RADIAL'` | Yes | |
| `center` | `GradientCenter` | Yes | Center point |
| `stops` | `GradientStop[]` | Yes | Color stops |

```yaml
type: RADIAL
center:
  x: 0.5
  y: 0.5
stops:
  - position: 0
    color: "#FFFFFFFF"
  - position: 1
    color: "#00000000"
```

### AngularGradient

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'ANGULAR'` | Yes | |
| `center` | `GradientCenter` | Yes | Center point |
| `stops` | `GradientStop[]` | Yes | Color stops |

```yaml
type: ANGULAR
center:
  x: 0.5
  y: 0.5
stops:
  - position: 0
    color: "#FF0000FF"
  - position: 0.33
    color: "#00FF00FF"
  - position: 0.66
    color: "#0000FFFF"
  - position: 1
    color: "#FF0000FF"
```

## Values

| Name | Description | Example |
|------|-------------|---------|
| `GradientStop` | A color at a position along the gradient | `{ position: 0.5, color: "#FF0000FF" }` |
| `GradientCenter` | Relative center point (0–1 range) | `{ x: 0.5, y: 0.5 }` |

### GradientStop

| Property | Type | Description |
|----------|------|-------------|
| `position` | `number` | Position along the gradient vector (0–1) |
| `color` | `string \| TokenReference` | Hex color (`#RRGGBBAA`) or [token reference](token-reference.md) |

### GradientCenter

| Property | Type | Description |
|----------|------|-------------|
| `x` | `number` | Horizontal position relative to the fill bounding box (0–1) |
| `y` | `number` | Vertical position relative to the fill bounding box (0–1) |

## Further Reading

- [ADR 003 — Gradient Support for Color Style Properties](../../adr/003-gradients.md) — introduces the `GradientValue` discriminated union and `ColorStyle` type
