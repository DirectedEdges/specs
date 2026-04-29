# ADR: Composition as a First-Class Type

**Branch**: `042-composition-type`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: [ADR 025 — Flowing Content into a Nested Instance's Slot](025-nested-slot-api) *(partially — retains its `Composition` type; defers its `PropConfigurations` widening to a follow-on ADR)*

---

## Context

The schema represents individual components with rich fidelity — anatomy, props, styling variants, layout. But the schema has no concept of *composition*: a pre-arranged grouping of component instances that expresses how components are combined in context.

Compositions appear at multiple scales in Figma-sourced design systems:

- **Slot-filling examples** — The elements Figma places inside a component's slot layer, representing what that slot shows in a named example. For example, a `Card` component's slot may have a `Body` text element and an `Action` button as its default example content.
- **Instance examples** — A complete, pre-configured usage of a component: specific prop values set and all slots filled with named slot examples. These document ready-made usages (e.g., a `ProductCard` example showing a featured layout with a title, image, and CTA button).
- **Layout compositions** — Multi-component arrangements forming a portion of a UI: a filter grid with a data table, a sidebar with an accordion and checkboxes. Not a single component — a named assembly of collaborating components.
- **Page compositions** — Full canonical views: a default application screen with header, navigation, content area, and footer, each occupied by specific components in specific states.

Today, the schema cannot represent any of these. `SlotProp.default` holds only a descriptive string. There is no `Composition` or example type for tooling to discover, render, or validate against.

DRAFT ADR-025 ("Flowing Content into a Nested Instance's Slot") introduced a `Composition` type for the inline case — a parent component flowing structured content into a child instance's slot via `PropConfigurations`. This ADR adopts the `Composition` structural shape from ADR-025 and extends the model to cover the component-example range. The `PropConfigurations` widening from ADR-025 (inline composition as a slot prop value) is deferred to a follow-on ADR, which will address how a parent component references named slot-filling examples defined on a child component rather than inlining arbitrarily nested content.

### Composition scoping

The four cases split into two scopes:

- **Component-scoped** (`slot`, `instance`): Authored by the component designer, living inside the component definition under `Component.examples`. Slot examples define the content for a named slot; instance examples show the whole component in a ready-made configuration.
- **System-scoped** (`layout`, `page`): Independent of any single component, living in a separate file (`compositions.yaml`, parallel to `components.yaml`). The schema for that file is a follow-on ADR; this ADR defines the `Composition` structural type that powers it.

### Slot default content: Figma provenance, not public API

A slot's default content — the elements Figma places inside the slot layer — is Figma-specific provenance. It is not part of the component's public API. Accordingly, the reference to a named slot example used as the Figma default belongs in `$extensions['com.figma']` on the slot-bound container `Element` within the variant/element layer, following the same pattern used by `PropExtensions` on props. Since this lives in `default.elements` or `variants[n].elements`, it is inherently variant-sensitive.

### Slot-bound containers vs. plain frame containers

In Figma's node model, a container element may be either a plain `FrameNode` or a `SlotNode` (a frame whose children are bound to a slot prop). The schema does not use distinct element types to distinguish these — the distinction is determined entirely by the `Element.children` field:

- `children: PropBinding` — slot-bound container (SlotNode); may carry `$extensions['com.figma'].defaultComposition`
- `children: string[]` — plain frame container (FrameNode); must never carry `defaultComposition`

No new element type is introduced by this ADR.

---

## Decision Drivers

- **Composition is a first-class concept** — components and compositions are peers in the schema's conceptual model; the type hierarchy must reflect this
- **Additive-only changes** — all new fields are optional; no existing field is removed or narrowed → MINOR semver
- **Type ↔ schema symmetry** — every new type field has a corresponding schema definition (Constitution §I)
- **No runtime logic** — only type declarations and schema; no validation functions or algorithms (Constitution §II)
- **No inline nesting** — inline anonymous compositions in `PropConfigurations` create unbounded recursive depth in the spec output; slot content must be expressed as named references, not inlined structures
- **Discriminated union for component examples** — `SlotExample` and `InstanceExample` are structurally distinct; a tagged union with `kind` as discriminator makes them unambiguous to tooling and JSON Schema validation
- **Figma provenance is not public API** — slot default content belongs in `$extensions['com.figma']` on the element, not in `Children` or `SlotProp`
- **Variant-sensitive slot defaults** — slot default compositions must be expressible per variant through the existing element layer
- **`$extensions` consistency** — Figma-specific element metadata follows the DTCG-derived pattern already established on `Props` and `TokenReference`
- **Scale separation** — component-scoped examples belong inside the component definition; system-scoped compositions belong in a separate file with a follow-on schema

---

## Options Considered

### Option A: `ComponentExample = SlotExample | InstanceExample`, `$extensions` for Figma defaults *(Selected)*

Introduce a `ComponentExample` discriminated union with two members: `SlotExample` (the anatomy and element bindings for a named slot's content) and `InstanceExample` (scalar prop values plus named slot-filling references). All slot content is expressed as named references — no inline nesting. Figma default content is declared via `$extensions['com.figma'].defaultComposition` on the slot-bound element. `Composition` is retained as a structural base type for system-scoped follow-on use.

```yaml
# Card — component with named examples and Figma-extension slot binding
title: Card
anatomy:
  root:
    type: container
  aSlotElement:
    type: container   # slot-bound container — children bound to a slot prop

props:
  aSlotProperty:
    type: slot

examples:
  cardBodyDefault:
    kind: slot
    slot: aSlotProperty
    title: Card – default body
    anatomy:
      body:
        type: text
      action:
        type: instance
        instanceOf: Button
    layout:
      - body
      - action
    elements:
      body:
        content: "Card body text"
      action:
        instanceOf: Button
        propConfigurations:
          label: "Learn more"

  cardFeaturedExample:
    kind: instance
    title: Card – featured usage
    slots:
      aSlotProperty: cardBodyDefault   # references examples.cardBodyDefault

default:
  elements:
    aSlotElement:
      children: { $binding: "#/props/aSlotProperty" }
      $extensions:
        com.figma:
          defaultComposition: cardBodyDefault   # Figma provenance — not public API
```

```yaml
# ProductCard — InstanceExample fills a nested instance's slot
title: ProductCard
anatomy:
  root:
    type: container
  aSlotElement:
    type: instance
    instanceOf: Card

examples:
  productCardFeatured:
    kind: instance
    title: ProductCard – featured
    propConfigurations:
      variant: featured
    slots:
      aSlotProperty: cardBodyDefault   # fills Card's aSlotProperty
```

**Pros**:
- Named references prevent unbounded inline nesting — every slot filling is a string key regardless of hierarchy depth
- `SlotExample` and `InstanceExample` are structurally distinct and discriminated by `kind`
- Figma default content stays in `$extensions` — `Children` and `SlotProp` are unchanged
- `Composition` is cleanly separated as the structural base for future system-scoped use
- All changes additive → MINOR

**Cons / Trade-offs**:
- Cross-component slot references in `InstanceExample.slots` (filling a nested instance's slot from a different component's `examples`) require a resolution protocol that is deferred to a follow-on ADR
- `PropConfigurations` for slot values in parent components is deferred — the full parent-fills-child-slot mechanism remains in ADR-025 pending the follow-on

---

### Option B: Inline `Composition` in `PropConfigurations` (ADR-025 pattern) *(Rejected)*

Allow inline anonymous `Composition` objects as values in `PropConfigurations` when filling a slot prop on a nested instance.

**Rejected because**:
- Creates unbounded recursive nesting: a composition contains component instances with their own slots, whose fillings are also inline compositions, ad infinitum
- Inline anonymous compositions cannot be named, reused, or referenced from `InstanceExample.slots`; they are invisible to tooling that catalogues compositions

---

### Option C: Single `Composition` type with `kind` covering all scales *(Rejected)*

One `Composition` type with a `kind` field covering `slot-default`, `example`, `layout`, and `page`.

**Rejected because**:
- `SlotExample` (anatomy + slot binding) and `InstanceExample` (prop values + slot refs) are structurally incompatible — they cannot share a single type without making all fields optional or requiring runtime discrimination
- Mixing component-scoped and system-scoped kinds in one type conflates two different authoring contexts

---

### Option D: Separate types per composition scale *(Rejected)*

Define `SlotComposition`, `ExampleComposition`, `LayoutComposition`, `PageComposition` as distinct types.

**Rejected because**:
- `LayoutComposition` and `PageComposition` share the same structural shape as `Composition`; duplication without benefit
- Four separate types multiply schema surface area and downstream import burden

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| New: `Composition.ts` | Add `Composition`, `SlotExample`, `InstanceExample`, `ComponentExample`, `ComponentExamples` | MINOR |
| `Element.ts` | Add optional `$extensions?: ElementExtensions`; add `ElementExtensions`, `FigmaElementExtension` | MINOR |
| `Component.ts` | Add optional `examples?: ComponentExamples` | MINOR |
| `PropConfigurations.ts` | Widen value union to include `PropBinding` | MINOR |
| `index.ts` | Export `Composition`, `SlotExample`, `InstanceExample`, `ComponentExample`, `ComponentExamples`, `ElementExtensions`, `FigmaElementExtension` | MINOR |

**New file** (`types/Composition.ts`):

```yaml
# Composition — raw structural content fragment
# Base shape used by SlotExample and by future system-scoped layout/page compositions
Composition:
  title?: string
  anatomy: Anatomy             # required
  elements?: Elements
  layout?: Layout

# SlotExample — named content for a specific slot
SlotExample:
  kind: 'slot'                 # discriminator
  slot: string                 # name of the SlotProp this example fills
  title?: string
  anatomy: Anatomy             # required
  elements?: Elements
  layout?: Layout

# InstanceExample — a pre-configured usage of the whole component
InstanceExample:
  kind: 'instance'             # discriminator
  title?: string
  propConfigurations?:
    Record<string, string | number | boolean>   # scalar prop values only
  slots?:
    Record<string, string>     # slot prop name → SlotExample key in Component.examples

# ComponentExample — discriminated union for Component.examples
ComponentExample: SlotExample | InstanceExample

# ComponentExamples — named record on Component
ComponentExamples: Record<string, ComponentExample>
```

**Extended `Element`** (`types/Element.ts`):

```yaml
# Before
Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding

# After
Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding
  $extensions?: ElementExtensions    # new — Figma-specific element metadata
```

**New types** (in `types/Element.ts`):

```yaml
FigmaElementExtension:
  defaultComposition?: string   # key in Component.examples — valid only when children is PropBinding
  [key: string]: unknown

ElementExtensions:
  'com.figma'?: FigmaElementExtension
  [key: string]: unknown
```

```yaml
# Usage — slot-bound element in default.elements or variants[n].elements
aSlotElement:
  children: { $binding: "#/props/aSlotProperty" }
  $extensions:
    com.figma:
      defaultComposition: cardBodyDefault   # references Component.examples.cardBodyDefault
```

**Extended `Component`** (`types/Component.ts`):

```yaml
# Before
Component:
  title: string
  anatomy: Anatomy
  props?: Props
  subcomponents?: Subcomponents
  default: Variant
  variants?: Variants
  invalidVariantCombinations?: PropConfigurations[]
  metadata?: Metadata

# After
Component:
  title: string
  anatomy: Anatomy
  props?: Props
  subcomponents?: Subcomponents
  default: Variant
  variants?: Variants
  invalidVariantCombinations?: PropConfigurations[]
  metadata?: Metadata
  examples?: ComponentExamples   # new — named slot and instance examples
```

**Widened `PropConfigurations`** (`types/PropConfigurations.ts`):

```yaml
# Before
PropConfigurations: Record<string, string | number | boolean>

# After
PropConfigurations: Record<string, string | number | boolean | PropBinding>
```

```yaml
# Usage — binding a nested instance's scalar prop to the parent's own prop
aSlotElement:
  instanceOf: Card
  propConfigurations:
    variant: featured                      # static scalar
    label: { $binding: "#/props/label" }   # bound to parent's label prop
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `Composition` definition | MINOR |
| `component.schema.json` | Add `SlotExample` definition | MINOR |
| `component.schema.json` | Add `InstanceExample` definition | MINOR |
| `component.schema.json` | Add `ComponentExample` definition (`oneOf` discriminated by `kind`) | MINOR |
| `component.schema.json` | Add `FigmaElementExtension` and `ElementExtensions` definitions | MINOR |
| `component.schema.json` | Add `$extensions` property to `Element` definition | MINOR |
| `component.schema.json` | Update `PropConfigurations` `additionalProperties` to include `PropBinding` | MINOR |
| `component.schema.json` | Add `examples` property to `Component` definition | MINOR |

**New definition** (`#/definitions/Composition`):

```yaml
Composition:
  type: object
  description: "Raw structural content fragment used as the base shape for SlotExample and future system-scoped compositions."
  required: [anatomy]
  properties:
    title:
      type: string
    anatomy:
      $ref: "#/definitions/Anatomy"
    elements:
      $ref: "#/definitions/Elements"
    layout:
      $ref: "#/definitions/Layout"
  additionalProperties: false
```

**New definition** (`#/definitions/SlotExample`):

```yaml
SlotExample:
  type: object
  description: "Named content for a specific slot: element anatomy, bindings, and layout for the elements that fill the slot."
  required: [kind, slot, anatomy]
  properties:
    kind:
      type: string
      enum: [slot]
    slot:
      type: string
      description: "The SlotProp name this example fills."
    title:
      type: string
    anatomy:
      $ref: "#/definitions/Anatomy"
    elements:
      $ref: "#/definitions/Elements"
    layout:
      $ref: "#/definitions/Layout"
  additionalProperties: false
```

**New definition** (`#/definitions/InstanceExample`):

```yaml
InstanceExample:
  type: object
  description: "A pre-configured usage of the whole component: scalar prop values and named slot-filling references."
  required: [kind]
  properties:
    kind:
      type: string
      enum: [instance]
    title:
      type: string
    propConfigurations:
      type: object
      description: "Scalar prop values for this example."
      additionalProperties:
        oneOf:
          - type: string
          - type: number
          - type: boolean
    slots:
      type: object
      description: "Maps slot prop names to SlotExample keys in Component.examples."
      additionalProperties:
        type: string
  additionalProperties: false
```

**New definition** (`#/definitions/ComponentExample`):

```yaml
ComponentExample:
  oneOf:
    - $ref: "#/definitions/SlotExample"
    - $ref: "#/definitions/InstanceExample"
```

**New definitions** (`#/definitions/FigmaElementExtension` and `#/definitions/ElementExtensions`):

```yaml
FigmaElementExtension:
  type: object
  properties:
    defaultComposition:
      type: string
      description: "Key of a SlotExample in Component.examples. Valid only when Element.children is a PropBinding (slot-bound container)."
  additionalProperties: true

ElementExtensions:
  type: object
  properties:
    "com.figma":
      $ref: "#/definitions/FigmaElementExtension"
  additionalProperties: true
```

**Updated `Element`** — add to `#/definitions/Element/properties`:

```yaml
$extensions:
  $ref: "#/definitions/ElementExtensions"
```

**Updated `PropConfigurations`** (`#/definitions/PropConfigurations`):

```yaml
# Before
PropConfigurations:
  type: object
  additionalProperties:
    oneOf:
      - type: string
      - type: number
      - type: boolean

# After
PropConfigurations:
  type: object
  additionalProperties:
    oneOf:
      - type: string
      - type: number
      - type: boolean
      - $ref: "#/definitions/PropBinding"
```

**New property** (`Component.examples` in `#/definitions/Component/properties`):

```yaml
examples:
  type: object
  description: "Named slot and instance examples for this component."
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      $ref: "#/definitions/ComponentExample"
  additionalProperties: false
```

### Out of scope for this ADR

- **`compositions.yaml` file schema** — Schema for system-scoped (`layout`, `page`) compositions in a separate file. Deferred to a follow-on ADR. The `Composition` structural type is defined here and ready.
- **Parent-fills-child-slot via `PropConfigurations`** — The mechanism for referencing a named `SlotExample` from a child component as a `PropConfigurations` slot value. Deferred to the follow-on that supersedes ADR-025.
- **Cross-component key resolution in `InstanceExample.slots`** — When `slots` fills a slot belonging to a nested child component, the key must resolve against that child's `Component.examples`. The resolution protocol is deferred to the follow-on ADR.
- **Nested slot filling within `SlotExample`** — When a `SlotExample` contains component instances that themselves have slots, filling those nested slots is deferred to the follow-on ADR.

### Notes

- `Composition.anatomy` is required — every composition must declare its element type map. `elements` and `layout` are optional because a minimal slot fragment may not need styling or explicit ordering.
- `SlotExample.slot` names the `SlotProp` the example fills, enabling tooling to associate the example with the correct slot without inspecting anatomy.
- `InstanceExample.slots` maps slot prop names to `SlotExample` keys in `Component.examples`. Deeper nesting — filling slots of instances within a `SlotExample` — is deferred to the follow-on ADR.
- `InstanceExample.propConfigurations` holds scalar values only (`string | number | boolean`). It is intentionally simpler than `Element.propConfigurations` (which now also accepts `PropBinding`): `InstanceExample` represents a documented configuration, not a live data binding.
- `FigmaElementExtension.defaultComposition` is valid only when `Element.children` is a `PropBinding` (slot-bound container / SlotNode in Figma). A container element with `children: string[]` is a plain FrameNode and must never carry `defaultComposition`. The schema cannot enforce this; it is a consumer validation concern.
- `PropBinding` in `PropConfigurations` allows a parent component to bind a nested instance's scalar prop to the parent's own prop, using the `{ $binding: "..." }` shape already established on `Element.content`, `Element.instanceOf`, and `Styles.visible`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — every type field maps to a schema property
- **Parity check**:
  - `Composition { title?, anatomy, elements?, layout? }` ↔ `#/definitions/Composition`
  - `SlotExample { kind: 'slot', slot, title?, anatomy, elements?, layout? }` ↔ `#/definitions/SlotExample`
  - `InstanceExample { kind: 'instance', title?, propConfigurations?, slots? }` ↔ `#/definitions/InstanceExample`
  - `ComponentExample = SlotExample | InstanceExample` ↔ `#/definitions/ComponentExample` (`oneOf`)
  - `FigmaElementExtension { defaultComposition?: string }` ↔ `#/definitions/FigmaElementExtension`
  - `ElementExtensions { 'com.figma'?: FigmaElementExtension }` ↔ `#/definitions/ElementExtensions`
  - `Element.$extensions?: ElementExtensions` ↔ `#/definitions/Element/properties/$extensions`
  - `PropConfigurations` value union `string | number | boolean | PropBinding` ↔ `additionalProperties.oneOf` (four branches)
  - `Component.examples?: ComponentExamples` ↔ `#/definitions/Component/properties/examples`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `Component.examples` (`SlotExample` from slot layers, `InstanceExample` from example frames); must emit `$extensions['com.figma'].defaultComposition` on slot-bound elements in variant data | Read new types; implement example detection; update output emitters |
| `specs-cli` | Recompile; CLI output includes `examples` key and element `$extensions` when present | Recompile; no breaking change |
| `specs-plugin-2` | Recompile; example rendering is a follow-on capability | Recompile; pass through composition data initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive:
- New optional field `Component.examples` on an existing type
- New optional field `Element.$extensions` on an existing type
- New types (`Composition`, `SlotExample`, `InstanceExample`, `ComponentExample`, `ComponentExamples`, `ElementExtensions`, `FigmaElementExtension`) — no removal or narrowing
- `PropConfigurations` value union widened to add `PropBinding` — existing scalar values remain valid

Per Constitution §III: additive types and new optional fields → MINOR.

---

## Consequences

- `Composition` is a first-class structural type in the schema; `SlotExample` and `InstanceExample` are its component-scoped manifestations
- Component authors declare named examples in `Component.examples`; slot content and usage configurations are discoverable alongside the component that owns them
- All slot-filling references are named strings — no inline anonymous compositions, no unbounded recursive nesting in the spec output
- Slot default content is Figma provenance metadata in `Element.$extensions['com.figma'].defaultComposition` — `Children` and `SlotProp` are unchanged
- `PropConfigurations` gains `PropBinding` — a parent component can bind a nested instance's scalar prop to its own prop, completing the pattern already used on `Element.content` and `Styles.visible`
- `Element` gains `$extensions` following the DTCG-derived provenance-metadata pattern established on `Props` and `TokenReference`
- `Composition` is defined and ready for a follow-on ADR introducing `compositions.yaml` for system-scoped layout and page compositions
- The parent-fills-child-slot pattern and cross-component slot key resolution are deferred to a follow-on ADR that supersedes ADR-025; ADR-025 remains open
- Future ADRs can add the system-scoped file schema, nested slot filling in `SlotExample`, and the full slot-filling mechanism without changes to the types established here
