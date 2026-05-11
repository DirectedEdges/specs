# ADR: Component Examples — InstanceExample and Component.examples

**Branch**: `046-component-examples`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-042 — Composition Structural Type](042-composition-type)
**Extended by**: [ADR-047 — Slot Content](047-slot-content) *(adds `SlotExample`, widens `ComponentExamples`, adds `InstanceExample.slots`)*

---

## Context

ADR-042 established `Composition` as the structural base type. That type has no authoring home yet — no field on `Component` accepts it, and no consumer-facing entry point exists.

Components need a named catalogue of pre-configured examples: a documented set of specific prop values (and, later, slot configurations) that expresses canonical usages. Tooling can discover and render these without inspecting the raw variant tree. Authors can reference them by key instead of repeating configuration inline.

The simplest case — and the right starting point — is an example defined entirely by scalar prop values: `state`, `title`, `description`, and similar string or boolean props. No slot content yet; slots are addressed in ADR-047.

`InstanceExample` is the type for this case. It captures:
- An optional human-readable label (`title`)
- Scalar prop values (`propConfigurations`)
- Slot references (`slots`) — present in the type now; meaningful once ADR-047 introduces `SlotExample`

`Component.examples` is the named record that holds `InstanceExample` entries (and, after ADR-047, `SlotExample` entries too).

---

## Decision Drivers

- **Named record, not array** — examples must be referenceable by key; `InstanceExample.slots` and `Element.$extensions['com.figma'].defaultComposition` (ADR-047) both point to keys, not indices
- **`kind` discriminator** — `InstanceExample` will share the `ComponentExamples` record with `SlotExample` (ADR-047); `kind: 'instance'` makes the type unambiguous to tooling and JSON Schema `oneOf` validation
- **Scalar-only `propConfigurations`** — `InstanceExample` represents a documented configuration for human readers and tooling, not a live data binding; `PropBinding` belongs in `Element.propConfigurations` (ADR-048), not here
- **No cross-component references** — `InstanceExample.slots` values are keys within the same `Component.examples`; no key resolution across component definitions
- **Additive-only** — new optional field `Component.examples`; no existing type changed → MINOR
- **Type ↔ schema symmetry** — every field has a schema counterpart (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)

---

## Options Considered

### Option A: `InstanceExample` as a discriminated record member *(Selected)*

Add `InstanceExample { kind: 'instance', title?, propConfigurations?, slots? }` and a named record `ComponentExamples` on `Component`. The `kind` field discriminates against `SlotExample` (ADR-047) in the shared `ComponentExamples` record.

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
    kind: instance
    title: Action List Item – default
    propConfigurations:
      state: default
      title: Browse all issues
      description: 12 open · 3 closed

  activeState:
    kind: instance
    title: Action List Item – active
    propConfigurations:
      state: active
      title: Browse all issues
      description: 12 open · 3 closed

  dangerState:
    kind: instance
    title: Action List Item – danger
    propConfigurations:
      state: danger
      title: Delete branch
      description: This action cannot be undone
```

**Pros**:
- Named keys enable reference-by-string from `InstanceExample.slots` and `defaultComposition` without type coupling
- `kind` discriminator makes `InstanceExample` and `SlotExample` unambiguous in the shared record
- Scalar-only `propConfigurations` keeps `InstanceExample` simple and human-readable
- `slots?` field present now — forward-compatible once ADR-047 introduces `SlotExample` keys

**Cons / Trade-offs**:
- `slots` values forward-reference `SlotExample` keys that do not exist until ADR-047; tooling cannot validate slot references until ADR-047 lands

---

### Option B: Flat scalar map without `kind` *(Rejected)*

Store examples as `Record<string, Record<string, string | number | boolean>>` — a named map of prop value maps, with no type wrapper.

**Rejected because**: No discriminator means tooling cannot tell an `InstanceExample` from a `SlotExample` without structural inspection. JSON Schema cannot use `oneOf` without a discriminating property. Adding `SlotExample` later would require a MAJOR-level type change.

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
  kind: 'instance'                               # discriminator
  title?: string
  propConfigurations?:
    Record<string, string | number | boolean>    # scalar prop values only
  slots?:
    Record<string, string>                       # slot prop name → key in Component.examples
                                                 # resolved entry must be a SlotExample (ADR-047)

# ComponentExamples — named record on Component
# Widened in ADR-047 to Record<string, InstanceExample | SlotExample>
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
      description: "Scalar prop values for this example. Binding is not permitted here."
      additionalProperties:
        oneOf:
          - type: string
          - type: number
          - type: boolean
    slots:
      type: object
      description: "Maps slot prop names to SlotExample keys in Component.examples (see ADR-047)."
      additionalProperties:
        type: string
  additionalProperties: false
```

**New definition** (`#/definitions/ComponentExamples`):

```yaml
ComponentExamples:
  type: object
  description: "Named examples for this component. Widened in ADR-047 to include SlotExample entries."
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

- **`SlotExample`** — extends `Composition` with `kind: 'slot'` and `slot` field; see ADR-047
- **Widening of `ComponentExamples`** to include `SlotExample` — see ADR-047
- **`Element.$extensions`** and `defaultComposition` — see ADR-047
- **`PropConfigurations` PropBinding** — see ADR-048

### Notes

- `InstanceExample.propConfigurations` is scalar-only (`string | number | boolean`). Prop binding (`PropBinding`) belongs in `Element.propConfigurations`, which represents live data flow. `InstanceExample` represents a documented configuration — human-intended, not runtime-driven.
- `InstanceExample.slots` is defined here but only becomes meaningful in ADR-047 when `SlotExample` entries can appear in `Component.examples`. Schema validation cannot enforce that `slots` values resolve to `SlotExample` keys until ADR-047 widens `ComponentExamples`.
- All `slots` values resolve within the same `Component.examples` — no cross-component key references.
- `ComponentExamples` uses `patternProperties` rather than `additionalProperties` on an object schema to satisfy Draft 7's handling of `$ref` alongside `additionalProperties: false`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `InstanceExample { kind, title?, propConfigurations?, slots? }` ↔ `#/definitions/InstanceExample`
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
- `InstanceExample.slots` is forward-compatible: slot references compile and validate as strings now; ADR-047 populates the target side
- `ComponentExamples` will be widened in ADR-047 to accept `SlotExample` entries alongside `InstanceExample` entries
