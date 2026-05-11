# ADR: Component Examples — InstanceExample and Component.examples

**Branch**: `046-component-examples`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-042 — Composition Structural Type](042-composition-type)
**Extended by**: [ADR-047 — Slot Content](047-slot-content), [ADR-049 — Nested Slot Compositions](049-nested-slot-compositions) *(slot fill is expressed via `propConfigurations`; this ADR no longer carries a separate `slots` field)*

---

## Context

ADR-042 established `Composition` as the structural base type. That type has no authoring home yet — no field on `Component` accepts it, and no consumer-facing entry point exists.

Components need a named catalogue of pre-configured examples: a documented set of specific prop values that expresses canonical usages. Tooling can discover and render these without inspecting the raw variant tree. Authors can reference them by key instead of repeating configuration inline.

This ADR covers the simplest case: an example defined entirely by scalar prop values (`state`, `title`, `description`, and similar string/number/boolean props). Slot fills — including the recursive composition story — are scoped out and handled by ADR-049 through `Element.propConfigurations`, not via a dedicated field on `InstanceExample`.

`InstanceExample` is the type for this case. It captures:
- An optional human-readable label (`title`)
- Scalar prop values (`propConfigurations`)

`Component.examples` is the named record that holds `InstanceExample` entries.

---

## Decision Drivers

- **Named record, not array** — examples must be referenceable by key; `Element.$extensions['com.figma'].defaultComposition` (ADR-047) and the slot-fill mechanism (ADR-049) both point to keys, not indices
- **No discriminator field** — `Component.examples` will only ever contain `InstanceExample` entries (slot fills are `Element.propConfigurations` per ADR-049; Figma authoring defaults are `Component.slotContent` per ADR-047). No `kind` field is needed because no other shape competes for the same record
- **Scalar-only `propConfigurations`** — `InstanceExample` represents a documented configuration for human readers and tooling, not a live data binding; `PropBinding` belongs in `Element.propConfigurations` (ADR-048), not here
- **Scalar-prop scope here; slot fill is ADR-049 territory** — `InstanceExample` documents scalar prop usages only. Filling slot props is part of the broader composition-recursion story and is handled through `Element.propConfigurations` per ADR-049, not via a dedicated field on `InstanceExample`
- **Additive-only** — new optional field `Component.examples`; no existing type changed → MINOR
- **Type ↔ schema symmetry** — every field has a schema counterpart (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)

---

## Options Considered

### Option A: `InstanceExample` as a record member *(Selected)*

Add `InstanceExample { title?, propConfigurations? }` and a named record `ComponentExamples` on `Component`. No discriminator field — `ComponentExamples` only holds one shape.

```yaml
# ActionListItem — instance examples covering scalar prop variants
title: Action List Item
anatomy:
  root:
    type: container
  label:
    type: text
  description:
    type: text

props:
  state:
    type: string
  title:
    type: string
  description:
    type: string

examples:
  defaultState:
    title: Action List Item – default
    propConfigurations:
      state: default
      title: Browse all issues
      description: 12 open · 3 closed

  activeState:
    title: Action List Item – active
    propConfigurations:
      state: active
      title: Browse all issues
      description: 12 open · 3 closed

  dangerState:
    title: Action List Item – danger
    propConfigurations:
      state: danger
      title: Delete branch
      description: This action cannot be undone
```

**Pros**:
- Named keys enable reference-by-string from `defaultComposition` (ADR-047) and from slot-fill mechanisms (ADR-049) without type coupling
- Scalar-only `propConfigurations` keeps `InstanceExample` simple and human-readable
- No discriminator field — minimum surface, since no other shape shares the record

**Cons / Trade-offs**:
- None at the scope of this ADR; slot fill is intentionally deferred to ADR-049

---

### Option B: Flat scalar map *(Rejected)*

Store examples as `Record<string, Record<string, string | number | boolean>>` — a named map of prop value maps, with no wrapping object.

**Rejected because**: There's no place for per-example metadata. `title` (and any future additive fields like `description`, `tags`, `deprecated`, `guidelines`) would have to be smuggled into the prop-name space with reserved-key conventions, which collides with real prop names and adds parser complexity. The `InstanceExample` wrapper is a thin object that gives metadata a clean home for free.

---

### Option C: Extend `Variant` for examples *(Rejected)*

Reuse the existing `Variant` type for examples — a `Variant` already has `configuration?`, `elements?`, `layout?`.

**Rejected because**: `Variant` represents a display state driven by prop combination. `InstanceExample` is a documented usage configuration with human intent. They are conceptually distinct; merging them would force `Variant` to carry optional fields that apply to only one of its two roles.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| New: `ComponentExample.ts` | Add `InstanceExample`, `ComponentExamples` | MINOR |
| `Component.ts` | Add optional `examples?: ComponentExamples` | MINOR |
| `index.ts` | Export `InstanceExample`, `ComponentExamples` | MINOR |

**New types** (`types/ComponentExample.ts`):

```yaml
# InstanceExample — a pre-configured usage of the whole component
InstanceExample:
  title?: string
  propConfigurations?:
    Record<string, string | number | boolean>    # scalar prop values only
                                                 # slot prop fills are NOT here — see ADR-049

# ComponentExamples — named record on Component
ComponentExamples: Record<string, InstanceExample>
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
  examples?: ComponentExamples    # new — named instance and slot examples
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `#/definitions/InstanceExample` | MINOR |
| `component.schema.json` | Add `#/definitions/ComponentExamples` | MINOR |
| `component.schema.json` | Add `examples` property to `#/definitions/Component` | MINOR |

**New definition** (`#/definitions/InstanceExample`):

```yaml
InstanceExample:
  type: object
  description: "A pre-configured usage of the whole component: scalar prop values."
  properties:
    title:
      type: string
    propConfigurations:
      type: object
      description: "Scalar prop values for this example. Binding and slot fills are not permitted here."
      additionalProperties:
        oneOf:
          - type: string
          - type: number
          - type: boolean
  additionalProperties: false
```

**New definition** (`#/definitions/ComponentExamples`):

```yaml
ComponentExamples:
  type: object
  description: "Named examples for this component."
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      $ref: "#/definitions/InstanceExample"
  additionalProperties: false
```

**New property** in `#/definitions/Component/properties`:

```yaml
examples:
  $ref: "#/definitions/ComponentExamples"
  description: "Named instance and slot examples for this component."
```

### Out of scope for this ADR

- **`Component.slotContent`** and **`SlotBinding.$extensions['com.figma'].default`** — Figma authoring defaults for component slots; see ADR-047
- **`Element.propConfigurations` PropBinding** — see ADR-048
- **Cross-boundary slot fill (recursion)** — filling a nested instance's slot prop from a parent context, including all forms of inline-Composition or named-composition reference; see ADR-049

### Notes

- `InstanceExample.propConfigurations` is scalar-only (`string | number | boolean`). Prop binding (`PropBinding`) belongs in `Element.propConfigurations`, which represents live data flow. `InstanceExample` represents a documented configuration — human-intended, not runtime-driven.
- `InstanceExample` does *not* include slot-fill information. Filling a slot is filling a prop; the value form (Composition object, named-composition key, etc.) lives on `Element.propConfigurations` and is settled by ADR-049. Earlier drafts of this ADR carried a `slots: Record<string, string>` field on `InstanceExample` as a placeholder; that field has been removed in favor of the unified mechanism.
- `ComponentExamples` uses `patternProperties` rather than `additionalProperties` on an object schema to satisfy Draft 7's handling of `$ref` alongside `additionalProperties: false`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `InstanceExample { title?, propConfigurations? }` ↔ `#/definitions/InstanceExample`
  - `ComponentExamples = Record<string, InstanceExample>` ↔ `#/definitions/ComponentExamples` (`patternProperties`)
  - `Component.examples?: ComponentExamples` ↔ `#/definitions/Component/properties/examples`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `Component.examples` with `InstanceExample` entries from example frames | Read new types; implement instance example detection |
| `specs-cli` | Recompile; output includes `examples` key when present | Recompile; no breaking change |
| `specs-plugin-2` | Recompile; example rendering is a follow-on capability | Recompile; pass through example data initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive — new optional field `Component.examples`, new types `InstanceExample` and `ComponentExamples`; no existing type is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `Component.examples` is a first-class named record on `Component`; example configurations are discoverable alongside the component that owns them
- `InstanceExample` expresses a complete scalar-prop configuration in a single, referenceable entry
- All example keys are plain strings — no inline nesting, no cross-component references
- Slot fill is *not* part of `InstanceExample`; it lives on `Element.propConfigurations` per ADR-049, keeping `InstanceExample` cleanly scoped to scalar-prop documentation
