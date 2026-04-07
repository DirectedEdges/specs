---
title: Elements
order: 3
description: Element runtime properties and children
---

# Elements

Within a [variant](variants.md), each element is described by the `Element` type. This carries the element's runtime properties — its children, parent, styles, content, and any prop-driven behavior.

```ts
type Elements = Record<string, Element>;
```

## Element

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `children` | `string[] \| PropBinding` | No | Child element names, or a binding to a slot prop |
| `parent` | `string \| null` | No | Parent element key (`null` for root) |
| `styles` | [`Styles`](styles.md) | No | Visual style properties |
| `propConfigurations` | [`PropConfigurations`](prop-configurations.md) | No | Prop values that must hold for this element to appear |
| `instanceOf` | `string \| PropBinding \| SubcomponentRef` | No | Component name, binding, or subcomponent ref |
| `content` | `string \| PropBinding` | No | Text content or glyph name, or a binding to a prop |

## Further Reading

- [ADR 016 — Element Content Identification](../../adr/016-element-content.md) — replaces `Element.text` with unified `Element.content` field
