---
title: "Anatomy"
description: "Element tree and element types"
---

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
| `$extensions` | `Record<string, unknown>` | No | DTCG §5.2.3 platform-specific extensions. Open-shape passthrough — processing packages may attach reverse-domain keys (e.g. `'com.figma'`) carrying provenance metadata; the schema does not constrain the inner structure |

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

Within variants, each element's runtime properties (children, styles, content) are described by the [`Element`](/specs/schema/elements/) type. The element tree can also be expressed as a recursive [`Layout`](/specs/schema/layout/).

## Further Reading

- [ADR 012 — Element Type References](https://github.com/DirectedEdges/specs/blob/main/adr/012-element-type-references.md) — widens `AnatomyElement.type` to support `$ref`-based external element type definitions
- [ADR 030 — Subcomponent $ref for instanceOf](https://github.com/DirectedEdges/specs/blob/main/adr/030-subcomponent-refs.md) — adds `SubcomponentRef` to `instanceOf` on AnatomyElement and Element
- [ADR 044 — Duplicate Layer Name Disambiguation](https://github.com/DirectedEdges/specs/blob/main/adr/044-duplicate-layer-disambiguation.md) — adds open-shape `$extensions` to `AnatomyElement` so processing packages can attach disambiguation provenance (e.g. `originalName`)
