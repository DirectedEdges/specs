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

## Two shapes, and which one you get

Everything above describes a component's **own** slot layer. The reference shape is the only one available there, and nothing about it changed: the component declares the slot, so content inside it is that slot's authored default.

The other shape appears when the content includes a **nested instance** whose own slot is filled — a card inside the slot, with content inside the card. If your library declares [`slots.default.match`](/settings/default-slot/), and the card's filled slot is the one it names, that content is captured as the card's **children** rather than as a second registry entry:

```yaml
slotContentExamples:
  dsAlert__children__default:
    anatomy:
      text: { type: container }
      title: { type: text }
      card: { type: instance, instanceOf: dsCard }
      label: { type: text }
    layout:
      - text:
          - title
      # `card`'s default slot is filled by nesting, inside this same entry
      - card:
          - label
```

Without the convention, `card`'s fill would be its own entry — `dsAlert__dsCard__children` — pointed at from a `$slotContent` on the `card` element. One level is easy to read either way; four levels of nested layout components is the difference between one tree and a chain of four entries you have to follow by hand.

A **non**-default slot on that card keeps the reference shape, so a card with both a `children` and a `header` slot shows both in one entry. See [`slots.default`](/settings/default-slot/) for the convention, and note that the `defaultSlotContent` flag on this page is what decides whether a component records any of this in the first place.

## How to Author It

1. Place real default content inside the component's slot layer in Figma (e.g. a heading + description inside an Alert's content slot).
2. Keep the arrangement representative — it becomes the canonical example.
3. Enable the feature (below) and generate.

## Configuration

```yaml
# config/settings.yaml
spec:
  defaultSlotContent: true
```

**Default**: `false`. Existing output is unchanged until you opt in.

:::note[Pro feature]
`defaultSlotContent` requires a [Pro license](/overview/licensing/). On the free tier the flag is ignored — no slot content is emitted. In the Figma plugin the control is hidden until a Pro license is active.
:::

## Default Slot Content vs. Instance Examples

These are two different things, often confused:

- **Default slot content** (this guide) — the content *inside a slot*, captured structurally. No detection config; `defaultSlotContent` is the only switch.
- **[Instance (ready-made) examples](/guides/instance-examples/)** — whole pre-configured *instances* of a component, detected from named frames via the `figma.instanceExamples` convention.

## Further Reading

- [`defaultSlotContent`](/settings/default-slot-content/) — config reference
- [`slots.default`](/settings/default-slot/) — naming the library's default slot, which decides the nested shape above
- [Instance (Ready-Made) Examples](/guides/instance-examples/) — the sibling feature
- [Schema: Component](/schema/component/) — the `slotContentExamples` registry shape
