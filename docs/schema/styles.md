---
title: Styles
order: 4
description: Style properties and value types
---

# Styles

The `Styles` object holds visual properties for an element. Every property is optional. Which properties are evaluated depends on the element type.

```ts
type Styles = Partial<{ /* 48 properties */ }>;
```

## Properties

| Name | Category | Evaluated For |
|------|----------|---------------|
| `aspectRatio` | size | container, slot, rectangle, text, vector, ellipse, star, polygon |
| `backgroundColor` | color | container, slot, rectangle |
| `clipContent` | visibility | container, slot |
| `cornerRadius` | border | container, slot |
| `cornerSmoothing` | border | container, rectangle, vector, ellipse, star, polygon |
| `counterAxisAlignContent` | layout | container |
| `counterAxisAlignItems` | layout | container |
| `counterAxisSpacing` | spacing | container |
| `effects` | effects | container, slot, rectangle, text, vector, ellipse, star, polygon, line |
| `fillColor` | color | glyph, vector, ellipse, star, polygon, line |
| `height` | size | container, slot, rectangle, glyph, vector, ellipse, star, polygon |
| `itemReverseZIndex` | layout | container |
| `itemSpacing` | spacing | container |
| `layoutMode` | layout | container |
| `layoutPositioning` | layout | all |
| `layoutSizingHorizontal` | layout | all |
| `layoutSizingVertical` | layout | all |
| `layoutWrap` | layout | container |
| `locked` | visibility | all |
| `maxHeight` | size | container, slot, rectangle, glyph, vector, ellipse, star, polygon, line |
| `maxWidth` | size | container, slot, rectangle, glyph, vector, ellipse, star, polygon, line |
| `minHeight` | size | container, slot, rectangle, glyph, vector, ellipse, star, polygon, line |
| `minWidth` | size | container, slot, rectangle, glyph, vector, ellipse, star, polygon, line |
| `opacity` | visibility | all |
| `padding` | spacing | container |
| `primaryAxisAlignItems` | layout | container |
| `primaryAxisSizingMode` | layout | container |
| `rotation` | transform | all |
| `strokeAlign` | border | container, rectangle, vector, ellipse, star, polygon, line |
| `strokes` | color | container, rectangle, vector, ellipse, star, polygon, line |
| `strokeWeight` | border | container, rectangle, vector, ellipse, star, polygon, line |
| `textAlignHorizontal` | text | text |
| `textAlignVertical` | text | text |
| `textColor` | color | text |
| `typography` | text | text |
| `visible` | visibility | all |
| `width` | size | container, slot, rectangle, glyph, vector, ellipse, star, polygon, line |
| `x` | position | all |
| `y` | position | all |

## Values

Most properties accept a `Style` value. Some properties accept specialized shapes instead of or in addition to `Style`.

| Name | Description | Example |
|------|-------------|---------|
| `string` | Literal string value | `"HORIZONTAL"` |
| `number` | Literal number value | `16` |
| `boolean` | Literal boolean value | `true` |
| `null` | Absent or cleared value | `null` |
| [`TokenReference`](token-reference.md) | Reference to a design token | `{ $token: "DS.Space.400", $type: "dimension" }` |
| [`PropBinding`](prop-binding.md) | Dynamic link to a prop value | `{ $binding: "#/props/label" }` |
| [`Conditional`](conditional.md) | Value that depends on a prop's state | `{ if: { condition: ..., then: 8, else: 12 } }` |
| [`GradientValue`](gradient-value.md) | Linear, radial, or angular gradient | `{ type: "LINEAR", angle: 90, stops: [...] }` |
| [`Typography`](typography.md) | Text style object with individual properties | `{ fontSize: 14, fontFamily: "Inter" }` |
| [`Effects`](effects.md) | Shadows and blurs | `{ shadows: [...], layerBlur: { ... } }` |
| [`Sides`](sides.md) | Per-side values for padding or stroke weight | `{ top: 8, end: 12, bottom: 8, start: 12 }` |
| [`Corners`](corners.md) | Per-corner values for corner radius | `{ topStart: 4, topEnd: 4, bottomEnd: 0, bottomStart: 0 }` |
| `AspectRatio` | Width-to-height ratio | `{ x: 16, y: 9 }` |

### Relating properties to values

- Most properties accept any `Style` (literal, token, binding, or conditional).
- `backgroundColor`, `fillColor`, `strokes`, `textColor` accept `string | TokenReference | GradientValue | null`.
- `typography` accepts `TokenReference | Typography`.
- `effects` accepts `TokenReference | Effects`.
- `padding`, `strokeWeight` accept `Style | Sides`.
- `cornerRadius` accepts `Style | Corners`.
- `aspectRatio` accepts `AspectRatio | null`.
