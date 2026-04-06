---
title: Corners
order: 14
description: Per-corner values for corner radius
---

# Corners

A positional object for `cornerRadius` when corners differ. Used as an alternative to a single scalar value. Introduced in schema 1.0.0.

```ts
interface Corners {
  topStart?: Style;
  topEnd?: Style;
  bottomEnd?: Style;
  bottomStart?: Style;
}
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `topStart` | [`Style`](styles.md#values) | No | Top-start corner |
| `topEnd` | [`Style`](styles.md#values) | No | Top-end corner |
| `bottomEnd` | [`Style`](styles.md#values) | No | Bottom-end corner |
| `bottomStart` | [`Style`](styles.md#values) | No | Bottom-start corner |

Corner names use logical directions (`topStart`/`bottomEnd`) rather than physical (`topLeft`/`bottomRight`) for bidirectional layout support.

## Example

```json
{ "topStart": 8, "topEnd": 8, "bottomEnd": 0, "bottomStart": 0 }
```

## Further Reading

- [ADR 010 — Sides and Corners Composite Types](../../adr/010-sides-and-corners.md) — replaces flat padding/stroke/corner fields with `Sides` and `Corners` composites using logical directions
