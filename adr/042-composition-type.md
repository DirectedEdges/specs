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

- **Slot-default content** — The specific elements placed inside a component's slot layer in Figma, representing the canonical default for that slot. For example, a `Card` component's `content` slot may have a `Body` text element and an `Action` button as its default composition.
- **Component examples** — Standalone instances of a component shown in context with all slots filled and prop values set. These demonstrate typical, ready-made usage (e.g., a `ProductCard` example with a featured image, title, and CTA button).
- **Layout compositions** — Multi-component arrangements forming a portion of a UI: a filter grid with a data table, a sidebar with an accordion and checkboxes. Not a single component — a named assembly of collaborating components.
- **Page compositions** — Full canonical views: a default application screen with header, navigation, content area, and footer, each occupied by specific components in specific states.

Today, the schema cannot represent any of these. `SlotProp.default` holds only a descriptive string. `PropConfigurations` accepts only scalar values — it cannot express structured slot content. There is no `Composition` type for tooling to discover, render, or validate against.

DRAFT ADR-025 ("Flowing Content into a Nested Instance's Slot") began addressing the narrowest case: expressing inline slot content within a parent component's `propConfigurations` when a parent component flows defined content into a child instance's slot. That proposal introduced a `Composition` type with `anatomy`, `layout`, and `elements`. This ADR supersedes ADR-025 by adopting its shape, retaining the `PropConfigurations` widening, and extending the model to cover the full compositional range.

### Composition scoping

The four composition kinds split naturally into two scopes:

- **Component-scoped** (`slot-default`, `example`): Authored by the component designer. They live inside the component definition itself under `Component.examples`. Slot defaults express what Figma places in a slot layer by default; examples show the component used in ready-made contexts. These are variant-sensitive — a slot's composition reference can differ per variant, expressed through the variant's element bindings.
- **System-scoped** (`layout`, `page`): Independent of any single component. They live in a separate file (`compositions.yaml`, parallel to `components.yaml`). The schema for that file is a follow-on ADR; this ADR defines the type that powers it.

### Slot default content and the variant layer

A slot element in the anatomy (type: `slot`) receives its content through code — callers pass children to the slot prop. In the spec, the component author declares the default slot content by setting a `CompositionRef` (`{ $composition: "key" }`) on the slot element's `children` field within `default.elements` or a specific variant's `elements`. This follows the existing pattern where `children` may be a `PropBinding` (consumer-bound) — the new `CompositionRef` branch expresses author-defined default content. Since this lives in the variant layer, different variants can reference different compositions for the same slot.

### Consumer slot content and the parent component pattern

When a *consumer* of a component authors a parent that flows content into a child's slot — e.g., a `ProductCard` that places a `Title` and `Button` inside `Card`'s `content` slot — that content is expressed as an inline `Composition` value in `PropConfigurations`. This is the ADR-025 pattern, retained here. The two patterns are complementary: the component author defines named compositions (`Component.examples`); the component consumer authors inline compositions when filling a child's slot.

---

## Decision Drivers

- **Composition is a first-class concept** — components and compositions are peers in the schema's conceptual model; the type hierarchy must reflect this
- **Additive-only changes** — all new fields are optional; no existing field is removed or narrowed → MINOR semver
- **Type ↔ schema symmetry** — every new type field has a corresponding schema definition (Constitution §I)
- **No runtime logic** — only type declarations and schema; no validation functions or algorithms (Constitution §II)
- **Variant-sensitive slot defaults** — slot default compositions must be expressible per variant, not only at the component level; the existing variant/element layer is the right location
- **Consistent reference patterns** — `$composition` follows the established `$`-prefix convention (`$binding`, `$ref`, `$token`) for structured references in the schema
- **Scale independence** — the same `Composition` type must work for a slot fragment (2 elements) and a page view (dozens of component instances); `kind` classifies without requiring separate types
- **PropConfigurations completeness** — structured slot content flowing from a parent into a child component's slot must be expressible alongside scalar prop values
- **Scope separation** — component-scoped compositions belong inside the component definition; system-scoped compositions (layouts, pages) belong in a separate file with a follow-on schema

---

## Options Considered

### Option A: `CompositionRef` in `Children`, inline `Component.examples`, `PropConfigurations` widening *(Selected)*

Introduce `Composition` and `CompositionRef` types. Component-scoped compositions live inline in `Component.examples: Record<string, Composition>`. The variant/element layer references named compositions via `CompositionRef` on the slot element's `children`. Consumer-side slot content uses an inline `Composition` in `PropConfigurations`. System-scoped compositions use `Compositions` (the same type) in a separate file defined by a follow-on ADR.

```yaml
# Component with inline examples and variant-layer slot binding
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
      children: { $composition: cardBodyDefault }   # references examples.cardBodyDefault
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
- `CompositionRef` follows the `$`-prefix convention — unambiguous in the `Children` union alongside `string[]` and `PropBinding`
- Slot default content lives in the variant layer — naturally varies per variant, no SlotProp change needed
- `Component.examples` is inline — tools can read the full composition without a separate lookup
- Author-defined (named) and consumer-defined (inline) composition patterns are distinct and complementary
- All changes additive → MINOR

**Cons / Trade-offs**:
- `Component.examples` can grow large for heavily-slotted components; schema has no length constraint (advisory concern, not a structural problem)
- Inline `Composition` in `PropConfigurations` requires consumers to handle two patterns: named (in `examples`) and inline (in `propConfigurations`)

---

### Option B: All compositions at root level, referenced by string key everywhere *(Rejected)*

All compositions (including slot defaults and examples) live in a root-level `compositions` catalogue, keyed by name. Components and slot elements reference them by string key. No inline compositions.

**Rejected because**:
- Component-scoped compositions (slot defaults, examples) are owned by one component and have no cross-component reuse value; forcing them to a shared root catalogue adds indirection without benefit
- Tooling that reads a component spec would need a separate catalogue lookup to resolve composition data
- String keys alone (without a `$`-prefix) cannot be distinguished from other string-valued fields; structured `CompositionRef` is required for unambiguous discrimination in the `Children` union

---

### Option C: Separate types per composition scale *(Rejected)*

Define `SlotComposition`, `ExampleComposition`, `LayoutComposition`, `PageComposition` as distinct types.

**Rejected because**:
- The structural shape is identical across scales (`anatomy`, `elements`, `layout`); scale differences are semantic, not structural
- Four types multiply the schema surface area and downstream import burden without adding constraint expressiveness

---

### Option D: Absorb compositions into `Variant` *(Rejected)*

A `Composition` has `elements` and `layout`, which `Variant` already has. Reuse `Variant` with a discriminating field.

**Rejected because**:
- `Variant` is bound to a single component's prop configuration state; it has no anatomy of its own
- `Composition` is a multi-element, multi-component fragment — structurally distinct from a variant

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| New: `Composition.ts` | Add `CompositionKind`, `CompositionRef`, `Composition`, `Compositions` | MINOR |
| `Children.ts` | Widen `Children` to `string[] \| PropBinding \| CompositionRef` | MINOR |
| `Component.ts` | Add optional `examples?: Record<string, Composition>` | MINOR |
| `PropConfigurations.ts` | Widen value union to `string \| number \| boolean \| PropBinding \| Composition` | MINOR |
| `index.ts` | Export `Composition`, `CompositionKind`, `CompositionRef`, `Compositions` | MINOR |

**New file** (`types/Composition.ts`):

```yaml
# CompositionKind — classification of a composition's scale and intent
CompositionKind:
  'slot-default'   # default content for a component's named slot
  'example'        # a complete, ready-made usage of a component with slots filled
  'layout'         # a multi-component partial-page arrangement (system-scoped)
  'page'           # a full canonical page view (system-scoped)

# CompositionRef — structured reference to a named composition
CompositionRef:
  $composition: string   # key in Component.examples (component-scoped)

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

**Widened `Children`** (`types/Children.ts`):

```yaml
# Before
Children: string[] | PropBinding

# After
Children: string[] | PropBinding | CompositionRef
```

```yaml
# Usage — slot element in default.elements
contentSlot:
  children: { $composition: cardBodyDefault }   # CompositionRef
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
| `component.schema.json` | Add `CompositionRef` definition | MINOR |
| `component.schema.json` | Update `Children` definition to include `CompositionRef` branch | MINOR |
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

**New definition** (`#/definitions/CompositionRef`):

```yaml
CompositionRef:
  type: object
  description: "Structured reference to a named composition in Component.examples."
  required: [$composition]
  properties:
    $composition:
      type: string
      description: "Key of the named composition in Component.examples."
  additionalProperties: false
```

**Updated `Children`** (`#/definitions/Children`):

```yaml
# Before
Children:
  oneOf:
    - type: array
      items: { type: string }
    - $ref: "#/definitions/PropBinding"

# After
Children:
  oneOf:
    - type: array
      items: { type: string }
    - $ref: "#/definitions/PropBinding"
    - $ref: "#/definitions/CompositionRef"
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

- **`compositions.yaml` file schema** — A separate schema file for system-scoped (`layout`, `page`) compositions living outside any component spec. Deferred to a follow-on ADR. The `Compositions = Record<string, Composition>` type is defined here and ready for that ADR to reference.
- **Cross-composition references** — One composition referencing another named composition via `CompositionRef` within its own `elements.*.children`. The type permits it structurally; a dedicated ADR can formalize the resolution semantics.

### Notes

- `Composition.anatomy` is required — every composition must declare its element type map. `elements` and `layout` are optional because minimal slot fragments may not need full styling or explicit ordering.
- `Composition.kind` is optional to preserve the inline `Composition` use case in `propConfigurations`, where kind classification is unnecessary noise. For named compositions in `Component.examples`, authors are expected to set `kind`; tooling may warn when it is absent.
- `CompositionRef.$composition` is a plain string key (not a JSON Pointer like `SubcomponentRef.$ref`) because it resolves locally within `Component.examples` — no pointer traversal is needed.
- `PropBinding` in `PropConfigurations` is a natural complement to inline `Composition`: it allows a parent component to bind a nested instance's scalar prop to the parent's own prop, alongside static values and composition-structured slot content. It follows the same `{ $binding: "..." }` shape already used on `Element.content`, `Element.instanceOf`, and `Styles.visible`.
- The slot default `CompositionRef` in `Children` is the author-side declaration; the inline `Composition` in `PropConfigurations` is the consumer-side declaration. These are not in conflict — they represent two distinct roles in the component hierarchy.
- Recursive composition is supported implicitly: `Composition.anatomy` elements can carry `instanceOf: string` (already supported); if that component has a slot, the composition's `elements` can carry an inline `Composition` in `propConfigurations`. Consumers resolve the tree by walking the named catalogue. No schema changes are needed for recursive support.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — every type field maps to a schema property
- **Parity check**:
  - `Composition { title?, kind?, anatomy, elements?, layout? }` ↔ `#/definitions/Composition` with same required/optional pattern
  - `CompositionKind` string literal union ↔ `#/definitions/CompositionKind` enum
  - `CompositionRef { $composition: string }` ↔ `#/definitions/CompositionRef` with required `$composition`
  - `Children = string[] | PropBinding | CompositionRef` ↔ `#/definitions/Children` updated `oneOf` (three branches)
  - `PropConfigurations` value union `string | number | boolean | PropBinding | Composition` ↔ `additionalProperties.oneOf` with five branches
  - `Component.examples?: Record<string, Composition>` ↔ `#/definitions/Component/properties/examples` patternProperties referencing `Composition`
  - `Compositions = Record<string, Composition>` — TypeScript type defined; corresponding schema file deferred to follow-on ADR

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `Component.examples` (slot-default and example compositions) from Figma slot layers and example frames; must emit `CompositionRef` in `default.elements` and variant elements; must widen `PropConfigurations` emission to include inline `Composition` | Read new types from schema; implement composition detection; update output emitters |
| `specs-cli` | Recompile against updated types; CLI output includes `examples` key when present in component spec; `Children` and `PropConfigurations` output shapes expand | Recompile; no breaking consumer change — new optional keys appear in output |
| `specs-plugin-2` | Recompile; panel may display composition entries when present | Recompile; composition rendering is a follow-on capability — panel can pass through unknown composition data initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive:
- New optional field `Component.examples` on an existing type
- New union members (`CompositionRef`) added to `Children` — existing valid values (`string[]`, `PropBinding`) remain valid
- `PropConfigurations` value union widened — existing scalar values remain valid
- New types (`Composition`, `CompositionKind`, `CompositionRef`, `Compositions`) with no removal or narrowing

Per Constitution §III: additive types and new optional fields → MINOR.

---

## Consequences

- `Composition` is a first-class type in the schema, co-equal with `Component` as a structural concept; all four scales share one type, classified by `kind`
- Component authors can declare named compositions inline in `Component.examples`; slot defaults and usage examples are discoverable alongside the component that owns them
- Slot default content is expressed in the variant/element layer via `CompositionRef` on the slot element's `children`, making it variant-sensitive at no additional schema cost
- Component consumers can flow inline `Composition` content into a child's slot via `PropConfigurations`, completing the parent-authoring pattern proposed in ADR-025
- `PropBinding` in `PropConfigurations` values enables a parent to bind a nested instance's scalar prop to its own prop, alongside static values and compositions
- `Compositions` type is defined and ready for a follow-on ADR that introduces the `compositions.yaml` schema for system-scoped layout and page compositions
- ADR-025 ("Flowing Content into a Nested Instance's Slot") is superseded — its `Composition` shape and `PropConfigurations` widening are absorbed here with the extended type
- Future ADRs can add cross-composition references, `kind`-specific required fields, composition-level `$extensions` for Figma provenance, and the system-scoped file schema without further changes to the `Composition` type structure
