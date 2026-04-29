# ADR: Composition as a First-Class Type

**Branch**: `042-composition-type`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: [ADR 025 — Flowing Content into a Nested Instance's Slot](025-nested-slot-api) *(extends and absorbs its `Composition` type and `PropConfigurations` widening)*

---

## Context

The schema represents individual components with rich fidelity — anatomy, props, styling variants, layout. But the schema has no concept of *composition*: a pre-arranged grouping of component instances that expresses how components are combined in context.

Compositions appear at multiple scales in Figma-sourced design systems:

- **Slot-default content** — The specific elements Figma places inside a component's slot layer, representing what that slot shows by default. For example, a `Card` component's `content` slot may have a `Body` text element and an `Action` button as its default composition.
- **Component examples** — Standalone instances of a component shown in context with slots filled and prop values set. These demonstrate typical, ready-made usage (e.g., a `ProductCard` example with a featured image, title, and CTA button).
- **Layout compositions** — Multi-component arrangements forming a portion of a UI: a filter grid with a data table, a sidebar with an accordion and checkboxes. Not a single component — a named assembly of collaborating components.
- **Page compositions** — Full canonical views: a default application screen with header, navigation, content area, and footer, each occupied by specific components in specific states.

Today, the schema cannot represent any of these. `SlotProp.default` holds only a descriptive string. `PropConfigurations` accepts only scalar values — it cannot express structured slot content. There is no `Composition` type for tooling to discover, render, or validate against.

DRAFT ADR-025 ("Flowing Content into a Nested Instance's Slot") began addressing the narrowest case: expressing inline slot content within a parent component's `propConfigurations` when a parent component flows defined content into a child instance's slot. That proposal introduced a `Composition` type with `anatomy`, `layout`, and `elements`. This ADR supersedes ADR-025 by adopting its shape, retaining the `PropConfigurations` widening, and extending the model to cover the full compositional range.

### Composition scoping

The four composition kinds split naturally into two scopes:

- **Component-scoped** (`slot-default`, `example`): Authored by the component designer, living inside the component definition under `Component.examples`. Slot defaults express what Figma places in a slot by default; examples show the component in ready-made contexts.
- **System-scoped** (`layout`, `page`): Independent of any single component, living in a separate file (`compositions.yaml`, parallel to `components.yaml`). The schema for that file is a follow-on ADR; this ADR defines the shared `Composition` type that powers it.

### Slot default content: Figma provenance, not public API

A slot's default content — the specific elements Figma places inside the slot layer — is Figma-specific provenance data. It is not part of the component's public API: the API does not prescribe what consumers must pass into a slot. Accordingly, the slot default composition reference belongs in `$extensions['com.figma']` on the slot `Element` within the variant/element layer, following the same provenance-metadata pattern used by `PropExtensions` on props. Since this lives in `default.elements` or `variants[n].elements`, it is inherently variant-sensitive — different variants can declare different default compositions for the same slot.

### Consumer slot content and the parent component pattern

When a *consumer* of a component authors a parent that flows content into a child's slot — e.g., a `ProductCard` that places a `Title` and `Button` inside `Card`'s `content` slot — that content is expressed as an inline `Composition` value in `PropConfigurations`. This is the ADR-025 pattern, retained here. The two patterns are complementary: the component author declares named default compositions in Figma extension metadata; the component consumer authors inline compositions when filling a child's slot.

---

## Decision Drivers

- **Composition is a first-class concept** — components and compositions are peers in the schema's conceptual model; the type hierarchy must reflect this
- **Additive-only changes** — all new fields are optional; no existing field is removed or narrowed → MINOR semver
- **Type ↔ schema symmetry** — every new type field has a corresponding schema definition (Constitution §I)
- **No runtime logic** — only type declarations and schema; no validation functions or algorithms (Constitution §II)
- **Figma provenance is not public API** — slot default content originates from Figma's design; it belongs in `$extensions['com.figma']` on the element, not in the public `Children` type or `SlotProp`
- **Variant-sensitive slot defaults** — slot default compositions must be expressible per variant; the variant/element layer is the right location
- **`$extensions` consistency** — Figma-specific metadata on elements follows the same DTCG-derived `$extensions` pattern already established on `Props` and `TokenReference`
- **Scale independence** — the same `Composition` type must work for a slot fragment (2 elements) and a page view (dozens of component instances); `kind` classifies without requiring separate types
- **PropConfigurations completeness** — structured slot content flowing from a parent into a child component's slot must be expressible alongside scalar prop values
- **Scope separation** — component-scoped compositions belong inside the component definition; system-scoped compositions (layouts, pages) belong in a separate file with a follow-on schema

---

## Options Considered

### Option A: `Component.examples` inline, `$extensions` on `Element` for slot defaults, `PropConfigurations` widening *(Selected)*

Introduce `Composition` as a type. Component-scoped compositions live inline in `Component.examples: Record<string, Composition>`, classified by `kind`. Slot default content is declared as Figma provenance metadata via `$extensions['com.figma'].defaultComposition` on the slot `Element` within the variant layer — keeping `Children` clean and free of Figma-specific concerns. Consumer-side slot content uses an inline `Composition` in `PropConfigurations` (ADR-025 pattern). System-scoped compositions use the same `Composition` type in a separate file defined by a follow-on ADR.

```yaml
# Component with inline examples and Figma-extension slot binding
title: Card
anatomy:
  root:
    type: container
  contentSlot:
    type: slot
props:
  content:
    type: slot

examples:
  cardBodyDefault:
    kind: slot-default
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

default:
  elements:
    contentSlot:
      $extensions:
        com.figma:
          defaultComposition: cardBodyDefault   # key in Component.examples
```

```yaml
# Parent component (ProductCard) flowing inline content into Card's slot
default:
  elements:
    card:
      instanceOf: Card
      propConfigurations:
        content:                       # Card's slot prop — inline Composition value
          anatomy:
            title:
              type: text
            cta:
              type: instance
              instanceOf: Button
          layout:
            - title
            - cta
          elements:
            title:
              content: { $binding: "#/props/title" }
            cta:
              instanceOf: Button
              propConfigurations:
                label: { $binding: "#/props/ctaLabel" }
```

**Pros**:
- `Children` stays unchanged — no Figma-specific branches in a core structural type
- `$extensions` on `Element` follows the established provenance-metadata pattern
- Slot default declarations are variant-sensitive through the existing element layer
- `Component.examples` is inline — tools read the full composition without a separate lookup
- Author-defined (named) and consumer-defined (inline) composition patterns are distinct and complementary
- All changes additive → MINOR

**Cons / Trade-offs**:
- `Component.examples` can grow large for heavily-slotted components (advisory concern; schema has no length constraint)
- Inline `Composition` in `PropConfigurations` requires consumers to handle two patterns: named (author declares in `Component.examples`) and inline (consumer authors in `propConfigurations`)

---

### Option B: `CompositionReference` in `Children` *(Rejected)*

Add a `CompositionReference = { $composition: string }` type as a new branch of `Children`, so a slot element's `children` field can directly reference a named composition.

**Rejected because**:
- `Children` is a public structural type used on all elements — adding a Figma-sourced reference branch pollutes it with provenance-specific semantics
- Slot default content is Figma-specific data (what Figma puts in the slot layer); it is not the slot's public API default. The `$extensions` pattern is the established home for such metadata.
- The `Children` union would become ambiguous in intent: `string[]` (layout children), `PropBinding` (consumer-bound), and `CompositionReference` (Figma provenance) have fundamentally different semantic roles

---

### Option C: All compositions at root level, referenced by string key everywhere *(Rejected)*

All compositions (including slot defaults and examples) live in a root-level `compositions` catalogue. Components and slot elements reference them by string key.

**Rejected because**:
- Component-scoped compositions are owned by one component and have no cross-component reuse value; forcing them to a shared root catalogue adds indirection without benefit
- Tooling reading a component spec would need a separate catalogue lookup to resolve composition data
- String keys in structural fields cannot be distinguished from other string values without a structured reference type

---

### Option D: Separate types per composition scale *(Rejected)*

Define `SlotComposition`, `ExampleComposition`, `LayoutComposition`, `PageComposition` as distinct types.

**Rejected because**:
- The structural shape is identical across all scales (`anatomy`, `elements`, `layout`); scale is semantic, not structural
- Four types multiply schema surface area and downstream import burden without adding constraint expressiveness

---

### Option E: Absorb compositions into `Variant` *(Rejected)*

A `Composition` has `elements` and `layout`, which `Variant` already has. Reuse `Variant` with a discriminating field.

**Rejected because**:
- `Variant` is bound to a single component's prop configuration state; it has no anatomy of its own
- `Composition` is a multi-element, multi-component fragment — structurally and conceptually distinct from a variant

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| New: `Composition.ts` | Add `CompositionKind`, `Composition`, `Compositions` | MINOR |
| `Element.ts` | Add optional `$extensions?: ElementExtensions`; add `ElementExtensions`, `FigmaElementExtension` | MINOR |
| `Component.ts` | Add optional `examples?: Record<string, Composition>` | MINOR |
| `PropConfigurations.ts` | Widen value union to `string \| number \| boolean \| PropBinding \| Composition` | MINOR |
| `index.ts` | Export `Composition`, `CompositionKind`, `Compositions`, `ElementExtensions`, `FigmaElementExtension` | MINOR |

**New file** (`types/Composition.ts`):

```yaml
# CompositionKind — classification of a composition's scale and intent
CompositionKind:
  'slot-default'   # default content Figma places in a component's named slot
  'example'        # a complete, ready-made usage of a component with slots filled
  'layout'         # a multi-component partial-page arrangement (system-scoped)
  'page'           # a full canonical page view (system-scoped)

# Composition — a pre-arranged grouping of component instances
Composition:
  title?: string               # human-readable label
  kind?: CompositionKind       # optional for inline propConfigurations use; expected for named compositions
  anatomy: Anatomy             # required — element type map for all instances in this fragment
  elements?: Elements          # optional — style/content/propConfigurations bindings per element
  layout?: Layout              # optional — ordering of fragment children

# Compositions — convenience type for a named record of compositions
Compositions: Record<string, Composition>
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
  $extensions?: ElementExtensions    # Figma-specific element metadata
```

**New types** (in `types/Element.ts`):

```yaml
# Figma-specific metadata for a slot element's default composition
FigmaElementExtension:
  defaultComposition?: string   # key in Component.examples — only meaningful for slot-type elements
  [key: string]: unknown        # additional Figma metadata passes through

# DTCG §5.2.3 platform-specific extensions for element definitions
ElementExtensions:
  'com.figma'?: FigmaElementExtension
  [key: string]: unknown
```

```yaml
# Usage — slot element in default.elements or variants[n].elements
contentSlot:
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
  examples?: Record<string, Composition>   # component-scoped named compositions
```

**Widened `PropConfigurations`** (`types/PropConfigurations.ts`):

```yaml
# Before
PropConfigurations: Record<string, string | number | boolean>

# After
PropConfigurations: Record<string, string | number | boolean | PropBinding | Composition>
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `Composition` definition | MINOR |
| `component.schema.json` | Add `CompositionKind` definition | MINOR |
| `component.schema.json` | Add `ElementExtensions` and `FigmaElementExtension` definitions | MINOR |
| `component.schema.json` | Add `$extensions` property to `Element` definition | MINOR |
| `component.schema.json` | Update `PropConfigurations` `additionalProperties` to include `PropBinding` and `Composition` | MINOR |
| `component.schema.json` | Add `examples` property to `Component` definition | MINOR |

**New definition** (`#/definitions/Composition`):

```yaml
Composition:
  type: object
  description: "A pre-arranged grouping of component instances: slot default content, a usage example, a layout pattern, or a canonical page view."
  required: [anatomy]
  properties:
    title:
      type: string
      description: "Human-readable label for this composition."
    kind:
      $ref: "#/definitions/CompositionKind"
    anatomy:
      $ref: "#/definitions/Anatomy"
    elements:
      $ref: "#/definitions/Elements"
    layout:
      $ref: "#/definitions/Layout"
  additionalProperties: false
```

**New definition** (`#/definitions/CompositionKind`):

```yaml
CompositionKind:
  type: string
  enum: [slot-default, example, layout, page]
  description: "Classifies a composition by its scale and intent."
```

**New definitions** (`#/definitions/FigmaElementExtension` and `#/definitions/ElementExtensions`):

```yaml
FigmaElementExtension:
  type: object
  description: "Figma-specific metadata for an element definition."
  properties:
    defaultComposition:
      type: string
      description: "Key of a named composition in Component.examples that represents this slot element's default content. Only meaningful when the element's anatomy type is 'slot'."
  additionalProperties: true   # additional Figma metadata passes through

ElementExtensions:
  type: object
  description: "DTCG §5.2.3 platform-specific extensions for element definitions."
  properties:
    "com.figma":
      $ref: "#/definitions/FigmaElementExtension"
  additionalProperties: true
```

**Updated `Element`** (`#/definitions/Element/properties`):

```yaml
# New property added to the Element definition
$extensions:
  $ref: "#/definitions/ElementExtensions"
  description: "Platform-specific extensions for this element."
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
      - $ref: "#/definitions/Composition"
```

**New property** (`Component.examples` in `#/definitions/Component/properties`):

```yaml
examples:
  type: object
  description: "Component-scoped named compositions: slot defaults and ready-made usage examples."
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      $ref: "#/definitions/Composition"
  additionalProperties: false
```

### Out of scope for this ADR

- **`compositions.yaml` file schema** — A schema file for system-scoped (`layout`, `page`) compositions living outside any component spec. Deferred to a follow-on ADR. The `Compositions = Record<string, Composition>` type is defined here and ready for that ADR to reference.
- **Cross-composition references** — One composition referencing another named composition within its own element data. The type permits it structurally; a dedicated ADR can formalize resolution semantics.

### Notes

- `Composition.anatomy` is required — every composition must declare its element type map. `elements` and `layout` are optional because minimal slot fragments may not need full styling or explicit ordering.
- `Composition.kind` is optional to preserve the inline `Composition` use case in `propConfigurations`, where kind classification adds noise. For named compositions in `Component.examples`, authors are expected to set `kind`; tooling may warn when it is absent.
- `FigmaElementExtension.defaultComposition` is a plain string key — it resolves locally within `Component.examples`. It is advisory: the schema cannot enforce that it references a valid key, and it is only meaningful when the element's anatomy type is `slot`. Validation is a consumer concern.
- `PropBinding` in `PropConfigurations` is a natural complement to inline `Composition`: it allows a parent component to bind a nested instance's scalar prop to the parent's own prop alongside static values and composition-structured slot content. It follows the same `{ $binding: "..." }` shape already used on `Element.content`, `Element.instanceOf`, and `Styles.visible`.
- The `$extensions['com.figma'].defaultComposition` (author-side, Figma provenance) and the inline `Composition` in `PropConfigurations` (consumer-side, parent authoring) are complementary — not in conflict. They represent two distinct roles: the component designer declares what Figma shows by default; the parent component author declares what they place in the slot when composing.
- Recursive composition is supported implicitly: `Composition.anatomy` elements can carry `instanceOf: string` (already supported); if that component has a slot, the composition's `elements` can carry an inline `Composition` in `propConfigurations`. No schema changes are needed for recursive support.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — every type field maps to a schema property
- **Parity check**:
  - `Composition { title?, kind?, anatomy, elements?, layout? }` ↔ `#/definitions/Composition` with same required/optional pattern
  - `CompositionKind` string literal union ↔ `#/definitions/CompositionKind` enum
  - `FigmaElementExtension { defaultComposition?: string }` ↔ `#/definitions/FigmaElementExtension` with optional `defaultComposition`
  - `ElementExtensions { 'com.figma'?: FigmaElementExtension }` ↔ `#/definitions/ElementExtensions`
  - `Element.$extensions?: ElementExtensions` ↔ `#/definitions/Element/properties/$extensions`
  - `PropConfigurations` value union `string | number | boolean | PropBinding | Composition` ↔ `additionalProperties.oneOf` with five branches
  - `Component.examples?: Record<string, Composition>` ↔ `#/definitions/Component/properties/examples` patternProperties referencing `Composition`
  - `Compositions = Record<string, Composition>` — TypeScript type defined; corresponding schema file deferred to follow-on ADR

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `Component.examples` from Figma slot layers and example frames; must emit `$extensions['com.figma'].defaultComposition` on slot elements in variant data; must widen `PropConfigurations` emission to include inline `Composition` | Read new types from schema; implement composition detection and Figma extension emission; update output emitters |
| `specs-cli` | Recompile against updated types; CLI output includes `examples` key and element `$extensions` when present in component spec | Recompile; no breaking consumer change — new optional keys appear in output |
| `specs-plugin-2` | Recompile; panel may display composition entries when present | Recompile; composition rendering is a follow-on capability — panel can pass through composition data initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive:
- New optional field `Component.examples` on an existing type
- New optional field `Element.$extensions` on an existing type
- New types (`Composition`, `CompositionKind`, `Compositions`, `ElementExtensions`, `FigmaElementExtension`) — no removal or narrowing
- `PropConfigurations` value union widened — existing scalar values remain valid

Per Constitution §III: additive types and new optional fields → MINOR.

---

## Consequences

- `Composition` is a first-class type in the schema, co-equal with `Component` as a structural concept; all four scales share one type, classified by `kind`
- Component authors can declare named compositions inline in `Component.examples`; slot defaults and usage examples are discoverable alongside the component that owns them
- Slot default content is Figma provenance metadata, expressed via `$extensions['com.figma'].defaultComposition` on the slot element in the variant layer — keeping `Children` clean and the public schema free of Figma-specific branches
- Slot default declarations are variant-sensitive: different variants can declare different default compositions for the same slot through the existing element layer
- Component consumers can flow inline `Composition` content into a child's slot via `PropConfigurations`, completing the parent-authoring pattern proposed in ADR-025
- `PropBinding` in `PropConfigurations` values enables a parent to bind a nested instance's scalar prop to its own prop alongside static values and compositions
- `Element` gains `$extensions` following the same DTCG-derived provenance-metadata pattern established on `Props` and `TokenReference`
- `Compositions` type is defined and ready for a follow-on ADR that introduces the `compositions.yaml` schema for system-scoped layout and page compositions
- ADR-025 ("Flowing Content into a Nested Instance's Slot") is superseded — its `Composition` shape and `PropConfigurations` widening are absorbed here with the extended type
- Future ADRs can add cross-composition references, `kind`-specific required fields, and the system-scoped file schema without further changes to the `Composition` type structure
