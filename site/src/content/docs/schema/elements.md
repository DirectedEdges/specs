---
title: "Elements"
description: "Element runtime properties and children"
---

Within a [variant](/schema/variants/), each element is described by the `Element` type. This carries the element's runtime properties — its children, parent, styles, content, and any prop-driven behavior.

```ts
type Elements = Record<string, Element>;
```

## Element

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `children` | `string[] \| SlotBinding` | No | Child element names, or a `SlotBinding` to a slot prop. `SlotBinding` extends `PropBinding` with optional `examples?: SlotContentRef[]` — authored sample fills for the slot (e.g. Figma's authoring default at index 0). Non-contractual; code consumers may ignore. |
| `parent` | `string \| null` | No | Parent element key (`null` for root) |
| `styles` | [`Styles`](/schema/styles/) | No | Visual style properties — the element's own |
| `contentStyles` | [`ContentStyles`](/schema/styles/#contentstyles) | No | Styles applied to content *filling* this element, as distinct from its own (since 0.35.0) |
| `propConfigurations` | [`PropConfigurations`](/schema/prop-configurations/) | No | Prop values that must hold for this element to appear |
| `instanceOf` | `string \| PropBinding \| SubcomponentRef` | No | Component name, binding, or subcomponent ref |
| `content` | `string \| PropBinding` | No | Text content or glyph name, or a binding to a prop |
| `$extensions` | `object` | No | Platform extensions. `com.figma` carries capture provenance for a [promoted](/settings/promote-primitives/) element — `promotedPrimitive`, the `styles` the promotion consumed, the `content` a promoted leaf carried, and the hoisted `children` fill a promoted container held (a `SlotContentRef`) |

## Styles vs. content styles

An element has two style blocks, and they describe different subjects. `styles` are the element's own — its padding, alignment, surface, sizing. `contentStyles` are what content *placed inside it* is formatted with.

On a slot element whose prop [`accepts`](/schema/props/#slotcontentkind) a string, `contentStyles` is the formatting a string fill takes on, captured from the single text layer that was the slot's default content in Figma. It varies per variant through the ordinary variant mechanism:

```yaml
default:
  elements:
    children:
      styles:
        padding: { $token: "DS Space.200", $type: dimension }
        mainAxisAlignment: CENTER
      contentStyles:
        typography: { $token: "DS Type.Label.Medium", $type: typography }
        textColor: { $token: "DS Color.Text.OnPrimary", $type: color }

variants:
  - configuration: { appearance: primary, state: hover }
    elements:
      children:
        contentStyles:
          textColor: { $token: "DS Color.Text.OnPrimaryHover", $type: color }
```

**`contentStyles` applies to a string fill only.** When the slot is filled with a component instead, that component brings its own formatting — apply `styles` and discard `contentStyles` rather than cascading it onto the instance.

`contentStyles` is meaningful only on a slot element. The schema permits it anywhere an element appears; keeping it to slot elements is an authoring and generator contract, not a validated one.

## Further Reading

- [ADR 016 — Element Content Identification](https://github.com/DirectedEdges/specs/blob/main/adr/016-element-content.md) — replaces `Element.text` with unified `Element.content` field
