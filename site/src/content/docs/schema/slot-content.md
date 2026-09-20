---
title: "Slot Content"
description: "The anatomy + elements + layout triplet used as a named slot fill"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>
<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

A `SlotContent` is the anonymous structural triplet — [`anatomy`](/schema/anatomy/), [`elements`](/schema/elements/), and [`layout`](/schema/layout/) — used as a named fill for a slot. It carries no metadata of its own; its identity lives at the key under which it is stored.

```ts
interface SlotContent {
  anatomy: Anatomy;
  elements: Elements;
  layout: Layout;
}
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `anatomy` | [`Anatomy`](/schema/anatomy/) | Yes | Element type map for this fill |
| `elements` | [`Elements`](/schema/elements/) | Yes | Element-level content, styles, and prop configurations |
| `layout` | [`Layout`](/schema/layout/) | Yes | Tree ordering of the elements |

## Where it lives

`SlotContent` entries are stored in named registries and referenced — never inlined — by a [`SlotContentRef`](/schema/slot-content-ref/) (`$slotContent` pointer):

- **`Component.slotContentExamples`** — component-scoped fills, e.g. `"#/components/pill/slotContentExamples/composedLabel"`. Emitted when [`settings.spec.defaultSlotContent`](/schema/settings/#spec) is on.
- **`Composition.slotContent`** — fills bundled alongside a [`Composition`](/schema/composition/)'s primary content, e.g. `"#/compositions/filterResultsPage/slotContent/pageHeader"`.

specs-from-figma de-duplicates entries by structural equality across variants and slots — identical fills share a single registry entry.

## Further Reading

- [Component Examples as Data](https://nathanacurtis.substack.com/p/component-examples-as-data) — the thinking behind examples in the spec
- [ADR 046 — Slots and Slot References](https://github.com/DirectedEdges/specs/blob/main/adr/046-slots-and-slot-references.md)
- [ADR 047 — Component Slot Examples](https://github.com/DirectedEdges/specs/blob/main/adr/047-component-slot-examples.md)
