---
title: "Absolute Positioning"
description: "How Figma constraints convert to semantic offset properties, including computation formulas, context rules, and variant interactions"
---

import { Aside } from '@astrojs/starlight/components';

Figma stores every element's position as raw `x`/`y` pixel coordinates plus a `constraints` object with one constraint type per axis. Specs converts these into a set of semantic offset properties that tell consumers *which edge* a value is measured from — and computes the correct value for that edge from the Figma geometry.

<Aside>
This guide covers the absolute positioning model in depth. For a broader overview of all positioning properties and platform code examples, see the [Layout Positioning](/specs/guides/layout-positioning) guide.
</Aside>

---

## When offsets are emitted

Not every node receives offset properties. Whether offsets are computed depends on the node's **position context** — the relationship between the node and its parent.

| Context | `position` | Offsets | Notes |
|---------|-----------|---------|-------|
| COMPONENT root or top-level frame | `null` | `null` | No parent to be positioned relative to |
| AUTO child in auto-layout parent | `AUTO` | `null` | Layout engine controls placement |
| ABSOLUTE child in auto-layout parent | `ABSOLUTE` | computed | Removed from layout flow |
| Child in regular frame (no auto-layout) | `null` | computed | `position` is irrelevant without auto-layout |

The key distinction: offsets are computed for ABSOLUTE children and for children of regular frames. AUTO children never have offsets — the parent's layout engine is responsible for placement.

---

## Per-axis independence

Figma applies one constraint type per axis. The horizontal and vertical constraints are mapped independently — any combination is valid.

```yaml
# Horizontal: MIN, Vertical: CENTER — perfectly fine
position: ABSOLUTE
start: 16
centerVerticalOffset: 0

# Horizontal: STRETCH, Vertical: MIN — also valid
position: ABSOLUTE
start: 8
end: 8
top: 48
```

Each axis runs through the same computation logic, producing properties for that axis only. There is no coupling between axes.

---

## Constraint types and value computation

Figma reports five constraint types. Each type maps to specific properties, and the values are derived from the node's geometry relative to its parent.

**Inputs available for computation:**
- `node.x` / `node.y` — distance from the parent's top-left corner to the node's top-left corner
- `node.width` / `node.height` — the node's dimensions
- `parent.width` / `parent.height` — the parent frame's dimensions

### MIN — pinned to the near edge

Emits `start` (horizontal) or `top` (vertical). The value is the distance from the inline-start or block-start edge.

```
start = node.x
top   = node.y
```

```yaml
# Figma: x: 24, y: 16
# Parent: 400×300

position: ABSOLUTE
start: 24     # 24px from the left edge
top: 16       # 16px from the top edge
```

### MAX — pinned to the far edge

Emits `end` (horizontal) or `bottom` (vertical). Figma stores `x`/`y` from the top-left, so the formula converts to a distance from the far edge.

```
end    = parent.width  - node.x - node.width
bottom = parent.height - node.y - node.height
```

```yaml
# Figma: x: 356, y: 12, width: 32, height: 32
# Parent: 400×300

position: ABSOLUTE
end: 12       # 400 - 356 - 32 = 12px from the right edge
top: 12       # still MIN on the vertical axis
```

Figma stores `x: 356` (distance from left), but the constraint says "pin to the right." Specs computes the correct right-edge offset rather than passing through the raw coordinate.

### CENTER — offset from the midpoint

Emits `centerHorizontalOffset` or `centerVerticalOffset`. A value of `0` means perfectly centered; positive values shift toward the far edge, negative toward the near edge.

```
centerHorizontalOffset = node.x + (node.width  / 2) - (parent.width  / 2)
centerVerticalOffset   = node.y + (node.height / 2) - (parent.height / 2)
```

```yaml
# Figma: x: 188, y: 138, width: 24, height: 24
# Parent: 400×300

position: ABSOLUTE
centerHorizontalOffset: 0    # 188 + 12 - 200 = 0 (perfectly centered)
centerVerticalOffset: 0      # 138 + 12 - 150 = 0 (perfectly centered)
```

```yaml
# Figma: x: 200, y: 134, width: 24, height: 24
# Parent: 400×300

position: ABSOLUTE
centerHorizontalOffset: 12   # shifted 12px right of center
centerVerticalOffset: -4     # shifted 4px above center
```

### STRETCH — pinned to both edges

Emits both `start` + `end` (horizontal) or `top` + `bottom` (vertical) simultaneously. The element spans between two fixed insets, and its dimension is determined by the container minus those insets.

```
start = node.x
end   = parent.width - node.x - node.width

top    = node.y
bottom = parent.height - node.y - node.height
```

```yaml
# Figma: x: 16, y: 200, width: 368, height: 2
# Parent: 400×300

position: ABSOLUTE
start: 16     # 16px from left
end: 16       # 400 - 16 - 368 = 16px from right
top: 200      # still MIN on the vertical axis
              # width is suppressed (see Dimension suppression below)
```

When `start` and `end` are both present, `width` is set to `null`. The dimension is defined by the container geometry — an explicit pixel width would conflict.

### SCALE — proportional to the parent

Emits both `start` and `end` as **percentage strings**, representing the node's position as a fraction of the parent's size. Like STRETCH, both edges are emitted simultaneously.

```
start% = (node.x / parent.width)  × 100
end%   = ((parent.width - node.x - node.width) / parent.width) × 100

top%    = (node.y / parent.height)  × 100
bottom% = ((parent.height - node.y - node.height) / parent.height) × 100
```

```yaml
# Figma: x: 100, y: 75, width: 200, height: 150
# Parent: 400×300

position: ABSOLUTE
start: "25%"     # 100 / 400 × 100
end: "25%"       # (400 - 100 - 200) / 400 × 100
top: "25%"       # 75 / 300 × 100
bottom: "25%"    # (300 - 75 - 150) / 300 × 100
                 # width and height are suppressed
```

Percentage values are formatted with up to two decimal places, trailing zeros removed: `"16.67%"`, `"8.5%"`, `"25%"`.

Consumers distinguish SCALE from pixel offsets by value type: a `string` value is always a percentage; a `number` value is always pixels.

---

## Dimension suppression

When a constraint fully determines a dimension from two edges, Specs sets the corresponding dimension property to `null`.

| Constraint | Axis | Suppressed dimension |
|-----------|------|---------------------|
| STRETCH | horizontal | `width` → `null` |
| STRETCH | vertical | `height` → `null` |
| SCALE | horizontal | `width` → `null` |
| SCALE | vertical | `height` → `null` |

For STRETCH: two fixed insets (`start` + `end`) define the element's width as `parent.width - start - end`. An explicit `width` would conflict with this edge-derived sizing — it's the same reason CSS `left: 0; right: 0; width: 100px` creates an ambiguity.

For SCALE: the element's size scales proportionally with the parent. A fixed pixel `width` contradicts the proportional intent.

Suppression is per-variant and per-axis. A component can have one variant where horizontal is MIN (width retained) and another where horizontal is STRETCH (width nulled).

---

## Variant interactions

All positioning properties — including those set to `null` — are always present on a variant's full style set. This ensures [variant layering](/specs/guides/variant-layering) can detect constraint changes between variants.

When a component variant changes from MIN to CENTER on the horizontal axis:

```yaml
# Default variant — MIN horizontal
start: 16
centerHorizontalOffset: null   # inactive, but present

# Variant "state: hovered" — CENTER horizontal (layered diff only)
start: null
centerHorizontalOffset: 0
```

If inactive properties were absent rather than null, the layering diff would be silent — `start` appearing in the default but not in the variant would never register as a removal. Explicit null ensures the transition is visible and applied correctly when layers are merged.

Similarly, when a variant transitions between `ABSOLUTE` and `AUTO`:

```yaml
# Default — ABSOLUTE child
position: ABSOLUTE
start: 16
top: 8
layoutSizingHorizontal: null   # not relevant for positioned children

# Variant "layout: auto" — AUTO child (layered diff)
position: AUTO
start: null
top: null
layoutSizingHorizontal: FILL   # layout sizing appears for auto children
```

The `layoutSizingHorizontal: null` in the default and `start: null` / `top: null` in the variant are both explicit, so consumers merging layers arrive at a correct final state in either direction.

---

## layoutSizing and ABSOLUTE

When a node is absolutely positioned (or a child of a regular frame), `layoutSizingHorizontal` and `layoutSizingVertical` are set to `null`. These properties only apply to AUTO children inside auto-layout parents — they describe how the layout engine sizes the element, which is irrelevant when the element is positioned manually.

```yaml
position: ABSOLUTE
start: 24
top: 16
layoutSizingHorizontal: null   # not applicable
layoutSizingVertical: null     # not applicable
width: 48
height: 48
```

Conversely, AUTO children have offset properties set to `null` and layoutSizing present:

```yaml
position: AUTO
start: null
top: null
layoutSizingHorizontal: FILL
layoutSizingVertical: FIXED
height: 48
# width is null — determined by FILL
```

---

## Mixed-axis examples

Real-world elements often combine different constraint types per axis.

### Toast notification — end + top (bottom-right anchor)

```yaml
# Figma: x: 316, y: 12, width: 72, height: 48
# Parent: 400×300
# constraints: { horizontal: MAX, vertical: MIN }

position: ABSOLUTE
end: 12      # MAX horizontal: 400 - 316 - 72 = 12
top: 12      # MIN vertical
```

### Responsive banner — SCALE horizontal, MIN vertical

```yaml
# Figma: x: 40, y: 0, width: 320, height: 56
# Parent: 400×300
# constraints: { horizontal: SCALE, vertical: MIN }

position: ABSOLUTE
start: "10%"    # 40/400 × 100
end: "10%"      # (400 - 40 - 320) / 400 × 100
top: 0
# width suppressed by SCALE
```

### Badge overlay — end + top (MAX + MIN)

```yaml
# Figma: x: 28, y: 0, width: 16, height: 16
# Parent: 40×40
# constraints: { horizontal: MAX, vertical: MIN }

position: ABSOLUTE
end: -4     # 40 - 28 - 16 = -4 (extends beyond parent edge)
top: -4
```

Negative values are valid — they represent elements that extend beyond the parent's boundary.

### Full-bleed overlay — STRETCH × STRETCH

```yaml
# Figma: x: 0, y: 0, width: 400, height: 300
# Parent: 400×300
# constraints: { horizontal: STRETCH, vertical: STRETCH }

position: ABSOLUTE
start: 0
end: 0
top: 0
bottom: 0
# width and height both suppressed
```

All four edges present, no explicit dimensions. The element fills its parent completely regardless of parent size.
