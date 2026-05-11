---
title: "Elements"
description: "Element runtime properties and children"
---

Within a [variant](/specs/schema/variants/), each element is described by the `Element` type. This carries the element's runtime properties — its children, parent, styles, content, and any prop-driven behavior.

```ts
type Elements = Record<string, Element>;
```

## Element

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `children` | `string[] \| PropBinding` | No | Child element names, or a binding to a slot prop |
| `parent` | `string \| null` | No | Parent element key (`null` for root) |
| `styles` | [`Styles`](/specs/schema/styles/) | No | Visual style properties |
| `propConfigurations` | [`PropConfigurations`](/specs/schema/prop-configurations/) | No | Prop values that must hold for this element to appear |
| `instanceOf` | `string \| PropBinding \| SubcomponentRef` | No | Component name, binding, or subcomponent ref |
| `content` | `string \| PropBinding` | No | Text content or glyph name, or a binding to a prop |

## Further Reading

- [ADR 016 — Element Content Identification](https://github.com/DirectedEdges/specs/blob/main/adr/016-element-content.md) — replaces `Element.text` with unified `Element.content` field
