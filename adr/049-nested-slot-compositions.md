# ADR: Nested Slot Compositions

**Branch**: `049-nested-slot-compositions`
**Created**: 2026-05-11
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-042 — Composition Structural Type](042-composition-type), [ADR-046 — Component Examples](046-component-examples), [ADR-047 — Slot Content](047-slot-content), [ADR-048 — PropConfigurations PropBinding](048-prop-configurations-binding)

---

## Context

ADRs 042, 046, 047, and 048 together define every authoring shape for a *single* composition; what's missing is the recursive case — when a `Composition` itself contains an instance whose component has slot props, how the parent context fills those nested slots.

The motivating scenario is a multi-component page composition rendered through deeply-nested instances — for example `Page.body → Row.children → Accordion.children → CheckboxGroup.children → Checkbox.children`. Two scratchpads in [`adr/research/049/`](research/049/) work a realistic filter-results page through both nested and flat forms; the abstract examples within Options A and B below are condensed for in-line readability.

### Constraints this ADR ships with

Three constraints are settled in advance; the option comparison below is bounded by them:

- **Named compositions resolve in two registries by scope, not one.** Component-scoped named compositions — including ones authored to support recursion within a single component — live in that component's `slotContent` (ADR-047), where they sit alongside the Figma-authoring-default entries. System-scoped compositions (page-level, layout-level, anything that spans multiple components) live in 1+ external composition files (file format deferred to ADR-042's follow-on). The mechanism for *reaching* a key is the same in both cases; the home depends on the composition's scope.
- **No cycles, ever.** A composition reference chain `A → B → … → A` (direct or indirect) is forbidden. Tooling MUST detect and reject cycles at validation time. The schema cannot enforce this on its own; the constraint is normative for consumer validators.
- **Layout direction is a `styles.layoutMode` concern, not a boundary concern.** When a slot fill contains multiple items, `HORIZONTAL` / `VERTICAL` lives on either the consumer's slot-bound container or on a wrapping container element inside the fill. No new boundary field.

### Decisions this ADR has to make

- **Headline:** nested-only, flat-only, both, or sibling-field — see Options A–D.
- **Value union for `Element.propConfigurations.<slotName>`:** what shapes does the slot-prop arm of the union accept once the headline lands? Two sub-questions:
  - *Direct shape* — Composition object, key reference, both?
  - *Form of the reference* — a bare `string` (the lightest), or a discriminated reference type (e.g., `{ $slotContent: '<key>' }` mirroring how `PropBinding` uses `$binding`, or reusing/extending `SlotBinding`'s shape from ADR-047)? The discriminated form avoids the schema's "is this a typo or a key" ambiguity in the bare-string approach.

That's it. Other concerns once flagged here — recursion depth, validation, aliasing semantics — are addressed below either as Decision Drivers, as Option-level pros/cons, or as tool/runtime concerns the schema does not own.

---

## Decision Drivers

- **Locality vs. reuse** — inline keeps the tree visible top-to-bottom; named-and-keyed enables one composition to be referenced from many call sites.
- **Aliasing as a compaction lever — favors flat.** Repeated structural patterns (four identical `Card` instances in a grid, the same `iconStart` slot fill across many `ActionListItem` instances) collapse to a single named definition under flat form; compaction grows linearly with repetition. Inline form forces verbatim duplication every time.
- **Indentation budget** — deep recursion pushes inline leaves past comfortable line widths.
- **Author intent transparency** — flat naming forces a description of *what each piece is*; inline lets authors skip naming for one-offs.
- **Recursion depth is unbounded.** The schema does not cap depth, ever. Pages, layouts, and large compositions can recurse arbitrarily; any cap would be arbitrary and would break legitimate authored content. Operational concerns about deeply-nested content (legibility, performance) are project-level, not schema-level.
- **One canonical syntax vs. per-case author choice** — single form keeps the schema small and consumers simple; both forms let authors match syntax to situation but compound the surface.
- **Additive-only** — every option below ships as MINOR; no existing type narrows.
- **Type ↔ schema symmetry** — Constitution §I.
- **No runtime logic** — Constitution §II.

---

## Options Considered

### Option A: Nested only — inline `Composition` under `propConfigurations.<slotName>`

`Element.propConfigurations.<slotName>` value union widens to accept `Composition` (in addition to the scalar and `PropBinding` arms from ADR-048). Slot fill is always written inline at the call site.

**Two-tier abstract example.** A `parent` element instances `Parent` (which has slot `body`); the body's fill instances `Mid` (which has slot `items`); the items' fill is a text leaf:

```yaml
elements:
  parent:
    instanceOf: Parent
    propConfigurations:
      body:                                # ← level-1: inline Composition
        anatomy:
          mid: { type: instance, instanceOf: Mid }
        elements:
          mid:
            propConfigurations:
              items:                       # ← level-2: inline Composition (deeper)
                anatomy:
                  leaf: { type: text }
                elements:
                  leaf: { content: Hello }
                layout: [leaf]
        layout: [mid]
```

**Pros**:
- Locality — entire tree visible without cross-references
- No external file required — composition is self-contained at the call site
- Smallest schema delta — one union widening
- One canonical form; tooling and consumers handle a single shape

**Cons**:
- Indentation grows linearly with recursion depth; deep trees push leaves off-screen
- **No aliasing** — identical sub-compositions duplicate verbatim. Four identical `Card` instances in a grid become four full `Composition` blocks; a glyph icon used in twenty `ActionListItem` slots becomes twenty inline copies
- Sub-compositions are anonymous; no addressable name for tooling, docs, or audits to reference
- Encourages bespoke one-off authoring over a vocabulary of named patterns

---

### Option B: Flat only — registry key under `propConfigurations.<slotName>`

`Element.propConfigurations.<slotName>` value union widens to accept a registry key resolving to a named `Composition`. The key resolves into either `Component.slotContent` (component-scoped) or an external composition file (system-scoped) per the registry constraint above.

The reference can be a bare `string` (shown below for brevity) or a discriminated form like `{ $slotContent: '<key>' }` — see decision 2 in Context.

**Two-tier abstract example.** Same `Parent → Mid → leaf` hierarchy as Option A, expressed as three sibling records — every composition stays at top-level indentation regardless of how deep its referencer sits. The reference shape is discriminated (`{ $slotContent: '<key>' }`) to parallel `PropBinding`'s `$binding` (see decision 2):

```yaml
root:                          # entry composition
  anatomy:
    parent: { type: instance, instanceOf: Parent }
  elements:
    parent:
      propConfigurations:
        body: { $slotContent: parentBody }   # ← level-1: discriminated reference
  layout: [parent]

parentBody:                    # named, top-level
  anatomy:
    mid: { type: instance, instanceOf: Mid }
  elements:
    mid:
      propConfigurations:
        items: { $slotContent: midItems }    # ← level-2: discriminated reference
  layout: [mid]

midItems:                      # named, top-level
  anatomy:
    leaf: { type: text }
  elements:
    leaf: { content: Hello }
  layout: [leaf]
```

A composition referenced from N call sites appears as the same `{ $slotContent: <key> }` reference repeated N times — one definition, many uses.

**Pros**:
- Indentation stays bounded regardless of recursion depth
- **Aliasing is a first-class strength** — one definition, many call sites. Four identical `Card` instances reduce to one `card` composition referenced four times; reusable patterns like `iconStart` become a single named building block. Compaction grows with repetition
- Naming forces authors to describe each piece's identity rather than its position
- Compositions become inspectable and addressable by tooling, docs, validation

**Cons**:
- Naming overhead for one-off sub-compositions that exist solely as a one-time fill
- Reading the whole tree requires jumping between records — locality is lost
- Schema cannot validate that key references resolve (cross-field reference checking) — consumer responsibility, including cycle detection (per Constraints)
- For system-scoped compositions, requires the external composition file format to land (deferred — ADR-042 follow-on); component-scoped recursion can use existing `Component.slotContent` immediately

---

### Option C: Both forms accepted — `Composition | string` per call site

`Element.propConfigurations.<slotName>` accepts both an inline `Composition` and a registry-key `string`. Authors choose per case: inline for tightly-coupled one-offs, key-ref for reusable named patterns.

**Pros**:
- Matches the actual range of authoring intent — different cases warrant different forms
- Aliasing strength of flat preserved where it matters; locality of nested preserved where it matters
- Migration is easy in either direction (extract to external file; inline a single-use entry)

**Cons**:
- Two ways to express the same thing — less canonical, weaker convention
- Tooling and consumers must handle both shapes
- Style inconsistency across (and within) codebases unless project conventions are imposed

---

### Option D: Sibling field on `Element` — `slotFills?: Record<string, Composition | string>`

Leave `Element.propConfigurations` alone. Add a dedicated `slotFills` field whose value is a record mapping slot-prop names to either a `Composition` or a key reference.

**Pros**:
- Preserves the ADR-046 reasoning that `propConfigurations` is scalar-and-binding territory
- Schema discrimination is structural and obvious — different fields for different value classes
- Composition values and scalar values stay in different physical fields; consumers can ignore one without parsing the other

**Cons**:
- Re-entrenches a split that the unified-`propConfigurations` framing arguably resolves more cleanly (slot is just a prop; filling it is filling a prop)
- Two fields (`propConfigurations` and `slotFills`) where one might do; consumers must read both to assemble the full prop configuration of an instance
- Adds a second field to the recursion story without simplifying any other aspect of it

---

## Decision

*To be specified once the headline option settles. This ADR is currently at the option-comparison stage.*

---

## Out of scope for this ADR

- **External composition file format** — the schema for the standalone composition file(s) (possibly multiple per project) that hold named compositions for Options B/C/D. A separate ADR (ADR-042 follow-on) lands after the headline option here is settled.
- **Reuse / aliasing runtime semantics** — when a flat-form composition is referenced from N sites, whether each realization is an independent instance (per-site identity for stateful interactions) or an alias is a runtime/consumer concern. The schema describes the static reference; runtime semantics live elsewhere. (The structural *strength* of aliasing-as-compaction is in scope and addressed by Options B and C.)

### Tool / consumer concerns (acknowledged, not scoped)

These are real and necessary, but they live in tools (validators, the CLI, the plugin), not in the schema:

- **Cycle detection** (per the Constraints section) — `A → B → … → A` MUST be rejected
- **Key-reference resolution** — confirming a string key under `propConfigurations.<slotName>` resolves to an existing composition
- **Slot-fit validation** — confirming a composition matches the slot-prop expectations at the consume site (e.g., constraints from ADR-028)

The schema does not encode these; tooling owns them.

---

## Type ↔ Schema Impact

Concrete sketch for **Option B (flat-only)**, illustrative — *not* a selection. The same shape narrative applies in spirit to A (Composition arm), C (both arms), and D (sibling field); the headline choice settles which becomes the authoritative section here.

The sketch below assumes the discriminated-reference form for the registry key (`SlotContentRef`), which mirrors the existing `PropBinding` pattern and avoids the bare-string ambiguity. A bare-`string` form is the lighter alternative; the choice is decision 2 in Context.

**Type changes** (Option B, discriminated-reference form):
- New type `SlotContentRef = { $slotContent: string }` — a key reference into either `Component.slotContent` (component-scoped) or an external composition file (system-scoped). Pattern parallels `PropBinding = { $binding: string }` from ADR-008.
- `Element.propConfigurations` value union widens from `string | number | boolean | PropBinding` (post-ADR-048) to `string | number | boolean | PropBinding | SlotContentRef`.
- No change to `Composition` itself (ADR-042); no change to `Element`'s other fields. `SlotBinding` (ADR-047) remains scoped to `Element.children`; `SlotContentRef` is the propConfigurations-side counterpart for the same registry.

**Schema changes** (Option B, discriminated-reference form):
- New `#/definitions/SlotContentRef` with `$slotContent: string` — single-property object, `additionalProperties: false`.
- `#/definitions/Element/properties/propConfigurations/additionalProperties/oneOf` gains a `$ref: "#/definitions/SlotContentRef"` arm.
- No new top-level registry definition here; the system-scoped external file format lands in the follow-on ADR (ADR-042's deferred `compositions.yaml`).

**Why not reuse `SlotBinding` directly** (briefly): `SlotBinding` is `{ $binding, $extensions? }` and lives on `Element.children` of slot-*owning* components, expressing the runtime binding of children to a slot prop. The propConfigurations-side reference goes the other direction — a *consumer* setting a nested instance's slot value — so the semantic role differs, even though the resolution target (a `slotContent` key) overlaps. A parallel-but-distinct `SlotContentRef` keeps each shape's role legible. If the pattern proves redundant in practice, a future MAJOR could unify them.

**Symmetric**: Yes, with the caveat that the schema cannot enforce cross-field reference resolution (consumer validation concern per Constraints).

---

## Downstream Impact

| Consumer | Impact (any option) | Action required |
|----------|--------------------|-----------------|
| `specs-from-figma` | Must detect cross-boundary slot fills and emit them in the chosen form | Read new union; implement nested-fill or registry-emission path |
| `specs-cli` | Recompile; output includes the new union arm | Recompile; no breaking change |
| `specs-plugin-2` | Recompile; cross-boundary slot rendering is a follow-on capability | Recompile; pass through data initially |

For Options B/C/D specifically, consumer validators take on cycle-detection and key-resolution responsibilities (per Constraints / Tool concerns).

---

## Semver Decision

**Version bump**: MINOR.

**Justification**: Every option is additive — value-union widening or new optional field. No existing type is removed or narrowed.

---

## Consequences

*Specifics depend on the headline option. These hold across all options:*

- `Component.slotContent` (ADR-047) becomes a dual-purpose registry: it holds Figma authoring defaults *and* component-scoped recursive composition entries. Both are `Composition` values; both reach via the same key mechanism; their roles differ at the call site (`SlotBinding.$extensions['com.figma'].default` for the former, `propConfigurations.<slotName>` for the latter).
- System-scoped compositions (page, layout) live in external composition files (ADR-042 follow-on) and resolve via the same reference form.
- Page-level compositions become expressible end-to-end without relying on per-component slot fills alone.
- Cycle detection becomes a normative requirement on consumer validators; the schema cannot enforce it.
- Recursion depth is unbounded; large authored content recurses freely.
- Layout direction inside a slot fill is expressed through existing `styles.layoutMode` on either the consumer's slot-bound container or on a wrapping container element inside the fill — no new boundary mechanism is needed.
- Reuse vs. locality becomes an explicit author choice (Option C), an enforced single style (A or B), or a structural separation (D).
