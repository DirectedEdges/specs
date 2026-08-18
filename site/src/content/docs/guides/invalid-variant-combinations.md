---
title: "Invalid Variant Combinations"
description: "Declare which variant combinations are intentionally unsupported for a component"
---

Components built in Figma often have variant combinations that are intentionally unsupported. A `Button` cannot be `disabled` and `focused` at the same time. A `readonly` input ignores `hover` and `active` states. These constraints live in the Figma component set as absent variants — combinations the designer chose not to create — but without explicit documentation, consumers have no way to know which pairings are off-limits.

## The Problem

When a component has multiple props, the theoretical number of variant combinations grows multiplicatively. Designers rarely build every possible combination — some are intentionally excluded because they violate design intent or create visual inconsistencies.

Without surfacing these exclusions, consumers face silent failures:
- A developer requests a prop combination that was never designed
- Code generation tools produce unreachable states
- Validation logic has no authoritative source of truth for which combinations are valid

## What It Does

The `invalidVariantCombinations` field on `Component` lists every prop combination that has no corresponding valid variant. Each entry is a `PropConfigurations` object — the same shape used in `Variant.configuration` — declaring which prop values, when combined, are intentionally unsupported.

Each entry means: "this combination of prop values was not designed and should not be used."

## Example: Button

A `Button` has three props — `state`, `disabled`, and `readonly`:

```yaml
props:
  state:
    type: string
    default: rest
    enum: [rest, hover, active, focused]
  disabled:
    type: boolean
    default: false
  readonly:
    type: boolean
    default: false
```

The designer builds variants for most combinations, but intentionally excludes several:

- **Disabled buttons cannot be interactive** — `disabled: true` is invalid with `state: hover`, `state: active`, and `state: focused`
- **Readonly buttons have limited interaction** — `readonly: true` is invalid with `state: hover` and `state: active`
- **Disabled and readonly are mutually exclusive** — `disabled: true` + `readonly: true` is invalid

Note that `state: rest` remains valid with both `disabled: true` and `readonly: true` — a disabled or readonly button still has a resting visual state.

The resulting output:

```yaml
invalidVariantCombinations:
  - disabled: true
    state: hover
  - disabled: true
    state: active
  - disabled: true
    state: focused
  - disabled: true
    readonly: true
  - readonly: true
    state: hover
  - readonly: true
    state: active
```

A consumer reading this spec knows exactly which prop pairings to avoid — and by omission, which pairings are safe.

## How It Works

The processing engine computes invalid combinations by comparing the full set of theoretical prop combinations against the variants actually present in the Figma component set. Any theoretical combination that has no matching variant is recorded as invalid.

This is controlled by the `include.invalidCombinations` config option:

| Value | Behavior |
|-------|----------|
| `true` (default) | Include `invalidVariantCombinations` in output |
| `false` | Omit the field entirely |

```yaml
# Config
include:
  invalidCombinations: true   # default
```

## Relationship to Variants

Invalid variant combinations and the `variants` array are complementary:

- **`variants`** lists the prop combinations that *are* designed, along with their visual overrides
- **`invalidVariantCombinations`** lists the prop combinations that are *not* designed

Together they form a complete picture of the component's variant space. A prop combination appears in exactly one of:
1. The `default` variant (when all props are at their default values)
2. A `variants` entry (a valid non-default combination)
3. An `invalidVariantCombinations` entry (an excluded combination)

### Relationship to `Variant.invalid`

Individual variants can also carry an `invalid: true` flag. This flag marks a specific variant record as invalid and is controlled by the separate `include.invalidVariants` config option (default: `false`).

The two mechanisms serve different purposes:

| Mechanism | Scope | Default |
|-----------|-------|---------|
| `invalidVariantCombinations` | Summary list on `Component` | Included (`true`) |
| `Variant.invalid` | Flag on individual `Variant` records | Excluded (`false`) |

When `include.invalidVariants` is `true`, invalid variants appear in the `variants` array with `invalid: true` and empty `elements`. When `include.invalidCombinations` is `true`, the same combinations appear in the summary list. Both can be active simultaneously — the summary list provides a quick lookup table, while the variant-level flag preserves the combination within the variant array for tools that iterate all variants.

## Schema Reference

### `Component.invalidVariantCombinations`

```typescript
invalidVariantCombinations?: PropConfigurations[];
```

An array of `PropConfigurations` objects. Each object is a `Record<string, string | number | boolean>` mapping prop names to the values that form the invalid combination.

### Config: `include.invalidCombinations`

```typescript
include: {
  invalidCombinations?: boolean; // default: true
}
```

When `true`, the component output includes the `invalidVariantCombinations` field. When `false`, the field is omitted from output.

---

## See Also

- [Variant Layering](/guides/variant-layering/) — how variants accumulate properties
- [Variant Depth](/guides/variant-depth/) — controlling variant expansion depth
- [Variants](/schema/variants/) — variant schema reference
- [Component](/schema/component/) — top-level component schema
- [Settings](/schema/settings/) — full run settings
