---
title: Variants
order: 5
description: Variant layering model and override semantics
---

# Variants

Variants describe how a component changes across prop combinations. A component always has a `default` variant and optionally a `variants` array of layered overrides.

## Layering Model

The spec uses a **layered override** model rather than a flat enumeration of every possible state:

1. The `default` variant defines the baseline appearance — every element's styles, content, children, and layout.
2. Each entry in `variants` defines a **delta** — only the properties that change from the baseline (or from a parent variant via `baseline`).
3. A consumer resolves the final state by starting from `default` and merging applicable variant overrides on top, in order.

This keeps specs compact. A component with 5 boolean props would need 32 flat variants, but with layering only needs a handful of meaningful overrides.

## Variant

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | No | Human-readable variant name |
| `baseline` | `string` | No | Name of a parent variant this one extends (inherits from `default` if omitted) |
| `configuration` | [`PropConfigurations`](prop-configurations.md) | No | Prop values that activate this variant |
| `invalid` | `boolean` | No | `true` for invalid/excluded variant combinations |
| `elements` | [`Elements`](anatomy.md#element) | No | Element overrides — only changed properties |
| `layout` | [`Layout`](anatomy.md#layout) | No | Layout tree for this variant |

## Resolution

When a variant's `configuration` matches the current prop values, its `elements` are merged over the baseline. Properties not mentioned in the override retain their baseline value.

If a variant specifies `baseline`, it extends that named variant instead of the default. This allows chaining: `default` → `size=large` → `size=large + disabled=true`.

## Invalid Variants

Variants with `invalid: true` represent prop combinations that exist in Figma but are semantically invalid. They are excluded from output by default (controlled by [`include.invalidVariants`](config.md#include) in config).

The top-level `invalidVariantCombinations` array lists prop combinations that should never occur together, separately from the variant list.
