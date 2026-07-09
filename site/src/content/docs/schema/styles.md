---
title: "Styles"
description: "Style properties and value types"
---

The `Styles` object holds visual properties for an element. Every property is optional. Which properties are evaluated depends on the element type.

```ts
type Styles = Partial<{ /* 49 properties */ }>;
```

## Properties

Combined view: every style property, grouped by category and then by name, with the element-type categories it is evaluated for. `container` covers `COMPONENT`/`FRAME`/`SLOT`/`INSTANCE`; `vectors` covers `RECTANGLE`/`VECTOR`/`ELLIPSE`/`STAR`/`POLYGON`; `text`, `glyph`, and `line` cover their like-named element types.

| Category | Name | container | text | glyph | vectors | line |
|----------|------|-----------|------|-------|---------|------|
| Border | `cornerRadius` | ✓ |  |  |  |  |
| Border | `cornerSmoothing` | ✓ |  |  | ✓ |  |
| Border | `strokeAlign` | ✓ |  |  | ✓ | ✓ |
| Border | `strokeDashPattern` | ✓ |  |  | ✓ | ✓ |
| Border | `strokeWeight` | ✓ |  |  | ✓ | ✓ |
| Color | `backgroundColor` | ✓ |  |  | ✓ |  |
| Color | `fillColor` |  |  | ✓ | ✓ | ✓ |
| Color | `strokes` | ✓ |  |  | ✓ | ✓ |
| Color | `textColor` |  | ✓ |  |  |  |
| Effects | `effects` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `bottom` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `centerHorizontalOffset` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `centerVerticalOffset` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `end` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `layoutSizingHorizontal` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `layoutSizingVertical` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `position` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `start` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (child) | `top` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Layout (parent) | `crossAxisAlignment` | ✓ |  |  |  |  |
| Layout (parent) | `itemReverseZIndex` | ✓ |  |  |  |  |
| Layout (parent) | `layoutMode` | ✓ |  |  |  |  |
| Layout (parent) | `mainAxisAlignment` | ✓ |  |  |  |  |
| Layout (parent) | `primaryAxisSizingMode` | ✓ |  |  |  |  |
| Layout (parent) | `wrap` | ✓ |  |  |  |  |
| Layout (parent) | `wrapAlignment` | ✓ |  |  |  |  |
| Size | `aspectRatio` | ✓ | ✓ | ✓ | ✓ |  |
| Size | `height` | ✓ | ✓ | ✓ | ✓ |  |
| Size | `maxHeight` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Size | `maxWidth` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Size | `minHeight` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Size | `minWidth` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Size | `width` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Spacing | `itemSpacing` | ✓ |  |  |  |  |
| Spacing | `padding` | ✓ |  |  |  |  |
| Text | `maxLines` |  | ✓ |  |  |  |
| Text | `textAlignHorizontal` |  | ✓ |  |  |  |
| Text | `textAlignVertical` |  | ✓ |  |  |  |
| Text | `textTruncation` |  | ✓ |  |  |  |
| Text | `typography` |  | ✓ |  |  |  |
| Transform | `rotation` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Visibility | `clipContent` | ✓ |  |  |  |  |
| Visibility | `locked` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Visibility | `opacity` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Visibility | `visible` | ✓ | ✓ | ✓ | ✓ | ✓ |

**Note on the `vectors` column.** This column unions `RECTANGLE` with the vector-family element types (`VECTOR`, `ELLIPSE`, `STAR`, `POLYGON`), which share most styling but split on color: `backgroundColor` is evaluated only for `RECTANGLE`, while `fillColor` is evaluated only for the vector family. Both show ✓ under `vectors` here, but a given element of one subtype will only honor one or the other.

## Key Mapping from Figma

Several spec style keys differ from the Figma node property they read from. Specs renames these to be more semantic and self-describing. Keys not listed here pass through unchanged (e.g. `opacity` reads `node.opacity`).

| Spec key | Figma property | ADR |
|----------|---------------|-----|
| `backgroundColor` | `fills` | [ADR 009](https://github.com/DirectedEdges/specs/blob/main/adr/009-color-values.md) |
| `textColor` | `fills` | [ADR 009](https://github.com/DirectedEdges/specs/blob/main/adr/009-color-values.md) |
| `fillColor` | `fills` | [ADR 013](https://github.com/DirectedEdges/specs/blob/main/adr/013-icon-fillColor.md) |
| `wrap` | `layoutWrap` | [ADR 039](https://github.com/DirectedEdges/specs/blob/main/adr/039-wrap-alignment.md) |
| `wrapAlignment` | `counterAxisAlignContent` | [ADR 039](https://github.com/DirectedEdges/specs/blob/main/adr/039-wrap-alignment.md) |
| `mainAxisAlignment` | `primaryAxisAlignItems` | [ADR 040](https://github.com/DirectedEdges/specs/blob/main/adr/040-layout-alignment.md) |
| `crossAxisAlignment` | `counterAxisAlignItems` | [ADR 040](https://github.com/DirectedEdges/specs/blob/main/adr/040-layout-alignment.md) |
| `position` | `layoutPositioning` | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |
| `top` | `y` (constraint MIN/STRETCH/SCALE) | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |
| `bottom` | `y` (constraint MAX/STRETCH) | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |
| `start` | `x` (constraint MIN/STRETCH/SCALE) | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |
| `end` | `x` (constraint MAX/STRETCH) | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |
| `centerHorizontalOffset` | `x` (constraint CENTER) | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |
| `centerVerticalOffset` | `y` (constraint CENTER) | [ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md) |

| `strokeDashPattern` | `strokeDashes` | [ADR 059](https://github.com/DirectedEdges/specs/blob/main/adr/059-border-style.md) |

All other style keys — `width`, `height`, `opacity`, `padding`, `itemSpacing`, `cornerRadius`, `strokeWeight`, `rotation`, etc. — use the same name as the Figma node property.

## Values

Most properties accept a `Style` value. Some properties accept specialized shapes instead of or in addition to `Style`.

| Name | Description | Example |
|------|-------------|---------|
| `string` | Literal string value | `"HORIZONTAL"` |
| `number` | Literal number value | `16` |
| `boolean` | Literal boolean value | `true` |
| `null` | Absent or cleared value | `null` |
| [`TokenReference`](/specs/schema/token-reference/) | Reference to a design token | `{ $token: "DS.Space.400", $type: "dimension" }` |
| [`PropBinding`](/specs/schema/prop-binding/) | Dynamic link to a prop value | `{ $binding: "#/props/label" }` |
| [`Conditional`](/specs/schema/conditional/) | Value that depends on a prop's state | `{ if: { condition: ..., then: 8, else: 12 } }` |
| [`GradientValue`](/specs/schema/gradient-value/) | Linear, radial, or angular gradient | `{ type: "LINEAR", angle: 90, stops: [...] }` |
| [`Typography`](/specs/schema/typography/) | Text style object with individual properties | `{ fontSize: 14, fontFamily: "Inter" }` |
| [`Effects`](/specs/schema/effects/) | Shadows and blurs | `{ shadows: [...], layerBlur: { ... } }` |
| [`Sides`](/specs/schema/sides/) | Per-side values for padding or stroke weight | `{ top: 8, end: 12, bottom: 8, start: 12 }` |
| [`Corners`](/specs/schema/corners/) | Per-corner values for corner radius | `{ topStart: 4, topEnd: 4, bottomEnd: 0, bottomStart: 0 }` |
| `ItemSpacing` | Per-axis gap values | `{ horizontal: 16, vertical: 8 }` |
| `LayoutMode` | Auto-layout direction enum | `"NONE"`, `"HORIZONTAL"`, `"VERTICAL"` |
| `WrapAlignment` | Wrap line distribution enum | `"START"`, `"SPACE_BETWEEN"` |
| `MainAxisAlignment` | Main axis alignment enum | `"START"`, `"END"`, `"CENTER"`, `"SPACE_BETWEEN"` |
| `CrossAxisAlignment` | Cross axis alignment enum | `"START"`, `"END"`, `"CENTER"`, `"STRETCH"`, `"BASELINE"` |
| `Position` | Layout positioning mode enum | `"AUTO"`, `"ABSOLUTE"` |
| `PositionOffset` | Positional offset value | `24` (px), `"25%"` (SCALE), `null` |
| `AspectRatio` | Width-to-height ratio | `{ x: 16, y: 9 }` |
| `StrokeDashPattern` | Dash geometry for a dashed stroke — presence signals dashed; null or absent signals solid | `{ dash: 8, gap: 4 }` |
| `TextTruncation` | Text truncation mode enum | `"DISABLED"`, `"ENDING"` |

### Relating properties to values

- Most properties accept any `Style` (literal, token, binding, or conditional).
- `backgroundColor`, `fillColor`, `strokes`, `textColor` accept `string | TokenReference | GradientValue | null`.
- `typography` accepts `TokenReference | Typography`.
- `effects` accepts `TokenReference | Effects`.
- `padding`, `strokeWeight` accept `Style | Sides`.
- `cornerRadius` accepts `Style | Corners`.
- `itemSpacing` accepts `Style | ItemSpacing`.
- `layoutMode` accepts `LayoutMode | null` — not token-bindable.
- `wrapAlignment` accepts `WrapAlignment | null` — not token-bindable.
- `mainAxisAlignment` accepts `MainAxisAlignment | null` — not token-bindable.
- `crossAxisAlignment` accepts `CrossAxisAlignment | null` — not token-bindable.
- `position` accepts `Position | null` — not token-bindable.
- `top`, `bottom`, `start`, `end`, `centerHorizontalOffset`, `centerVerticalOffset` accept `PositionOffset` (`number | string | null`) — not token-bindable.
- `aspectRatio` accepts `AspectRatio | null`.
- `strokeDashPattern` accepts `StrokeDashPattern | null` — not token-bindable; presence signals a dashed stroke, null or absent signals solid.
- `textTruncation` accepts `TextTruncation | null` (`"DISABLED" | "ENDING"`) — not token-bindable; `"ENDING"` truncates overflowing text with a trailing ellipsis.
- `maxLines` accepts any `Style` (a plain number like other sizes); the line limit before `textTruncation: "ENDING"` applies, or `null` for no limit.
