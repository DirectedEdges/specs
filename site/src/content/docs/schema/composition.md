---
title: "Composition"
description: "A named, authored unit of composed content"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>
<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

A `Composition` is a named, authored unit of composed content. The top-level [`anatomy`](/schema/anatomy/) + [`elements`](/schema/elements/) + [`layout`](/schema/layout/) triplet **is** the primary content — there is no wrapper and no reserved `main` key. An optional `slotContent` map bundles named slot fills alongside that primary content for authoring convenience.

```ts
interface Composition {
  title?: string;
  description?: string;
  anatomy: Anatomy;
  elements: Elements;
  layout: Layout;
  slotContent?: Record<string, SlotContent>;
}

type Compositions = Record<string, Composition>;
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | No | Human-readable label for the composition |
| `description` | `string` | No | Purpose and usage notes for documentation tooling |
| `anatomy` | [`Anatomy`](/schema/anatomy/) | Yes | Element type map for the primary content |
| `elements` | [`Elements`](/schema/elements/) | Yes | Element-level content, styles, and prop configurations |
| `layout` | [`Layout`](/schema/layout/) | Yes | Tree ordering of the primary content |
| `slotContent` | `Record<string, `[`SlotContent`](/schema/slot-content/)`>` | No | Named slot fills bundled with this composition |

`slotContent` is an authoring convenience, not a scope boundary — fills there may reference entries in other compositions via [`SlotContentRef`](/schema/slot-content-ref/).

## Registry and references

`Compositions` (`Record<string, Composition>`) is the registry shape used by external composition files, keyed `compositions:` (system-scoped).

A [`SlotContentRef`](/schema/slot-content-ref/) pointing at a composition resolves as follows:

| Pointer | Resolves to |
|---------|-------------|
| `#/compositions/pageGrid` | the composition's top-level `anatomy + elements + layout` |
| `#/compositions/filterResultsPage/slotContent/pageHeader` | that bundled [`SlotContent`](/schema/slot-content/) |

## Further Reading

- [ADR 042 — Composition Type](https://github.com/DirectedEdges/specs/blob/main/adr/042-composition-type.md)
- [ADR 046 — Slots and Slot References](https://github.com/DirectedEdges/specs/blob/main/adr/046-slots-and-slot-references.md)
