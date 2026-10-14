---
title: "Overview"
description: "How the parts of the Specs schema relate — components and compositions, the files a spec is written as, variants and styles, slots, content, references, conventions, and the reports derived from them"
---

`specs-schema` offers a schema for describing components and composition formally and precisely as TypeScript types and JSON Schema. This file serves as a primer to understand the landscape and provide links to explore deeper when necessary.

## Types: `component`s and `composition`s

The schema organizes two kinds of spec — **`components`** and **`compositions`** — into a graph. [Components](/schema/component/) are reusable, and arranged inside other components as well as inside [compositions](/schema/composition/) that serve as a page type, template, pattern, or other scaffold. Instances of a component can be nested as an element in another component, composed in another component's slot, or arranged in a composition. When a component is only allowed to be nested inside a another specific component, it's a [subcompoennt] that's shipped with the parent.

## Files: `api`, `variants` and `examples`

A spec is written as two or three files: `api`, `variants` and `examples`. Other files, such as `styling` produced by an analysis, are not part of the formal spec.

### `api`: "The contract file"

`api` holds the [anatomy](/schema/anatomy/), [props](/schema/props/), and the prop combinations that are invalid

```yaml
props:
  <prop name>:
    type: # boolean, string, slot, ...
    ...
anatomy:
  root:
    type: container
  <element name>:
    type: # text, glyph, container, nested instance, ...
    instanceOf: # reference to another component
invalidPropCombinations:
  ...
```

### `variants`: "The styling and content file"

`variants` holds the default and varying [layout] structures, [styles] and [content].

```yaml
default:
  layout:
    - root:
      - <element name>:
        - <element name>
      ... # nested layout array structure, starting at the root
  elements:
    <element name>: # every element gets an entry
      styles:
        <style property>:
      content:
      children:
      propConfigurations: # only for nested instances
variants:
  - configurations:
      ... # key/value pairs, like disabled:true
    layout:
      ... # same schema as default, of a complete different tree
    elements:
      ... # same schema as default, for impacted elements only
```

The default variant is the complete baseline: every element fully described, with styles, content and layout. Every entry in `variants` is a layered *delta* — a [`configuration`](/schema/prop-configurations/) saying which prop values activate it along with the layout, styles and contnet that changes because of it. A component's resolved state is all the [layered variants](/guides/variant-layering/) merged in order onto the default.

#### `layout`

#### `styles`

[Styles] are organized per [element] and take different shapes:

- **Flat and wide** — dozens like `width`, `layoutSizingHorizontal`, `textColor` and `backgroundColor`.
- **Deep** — [`typography`](/schema/typography/) gathers the text properties under one node that corresponds to a text style, while [`effects`](/schema/effects/) and [`GradientValue`](/schema/gradient-value/) also have deep, sophisticated shapes.
- **Side- and corner-shaped** — `padding` and `strokeWeight` as [`Sides`](/schema/sides/); `cornerRadius` is [`Corners`](/schema/corners/) that can be single value or several addressable parts (like `{start:, end:, top:, bottom: }).

Style values can be a literal, a [`TokenReference`](/schema/token-reference/), a [`PropBinding`](/schema/prop-binding/), or a [`Conditional`](/schema/conditional/). A composite token can be bound to `typography` and `effects` (Figma's text and effect styles, respectively).

#### `content` as primitives or components

Content surfaces in components directly through primitives as wel as nested components that wrap primitives in an api.

Content is mostly two things: [text] strings and [glyph] by name, reaching an element through `content` as a literal or a `$binding` to a prop. Image content flows through as both `backgroundImage` properties on elements and source properties on components. References to image files are declared in `examples.yaml`.

All three content types — and the containers that scaffold layout — are frequently offered as components themselves too. An `Icon` component that wraps a glyph element (the simple vector) with props for size and color; a text primitive element or a `Text` component with props for style, size and color.

### `examples`

`examples` holds ready-made instances as well as examples of the component's slot(s) (which are actually compositions themselves)

## Composing Layouts and Slots

Layout is a tree, and there is one per component, per composition, and per instance. [`layout`](/schema/layout/) in a variant is where it lives.

Slots are what make those trees combine. A slot is a prop a component exposes for content it does not define, and a fill arrives one of two ways:

- **Into a default slot** — an instance filling a component's designated default slot is nested as a plain [child](/schema/children/). **The nesting is the fill**, and nothing points from one level to the next.
- **Into a named slot** — every other fill binds explicitly through a [`SlotContentRef`](/schema/slot-content-ref/) into [`slotContentExamples`](/schema/slot-content/), which is the only shape that can say *which* of several slots a fill belongs to.

Both appear in one spec, so both have to be read. Because many slots are default slots, their fills merge into **consolidated layout trees** — a composition's tree is not the concatenation of its components' trees but the result of those fills resolving into place.

**Following a slot crosses all three files.** The slot prop is declared in `api.yaml`, its example content lives in `examples.yaml`, and the binding that places it is in `variants.yaml`. That traversal is the part of the schema most worth understanding before reading a catalogue, because no single file shows it.

## References

A spec points at things rather than repeating them, with five references. Each is stored as a value in one file and resolved somewhere else — so these are the paths to follow when reading a catalogue.

**`instanceOf`** — an element is an instance of another component<br/>
Found in `api.yaml` at `anatomy.<element>.instanceOf`<br/>
Value: a component key, as a plain string<br/>
Resolves to that component's own spec folder

**[`$ref`](/schema/subcomponents/)** — an element is an instance of a subcomponent<br/>
Found in `api.yaml` and `variants.yaml` at `anatomy.<element>.instanceOf`<br/>
Value: `"#/subcomponents/<name>"`<br/>
Resolves to `subcomponents.<name>` in the same file

**[`$binding`](/schema/prop-binding/)** — a prop drives this element<br/>
Found in `variants.yaml` at `default.elements.<element>.<property>`, and the same path under each entry of `variants`<br/>
Value: `"#/props/<prop>"`<br/>
Resolves to `props.<prop>` in `api.yaml`

**[`$slotContent`](/schema/slot-content-ref/)** — this is what fills the slot<br/>
Found in `variants.yaml` at `default.elements.<element>.examples`, and in `examples.yaml` at `instanceExamples.<name>.propConfigurations.<slotProp>`<br/>
Value: `"#/components/<component>/slotContentExamples/<name>"`<br/>
Resolves to `slotContentExamples.<name>` in `examples.yaml`

**[`$token`](/schema/token-reference/)** — this style value is a design token<br/>
Found in `variants.yaml` and `examples.yaml` at `default.elements.<element>.styles.<property>`<br/>
Value: a token name, alongside a `$type`<br/>
Resolves outside the spec, to a token in the source library

`<property>` on a binding is most often `children`, `content`, `visible` or `value`.

## Conventions

[Conventions](/schema/conventions/) are the layer most easily mistaken for cosmetic. They are declared per platform in `config/conventions/`, and they change the *shape* of the spec rather than its formatting — **the same Figma file produces different specs under different conventions:**

| Convention | What it changes |
|---|---|
| [`glyphs`](/settings/glyphs/) | whether a component is typed `glyph` with a resolved name, or an ordinary element |
| [`subcomponents`](/settings/subcomponents/) | whether one component becomes a parent with nested subcomponents, or stays flat |
| [`codeOnlyProps`](/settings/code-only-props-pattern/) | whether a prop reaches the spec at all |
| [`naming`](/settings/figma-keys/) | whether a key can be reversed back to its original layer name |
| [`states`](/settings/states/) | whether a variant prop emits a CSS pseudo-class or a `data-*` attribute |

There is no defaults export for conventions, and that is deliberate: a convention's absence means the library declares no such convention, and nothing can supply that on its behalf.

## Analysis reports

[`specs analyze`](/cli/analyze/) writes summaries across the whole catalogue, into `analysis/`. These answer questions **no single spec can** — which components share a prop, which token is used nowhere, where one name means two things:

| Report | Summarizes |
|---|---|
| `props.yaml` | every prop name, its types, which components carry it, and where one name means two things |
| `styling.byToken.yaml`, `styling.byComponent.yaml`, `styling.unused.yaml` | token usage from both directions, and tokens nothing references |
| `dependencies.graph.yaml`, `dependencies.byComponent.yaml` | the `instanceOf` graph, so a change's blast radius is visible before it is made |
| `keys.yaml` | names the chosen key format cannot reconstruct — the list to fix in the source |
| `roles.yaml` | which anatomy elements declare a [role](/roles/), and which concepts the library has never used |

They are **indexes, and lossy by design.** `props.yaml` says which components share a prop; it does not carry that prop's enum values. An analysis report tells you where to look. The spec and the schema tell you what is true.

## See Also

- [Document map](/schema/document-map/) — one spec document, node by node, with a link to every type
- [Component](/schema/component/) and [Composition](/schema/composition/) — the two spec kinds
- [Conventions](/schema/conventions/) and [Settings](/schema/settings/) — the declarations that shape a run
- The guides — how to express a particular thing correctly in data, a page per topic: [variant layering](/guides/variant-layering/), [slot constraints](/guides/slot-constraints/), [consolidating props](/guides/consolidating-props/), [data layout](/guides/data-layout/), [render to Figma](/guides/render-to-figma/), and more
