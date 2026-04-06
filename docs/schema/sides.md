---
title: Sides
order: 13
description: Per-side values for padding and stroke weight
---

# Sides

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
| `top` | [`Style`](styles.md#values) | No | Top edge |
| `end` | [`Style`](styles.md#values) | No | Inline-end (right in LTR) |
| `bottom` | [`Style`](styles.md#values) | No | Bottom edge |
| `start` | [`Style`](styles.md#values) | No | Inline-start (left in LTR) |

Side names use logical directions (`start`/`end`) rather than physical (`left`/`right`) for bidirectional layout support.

## Example

```json
{ "top": 8, "end": 16, "bottom": 8, "start": 16 }
```

## Further Reading

- [ADR 010 — Sides and Corners Composite Types](../../adr/010-sides-and-corners.md) — replaces flat padding/stroke/corner fields with `Sides` and `Corners` composites using logical directions
