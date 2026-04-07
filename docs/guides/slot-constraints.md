---
title: Slot Constraints
order: 1
description: Express quantity and content-type constraints on slot props
---

# Slot Constraints

Slots describe placeable content areas in a component — regions where consumers insert child components at runtime. By default, a `SlotProp` captures the slot's default content and nullability but says nothing about **how many items** the slot accepts or **which component types** are allowed. The `slotConstraints` feature promotes those rules to first-class fields on every slot prop.

## The Problem

Design systems often have slots with implicit rules. An avatar group accepts 1–4 avatars. A toolbar permits only `Button` and `IconButton`. In Figma, these constraints live as code-only text properties on the slot's container layer — props named things like "Min Items", "Max Items", and "Permitted Items." Without `slotConstraints`, those props appear as ordinary code-only extensions, buried under `$extensions` metadata. Consumers must know to look there and interpret the naming convention themselves.

## What It Does

When `slotConstraints` is enabled, the processing engine detects constraint-related code-only props on slot layers and consolidates them into three optional fields directly on `SlotProp`:

| Field | Type | Meaning |
|-------|------|---------|
| `minItems` | `number` | Minimum number of items the slot accepts |
| `maxItems` | `number` | Maximum number of items the slot accepts |
| `anyOf` | `string[]` | Component type names permitted in the slot |

The field names deliberately echo JSON Schema's array-constraint vocabulary, making their semantics immediately familiar.

### Before (without `slotConstraints`)

```yaml
items:
  type: slot
  default: null
  nullable: true
  $extensions:
    com.figma:
      codeOnlyProps:
        Min Items:
          type: string
          default: "1"
        Max Items:
          type: string
          default: "4"
        Permitted Items:
          type: string
          default: "Avatar"
```

### After (with `slotConstraints: true`)

```yaml
items:
  type: slot
  default: null
  nullable: true
  minItems: 1
  maxItems: 4
  anyOf:
    - Avatar
```

Constraints move from supplementary metadata to the prop's top-level contract. Consumers read slot rules the same way they read `default` or `nullable` — no indirection required.

## When to Use It

Enable `slotConstraints` when your Figma library follows the code-only prop naming convention for slot constraints ("Min Items", "Max Items", "Permitted Items"). If your library does not use that convention, the flag has no effect.

This feature is most valuable when:

- **Components have bounded slots** — avatar groups, tab bars, button groups with min/max counts
- **Slots restrict content types** — a card header that only accepts `Heading` or `Badge`
- **Downstream consumers need the contract** — code generators, linters, or documentation tools that enforce slot rules

## Configuration

Add `slotConstraints: true` under `model.processing` in your config file:

```yaml
# .specs.config.yaml
model:
  processing:
    slotConstraints: true
```

**Default**: `false` (absent). Existing specs are unaffected until you opt in.

## Design Rationale

Slot constraints describe **intrinsic slot semantics** — they define what the slot *is*, not where the data came from. A code implementation enforces the same min/max regardless of whether the spec originated in Figma. That's why the fields live directly on `SlotProp` rather than inside `$extensions` platform metadata.

The `anyOf` field uses plain component-name strings, consistent with `instanceOf` on anatomy elements. No cross-component reference resolution is required.

## Further Reading

- [Code-Only Props in Figma](https://nathanacurtis.substack.com/p/code-only-props-in-figma) — the convention for encoding developer-facing properties on Figma layers
- [Figma Slots for Repeating Items](https://nathanacurtis.substack.com/p/figma-slots-for-repeating-items) — design patterns for slots with quantity and content-type constraints
- [CLI Configuration](../cli/configuration.md) — full config reference
