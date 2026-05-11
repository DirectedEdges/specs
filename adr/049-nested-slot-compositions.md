# ADR: Nested Slot Compositions

**Branch**: `049-nested-slot-compositions`
**Created**: 2026-05-11
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-047 — Slot Content](047-slot-content)

---

## Context

ADR-047 ("Slot Content") scopes slot-content entries to **one level deep**: a `Composition` in `Component.slotContent` declares its own anatomy and may contain component instances, but does not reach into those instances' own slot fills. Each component is the sole author of its own content.

The motivating tension is recursion. The ActionList / ActionListItem case shows why the boundary matters:

- **ActionListItem** has two slot props (`startVisual`, `endVisual`) and ~3 prop variants. Per-slot single-glyph entries plus a few instance examples cover its surface in a handful of `slotContent` entries.
- **ActionList** has one slot prop (`items`) and ~8 prop variants. A naive recursion that fills each `ActionListItem`'s `startVisual` and `endVisual` from `ActionList`'s context reaches across component boundaries: 8 variants × 3 items × 2 slots = **48+** entries on `ActionList` alone.
- The one-level-deep rule keeps the count proportional to each component's own surface (~16 entries on `ActionList`, ~4 on `ActionListItem`) by deferring nested-slot resolution to the owning component.

That deferral is correct as a default but leaves a real authoring need open: sometimes a parent *does* need to specify what fills a nested instance's slot in a particular composition (e.g., "in `ActionList`'s `danger` items, every `ActionListItem` gets a trash icon in `endVisual`"). This ADR opens the design space for that case.

---

## Decision Drivers

*(to be specified — likely include: scale must remain proportional to the parent's own variation, not multiplicative across descendants; reuse `Component.slotContent` keys rather than introducing inline composition; preserve "each component owns its own content" as the default; offer an explicit, opt-in mechanism for cross-boundary fill)*

---

## Options Considered

*(to be specified)*

---

## Decision

*(to be specified)*

---

## Out of scope for this ADR

- **`compositions.yaml` file schema** — system-scoped (`layout`, `page`) compositions; a separate follow-on ADR.

---

## Consequences

*(to be specified)*
