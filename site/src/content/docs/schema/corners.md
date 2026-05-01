---
title: "Corners"
description: "Per-corner values for corner radius"
---

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
| `topStart` | [`Style`](/specs/schema/styles.md/#values) | No | Top-start corner |
| `topEnd` | [`Style`](/specs/schema/styles.md/#values) | No | Top-end corner |
| `bottomEnd` | [`Style`](/specs/schema/styles.md/#values) | No | Bottom-end corner |
| `bottomStart` | [`Style`](/specs/schema/styles.md/#values) | No | Bottom-start corner |

Corner names use logical directions (`topStart`/`bottomEnd`) rather than physical (`topLeft`/`bottomRight`) for bidirectional layout support.

## Examples

When all corners are the same, `cornerRadius` is a scalar:

```yaml
cornerRadius: 8
```

When corners differ, `cornerRadius` is a `Corners` object:

```yaml
cornerRadius:
  topStart: 8
  topEnd: 8
  bottomEnd: 0
  bottomStart: 0
```

## Further Reading

- [ADR 010 — Sides and Corners Composite Types](https://github.com/DirectedEdges/specs/blob/main/adr/010-sides-and-corners.md) — replaces flat padding/stroke/corner fields with `Sides` and `Corners` composites using logical directions
