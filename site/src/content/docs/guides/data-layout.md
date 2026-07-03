---
title: "Data Layout"
description: "Choose how element hierarchy is represented in the spec output"
---

Every component has an element tree — a root with nested children that form the component's anatomy. The `layout` format option controls **how that hierarchy is expressed** in the spec output. You can get a top-level tree structure, per-element parent/children fields, or both.

## The Problem

Different consumers need hierarchy in different shapes. A tree renderer wants a nested structure it can walk top-down. A flat component registry wants each element to carry its own `parent` and `children` references. A documentation tool might want both for cross-referencing. One representation doesn't fit all use cases.

## What It Does

The `layout` option controls two independent aspects of the output:

1. Whether a top-level `layout` array appears on each variant (a nested tree)
2. Whether individual elements carry `parent` and `children` fields

| Value | Top-level `layout` tree | `parent` on elements | `children` on elements |
|-------|------------------------|---------------------|----------------------|
| `LAYOUT` | Yes | No | No |
| `PARENT_CHILDREN` | No | Yes | Yes |
| `BOTH` | Yes | Yes | Yes |

### `LAYOUT` — Tree Structure (Default)

A top-level `layout` array provides the full hierarchy as a nested tree. Leaf elements are plain strings; parent elements are objects mapping a name to their children:

```yaml
default:
  layout:
    - root:
        - labelContainer:
            - requiredIndicator
            - label
            - secondaryDescription
        - control:
            - value
            - placeholder
            - startIcon
  elements:
    root:
      type: frame
      # no parent or children fields
    labelContainer:
      type: frame
    label:
      type: text
```

Best for: tree renderers, recursive traversal, documentation that shows component structure visually.

### `PARENT_CHILDREN` — Element-Level References

No top-level tree. Instead, each element carries its own `parent` and `children` fields:

```yaml
default:
  elements:
    root:
      type: frame
      children: [labelContainer, control]
    labelContainer:
      type: frame
      parent: root
      children: [requiredIndicator, label, secondaryDescription]
    label:
      type: text
      parent: labelContainer
```

Best for: flat registries, graph-based tooling, consumers that look up elements by name and need to navigate up or down one level at a time.

### `BOTH` — Combined

The top-level `layout` tree is present, and every element also carries `parent` and `children` fields. This is redundant by design — the two representations provide different access patterns over the same data.

```yaml
default:
  layout:
    - root:
        - labelContainer:
            - label
        - control:
            - value
  elements:
    root:
      type: frame
      children: [labelContainer, control]
    labelContainer:
      type: frame
      parent: root
      children: [label]
    label:
      type: text
      parent: labelContainer
```

Best for: consumers that need both tree traversal and direct element lookups, or when multiple downstream tools have different preferences.

## When to Use Each Format

- **`LAYOUT`** — Default. Choose when your primary consumer walks the tree top-down (rendering a component diagram, generating nested markup, displaying anatomy in docs). Keeps element objects lean by omitting relationship fields.
- **`PARENT_CHILDREN`** — Choose when consumers look up elements by name and navigate relationships from each element. Useful for flat component registries, linters that check parent/child rules, or graph-based analysis.
- **`BOTH`** — Choose when you have multiple consumers with different needs, or when a single consumer benefits from both access patterns. The data duplication is minimal and eliminates post-processing.

## Configuration

Set `layout` under `model.format` in your config file:

```yaml
# specs.config.yaml
model:
  format:
    layout: LAYOUT    # Default — top-level tree only
```

**Default**: `LAYOUT`.

## See Also

- [CLI Configuration](/specs/settings/) — full config reference
