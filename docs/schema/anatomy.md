---
title: Anatomy
order: 2
description: Element tree and element types
---

# Anatomy

The `Anatomy` is a map of named elements that make up a component's structure. Each entry describes what kind of element it is and, optionally, where it was detected and what component it is an instance of.

```ts
type Anatomy = Record<string, AnatomyElement>;
```

## AnatomyElement

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `ElementType \| ElementTypeRef` | Yes | What kind of element this is |
| `detectedIn` | `string` | No | Frame or node name where this element was found |
| `instanceOf` | `string \| SubcomponentRef` | No | Component name this element is an instance of, or a `$ref` to a subcomponent |

### ElementType

One of 11 string literals:

| Type | Description |
|------|-------------|
| `text` | Text content |
| `glyph` | Icon or symbol |
| `vector` | Vector shape |
| `container` | Layout container (frame, group) |
| `slot` | Insertion point for child content |
| `instance` | Component instance |
| `line` | Line element |
| `ellipse` | Ellipse/circle |
| `rectangle` | Rectangle |
| `polygon` | Polygon |
| `star` | Star shape |

### ElementTypeRef

A URI reference to an externally defined element type:

```ts
type ElementTypeRef = { $ref: string };
// e.g. { $ref: "foundations#/definitions/glyph" }
```

### SubcomponentRef

A JSON Pointer linking to a subcomponent defined in the same spec:

```ts
type SubcomponentRef = { $ref: string };
// e.g. { $ref: "#/subcomponents/formLabel" }
```

## Element

Within a [variant](variants.md), each element is described by the `Element` type. This carries the element's runtime properties — its children, parent, styles, content, and any prop-driven behavior.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `children` | `string[] \| PropBinding` | No | Child element names, or a binding to a slot prop |
| `parent` | `string \| null` | No | Parent element key (`null` for root) |
| `styles` | [`Styles`](styles.md) | No | Visual style properties |
| `propConfigurations` | [`PropConfigurations`](prop-configurations.md) | No | Prop values that must hold for this element to appear |
| `instanceOf` | `string \| PropBinding \| SubcomponentRef` | No | Component name, binding, or subcomponent ref |
| `content` | `string \| PropBinding` | No | Text content or glyph name, or a binding to a prop |

## Layout

The `Layout` type provides a recursive tree representation of element nesting. It's an alternative to `parent`/`children` for expressing hierarchy.

```ts
type LayoutNode = string | { [nodeName: string]: LayoutNode[] };
type Layout = LayoutNode[];
```

A leaf is a plain string (element name). A branch is an object mapping a parent element name to its children:

```json
[{ "root": [{ "labelContainer": ["label", "hint"] }, "control"] }]
```

The [`format.layout`](config.md#format) config option controls which representation appears in the output: `LAYOUT` (tree only), `PARENT_CHILDREN` (flat parent/children on each element), or `BOTH`.

## Further Reading

- [ADR 012 — Element Type References](../../adr/012-element-type-references.md) — widens `AnatomyElement.type` to support `$ref`-based external element type definitions
- [ADR 030 — Subcomponent $ref for instanceOf](../../adr/030-subcomponent-refs.md) — adds `SubcomponentRef` to `instanceOf` on AnatomyElement and Element
