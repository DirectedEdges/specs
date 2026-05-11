# ADR: Composition Structural Type

**Branch**: `042-composition-type`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: [ADR 025 — Flowing Content into a Nested Instance's Slot](025-nested-slot-api) *(partially — retains its `Composition` shape; defers its `PropConfigurations` widening to ADR-048)*
**Extended by**: ADR-046 (Component Examples), ADR-047 (Slot Content), ADR-048 (PropConfigurations PropBinding)

---

## Context

The schema represents components individually but has no type for a *composition*: a named, reusable arrangement of component instances that expresses how components are combined in context.

Compositions appear at four scales in Figma-sourced design systems:

- **Slot-filling examples** — content placed inside a component's slot layer in Figma (e.g., what fills `ActionListItem`'s `startVisual` slot by default)
- **Instance examples** — a fully-configured component usage (e.g., `ActionList` in its `danger` variant with three items)
- **Layout compositions** — multi-component arrangements forming a portion of a UI (a filter grid with a data table, a sidebar with checkboxes)
- **Page compositions** — full canonical views with specific components in specific states

Today, the schema cannot represent any of these. `SlotProp.default` holds only a descriptive string. There is no structural type for tooling to discover, render, or validate against.

DRAFT ADR-025 ("Flowing Content into a Nested Instance's Slot") proposed a `Composition` type for the inline parent-fills-child-slot case. This ADR adopts that structural shape as a named foundational type. How components store and reference compositions is addressed in ADR-046 (`InstanceExample`, `Component.instanceExamples`) and ADR-047 (`SlotExample`, `Element.$extensions`).

### Composition scoping

The four scales split into two authoring scopes:

- **Component-scoped** (`slot`, `instance`) — authored by the component designer inside the component definition; covered by ADR-046 and ADR-047
- **System-scoped** (`layout`, `page`) — independent of any single component, living in a separate `compositions.yaml` file parallel to `components.yaml`; schema for that file is a follow-on ADR

The `Composition` type established here serves both scopes. `SlotExample` (ADR-047) extends it for the component-scoped slot-filling case; the future system-scoped ADR will use it directly.

---

## Decision Drivers

- **Composition is a first-class concept** — components and compositions are peers in the schema's conceptual model; a named type is required
- **Additive-only** — no existing type is changed → MINOR semver
- **Type ↔ schema symmetry** — every type field has a schema counterpart (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)
- **Shared shape across scopes** — component-scoped and system-scoped compositions are structurally identical; one type serves both

---

## Options Considered

Four distinct questions shape the design space:

1. **Should `anatomy` and `elements` be converged?** — The split exists in `Component`/`Variant` to support variant-sensitive element data. A composition has no variants. Does the split still earn its weight here?
2. **Are `elements` and `layout` required or optional?** — An anatomy-only composition is structurally just a type map. Does meaningful content require both?
3. **How much metadata belongs on a composition now?** — `title` is the obvious start. What else is warranted, and what should be noted as anticipated extension points?
4. **When a composition's element is an instance with a slot, how is that slot filled?** — This is a constraint on the type's scope that must be stated explicitly.

---

### Option A: Separate anatomy and elements; all three fields required *(Selected)*

Keep the `Anatomy`/`Elements` split inherited from `Variant` for consistency. Require all three content fields — `anatomy`, `elements`, and `layout` — so a composition is always a complete structural + content + layout declaration. Add `description?` alongside `title?` for documentation tooling.

```yaml
# Composition — named structural content fragment
# Example: ActionListItem core content with text elements
title: Action List Item – default
description: Default text content for a standard list item with label and secondary description.
anatomy:
  root:
    type: container
  label:
    type: text
  description:
    type: text
elements:
  label:
    content: Browse all issues
  description:
    content: 12 open · 3 closed
layout:
  - root:
      - label
      - description
```

Note: `root` carries no element-level data and is absent from `elements`. The `elements` map is sparse — only elements with content, styles, or configurations need entries.

**Pros**:
- Completeness guarantee — every composition is a full structural declaration; no anatomy-only fragments that are indistinguishable from plain `Anatomy`
- `layout` required forces authors to express ordering intent, even when trivial (`[icon]` for a single glyph)
- Consistent with `Variant` field names, easing authoring and migration
- `description?` supports documentation tooling now; further metadata is anticipated

**Cons / Trade-offs**:
- When a composition's anatomy contains only instance elements with nothing meaningful to set on them (e.g., a slot that holds three `ActionListItem` instances with no per-instance element data), `elements` must be an empty record `{}`. This is explicit but adds authoring noise.
- `layout` is trivially `[iconName]` for single-element compositions such as a glyph in a visual slot; requiring it adds overhead for that common case.

---

### Option B: Converge `anatomy` and `elements` into a single map *(Rejected)*

Since compositions have no variant tree, the split that motivates keeping `anatomy` and `elements` separate in `Component` does not apply. A single `entries` map where each entry holds both type metadata and element data would be a simpler authoring surface:

```yaml
# Converged model (not selected)
anatomy:
  root:
    type: container
  label:
    type: text
    content: Browse all issues       # type + data in one entry
  description:
    type: text
    content: 12 open · 3 closed
```

**Rejected because**:
- `SlotExample` (ADR-047) must extend `Composition`. If `Composition` uses a converged map, `SlotExample` must too — breaking the Anatomy/Elements pattern used throughout the rest of the schema.
- If a composition is later promoted to a full component (a natural authoring workflow), the converged map must be split back into `anatomy` + `elements` + `variants`. Keeping them separate makes that migration a no-op.
- `AnatomyElement` (`type`, `detectedIn?`, `instanceOf?`) and `Element` (`children`, `styles`, `propConfigurations`, `content`) have non-overlapping fields. Merging them creates a hybrid type that is neither and must be maintained independently.

---

### Option C: `anatomy` required; `elements` and `layout` optional *(Rejected)*

Keep the minimal surface from the ADR-025 draft: only `anatomy` is required; `elements` and `layout` are optional for cases where a composition is purely structural.

**Rejected because**:
- An anatomy-only composition — `anatomy` with no `elements` and no `layout` — is structurally identical to an `Anatomy` record. It carries no information beyond element types and names; it does not describe a *composition* in any meaningful sense.
- Making `elements` optional permits this degenerate case without a schema-level guard.
- Downstream consumers cannot distinguish an authored anatomy-only composition (intentional) from one where the author simply forgot to add content data.

---

### Option D: `anatomy` and `elements` required; `layout` optional *(Rejected)*

A middle position: require content data but leave layout optional, with anatomy key order as the implied default.

**Rejected because**:
- "Implied order" is an invisible convention that tooling must either assume or reject. Making `layout` required is a small authoring cost that eliminates ambiguity, especially for compositions with nested containers where order is load-bearing.
- The only case where `layout` is genuinely noise is a single-element composition — and even there, `layout: [elementName]` is one line and makes intent explicit.

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
  title?: string          # human-readable label
  description?: string    # purpose and usage notes for documentation tooling
  anatomy: Anatomy        # required — declares the element type map
  elements: Elements      # required — element-level content, styles, prop configurations
  layout: Layout          # required — tree ordering of elements
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `#/definitions/Composition` | MINOR |

**New definition** (`#/definitions/Composition`):

```yaml
Composition:
  type: object
  description: "Named structural content fragment. Base shape for SlotExample (ADR-047) and system-scoped layout/page compositions."
  required: [anatomy, elements, layout]
  properties:
    title:
      type: string
    description:
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

- **`SlotExample`** — extends `Composition` with `kind: 'slot'` and `slot` field; see ADR-047
- **`InstanceExample`** and **`Component.instanceExamples`** — see ADR-046
- **`Element.$extensions`** and `defaultComposition` — see ADR-047
- **`PropConfigurations` PropBinding widening** — see ADR-048
- **`compositions.yaml` file schema** — follow-on ADR after ADR-047
- **Nested slot filling in composition elements** — see below

### Notes

- **Nested instance with a slot** — when `elements` contains an `instance` element whose component has slot props, those slots cannot be filled from within this `Composition`. The composition can set scalar prop values via `propConfigurations` on that instance, but slot content resolution is deferred to the mechanism introduced in ADR-047 (one level deep) and its follow-on. This is a deliberate constraint, not an oversight.
- **`elements` is sparse** — not every anatomy element needs a corresponding `elements` entry. An element with no content, styles, or prop configurations can be omitted from `elements`. The `elements: {}` case (all anatomy elements are instances with no element-level data) is valid and explicit.
- **No `kind` field** — discrimination is the responsibility of the extending types (`SlotExample` adds `kind: 'slot'`; future system-scoped types add their own).
- **`Composition` is not placed directly on `Component`** — it is the structural base; `Component.instanceExamples` (ADR-046) and `SlotExample` (ADR-047) are the consumer-facing entry points.
- **Anticipated metadata extensions** — `title` and `description` are the authoring-time metadata for this ADR. Anticipated follow-on extensions include `tags?: string[]` for cataloguing, `deprecated?: boolean` for lifecycle management, and `guidelines?: string` for usage guidance. These are deferred to a follow-on ADR once the consuming types are established and usage patterns are known.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Composition { title?, description?, anatomy, elements, layout }` ↔ `#/definitions/Composition`; `required: [anatomy, elements, layout]`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | No immediate output change; `Composition` is foundational for ADR-046/044 | Recompile when 046/047 land |
| `specs-cli` | Recompile | No change |
| `specs-plugin-2` | Recompile | No change |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: Adds new type `Composition` — purely additive; no existing type is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `Composition` is a named structural type in the schema, available as a base for `SlotExample` (ADR-047) and future system-scoped layout and page composition types
- All three content fields (`anatomy`, `elements`, `layout`) are required — a composition is always a complete structural declaration, never a degenerate anatomy-only fragment
- `description?` is the first step toward a richer authoring-time metadata model; `tags`, `deprecated`, and `guidelines` are identified follow-on extension points
- No existing type is changed; no downstream consumers are broken
- ADR-046, ADR-047, and ADR-048 complete the composition model; this ADR is the foundation they build on
