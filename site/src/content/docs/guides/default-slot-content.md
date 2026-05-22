---
title: "Default Slot Content"
description: "Capture the default content authored inside a component's slots as reusable examples"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

A slot is a placeable content area — a region where consumers drop child components. But most slots in a real library ship with **default content** already inside them: an alert's body slot holds a heading and description, a card's media slot holds an image. That authored content is a meaningful example of how the slot is meant to be filled. The `slotContentExamples` feature captures it.

## The Problem

Without slot content examples, a `SlotProp` tells you a slot exists and whether it's nullable — but not what *good* content looks like. The default arrangement a designer carefully built inside the slot is discarded at generation time. Consumers and downstream tools (code generators, docs, AI agents) are left guessing at the intended composition.

## What It Does

When enabled, the engine walks each component's slot layers, captures the content placed inside them **structurally** (anatomy + layout + element styles), and emits it under `Component.slotContentExamples`. Each slot binding then references its example by JSON Pointer via `$slotContent`, so the default content travels with the spec.

No detection patterns are required — slot content is derived from whatever already sits inside the slot layers. The only control is the `defaultSlotContent` flag.

```yaml
children:
  $binding: "#/props/children"
  examples:
    - $slotContent: "#/components/dsAlert/slotContentExamples/dsAlert__children__default"
```

```yaml
slotContentExamples:
  dsAlert__children__default:
    anatomy: { ... }   # heading + description structure
    elements: { ... }  # per-element styles & content
    layout: [ ... ]    # arrangement
```

Identical fills across variants and components de-duplicate to a single entry, keyed by the host and slot.

## How to Author It

1. Place real default content inside the component's slot layer in Figma (e.g. a heading + description inside an Alert's content slot).
2. Keep the arrangement representative — it becomes the canonical example.
3. Enable the feature (below) and generate.

## Configuration

```yaml
# specs.config.yaml
config:
  include:
    defaultSlotContent: true
```

**Default**: `false`. Existing output is unchanged until you opt in.

:::note[Pro feature]
`defaultSlotContent` requires a [Pro license](/specs/overview/licensing/). On the free tier the flag is ignored — no slot content is emitted. In the Figma plugin the control is hidden until a Pro license is active.
:::

## Default Slot Content vs. Instance Examples

These are two different things, often confused:

- **Default slot content** (this guide) — the content *inside a slot*, captured structurally. No detection config; `defaultSlotContent` is the only switch.
- **[Instance (ready-made) examples](/specs/guides/instance-examples/)** — whole pre-configured *instances* of a component, detected from named frames via `processing.instanceExamples`.

## Further Reading

- [`defaultSlotContent`](/specs/config/default-slot-content/) — config reference
- [Instance (Ready-Made) Examples](/specs/guides/instance-examples/) — the sibling feature
- [Schema: Component](/specs/schema/component/) — the `slotContentExamples` registry shape
