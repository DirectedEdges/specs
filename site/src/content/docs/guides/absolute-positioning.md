---
title: "Absolute Positioning"
description: "How Figma constraints convert to semantic offset properties, and how constraint changes surface across component variants"
---

import { Aside } from '@astrojs/starlight/components';

## How Figma stores position

Figma stores every element's position as raw `x`/`y` pixel coordinates measured from the parent frame's top-left corner. Alongside those coordinates it stores a `constraints` object — one constraint type per axis — that describes *how* the element is anchored.

```
# What Figma stores internally
x: 356
y: 12
constraints: { horizontal: MAX, vertical: MIN }
layoutPositioning: ABSOLUTE
```

The raw `x: 356` tells you where the element currently sits, but it says nothing about the designer's intent. Is `356` pinned to the left? Computed from the right? Proportional? To know, you have to read the constraint — and then mentally convert the number yourself.

## How code platforms think about position

Every major platform positions absolutely-placed elements by naming the edge being anchored to, not by measuring from the top-left corner:

```css
/* CSS — anchored to right and top edges */
position: absolute;
inset-inline-end: 12px;
top: 12px;
```

```swift
// SwiftUI — anchored to trailing and top edges
ZStack(alignment: .topTrailing) {
    child.padding(.trailing, 12).padding(.top, 12)
}
```

```kotlin
// Compose — anchored to end and top edges
Box { child.align(Alignment.TopEnd).padding(end = 12.dp, top = 12.dp) }
```

Platforms don't want a raw `x` value measured from the left — they want the offset from the edge the element is pinned to. When a designer pins something to the right edge at 12 px, every platform expects `12` from the right, not `356` from the left.

## How Specs converts Figma to platform-ready values

Specs reads both the raw geometry and the `constraints` object, computes the correct edge-relative value, and emits a named property that matches what platforms expect. The ADR that defines this model is [ADR-041](/specs/adr/041-layout-positioning).

```yaml
# Specs output — same element as above
position: ABSOLUTE
end: 12
top: 12
```

The `x: 356` is gone. In its place is `end: 12` — the distance from the inline-end (right) edge, derived from the constraint. A platform engineer reads this and writes `inset-inline-end: 12px` without any additional reasoning.

This conversion also matters across variants. If a later variant changes the horizontal constraint from `MAX` to `MIN`, the output changes from `end: 12` to `start: 24` — and the diff between variants is immediately visible. With raw `x`/`y`, a constraint change looks like an arbitrary coordinate shift with no indication of which edge changed or why.

---

## The five constraint types

Each axis has one of five constraint types. The same mapping logic applies to both horizontal and vertical axes; the examples below focus on the horizontal axis (`start`, `end`, `centerHorizontalOffset`) for clarity.

### MIN — pinned to the near edge

The element is anchored to the inline-start edge. `start` receives the pixel distance from that edge.

```
start = node.x
```

```yaml
# Figma: x: 24, width: 80, parent width: 400
# constraints: { horizontal: MIN }

# Spec output
position: ABSOLUTE
start: 24
```

### MAX — pinned to the far edge

The element is anchored to the inline-end edge. Figma stores `x` from the left, so the formula inverts it.

```
end = parent.width - node.x - node.width
```

```yaml
# Figma: x: 356, width: 32, parent width: 400
# constraints: { horizontal: MAX }

# Spec output
position: ABSOLUTE
end: 12    # 400 - 356 - 32 = 12
```

The designer pinned this 12 px from the right. Figma reported `x: 356` (from the left). Specs delivers `end: 12`.

### CENTER — offset from the midpoint

The element is centered horizontally, with an optional pixel offset. A value of `0` means perfectly centered; positive shifts toward the end edge, negative toward the start edge.

```
centerHorizontalOffset = node.x + (node.width / 2) - (parent.width / 2)
```

```yaml
# Figma: x: 200, width: 24, parent width: 400
# constraints: { horizontal: CENTER }

# Spec output
position: ABSOLUTE
centerHorizontalOffset: 12    # 200 + 12 - 200 = 12 (shifted 12px right of center)
```

### STRETCH — spanning both edges

The element is pinned to both edges simultaneously. Both `start` and `end` are emitted, and `width` is set to `null` — the element's width is determined by the container minus the two insets, not by a fixed pixel value.

```
start = node.x
end   = parent.width - node.x - node.width
```

```yaml
# Figma: x: 16, width: 368, parent width: 400
# constraints: { horizontal: STRETCH }

# Spec output
position: ABSOLUTE
start: 16
end: 16    # 400 - 16 - 368 = 16
width: null
```

`width` is null because both edges are defined — an explicit pixel dimension would conflict with the edge-derived sizing. This mirrors CSS `inset-inline-start: 16px; inset-inline-end: 16px`, where `width` is implicit.

### SCALE — proportional to the parent

The element's position scales with its container. Both `start` and `end` are emitted as percentage strings, and `width` is set to `null`. A `string` value always signals a percentage; a `number` always signals pixels.

```
start% = (node.x / parent.width) × 100
end%   = ((parent.width - node.x - node.width) / parent.width) × 100
```

```yaml
# Figma: x: 100, width: 200, parent width: 400
# constraints: { horizontal: SCALE }

# Spec output
position: ABSOLUTE
start: "25%"    # 100 / 400 × 100
end: "25%"      # (400 - 100 - 200) / 400 × 100
width: null
```

Percentages are formatted with up to two decimal places, trailing zeros removed: `"16.67%"`, `"8.5%"`, `"25%"`.

---

## Variant-by-variant differences

Specs emits all positioning properties on every variant — active keys carry their computed value, inactive keys carry `null`. This ensures [variant layering](/specs/guides/variant-layering) can detect any constraint change between variants, because a key that's absent can't be compared.

### Constraint type change: MIN → STRETCH

When a horizontal constraint changes from `MIN` to `STRETCH`, `start` gains a companion `end`, and `width` becomes `null`:

```yaml
# Default variant — MIN
position: ABSOLUTE
start: 16
end: null
width: 80

# Variant "size: fullWidth" — STRETCH (layered diff only)
start: 16
end: 16
width: null
```

`end` moves from `null` to `16`. `width` moves from `80` to `null`. Both transitions are explicit in the diff. A consumer merging these layers gets a correct final state with no ambiguity about which properties changed.

### Position mode change: ABSOLUTE → AUTO

When a variant switches an element from absolutely positioned to participating in auto-layout, `position` changes and all offset keys are nulled:

```yaml
# Default variant — ABSOLUTE
position: ABSOLUTE
start: 16
end: null
layoutSizingHorizontal: null

# Variant "layout: auto" — AUTO (layered diff only)
position: AUTO
start: null
layoutSizingHorizontal: FILL
```

`start` drops to `null` because an AUTO child's placement is controlled by the layout engine, not by edge offsets. `layoutSizingHorizontal` appears to describe how the layout engine should size the element. A reverse transition from AUTO back to ABSOLUTE would produce the mirror diff — offsets restored, `layoutSizingHorizontal` nulled.
