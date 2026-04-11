---
title: Number Inference
order: 2
description: Infer numeric prop types from text-based code-only properties
---

# Number Inference

Figma has no native number type. Numeric values like `maxCharacterCount`, `minRows`, and `tabIndex` are stored as TEXT component properties with string content. Without intervention, these appear in your spec as `StringProp` — technically faithful to Figma but semantically wrong. The `inferNumberProps` feature detects numeric text values and emits them as `NumberProp` instead.

## The Problem

A component spec that types `maxCharacterCount: "24"` as a string forces every consumer to parse it themselves. Code generators produce `string` parameters, documentation shows string types, and linters can't validate numeric ranges. The type information is lost at the source.

## What It Does

When `inferNumberProps` is enabled, the processing engine examines TEXT code-only props and applies a deterministic inference guard. If a prop's default value (and all example values) pass the guard, the prop is emitted as `NumberProp` (`type: 'number'`) with numeric values instead of strings.

### The Inference Guard

A value is treated as numeric when all of these conditions hold:

- Not empty (`""`) or a bare minus sign (`"-"`)
- No leading zero before another digit — rejects `"007"`, `"0800"`, `"01"` (likely identifiers or formatted codes) but allows `"0"` and `"0.5"`
- Parses to a finite number (not `NaN` or `Infinity`)

### Before (without `inferNumberProps`)

```yaml
maxCharacterCount:
  type: string
  default: "24"
```

### After (with `inferNumberProps: true`)

```yaml
maxCharacterCount:
  type: number
  default: 24
```

The value moves from a quoted string to a native number. Downstream consumers get the correct type without additional parsing.

## Known Edge Cases

The inference guard is a heuristic. Some values pass all conditions but may not be intended as numbers:

| Value | Inferred? | Why |
|-------|-----------|-----|
| `"24"` | Yes | Standard integer |
| `"3.14"` | Yes | Standard decimal |
| `"-42"` | Yes | Negative number |
| `"0"`, `"0.5"` | Yes | Zero and zero-prefixed decimals |
| `"007"` | No | Leading zero — likely an identifier |
| `"0800"` | No | Leading zero — likely a formatted code |
| `""` | No | Empty string |
| `"90210"` | Yes | Passes all guards, but could be a zip code |
| `"1.0"` | Yes | Passes all guards, but could be a version string |

The last two rows are why the feature is opt-in. Enabling it means accepting responsibility for occasional false positives where a numeric-looking string is actually a semantic identifier.

## When to Use It

Enable `inferNumberProps` when your Figma library uses TEXT code-only props for genuinely numeric values — counts, indices, thresholds, dimensions. This is most valuable when:

- **Code generators consume your specs** — they produce correctly typed parameters instead of strings
- **Documentation is auto-generated** — readers see `number` types, not ambiguous strings
- **Validation tooling checks ranges** — numeric min/max checks only work on number types

Leave it disabled if your library uses TEXT props for values that look numeric but aren't (version strings, formatted codes, identifiers with leading zeros).

## Configuration

Add `inferNumberProps: true` under `model.processing` in your config file:

```yaml
# specs.config.yaml
model:
  processing:
    inferNumberProps: true
```

**Default**: `false` (absent). Existing specs are unaffected until you opt in.

## Design Rationale

Number inference follows the same pattern as boolean inference, which already exists in the processing engine. A VARIANT property with exactly `"true"` / `"false"` values is emitted as `BooleanProp` — that inference is deterministic and always on. Number inference from TEXT props is probabilistic (the guard is a heuristic), so it requires an explicit opt-in flag.

`NumberProp` is a first-class member of the `AnyProp` union with its own `type: 'number'` discriminant, consistent with the discriminated-union pattern used by all other prop types.

## Further Reading

- [ADR 029 — NumberProp](../../adr/029-number-prop.md) — architecture decision record covering the `NumberProp` type, inference guard rules, and known false positives
- [CLI Configuration](../cli/configuration.md) — full config reference
