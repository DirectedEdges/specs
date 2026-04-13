---
title: Code-Only Props
order: 5
description: Extract non-visual component properties from hidden Figma container layers
---

# Code-Only Props

Design systems encode more than just visual styling. Accessibility labels, semantic heading levels, ARIA roles, min/max constraints — these properties affect the coded component but have no visual representation in Figma. The `codeOnlyPropsPattern` feature tells the processing engine where to find these hidden properties and promotes them into the spec alongside visual props.

## The Problem

Figma's component property system is visual — variant properties control layer visibility, text properties bind to text content, boolean properties toggle layers. There's no built-in way to express a property like `aria-label` or `tabIndex` that only matters in code.

Teams solve this by creating a hidden container layer inside their Figma components. The container (typically named "Code only props") is effectively invisible — near-zero dimensions, clipped contents — and hosts sub-layers whose names and bindings encode the non-visual properties. Without `codeOnlyPropsPattern`, the processing engine treats this container as an ordinary anatomy element. The props it encodes are invisible in the spec output.

## What It Does

When `codeOnlyPropsPattern` is set, the processing engine:

1. **Finds the container** — scans the component's direct children for a layer whose name exactly matches the pattern string
2. **Excludes it from anatomy** — the container and its descendants are removed from the element tree, since they carry no visual meaning
3. **Extracts props** — each sub-layer inside the container becomes a prop in the spec, with its type inferred from the Figma node type:

| Sub-layer type | Extracted as | Example |
|----------------|-------------|---------|
| Text layer bound to a text property | `StringProp` (or `NumberProp` if `inferNumberProps` is enabled) | `accessibilityLabel: "Submit form"` |
| Instance of a single-variant component | `EnumProp` (or `BooleanProp` for true/false variants) | `headingLevel: h1 \| h2 \| h3 \| h4 \| h5 \| h6` |
| Boolean node | `BooleanProp` | `hasA11yOverrides: true` |

Every extracted prop carries source provenance in `$extensions["com.figma"]`, identifying it as `kind: "codeOnlyProp"` with the originating layer name. This lets consumers distinguish code-only props from visually-derived ones when needed.

### Before (without `codeOnlyPropsPattern`)

The container appears as an anatomy element, and its sub-layers are treated as nested elements:

```yaml
anatomy:
  root:
    - labelContainer
    - control
    - Code only props    # unwanted noise in the element tree
```

### After (with `codeOnlyPropsPattern: "Code only props"`)

The container is excluded from anatomy. Its sub-layers become props:

```yaml
anatomy:
  root:
    - labelContainer
    - control

props:
  accessibilityLabel:
    type: string
    default: "Submit form"
    $extensions:
      com.figma:
        source:
          kind: codeOnlyProp
          layer: accessibilityLabel
  headingLevel:
    type: string
    enum: [h1, h2, h3, h4, h5, h6]
    $extensions:
      com.figma:
        source:
          kind: codeOnlyProp
          layer: Heading Level
          instanceOf: Heading Level
```

## When to Use It

Enable `codeOnlyPropsPattern` when your Figma library follows the code-only props convention — a hidden container layer whose sub-layers encode non-visual properties. This is most valuable when:

- **Components have accessibility props** — labels, roles, live-region attributes that code needs but Figma can't visualize
- **Components have semantic props** — heading levels, tab indices, character limits
- **You want a clean anatomy** — removing the code-only container from the element tree eliminates noise in the spec

Leave it unset if your library doesn't use the code-only props convention.

## Configuration

Set `codeOnlyPropsPattern` under `model.processing` in your config file. The value is the exact name of the container layer:

```yaml
# specs.config.yaml
model:
  processing:
    codeOnlyPropsPattern: "Code only props"
```

**Default**: absent. When omitted, no code-only prop extraction occurs and the container (if present) is treated as a normal anatomy element.

The pattern is matched by **exact string equality** against direct children of the component root. It is not a regex or glob — the layer name must match exactly.

## Nesting

Code-only props can be nested inside container frames bound to boolean code-only props, forming a hierarchy:

```
root
└── Code only props (FRAME)
    ├── accessibilityLabel (TEXT)
    ├── hasA11yOverrides (BOOLEAN)
    └── A11y Overrides (FRAME — visibility bound to hasA11yOverrides)
        ├── ariaRole (TEXT)
        └── ariaLive (TEXT)
```

The processing engine traverses all descendants of the container recursively, extracting props at every level.

## Further Reading

- [Code-Only Props in Figma](https://nathanacurtis.substack.com/p/code-only-props-in-figma) — the Figma convention for encoding developer-facing properties on hidden layers
- [ADR 027 — Code-Only Props](../../adr/027-code-only-props.md) — architecture decision record covering the extraction model and provenance metadata
- [CLI Configuration](../cli/configuration.md) — full config reference
