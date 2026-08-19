---
title: "Collapse Primitive Wrapper"
description: "Strip plain container wrappers around a single text or glyph element and promote the leaf to spec root"
---

A run choice in `config/settings.yaml`. When enabled, a component whose root is a plain, style-free container holding a single `text` or `glyph` child is collapsed: the wrapper is stripped and the leaf becomes the spec root. This eliminates structural noise for purely typographic or icon primitives — such as Heading, Paragraph, Body, Label, or Icon components — where the container adds no design-system meaning.

## Configuration

```yaml
spec:
  collapsePrimitiveWrapper: true
```

## Result

**Without** collapse (`false`) a Heading component emits a two-node anatomy with a `container` root:

```yaml
anatomy:
  root:
    type: container
  label:
    type: text
    parent: root
```

**With** collapse (`true`) the wrapper is stripped and the leaf becomes root:

```yaml
anatomy:
  root:
    type: text
    $extensions:
      com.figma.name: Label
```

The `$extensions.com.figma.name` field on the anatomy root carries the Figma layer name so the source layer remains traceable.

## Eligibility

A component qualifies for collapse when **all** of the following are true:

- The root element type is `container`.
- The root has exactly one anatomy-visible child.
- That child's type is `text` or `glyph`.
- The child has no children of its own.
- The root carries no slot binding on its children.
- The root carries none of the following styles after default/zero values are stripped: `clipsContent`, `cornerRadius`, `strokes`, `strokeAlign`, `strokeWeight`, `itemSpacing`, `padding`, `effects`, `backgroundColor`, `cornerSmoothing`.

Collapse is **all-or-nothing**: if any variant in the component set fails the eligibility check, no collapse occurs for any variant.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, eligible wrapper-only components are collapsed so the leaf element becomes the spec root. When `false`, the container is emitted as root regardless of structure.

## Path

`spec.collapsePrimitiveWrapper` in `config/settings.yaml`

Stripping the wrapper is a normalization choice, not a fact about the library — keeping it is faithful to Figma and equally correct. That is why this option lives in `settings.yaml` while its neighbors from the old `processing` block moved to `conventions.yaml`.
