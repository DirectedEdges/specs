# ADR: Composition as a First-Class Type

**Branch**: `042-composition-type`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: [ADR 025 — Flowing Content into a Nested Instance's Slot](025-nested-slot-api) *(extends and absorbs its `Composition` type proposal)*

---

## Context

The schema represents individual components with rich fidelity — anatomy, props, styling variants, layout. But the schema has no concept of *composition*: a pre-arranged grouping of component instances that expresses how components are combined in context.

Compositions appear at multiple scales in Figma-sourced design systems:

- **Slot-default content** — The specific elements placed inside a component's slot layer in Figma, representing the canonical default for that slot. For example, a `Card` component's `content` slot may have a `Body` text element and an `Action` button as its default composition.
- **Component examples** — Standalone instances of a component shown in context with all slots filled and prop values set. These demonstrate typical, ready-made usage (e.g., a `ProductCard` example with a featured image, title, and CTA button).
- **Layout compositions** — Multi-component arrangements that form a portion of a UI: a filter grid with a data table, a sidebar with accordion and checkboxes. Not a single component — a named assembly of collaborating components.
- **Page compositions** — Full-page canonical views: a default application screen with header, navigation, content area, and footer, each occupied by specific components in specific states.

Today, the schema cannot represent any of these. `SlotProp.default` holds only a string description. `PropConfigurations` accepts only scalar values — it cannot express structured slot content. There is no catalogue of named, reusable compositions that consumers can discover, render, or validate against.

DRAFT ADR-025 ("Flowing Content into a Nested Instance's Slot") began addressing the narrowest case: expressing inline slot content within a parent component's `propConfigurations`. That proposal introduced a `Composition` type with `anatomy`, `layout`, and `elements`. This ADR supersedes ADR-025 by adopting its `Composition` shape, retaining the `propConfigurations` widening it proposed, and extending the model to cover the full compositional range — from slot defaults to page views — with a shared type, named catalogue, and cross-referencing mechanism.

The recursive challenge is real but tractable. A `Card` slot holds a `ProductCard` composition; `ProductCard`'s anatomy may itself include a `Button` instance with its own slot. Rather than inlining the full recursive tree, this ADR adopts a **flat catalogue** approach: all named compositions are declared at the root level, composition anatomy elements reference component names (as `instanceOf`, already supported), and recursive nesting is resolved by consumers against the catalogue — not embedded inline in the schema.

---

## Decision Drivers

- **Composition is a first-class concept** — components and compositions are peers in the schema's conceptual model; the type hierarchy must reflect this
- **Additive-only changes** — all new fields are optional; no existing field is removed or narrowed → MINOR semver
- **Type ↔ schema symmetry** — every new type field has a corresponding schema definition (Constitution §I)
- **No runtime logic** — only type declarations and schema; no validation functions or algorithms (Constitution §II)
- **Flat catalogue over deep inline nesting** — recursive composition trees must not require unbounded schema depth; a named flat catalogue with `instanceOf` references provides tractable resolution
- **Scale independence** — the same `Composition` type must work for a slot fragment (2 elements) and a page view (dozens of component instances); `kind` classifies without requiring separate types
- **Consistent reference patterns** — referencing a named composition follows the same `string` key convention already used in `AnatomyElement.instanceOf` and `SlotProp.anyOf` — no new `$ref` protocol
- **PropConfigurations completeness** — slot content flowing from a parent into a child's slot must be expressible (ADR-025 requirement, retained here)

---

## Options Considered

### Option A: Single `Composition` type with `kind`, flat root-level catalogue, `string` key references *(Selected)*

Introduce one `Composition` type covering all scales. A `kind` field classifies each composition without requiring separate types. All named compositions are catalogued under a root-level `compositions` key. Component slots reference named compositions by their string key. The `propConfigurations` value union is widened to allow inline `Composition` for slot content authored by a parent component.

```yaml
# Root-level spec output — new shape
components:
  Card: { ... }
compositions:
  cardDefault:
    kind: slot-default
    title: Card – default content
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
          type: secondary
```

```yaml
# SlotProp — new optional field
content:
  type: slot
  defaultComposition: cardDefault   # references compositions.cardDefault
```

**Pros**:
- One type, one catalogue key — no proliferation of type variants
- `kind` enables tooling to filter/render at appropriate detail level
- Flat catalogue avoids schema recursion depth problems
- String key references are consistent with `instanceOf`, `anyOf`
- Inline `Composition` in `propConfigurations` (ADR-025 pattern) is preserved for parent-authored slot content
- All changes are additive optional fields → MINOR

**Cons / Trade-offs**:
- `kind` is advisory — the schema cannot enforce that a `slot-default` composition has exactly one slot's worth of elements; that validation is a consumer concern
- Cross-composition references (one composition using another as a sub-composition) are not explicitly modelled in this ADR — left for a follow-on

---

### Option B: Separate types per composition scale *(Rejected)*

Define `SlotComposition`, `ExampleComposition`, `LayoutComposition`, `PageComposition` as distinct types with different required/optional fields per scale.

**Rejected because**:
- The structural shape is identical across scales (`anatomy`, `elements`, `layout`); scale differences are semantic, not structural
- Four separate types multiplies the schema surface area and the downstream type import burden without adding constraint expressiveness
- Diverging shapes would require separate schema definitions, separate JSON schema refs, and separate consumer handling — adding complexity without benefit

---

### Option C: Compositions as sub-records on `Component` only *(Rejected)*

Attach compositions to the component that owns them (`Component.compositions?: Record<string, Composition>`) and skip a root-level catalogue.

**Rejected because**:
- Layout and page compositions are not owned by a single component — they span multiple components
- A slot-default composition may be shared or referenced by multiple consumers; component-scoped storage prevents cross-component reuse
- Tooling that needs to enumerate all compositions (for rendering, documentation, or validation) would have to traverse every component — a flat root-level catalogue is O(1) to access

---

### Option D: Absorb compositions into `Variant` (reuse existing structure) *(Rejected)*

A `Composition` has `elements` and `layout`, which `Variant` already has. Reuse `Variant` with a new discriminating field.

**Rejected because**:
- `Variant` is bound to a single component's prop configuration state (`configuration?: PropConfigurations`); it has no anatomy of its own
- `Composition` is a multi-element, multi-component fragment with its own `anatomy` — this is structurally distinct from a variant
- Conflating the two would make `Variant` ambiguous and would require downstream consumers to distinguish "is this a variant or a composition?" through heuristics rather than type structure

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| New: `Composition.ts` | Add `CompositionKind`, `Composition`, `Compositions` | MINOR |
| `Props.ts` | Add optional `defaultComposition?: string` to `SlotProp` | MINOR |
| `PropConfigurations.ts` | Widen value union to include `PropBinding \| Composition` | MINOR |
| `Component.ts` | Add optional `examples?: string[]` | MINOR |
| `index.ts` | Export `Composition`, `CompositionKind`, `Compositions` | MINOR |

**New file** (`types/Composition.ts`):

```yaml
# CompositionKind — classification of a composition's scale and intent
CompositionKind:
  'slot-default'   # default content for a component's named slot
  'example'        # a complete, ready-made usage of a component with slots filled
  'layout'         # a multi-component partial-page arrangement
  'page'           # a full canonical page view

# Composition — a pre-arranged grouping of component instances
Composition:
  title?: string               # human-readable label
  kind?: CompositionKind       # optional — omit for inline propConfigurations use
  anatomy: Anatomy             # required — element type map for all instances in this fragment
  elements?: Elements          # optional — style/content bindings per element
  layout?: Layout              # optional — top-level ordering of fragment children
```

```yaml
# Compositions — root-level catalogue type
Compositions: Record<string, Composition>
```

**Extended `SlotProp`** (`types/Props.ts`):

```yaml
# Before
SlotProp:
  type: 'slot'
  default?: string | null
  nullable?: boolean
  minItems?: number
  maxItems?: number
  anyOf?: string[]
  $extensions?: PropExtensions

# After
SlotProp:
  type: 'slot'
  default?: string | null
  nullable?: boolean
  minItems?: number
  maxItems?: number
  anyOf?: string[]
  defaultComposition?: string   # key into root-level compositions catalogue
  $extensions?: PropExtensions
```

**Widened `PropConfigurations`** (`types/PropConfigurations.ts`):

```yaml
# Before
PropConfigurations: Record<string, string | number | boolean>

# After
PropConfigurations: Record<string, string | number | boolean | PropBinding | Composition>
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
  examples?: string[]    # keys into root-level compositions catalogue
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `Composition` definition; add `CompositionKind` enum definition | MINOR |
| `component.schema.json` | Add `defaultComposition` property to `SlotProp` definition | MINOR |
| `component.schema.json` | Widen `PropConfigurations` `additionalProperties` to include `PropBinding` and `Composition` refs | MINOR |
| `component.schema.json` | Add `examples` property to `Component` definition | MINOR |
| `components.schema.json` | Add optional `compositions` property: `patternProperties` referencing `Composition` definition | MINOR |

**New definition** (`#/definitions/Composition` in `component.schema.json`):

```yaml
Composition:
  type: object
  description: "A pre-arranged grouping of component instances representing slot content, a usage example, a layout pattern, or a canonical page view."
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
  enum:
    - slot-default
    - example
    - layout
    - page
  description: "Classifies a composition by its scale and intent."
```

**New property** (`SlotProp.defaultComposition` in `#/definitions/SlotProp/properties`):

```yaml
defaultComposition:
  type: string
  description: "Key of a named composition in the root-level compositions catalogue that represents this slot's default content."
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
  type: array
  items:
    type: string
  description: "Keys of root-level compositions demonstrating this component in canonical usage contexts."
```

**New property** (`components.schema.json`, under `properties`):

```yaml
compositions:
  type: object
  description: "Named compositions catalogued at the spec root — slot defaults, examples, layouts, and page views."
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      $ref: "component.schema.json#/definitions/Composition"
  additionalProperties: false
```

### Notes

- `Composition.anatomy` is required — every composition must declare its element type map. `elements` and `layout` are optional because simple slot fragments may not need full styling bindings.
- `Composition.kind` is optional to preserve the inline `Composition` use case (within `propConfigurations`), where kind classification is unnecessary.
- `SlotProp.defaultComposition` is a `string` key reference, not a `$ref` object — consistent with `AnatomyElement.instanceOf` and `SlotProp.anyOf[]` which also reference component names as plain strings. Structured `$ref`-style references would require a registry concept that does not yet exist.
- `Component.examples` references root-level compositions, not inline definitions — this keeps component definitions lean and enables the same composition to be referenced from multiple contexts.
- Recursive composition is supported implicitly: `Composition.anatomy` elements can have `instanceOf: string` (referencing component names); if that component has a slot, a composition can fill it via `Composition.elements[element].propConfigurations` carrying an inline `Composition`. Consumers resolve the tree by walking the catalogue. The schema does not need to model the recursion depth explicitly.
- The `components.schema.json` change requires removing `additionalProperties: false` at the root level and replacing it with an explicit `properties` block that includes both `components` and `compositions`. Only one of the two keys needs to be present — `required: [components]` remains unchanged if component-first output is the norm; `compositions` is a standalone addition.
- `PropConfigurations` widening to include `PropBinding` completes a pattern already established: `PropBinding` (`{ $binding: "..." }`) is already used on `Element.content`, `Element.instanceOf`, and `Styles.visible`. Allowing it in `propConfigurations` values enables a parent component to bind a nested instance's scalar prop to the parent's own prop, alongside static values and `Composition` values.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — every type field maps to a schema property
- **Parity check**:
  - `Composition { title?, kind?, anatomy, elements?, layout? }` ↔ `#/definitions/Composition` with same required/optional pattern
  - `CompositionKind` string literal union ↔ `#/definitions/CompositionKind` enum
  - `Compositions = Record<string, Composition>` ↔ `components.schema.json#/properties/compositions` patternProperties
  - `SlotProp.defaultComposition?: string` ↔ `#/definitions/SlotProp/properties/defaultComposition` type string
  - `PropConfigurations` value union `string | number | boolean | PropBinding | Composition` ↔ `additionalProperties.oneOf` with five branches
  - `Component.examples?: string[]` ↔ `#/definitions/Component/properties/examples` array of string

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | New optional types appear in output shape; transformer must detect and emit composition anatomy, elements, and layout from slot layers and example frames | Read `Composition`, `CompositionKind`, `Compositions` from schema; emit `compositions` at root level and `SlotProp.defaultComposition` keys |
| `specs-cli` | Recompile against updated types; CLI output must include `compositions` key when present; `--config` may need `kind` filter options in future | Recompile; no breaking consumer change — new optional keys appear in output |
| `specs-plugin-2` | Recompile; plugin must be able to read and display composition entries in the panel when present | Recompile; composition rendering is out of scope for this ADR — panel can ignore unknown keys initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive optional fields on existing types (`SlotProp.defaultComposition`, `PropConfigurations` value union widening, `Component.examples`) or entirely new types (`Composition`, `CompositionKind`, `Compositions`) and new optional root-level schema keys (`compositions`). No existing field is removed, renamed, narrowed, or made required. Per Constitution §III: additive types and new optional fields → MINOR.

---

## Consequences

- `Composition` is a first-class type in the schema, co-equal with `Component` as a structural concept
- All four composition scales — slot default, example, layout, page — are expressible with a single type using `kind` as a classifier; no separate type proliferation
- Named compositions are catalogued at the root level of the spec output under `compositions`; tooling can enumerate, filter, and render them without traversing individual component records
- Slot default content is declared as `SlotProp.defaultComposition: string` pointing to a root-level named composition — the string `default` field retains backward compatibility as a free-form description or is deprecated in a future ADR
- Component examples are declared as `Component.examples: string[]` referencing root-level compositions — components remain lean; their usage demonstrations are decoupled from their structural definition
- Inline `Composition` in `propConfigurations` (the ADR-025 pattern) is preserved — parent components can express slot content they author without naming or cataloguing the fragment
- Recursive composition depth is tractable: `Composition.anatomy` elements carry `instanceOf` references, and `propConfigurations` can carry inline compositions for nested slot content; consumers resolve the tree by walking the flat catalogue rather than parsing unbounded schema nesting
- ADR-025 ("Flowing Content into a Nested Instance's Slot") is superseded — its `Composition` type and `PropConfigurations` widening are absorbed into this ADR with the extended shape
- Future ADRs can add cross-composition reference (`Composition.uses?: string[]`), composition-level `$extensions` for Figma provenance, or `kind`-specific required fields once the base mechanism is established
