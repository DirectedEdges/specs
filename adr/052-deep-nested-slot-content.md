# ADR: Path-Addressed Element Overrides for Deeply-Nested Descendants

**Branch**: `052-deep-nested-slot-content`
**Created**: 2026-05-22
**Status**: DRAFT — **Deferred** (see note)
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-046 — Component Instance Examples](046-component-instance-examples), [ADR-047 — Slot Content](047-component-slot-examples), [ADR-048 — PropConfigurations PropBinding](048-component-instance-examples), [ADR-049 — Nested Slot Compositions](049-prop-configurations-bindings), [ADR-050 — Examples Config](050-examples-config)

---

> **Deferral note.** This ADR is **not a prerequisite** for anything. `slotContentExamples` and `instanceExamples` (ADRs 047/048/050) ship as a complete component-documentation feature **without** this ADR and **without** the `Composition` type — they depend only on `SlotContent`, `SlotContentRef` (a plain string pointer), and `InstanceExample`. `Element.overrides` addresses only the narrow case in DirectedEdges/specs#115 — a deep override *into a component that exposes no slot for it* — which is inherently sparse. It is the **wrong backbone for dense, deep, wide page compositions**, whose addresses degrade into long, prefix-duplicated paths concentrated on a single anchor element (see *Limitations*). Page compositions warrant a dedicated design (likely a first-class composition graph, where depth = composition references and width = sibling elements, and which — being concrete, not varianted — owes none of the variant-stability tax that forced this ADR's flat paths). **This ADR is parked pending that page-composition design**, which may reshape whether deep overrides are needed at all.

---

## Context

The slot-content reference model addresses nested slot content with a **single-hop** reference. The fill is a `SlotContent` triplet stored once in `Component.slotContentExamples` and pointed at by a `SlotContentRef` (`{ $slotContent: "#/components/.../slotContentExamples/<key>" }`). The *anchor* — where that ref sits — carries the addressing:

- A component's own default slot fill: `SlotBinding.examples[0]` on the slot prop's `Children`.
- A fill one instance-boundary deep: `Element.propConfigurations[<slotKey>]` of the instance that sits **directly** in the parent slot's `elements` (`PropConfigurations` accepts `SlotContentRef`, ADR-049).

Every anchor assumes the filled slot is reachable as a **slot property on a leaf `instanceOf` element** in the block being authored. That breaks when authored slot content lives **several instance boundaries down** through instances that expose **no slot** for it:

```text
DS Page (component)
  └─ children (SLOT)              ← composed content lives here (a slotContentExamples entry)
       └─ FilterGrid (INSTANCE)   ← exposes NO slot for what's filled below
            ├─ FilterHeader (INSTANCE)   ← non-slot boundary
            │    └─ DS Row (INSTANCE)    ← HAS a slot + composition (FILLED)
            └─ FilterContent (INSTANCE)  ← non-slot boundary
                 └─ DS Row (INSTANCE)    ← HAS a slot + composition (FILLED)
```

`FilterGrid` is a leaf `instanceOf` reference inside DS Page's slot fill — its internals are not expanded (an instance is a leaf reference, by design). So there is no slot property anywhere in DS Page's output to anchor a `SlotContentRef` on for DS Row's filled slot. The fill can be captured as a `slotContentExamples` entry; the model cannot say **where it belongs**.

### This is a general "override a nested descendant" gap, not a slot-only one

Filling a deep slot is one instance of a broader need: **configuring a descendant reached only through nested instance boundaries**. The same depth problem applies to overriding a deep descendant's `content`, `styles`, or scalar prop values — exactly the surface Figma calls *instance overrides*. And a slot fill is already expressed as `propConfigurations[<slotKey>] = { $slotContent: … }` (ADR-049) — there is nothing slot-specific about needing to apply that **at a path**. So the right primitive is a general, path-addressed override of a nested descendant, of which deep slot content is the first consumer.

### Ownership and placement (settled in review)

- **Composed content lives in `slotContentExamples`.** The override that addresses a deep descendant anchors on an element *inside* a `slotContentExamples` entry (the boundary instance, e.g. `filterGrid`) — the place where the composition is already expressed.
- **`instanceExamples` is reserved for instances of *this* component.** It must not absorb nested-component-instance override data. A whole-component `instanceExample` selects *which* composed fill to use by referencing a `slotContentExamples` entry; it carries no deep-descendant overrides itself.

### Interim behavior

`specs-from-figma` already **detects and warns** when a filled slot sits more than one instance boundary below its containing slot, omitting that content rather than emitting it mis-attributed. That warning references the issue this ADR resolves; lifting it is part of implementing this decision.

---

## Decision Drivers

- **One general override primitive, minimal surface** — not a new field per override kind. Adding a slot-only `deepSlotContent` field would multiply the public surface and fail to express deep `content`/`styles`/prop overrides that are equally needed (Constitution §III: minimal, stable API).
- **Reuse existing constructs** — a deep slot fill is `propConfigurations` (which already carries `SlotContentRef`) applied at a path; not a new payload type. `styles` and `content` overrides reuse the existing `Element` field types.
- **Composed content stays in `slotContentExamples`; `instanceExamples` untouched** — the override anchors on the boundary element inside the composed fill, so no nested-instance data leaks into `instanceExamples`.
- **Keep "instance = leaf reference"** — intermediate instances stay leaf `instanceOf` references; nothing is expanded into `elements`. Addressing is by path.
- **Flat spec — serialize the route, don't nest it** — the deep chain becomes a flat path, not nested structure.
- **Address only the variant-stable element-reference hierarchy** — path segments are typed `{ instance }` / `{ slot }` references only. Container/layout layers change across variants and are never segments; instances are located by direct element-key lookup.
- **Self-describing, collision-safe segments** — slot-prop names and element keys are not guaranteed distinct, so each segment carries its kind (`{ slot }` vs `{ instance }`).
- **Pathless override = the element itself** — `path` is optional; absent means the override applies to the anchoring element directly (the degenerate, depth-0 case).
- **Additive, type ↔ schema symmetric, no runtime logic** — one new optional field plus two new types; detection/path construction live in `specs-from-figma`.
- **Naming — code/Figma aligned** (Constitution §VI) — Figma already names this surface *overrides*.

---

## Options Considered

### Option A: A general `Element.overrides` array of path-addressed overrides *(Selected)*

An instance `Element` gains one optional field, `overrides`: a list of path-addressed overrides of its nested descendants. Each `Override` addresses a descendant by `path` (typed segments) and applies the **same overridable surface an `Element` already has**. This ADR ships the `propConfigurations` arm (which carries slot fills via `SlotContentRef`, scalar props, and prop bindings); `styles` and `content` arms follow additively.

```ts
// types/Override.ts (new)

// One typed step toward a descendant — discriminated union, exactly one key
type OverridePathSegment =
  | { instance: string }   // step into a nested instanceOf element's referenced component
  | { slot: string }       // descend through a slot's fill content (when the descendant lives in a slot fill)

// A path-addressed override of a nested descendant
type Override = {
  path?: OverridePathSegment[]              // absent = the anchoring element itself; present = a descendant
  propConfigurations?: PropConfigurations   // scalar props, prop bindings, AND slot fills (SlotContentRef)
  // styles?: Styles                        // (future, additive)
  // content?: string | PropBinding         // (future, additive)
}

// types/Element.ts — one new optional field; no deepSlotContent, no new top-level field
type Element = {
  /* ...existing: children, parent, styles, propConfigurations, instanceOf, content... */
  overrides?: Override[]
}
```

Key properties:

- **The boundary element is the anchor.** `overrides` hangs on the instance element (`filterGrid`) that already exists in the composed `slotContentExamples` fill. The starting point is a real, addressable element — no detached registry, no re-naming it in a path.
- **Path ends at the descendant being configured.** A `path` is a sequence of `{ instance }` hops (into nested components) and `{ slot }` descents (through a slot's fill). Its **final** segment is the `{ instance }` whose `propConfigurations` the override sets; `{ slot }` segments only appear mid-path to descend through a slot fill.
- **Slot fills are not special.** Filling a deep slot is `propConfigurations[<slotKey>] = { $slotContent: … }` applied at a path — identical to how an element fills its *direct* child's slot today (ADR-049), just deeper.
- **Pathless = self.** An `Override` with no `path` applies to the anchoring element (degenerate; equivalent to the element's own `propConfigurations`).
- **Variant-stable, collision-safe.** Segments are typed (`{ slot }` vs `{ instance }`) and reference only slots and instances — never container/layout layers, whose nesting varies across variants. `{ instance }` is found by direct element-key lookup in the flat `elements` record.

**Example output** — DS Page's composed default content. `FilterGrid` overrides *many* descendant slots, so `overrides` is an array (the deep fills are themselves `slotContentExamples` entries):

```yaml
# (instance data)
slotContentExamples:
  pageBody:                                  # composed default content of DS Page's `children` slot
    elements:
      filterGrid:
        instanceOf: FilterGrid               # boundary instance — anchor for ITS descendants
        overrides:
          - path:
              - instance: filterHeader       # into FilterGrid's component
              - instance: row                # the DS Row inside FilterHeader  ← terminal instance
            propConfigurations:
              children: { $slotContent: "#/slotContentExamples/filterHeaderRow" }
          - path:
              - instance: filterContent
              - instance: row                # the DS Row inside FilterContent
            propConfigurations:
              children: { $slotContent: "#/slotContentExamples/filterContentRow" }
    layout: { ... }

  filterHeaderRow:  { anatomy: {...}, elements: {...}, layout: {...} }   # deep fills,
  filterContentRow: { anatomy: {...}, elements: {...}, layout: {...} }   # also in slotContentExamples
```

**Edge case — descending through a slot-bearing instance mid-chain** (`C` slot → `NS1` *(has slot)* → `NW1` → `NW2` → `NW3` → `NS2` *(has slot, filled)*, where `NW1`–`NW3` expose no slot). The override anchors on `NS1` in C's composed fill; a `{ slot }` segment marks the descent through `NS1`'s slot fill, then `{ instance }` hops cross the non-slot `NW`s:

```yaml
# (instance data) — on the NS1 element inside C's slotContentExamples entry
ns1:
  instanceOf: NS1
  overrides:
    - path:
        - slot: body       # descend through NS1's `body` slot fill
        - instance: nw1    # NW1 (no slot) → into NW1's component
        - instance: nw2
        - instance: nw3
        - instance: ns2    # ← terminal instance
      propConfigurations:
        content: { $slotContent: "#/slotContentExamples/ns2Fill" }   # fill NS2's `content` slot
```

A `{ slot }` appears only where a slot fill is entered; everything else is `{ instance }`. The explicit kinds make resolution total — it never guesses whether a step descends into an instance's slot or its internals.

**Mixed path — instances and slot-fills interleaved repeatedly.** A `{ slot }` segment descends into that slot's **configured fill** (a `slotContentExamples` / `Composition` triplet); from there the route can hop instances again, descend through *another* configured slot, and so on, to any depth. Consider `Dashboard` → `panel` → `header` (no slot) → `toolbar` (no slot) → `actions` *(slot, configured)* → `menu` → `items` *(slot, configured)* → `menuItem` *(slot, filled)*. Anchored on `panel`, the path interleaves `instance → instance → slot → instance → slot → instance`:

```yaml
# (instance data) — on the panel element inside Dashboard's slotContentExamples entry
panel:
  instanceOf: PanelCard
  overrides:
    - path:
        - instance: header     # into PanelCard's component (no slot)
        - instance: toolbar    # into header's component (no slot)
        - slot: actions        # descend into toolbar's CONFIGURED `actions` fill
        - instance: menu       # an instance inside that fill
        - slot: items          # descend into menu's CONFIGURED `items` fill
        - instance: menuItem   # ← terminal instance
      propConfigurations:
        children: { $slotContent: "#/slotContentExamples/menuItemBody" }   # fill menuItem's slot
```

The route freely alternates `{ instance }` (cross a component boundary) and `{ slot }` (drop into a configured fill) — there is no required pattern or ordering, and each `{ slot }` lands in whatever content currently fills that slot in the composition. The terminal is always the `{ instance }` whose `propConfigurations` the override sets.

**Default vs. per-instance overrides need no extra mechanism.** Because the composition (with its `overrides`) **is** a `slotContentExamples` entry, a whole-component `instanceExample` that wants different deep content simply references a *different* `slotContentExamples` entry in its `propConfigurations[<slotKey>]`. No override data lands on `instanceExamples`.

**Pros**:

- One general field instead of a slot-specific one — smaller public surface, and it already covers deep slot fills, scalar/prop overrides, and (additively) `styles`/`content`.
- Anchored on the real boundary element where the composition is expressed; path is relative and short (omits the anchor).
- Reuses `propConfigurations` / `SlotContentRef` — deep slot fills are not a new payload, just the existing mechanism at a path.
- Keeps composed content in `slotContentExamples` and leaves `instanceExamples` clean (instances of this component only).
- Keeps "instance = leaf reference"; flat; variant-stable; collision-safe typed segments.
- Purely additive — existing single-hop anchors and consumers are unchanged.

**Cons / Trade-offs**:

- Resolving a `path` requires walking referenced components in the `components` registry — heavier than a single pointer, though `SlotContentRef` resolution already follows pointers across components.
- `overrides` with a 1-segment path can overlap with directly configuring a child element. Convention: use an element's own `propConfigurations` for itself/its direct children; use `overrides` to reach descendants beyond direct reach.

---

### Option B: A slot-specific field (`deepSlotContent`) *(Rejected — earlier iteration of this ADR)*

Add a slot-only field — e.g. `Component.deepSlotContent` / `InstanceExample.deepSlotContent` keyed by host slot, each entry a `{ path, content: SlotContentRef }`. The override data hangs off the *component* (or instance example), not the boundary element:

```yaml
# (instance data) — a new top-level field on the DS Page component
deepSlotContent:
  children:                          # keyed by host slot
    - path:
        - instance: filterGrid       # re-names filterGrid, which already exists in slotContentExamples
        - instance: filterHeader
        - instance: row
        - slot: children
      content: { $slotContent: "#/slotContentExamples/filterHeaderRow" }

# …and the moment a deep *style* override is needed, a SECOND parallel field appears:
deepSlotStyles:                      # ← surface multiplies, one field per override kind
  children:
    - path: [ { instance: filterHeader }, { instance: title } ]
      styles: { ... }
```

**Rejected because**: It is special-purpose where a general one is warranted — it expresses only slot fills, so deep `content`/`styles`/prop overrides each demand *another* parallel field (`deepSlotStyles`, `deepSlotContent…`), multiplying public surface (Constitution §III). Keying it on `Component`/`InstanceExample` detaches it from the boundary element where the composition already lives (forcing the path to re-name `filterGrid`), and the per-instance variant would push nested-instance override data onto `instanceExamples`, which is reserved for instances of *this* component. Option A subsumes the whole family: a deep slot fill is just `filterGrid.overrides[].propConfigurations[<slot>] = { $slotContent }`, anchored on the element itself.

---

### Option C: Expand intermediate instances into `elements` *(Rejected)*

Materialise `FilterGrid` / `FilterHeader` internals as nested `elements` so each boundary instance exposes a real slot property at every level, letting the existing single-hop `SlotContentRef` anchor exist at every depth:

```yaml
# (instance data) — filterGrid's internals expanded inline instead of staying a leaf reference
filterGrid:
  instanceOf: FilterGrid
  elements:                          # ← NEW nesting: FilterGrid's whole internal tree, duplicated here
    headerStack:                     # a container layer — and these shift across variants
      elements:
        filterHeader:
          instanceOf: FilterHeader
          elements:
            row:
              instanceOf: DS Row
              propConfigurations:
                children: { $slotContent: "#/slotContentExamples/filterHeaderRow" }
    contentStack:
      elements:
        filterContent: { instanceOf: FilterContent, elements: { row: { ... } } }
```

**Rejected because**: It breaks "instance = leaf reference" (`filterGrid` is no longer a leaf), reintroduces the nested structure the flat-spec driver rejects, and **duplicates each referenced component's full internals into every consumer** of it (size blow-up, and drift when `FilterGrid` changes). The expansion also drags in container layers (`headerStack`, `contentStack`) whose nesting changes across variants — the exact variant-instability Option A's typed path avoids — and it redefines what an existing `instanceOf` leaf element means, so it is not additive.

---

### Option D: Encode the descent inside `SlotContentRef` as a delimited path string *(Rejected)*

Overload the existing `SlotContentRef` with a sibling string encoding the whole descent, hung on the boundary element's `propConfigurations`:

```yaml
# (instance data)
filterGrid:
  instanceOf: FilterGrid
  propConfigurations:
    # one string crams the route + the fill into the existing single-hop ref shape
    "filterHeader/row/children":
      $slotContent: "#/slotContentExamples/filterHeaderRow"
    # …and is the second segment "row" an instance or a slot? a flat string can't say.
    # …what if an element key legitimately contains "/"? the delimiter is now ambiguous.
```

**Rejected because**: It overloads the single-hop `SlotContentRef` / `propConfigurations` shape that depth-0/1 consumers already parse — a consumer reading a `propConfigurations` key as a *prop name* would mis-handle a key that is secretly a path (forward-compatibility risk). A delimited string also can't distinguish `{ slot }` from `{ instance }` segments and reintroduces escaping ambiguity when keys contain `/` — both of which the typed `OverridePathSegment[]` array in Option A resolves outright.

---

## Decision

Add a general, path-addressed override primitive on `Element`. The fill content it references remains a `SlotContent` entry in `Component.slotContentExamples`, referenced by `SlotContentRef` inside `propConfigurations`.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Override.ts` *(new)* | Add `OverridePathSegment` (`{ instance: string } \| { slot: string }`) and `Override` (`path?: OverridePathSegment[]`, `propConfigurations?: PropConfigurations`) | MINOR |
| `Element.ts` | Add `overrides?: Override[]` | MINOR |
| `index.ts` | Export `Override` and `OverridePathSegment` | MINOR |

**Example — new types** (`types/Override.ts`):
```ts
// One typed step toward a descendant. Exactly one key names its kind, so a
// slot-prop name colliding with an element key is unambiguous and the kind is
// never inferred from position.
type OverridePathSegment =
  | { instance: string }   // an instanceOf element key — crosses into the referenced component
  | { slot: string }       // a slot-prop key — descends through that slot's fill content

// A path-addressed override of a nested descendant. `path` reaches the
// descendant through nested instances (and slot-fill descents); the payload is
// the overridable Element surface applied to it. `path` absent = the anchoring
// element itself.
type Override = {
  path?: OverridePathSegment[]
  propConfigurations?: PropConfigurations   // scalar props, prop bindings, and slot fills (SlotContentRef)

  // ── Deferred (NOT in this ADR) — added additively when needed; shape reserved ──
  // styles?: Styles                        // deferred: deep style overrides
  // content?: string | PropBinding         // deferred: deep text/glyph content overrides
}
```

**Example — `Element` addition** (`types/Element.ts`):
```ts
// After — one new optional field
type Element = {
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding
  overrides?: Override[]                     // path-addressed overrides of nested descendants — optional — MINOR
}
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `OverridePathSegment` definition | MINOR |
| `component.schema.json` | Add `Override` definition | MINOR |
| `component.schema.json` | Add `overrides` to the `Element` definition | MINOR |

**Example — new definitions** (`schema/component.schema.json`):
```yaml
OverridePathSegment:
  description: "One typed step toward a descendant. Exactly one key names its kind: `instance` crosses into an instanceOf element's referenced component; `slot` descends through that slot's fill content. Discriminated so slot-prop and element-key name collisions are unambiguous."
  oneOf:
    - type: object
      properties: { instance: { type: string, description: "An instanceOf element key; crosses into that referenced component's elements." } }
      required: [instance]
      additionalProperties: false
    - type: object
      properties: { slot: { type: string, description: "A slot-prop (PropConfigurations) key; descends through that slot's fill content." } }
      required: [slot]
      additionalProperties: false

Override:
  type: object
  description: "A path-addressed override of a nested descendant reached through instance boundaries. `path` (optional; absent = the anchoring element itself) is the variant-stable route — typed instance/slot segments only, no container/layout layers. `propConfigurations` is applied to the addressed descendant and may carry slot fills via SlotContentRef."
  properties:
    path:
      type: array
      minItems: 1
      items: { $ref: "#/definitions/OverridePathSegment" }
      description: "Ordered, typed segments to the descendant. { instance } crosses a boundary; { slot } descends through a slot fill; instances are located by direct element-key lookup, never via container layers. The final segment is the configured instance. Absent = the anchoring element itself."
    propConfigurations:
      $ref: "#/definitions/PropConfigurations"
  additionalProperties: false
```

**Example — `Element` definition addition**:
```yaml
overrides:
  type: array
  description: "Path-addressed overrides of nested descendants reached through instance boundaries (e.g. deep slot fills). Each entry addresses a descendant by path and applies propConfigurations to it."
  items:
    $ref: "#/definitions/Override"
```

### Out of scope for this ADR

- **`Override.styles` / `Override.content`** — the generalized payload arms; added in a later additive MINOR when needed. The `Override` shape is designed to accept them without restructuring.
- **Transformer detection and path construction** — discovering deep descendants and computing each `path` lives in `specs-from-figma`.
- **Removing the interim warning** — lifting the "more than one boundary deep" warn-and-omit is a `specs-from-figma` task tracked with this change.
- **Pro-license gating** — like the other example registries (ADR-050), composed output is gated at emission in `specs-from-figma`.

### Notes

- **`overrides` is meaningful on instance elements.** Only an element with `instanceOf` has nested descendants to override. The schema does not couple the two fields, but emitters write `overrides` only on instance elements.
- **Terminal segment is an `{ instance }`.** `propConfigurations` configures an element/instance, so a `path` ends at the `{ instance }` being configured; `{ slot }` segments appear only mid-path to descend through a slot fill.
- **Segments are typed, not bare strings.** Slot-prop names and element keys are different namespaces with no distinctness guarantee; the discriminant key makes each step self-describing and resolution total.
- **Segments are slot/instance references only.** No container/group/layout layers (they vary across variants); `{ instance }` is located by direct key lookup in the flat `elements` record.
- **Deep slot fills reuse `propConfigurations`.** They are not a new payload — `propConfigurations[<slotKey>] = { $slotContent: … }` applied at a path, consistent with ADR-049.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `OverridePathSegment = { instance: string } | { slot: string }` ↔ `#/definitions/OverridePathSegment` (`oneOf` two single-key objects, each `additionalProperties: false`)
  - `Override { path?: OverridePathSegment[]; propConfigurations?: PropConfigurations }` ↔ `#/definitions/Override` (`path` optional, `items` `$ref` `OverridePathSegment`; `propConfigurations` `$ref`s the existing definition)
  - `Element.overrides?: Override[]` ↔ `Element` definition `overrides` (array of `$ref: Override`; not in `required`)
  - `propConfigurations` and `SlotContentRef` reuse existing definitions — no change to them

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Emits `Element.overrides` (with computed `path` + `propConfigurations`) on boundary instances inside composed `slotContentExamples` fills; contributes deep fills to `slotContentExamples` (deduplicated); removes the interim warn-and-omit. No `instanceExamples` change | Implement detection, path construction, and override emission; lift the warning |
| `specs-cli` | Recompile against the new type/schema; passes the new optional field through unchanged | Recompile |
| `specs-plugin-2` | Recompile; the plugin runtime emits `overrides` via the same engine path | Recompile |
| Schema validators | New optional definitions and field; existing documents remain valid | Adopt the new schema version |

---

## Semver Decision

**Version bump**: `0.21.0 → 0.21.0` (`MINOR` — folds into the unreleased 0.21.0 line)

**Justification**: Adds two new types (`Override`, `OverridePathSegment`) and one new **optional** field (`Element.overrides`) plus their schema counterparts. No existing type, field, or schema property is removed, renamed, or narrowed → MINOR per Constitution §III. The slot-content model it extends (ADRs 046–050) is still DRAFT/unreleased on the `0.21.0` line, so this folds into that same MINOR.

---

## Limitations / Scale

This primitive is tuned for **sparse** deep overrides. It degrades on **dense, deep, wide** compositions — the page-authoring workload — for three structural reasons:

- **Single-anchor concentration.** Only the top boundary instance is an addressable element (intermediate instances stay leaf references). So *every* deep override for an entire subtree piles onto one element's `overrides` array, with no locality to the structure it describes.
- **No structural sharing (prefix duplication).** Flat paths repeat their common ancestor segments in every sibling entry; total cost ≈ `entries × depth`, where a composition graph would mention each ancestor once.
- **Entry count.** In a branching-factor-`W`, depth-`D` authored tree the override count trends toward `O(W^D)` — e.g. `W=3, D=10` ≈ 59k entries × ~19 segments ≈ ~1M path segments on one element.

Mitigations that exist but don't remove the ceiling: fill **content** is deduplicated in `slotContentExamples` (the blowup is in *addresses*, not content), and only *authored deviations* need overrides (child components carry their own defaults). The cost is the bill for the flat / variant-stable / instance-as-leaf constraints — the only way to remove the repetition is intermediate-anchor or nested forms, which reintroduce nesting or variant-instability.

**Conclusion:** use `overrides` for sparse no-slot reach-ins, not as the backbone for page compositions. Dense deep authoring is a signal that components lack slots where the page composes, or that a first-class composition graph is the right model (see *Deferral note*).

---

## Consequences

- An instance element can configure descendants reached only through nested, no-slot instance boundaries — including chains that interleave non-slot instances between slot-bearing ones — via one general `overrides` array, addressed by a flat, typed `path`.
- Deep slot content is expressed with **no new payload**: `overrides[].propConfigurations[<slot>] = { $slotContent }`, reusing ADR-049. The same field will carry deep `styles`/`content` overrides additively.
- Composed content stays in `slotContentExamples`; `instanceExamples` remains "instances of this component" and selects compositions by reference rather than carrying override data.
- The override anchors on the real boundary element, so the path is relative and short; intermediate instances stay leaf references and the spec stays flat.
- The address is typed, collision-safe, and variant-stable — a variant swap or layout refactor that re-nests containers does not invalidate it.
- The DS Page → FilterGrid → FilterHeader/FilterContent → DS Row composition round-trips: both DS Rows' filled slots are captured in `slotContentExamples` and addressed from `filterGrid.overrides`.
- `specs-from-figma` can replace the interim "deeper than one boundary" warning with real emission.
- Existing single-hop `SlotContentRef` output and its consumers are unaffected; the override field is opt-in and additive.
