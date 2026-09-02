---
title: "Collapse Primitive Wrapper"
description: "Strip a root container that only wraps one child — a text or glyph leaf, or a slot — and promote the child to spec root"
---

A run choice in `config/settings.yaml`. When enabled, a component whose root is a container holding exactly one child is collapsed: the wrapper is stripped and the child becomes the spec root.

Two shapes qualify, and they are tested differently because they lose different things:

- **A `text` or `glyph` leaf.** A container merges into a leaf, where container styles have nowhere to go, so the wrapper must carry none that matter. This eliminates structural noise for typographic and icon primitives — Heading, Paragraph, Body, Label, Icon — where the container adds no design-system meaning.
- **A slot.** Both nodes are containers with the same style signature, so the merge discards nothing and no style is tested. This applies to layout primitives — a frame whose only content is the slot its children fill.

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
And **either** of the following.

For a **leaf** child:

- That child's type is `text` or `glyph`.
- The child has no children of its own.
- The root carries no slot binding on its children.
- The root carries none of the following styles after default/zero values are stripped: `clipsContent`, `cornerRadius`, `strokes`, `strokeAlign`, `strokeWeight`, `itemSpacing`, `padding`, `effects`, `backgroundColor`, `cornerSmoothing`.

For a **slot** child:

- That child is a container whose `children` is bound to a slot property, and that property is the component's only slot.
- No variant overrides the binding.
- No style test applies — both nodes are containers, so nothing is discarded. Where both carry a style key, the slot's value is kept.

Collapse is **all-or-nothing**: if any variant in the component set fails the eligibility check, no collapse occurs for any variant.

## Collapsing a slot

**Without** collapse (`false`) a Layout component emits two boxes:

```yaml
anatomy:
  root:
    type: container
  children:
    type: slot
    parent: root
```

**With** collapse (`true`) the wrapper is stripped and the slot binding moves onto the root:

```yaml
anatomy:
  root:
    type: container
    $extensions:
      com.figma.name: Children
elements:
  root:
    children:
      $binding: "#/props/children"
```

As with a leaf, `$extensions.com.figma.name` carries the surviving layer's Figma name so the source layer remains traceable.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, eligible wrapper-only components are collapsed so the child — a leaf or a slot — becomes the spec root. When `false`, the container is emitted as root regardless of structure.

## Path

`spec.collapsePrimitiveWrapper` in `config/settings.yaml`

Stripping the wrapper is a normalization choice, not a fact about the library — keeping it is faithful to Figma and equally correct. That is why this option lives in `settings.yaml` while its neighbors from the old `processing` block moved to `conventions.yaml`.
