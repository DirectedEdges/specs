---
title: "Element Types"
description: "Choosing the right anatomy element type — containers, content-bearing elements, instances, and when a shape primitive is actually correct"
---

Every anatomy element declares a `type`, and the choice determines what the element can carry, what its styles mean, and what every platform emits for it. Most authoring mistakes with types come from one confusion: using a shape primitive for something that is really a styled box.

## The vocabulary

| Type | Is | Carries |
|------|----|---------|
| `container` | A box that holds children or stands alone as a styled block | Layout styles, background, border, radius, children |
| `text` | A text run | `content` (string or `$binding`), typography styles |
| `glyph` | A named icon glyph | `content` (glyph name or `$binding`) |
| `instance` | A nested component | `instanceOf`, `propConfigurations` |
| `slot` | A content region a consumer fills | Binding to a slot prop |
| `vector` | Literal vector artwork | Fill/stroke styles |
| `rectangle`, `ellipse`, `line`, `polygon`, `star` | Literal vector geometry — the drawing itself | Fill/stroke styles |

## Styled blocks are containers

A shape primitive (`rectangle`, `ellipse`, `line`, `polygon`, `star`) is for geometry that *is* the artwork — a decorative line in an illustration, a star in a rating glyph that isn't an icon. Anything that carries block styling — background color, corner radius, padding, position offsets — is a `container`, even when it renders as a simple shape.

A tooltip's notch is the canonical case. It looks like a rotated square, but it carries a background color, a position, and participates in placement variants — so it is a container, not a rectangle:

```yaml
# api.yaml
anatomy:
  notch:
    type: container

# variants.yaml — default.elements
notch:
  styles:
    position: ABSOLUTE
    width: 12
    height: 12
    rotation: 45
    bottom: -6
    centerHorizontalOffset: 0
    backgroundColor:
      $token: Color/Overlay surface
      $type: color
```

The parent needs `clipsContent: false` for a child hung past its edge; see [Absolute Positioning](/guides/absolute-positioning/) for the offset model and [Layout Positioning](/guides/layout-positioning/) for auto-layout flow.

## Content-bearing elements

`text` and `glyph` take `content` — a literal, or a `$binding` to a prop. An `instance` takes `instanceOf` (a component name, or a `#/subcomponents/<name>` reference) and configures its target through `propConfigurations`. A `slot` element marks where slot-prop content lands. None of these carry the other's fields: a text element with `instanceOf`, or an instance with `content`, is a modeling error even where the schema is permissive.

## Choosing, in order

1. Does a component already express this? → `instance`.
2. Is it text or a named icon? → `text` / `glyph`.
3. Is it a region consumers fill? → `slot`.
4. Does it carry any block styling or layout role? → `container`.
5. Only if it is literal vector geometry with none of the above → a shape primitive or `vector`.
