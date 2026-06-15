---
title: "Slot Constraints"
description: "Express quantity and content-type constraints on slot props"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Slots describe placeable content areas in a component — regions where consumers insert child components at runtime. By default, a `SlotProp` captures the slot's default content and nullability but says nothing about **how many children** the slot accepts or **which component types** are allowed. The `slotConstraints` feature promotes those rules to first-class fields on every slot prop.

## The Problem

Design systems often have slots with implicit rules. An avatar group accepts 1–4 avatars. A toolbar permits only `Button` and `IconButton`. Without `slotConstraints`, those constraints are either absent from specs entirely or buried as code-only extension metadata. Consumers must know to look there and interpret the naming convention themselves.

## What It Does

When `slotConstraints` is enabled, the processing engine reads constraint data from two sources and consolidates it into three optional fields directly on `SlotProp`:

| Field | Type | Meaning |
|-------|------|---------|
| `minChildren` | `number` | Minimum number of children the slot accepts |
| `maxChildren` | `number` | Maximum number of children the slot accepts |
| `anyOf` | `string[]` | Component type names permitted in the slot |

### Source 1 — Figma native `slotSettings`

Figma's component property API exposes `slotSettings` on SLOT-typed properties. When present, `minChildren` and `maxChildren` are read directly. When `allowPreferredValuesOnly` is true, `anyOf` is resolved from the slot's `preferredValues` list (Figma component keys are looked up asynchronously and resolved to component names).

### Source 2 — code-only props (fallback)

If `slotSettings` is absent or doesn't supply a field, the engine falls back to the code-only prop naming convention: a text prop named `{slotName} minChildren` (or the legacy `{slotName} minItems`), `{slotName} maxChildren` (or `{slotName} maxItems`), or `{slotName} anyOf` on the slot's code-only props container.

Both sources produce the same output. Native `slotSettings` takes priority; code-only props fill in any gaps.

### Before (without `slotConstraints`)

```yaml
items:
  type: slot
  default: null
  nullable: true
```

### After (with `slotConstraints: true`)

```yaml
items:
  type: slot
  default: null
  nullable: true
  minChildren: 1
  maxChildren: 4
  anyOf:
    - Avatar
```

Constraints move from implicit convention to the prop's top-level contract. Consumers read slot rules the same way they read `default` or `nullable` — no indirection required.

## When to Use It

Enable `slotConstraints` when your Figma library uses native slot settings, code-only props for slot constraints, or both. The flag has no effect on slots that carry neither.

This feature is most valuable when:

- **Components have bounded slots** — avatar groups, tab bars, button groups with min/max counts
- **Slots restrict content types** — a card header that only accepts `Heading` or `Badge`
- **Downstream consumers need the contract** — code generators, linters, or documentation tools that enforce slot rules

## Configuration

```yaml
# specs.config.yaml
config:
  processing:
    slotConstraints: true
```

**Default**: `false` (absent). Existing specs are unaffected until you opt in.

## Design Rationale

Slot constraints describe **intrinsic slot semantics** — they define what the slot *is*, not where the data came from. A code implementation enforces the same min/max regardless of whether the spec originated in Figma. That's why the fields live directly on `SlotProp` rather than inside `$extensions` platform metadata.

The field names `minChildren`/`maxChildren` align with Figma's native `slotSettings` API, making the source data and the spec output use the same vocabulary. The `anyOf` field uses plain component-name strings, consistent with `instanceOf` on anatomy elements.

## Further Reading

- [Code-Only Props in Figma](https://nathanacurtis.substack.com/p/code-only-props-in-figma) — the convention for encoding developer-facing properties on Figma layers
- [Figma Slots for Repeating Items](https://nathanacurtis.substack.com/p/figma-slots-for-repeating-items) — design patterns for slots with quantity and content-type constraints
- [CLI Configuration](/specs/config/) — full config reference
