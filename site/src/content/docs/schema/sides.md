---
title: "Sides"
description: "Per-side values for padding and stroke weight"
---

A positional object for properties that can vary per side. Used by `padding` and `strokeWeight` as an alternative to a single scalar value. Introduced in schema 1.0.0.

```ts
interface Sides {
  top?: Style;
  end?: Style;
  bottom?: Style;
  start?: Style;
}
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `top` | [`Style`](/specs/schema/styles.md/#values) | No | Top edge |
| `end` | [`Style`](/specs/schema/styles.md/#values) | No | Inline-end (right in LTR) |
| `bottom` | [`Style`](/specs/schema/styles.md/#values) | No | Bottom edge |
| `start` | [`Style`](/specs/schema/styles.md/#values) | No | Inline-start (left in LTR) |

Side names use logical directions (`start`/`end`) rather than physical (`left`/`right`) for bidirectional layout support.

## Examples

When all sides are the same, `padding` is a scalar:

```yaml
padding: 16
```

When sides differ, `padding` is a `Sides` object:

```yaml
padding:
  top: 8
  end: 16
  bottom: 8
  start: 16
```

## Further Reading

- [ADR 010 — Sides and Corners Composite Types](https://github.com/DirectedEdges/specs/blob/main/adr/010-sides-and-corners.md) — replaces flat padding/stroke/corner fields with `Sides` and `Corners` composites using logical directions
