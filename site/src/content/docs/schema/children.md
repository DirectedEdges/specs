---
title: "Children"
description: "An element's children — a name list or a slot binding"
---

The `children` data output of an element is either a plain array of child element names or — when the element is bound to a slot prop — a `SlotBinding`.

```ts
type Children = string[] | SlotBinding;

interface SlotBinding extends PropBinding {
  examples?: SlotContentRef[];
}
```

Because `SlotBinding extends` [`PropBinding`](/specs/schema/prop-binding/), existing `{ $binding }` values still validate — the slot variant simply adds an optional `examples` array.

## `string[]`

The ordinary case: an ordered list of the element's child element names.

```yaml
children:
  - icon
  - label
```

## `SlotBinding`

When an element's children are driven by a slot prop, `children` is a [`PropBinding`](/specs/schema/prop-binding/) (a `$binding` JSON Pointer to the slot prop) optionally carrying authored example fills.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$binding` | `string` | Yes | JSON Pointer to the slot prop (e.g. `#/props/children`) |
| `examples` | [`SlotContentRef[]`](/specs/schema/slot-content-ref/) | No | Authored example fills for the slot |

Each `examples[i]` is a [`SlotContentRef`](/specs/schema/slot-content-ref/) pointing into a [`slotContentExamples`](/specs/schema/slot-content/) registry or a [`Composition`](/specs/schema/composition/). Emitters currently write at most one entry — `examples[0]` is Figma's authoring default for the slot layer — but the array shape leaves room for more.

```yaml
children:
  $binding: "#/props/children"
  examples:
    - $slotContent: "#/components/dsAlert/slotContentExamples/dsAlert__children__default"
```

`examples` is **non-contractual reference material** — parallel to `StringProp.examples` and `NumberProp.examples`. Code consumers handle missing slots through component logic and need not honor it.

## Further Reading

- [ADR 046 — Slots and Slot References](https://github.com/DirectedEdges/specs/blob/main/adr/046-slots-and-slot-references.md)
- [defaultSlotContent (config)](/specs/config/default-slot-content/) — emit captured default fills into `examples`
