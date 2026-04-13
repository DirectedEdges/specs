---
title: Variant Depth
order: 3
description: Control how many variant property dimensions are expanded
---

# Variant Depth

Components in a design system often have multiple variant properties — size, state, emphasis, shape. A `Button` with 3 sizes, 4 states, and 3 emphases produces 36 combinations. Add a fourth property and the count grows exponentially. The `variantDepth` setting controls how deep the processing engine explores these combinations, letting you balance completeness against output size and processing time.

## The Problem

Unlimited variant expansion captures every possible combination, which is thorough but produces large output files and slow processing for complex components. Most consumers don't need every three- or four-property combination — they need the default, single-property overrides, and perhaps two-property pairings. Deeper combinations are rarely useful and dramatically inflate the spec.

## What It Does

`variantDepth` limits the number of **non-default property values** in any single variant combination. The depth is the count of properties that differ from the default variant.

| Depth | What's included | Example (Button: size, state, emphasis) |
|-------|----------------|----------------------------------------|
| `1` | Single-property variations only | `size: small`, `state: hover`, `emphasis: high` (each alone) |
| `2` | Up to two-property combinations | `size: small + state: hover`, `size: small + emphasis: high`, etc. |
| `3` | Up to three-property combinations | `size: small + state: hover + emphasis: high` |
| `9999` | Unlimited — all combinations | Every possible permutation |

The default variant (all properties at their default values) is always included regardless of depth.

### Example Output at Different Depths

Given a component with properties `size` (small, medium, large) and `state` (default, hover, disabled):

**Depth 1** — 4 variants:
```yaml
variants:
  - name: "size=small"
  - name: "size=large"
  - name: "state=hover"
  - name: "state=disabled"
```

**Depth 2** — 10 variants:
```yaml
variants:
  - name: "size=small"
  - name: "size=large"
  - name: "state=hover"
  - name: "state=disabled"
  - name: "size=small, state=hover"
  - name: "size=small, state=disabled"
  - name: "size=large, state=hover"
  - name: "size=large, state=disabled"
```

Depth 2 includes everything from depth 1 plus all two-property pairings. Each deeper level adds the next dimension of combinations.

## When to Use Each Depth

- **`1`** — Fast iteration during development. Good for checking single-property styling without waiting for full expansion. Ideal for large component libraries where processing time matters.
- **`2`** — Production default for most teams. Captures the pairwise interactions that matter for visual QA and documentation. Catches most real-world variant bugs (e.g., "small + disabled" renders incorrectly).
- **`3`** — Thorough testing. Useful for critical components where three-way interactions could produce visual bugs.
- **`9999`** — Complete exploration. Use for auditing a component's full variant space or when generating exhaustive test matrices. Expect large output and longer processing for complex components.

## Configuration

Set `variantDepth` under `model.processing` in your config file:

```yaml
# specs.config.yaml
model:
  processing:
    variantDepth: 2    # Recommended for production
```

**Default**: `9999` (unlimited) in the processing engine. The CLI config template suggests `2` as a practical starting point.

**Allowed values**: `1`, `2`, `3`, or `9999`.

## Practical Guidance

**Start with `2`, increase if needed.** Depth 2 covers single-property overrides and pairwise interactions, which is sufficient for most documentation and code-generation use cases. If a specific component has three-way interactions you need to capture, consider increasing depth for that component's run rather than globally.

**Use `1` for rapid feedback loops.** When iterating on a component's anatomy or props, depth 1 gives you variant data quickly without the combinatorial overhead.

**Use `9999` when using the CLI.** A component with 5 properties and 4 values each produces over 1,000 combinations at unlimited depth.

## See Also

- [CLI Configuration](../cli/configuration.md) — full config reference
