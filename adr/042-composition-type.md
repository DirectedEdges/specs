# ADR: Composition Structural Type

**Branch**: `042-composition-type`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: [ADR 025 — Flowing Content into a Nested Instance's Slot](025-nested-slot-api) *(partially — retains its `Composition` shape; defers its `PropConfigurations` widening to ADR-045)*
**Extended by**: ADR-043 (Component Examples), ADR-044 (Slot Content), ADR-045 (PropConfigurations PropBinding)

---

## Context

The schema represents components individually but has no type for a *composition*: a named, reusable arrangement of component instances that expresses how components are combined in context.

Compositions appear at four scales in Figma-sourced design systems:

- **Slot-filling examples** — content placed inside a component's slot layer in Figma (e.g., what fills `ActionListItem`'s `startVisual` slot by default)
- **Instance examples** — a fully-configured component usage (e.g., `ActionList` in its `danger` variant with three items)
- **Layout compositions** — multi-component arrangements forming a portion of a UI (a filter grid with a data table, a sidebar with checkboxes)
- **Page compositions** — full canonical views with specific components in specific states

Today, the schema cannot represent any of these. `SlotProp.default` holds only a descriptive string. There is no structural type for tooling to discover, render, or validate against.

DRAFT ADR-025 ("Flowing Content into a Nested Instance's Slot") proposed a `Composition` type for the inline parent-fills-child-slot case. This ADR adopts that structural shape as a named foundational type. How components store and reference compositions is addressed in ADR-043 (`InstanceExample`, `Component.examples`) and ADR-044 (`SlotExample`, `Element.$extensions`).

### Composition scoping

The four scales split into two authoring scopes:

- **Component-scoped** (`slot`, `instance`) — authored by the component designer inside the component definition; covered by ADR-043 and ADR-044
- **System-scoped** (`layout`, `page`) — independent of any single component, living in a separate `compositions.yaml` file parallel to `components.yaml`; schema for that file is a follow-on ADR

The `Composition` type established here serves both scopes. `SlotExample` (ADR-044) extends it for the component-scoped slot-filling case; the future system-scoped ADR will use it directly.

---

## Decision Drivers

- **Composition is a first-class concept** — components and compositions are peers in the schema's conceptual model; a named type is required
- **Additive-only** — no existing type is changed → MINOR semver
- **Type ↔ schema symmetry** — every type field has a corresponding schema property (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)
- **Shared shape across scopes** — component-scoped and system-scoped compositions are structurally identical; one type serves both

---

## Options Considered

### Option A: Named standalone `Composition` type *(Selected)*

Define `Composition` as a named structural type with `anatomy` (required), `elements?`, `layout?`, and an optional `title?` for human-readable labeling. No `kind` discriminator here — discrimination is the responsibility of the extending types (`SlotExample` in ADR-044, and future system-scoped types).

The example below shows a `Composition` describing an `ActionListItem` instance with scalar prop values — no slots yet (slots are introduced in ADR-044):

```yaml
# Composition — named structural content fragment
# Example: an ActionListItem with scalar props configured
title: Action List Item – default state
anatomy:
  item:
    type: instance
    instanceOf: ActionListItem
elements:
  item:
    propConfigurations:
      state: default
      title: Browse all issues
      description: 12 open · 3 closed
layout:
  - item
```

**Pros**:
- Clean, minimal foundational type — easy to extend in ADR-044 (`SlotExample`) and the system-scoped follow-on
- Single shared shape for component-scoped and system-scoped use
- `anatomy` required — every composition declares its element type map
- `elements?` and `layout?` optional — a minimal fragment may only need anatomy

**Cons / Trade-offs**:
- Standalone — no consuming type lands until ADR-043 and ADR-044; the type is not usable in isolation

---

### Option B: Inline shape, no named type *(Rejected)*

Define the shape inline at each use site (`SlotExample`, system-scoped types) rather than as a shared named type.

**Rejected because**: `SlotExample` and system-scoped compositions share identical fields; duplicating the shape without a named base creates schema drift and prevents a single `$ref` anchor.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| New: `Composition.ts` | Add `Composition` type | MINOR |
| `index.ts` | Export `Composition` | MINOR |

**New type** (`types/Composition.ts`):

```yaml
Composition:
  title?: string      # human-readable label
  anatomy: Anatomy    # required — declares the element type map
  elements?: Elements
  layout?: Layout
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `#/definitions/Composition` | MINOR |

**New definition** (`#/definitions/Composition`):

```yaml
Composition:
  type: object
  description: "Named structural content fragment. Base shape for SlotExample (ADR-044) and system-scoped layout/page compositions."
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

### Out of scope for this ADR

- **`SlotExample`** — extends `Composition` with `kind: 'slot'` and `slot` field; see ADR-044
- **`InstanceExample`** and **`Component.examples`** — see ADR-043
- **`Element.$extensions`** and `defaultComposition` — see ADR-044
- **`PropConfigurations` PropBinding widening** — see ADR-045
- **`compositions.yaml` file schema** — follow-on ADR after ADR-044

### Notes

- `Composition.anatomy` is required — every composition must declare its element type map; `elements` and `layout` are optional because a minimal slot fragment may only need the type declarations
- No `kind` field on `Composition` itself — the `kind` discriminator is added by the consuming types (`SlotExample` adds `kind: 'slot'`; future system-scoped types add their own)
- `Composition` is not placed directly on `Component` — it is the structural base; `Component.examples` (ADR-043) and `SlotExample` (ADR-044) are the consumer-facing entry points

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Composition { title?, anatomy, elements?, layout? }` ↔ `#/definitions/Composition`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | No immediate output change; `Composition` is foundational for ADR-043/044 | Recompile when 043/044 land |
| `specs-cli` | Recompile | No change |
| `specs-plugin-2` | Recompile | No change |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: Adds new type `Composition` — purely additive; no existing type is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `Composition` is a named structural type in the schema, available as a base for `SlotExample` (ADR-044) and future system-scoped layout and page composition types
- No existing type is changed; no downstream consumers are broken
- ADR-043, ADR-044, and ADR-045 complete the composition model; this ADR is the foundation they build on
