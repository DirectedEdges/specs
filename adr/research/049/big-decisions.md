# Big Decisions — Composition / Slot Content / Nested Compositions

A skimmable cheat sheet of the open structural and naming choices across
ADR-042, ADR-046, ADR-047, ADR-048, and ADR-049. Each entry frames the
question, lists the options, points at the ADR (or scratchpad) that carries
the fuller argument, and notes the current leaning where one exists.

The order below is roughly "biggest blast radius first" — decisions earlier
in the list cascade into shapes later in the list.

---

## 1. Flat vs. nested for compositions (ADR-049 headline)

**Question:** When a composition's element instances have their own slots,
how is the parent context's slot fill expressed under
`Element.propConfigurations.<slotName>`?

**Options:**
- **A — Nested only.** Inline `Composition` at the call site. Locality;
  unbounded indentation; no aliasing.
- **B — Flat only.** `{ $composition: <JSON Pointer> }` reference into a
  named registry. Aliasing is free; locality is lost; needs the external
  file format for system-scoped uses.
- **C — Both forms accepted.** Author chooses per case. Maximum expressivity;
  weakest canonical convention.
- **D — Sibling field on `Element` (`slotFills`).** Keeps
  `propConfigurations` scalar/binding-only. Two fields where one might do.

**Where:** ADR-049 §Options. Scratchpads `example.nested.yaml` (A) and
`example.flat.yaml` (B) show the two extremes on the same hierarchy.

**Current leaning:** undecided. Examples in research currently mix forms;
the Pill and CheckboxGroup scratchpads both use **B**.

---

## 2. Consolidated `examples` (with `kind`) vs. sibling `slotContent` + `instanceExamples`

**Question:** Do component-scoped compositions live in one named record
discriminated by `kind`, or in two sibling fields each holding one shape?

**Options:**
- **Two siblings (current ADR-046 + ADR-047 selection).**
  `Component.instanceExamples: Record<string, InstanceExample>` and
  `Component.slotContent: Record<string, Composition>`. One purpose each; no
  discriminator; reader must read both fields for "everything authored."
- **One consolidated `examples` record (alternative — `example.checkboxGroup.yaml`).**
  Entries discriminate by `kind: instance | slotContent | nestedSlotContent`.
  Single home; single resolution path; every consumer filters by `kind`.

**Where:** ADR-047 §Option A (sibling, selected) vs. §Option B (bundled
union, rejected at the time). The `nestedSlotContent` kind in the
CheckboxGroup scratchpad is a new shape not in any ADR yet.

**Current leaning:** ADRs select siblings; the CheckboxGroup scratchpad
re-opens the consolidation question with the three-kind framing.

**Sub-question if consolidation lands:** is `nestedSlotContent` a separate
`kind`, or is it indistinguishable from `slotContent` at the schema level
(distinguished only by reference site)?

---

## 3. Consolidated vs. separated `anatomy` / `elements` in `Composition`

**Question:** Does `Composition` keep the `Anatomy` + `Elements` split
inherited from `Variant`, or converge them into a single map of entries that
each hold both type metadata and element data?

**Options:**
- **Separated (ADR-042 selection).** Mirrors `Variant`; eases
  composition→component promotion; `SlotExample` / `SlotContent` /
  `nestedSlotContent` all inherit the same split.
- **Converged (`entries: { name: { type, content, styles, ... } }`).**
  Simpler authoring surface; one map instead of two. Breaks the
  Anatomy/Elements pattern used elsewhere; promoting a composition to a
  component requires splitting it back.

**Where:** ADR-042 §Options A/B.

**Current leaning:** separated, selected in ADR-042. Worth re-opening only
if authoring-surface complaints accumulate in practice.

---

## 4. Naming the composition shape

**Working name:** `Composition` (ADR-042).

**Alternatives considered or available:**
- `Composition` — current; structural-shape word
- `Fragment` — connotes "piece of UI"; collides with React vocabulary
- `Arrangement` — accurate but uncommon in design-system vocabulary
- `Layout` — collides with the `Layout` field already on `Variant`
- `Scene` — Figma-adjacent but evokes 3D / animation
- `Snippet` — code-adjacent; understates the structural completeness
- `Block` — short, but overloaded across CMS / editor / layout vocabularies
- `View` — overloaded across platforms (iOS, Android, Vue, MVC)
- `Slot` — collides with `SlotProp` on `Component.props`
- `Content` — too generic; collides with `Element.content`

**Where:** ADR-042 (no naming section — current name is the working
choice).

**Current leaning:** `Composition` until a stronger candidate surfaces.

---

## 5. Naming the `$composition` reference

**Working name:** `{ $composition: "<JSON Pointer>" }` (ADR-049 §Option B).

**Alternatives:**
- `$composition` — current; parallels `$binding` from ADR-008
- `$ref` — JSON-Schema convention; collides with schema-internal `$ref`
  semantics and may confuse readers
- `$compositionRef` — explicit; verbose
- `$fill` — short, slot-flavored, but loses the "what kind of thing is
  being referenced" cue
- `$slotFill` — too narrow if compositions become reusable across non-slot
  contexts
- `$use` — short and pattern-neutral; reads ambiguously
- `$pointer` — describes the form, not the role
- `$content` — collides with `Element.content`
- `$instance` — wrong; instances are anatomy-level, not reference-level

**Related sub-question:** the *value* form — JSON Pointer (current) vs.
bare key string. ADR-049 §Constraints picks JSON Pointer for path-explicit
scope and parallelism with `$binding`.

**Where:** ADR-049 §Constraints + §Type↔Schema Impact.

**Current leaning:** `$composition` + JSON Pointer.

---

## 6. Where the Figma authoring default lives

**Question:** How does the default variant reference the content Figma
shows inside a slot layer?

**Options:**
- **A — `SlotBinding.$extensions['com.figma'].default` (ADR-047 selection).**
  Colocated with the slot binding; `$extensions` framing marks it as
  design-tool provenance that code consumers ignore.
- **F — Widen `Element.content` to accept slot-content keys.** Same field,
  two meanings depending on `children`'s shape. Schema can't express the
  conditional.

**Where:** ADR-047 §Options A/F.

**Current leaning:** A, selected.

---

## 7. Unify `SlotBinding` and `CompositionRef`, or keep parallel

**Question:** `SlotBinding` (on `Element.children`, author-side) and
`CompositionRef` (on `propConfigurations.<slotName>`, consume-side) both
resolve to a `Composition`. One type or two?

**Options:**
- **Parallel-but-distinct (ADR-049 §Type Impact, current).** Different
  semantic roles (binding-to-prop vs. setting-prop-value); each keeps its
  own shape for legibility.
- **Unified.** One shape carries both; consumers branch on field location.
  Smaller surface; muddier roles.

**Where:** ADR-049 §"Why not reuse `SlotBinding` directly."

**Current leaning:** parallel; revisit at a future MAJOR if redundancy
proves out in practice.

---

## 8. Naming the consolidated field — only if Decision 2 lands

**Working name (CheckboxGroup scratchpad):** `examples`.

**Alternatives:**
- `examples` — current; pairs with `kind` discriminator
- `compositions` — accurate to the structural type; collides with the
  system-scoped `compositions.yaml` ADR-042 follow-on reserves
- `cases` — short; reads as "use cases"
- `scenarios` — usage-flavored; verbose
- `usages` — direct; underused as a noun
- `fixtures` — testing-flavored
- `patterns` — broader than this field's scope
- `samples` — too generic

**Current leaning:** `examples`, if consolidation lands.

---

## 9. Naming the `kind` values — only if Decision 2 lands

**Working values:** `instance` | `slotContent` | `nestedSlotContent`.

**Alternatives & open questions:**
- `instance` vs. `usage` vs. `example` (the last collides with the field
  name)
- `slotContent` vs. `slotFill` vs. `fill` vs. `content`
- `nestedSlotContent` — is the distinction load-bearing, or does the
  reference site already make role obvious? Could collapse to
  `slotContent` and let context discriminate.
- Two-axis alternative: `kind: composition | instance` plus a
  `role: slot | nestedSlot` flag for compositions.

**Where:** not in any ADR yet — introduced in `example.checkboxGroup.yaml`.

**Current leaning:** the three-value flat enum, pending discussion of
whether `nestedSlotContent` carries its weight.

---

## Cross-references

- ADR-042 — `Composition` structural type
- ADR-046 — `InstanceExample` + `Component.instanceExamples`
- ADR-047 — `Component.slotContent` + `SlotBinding.$extensions`
- ADR-048 — `Element.propConfigurations` widened with `PropBinding`
- ADR-049 — nested slot compositions; flat vs. nested headline
- Scratchpads in this directory:
  - `example.nested.yaml` — Option A (nested) at page scope
  - `example.flat.yaml` — Option B (flat) at page scope
  - `example.pill.yaml` — component-scoped with sibling
    `slotContent` + `instanceExamples`
  - `example.checkboxGroup.yaml` — component-scoped with consolidated
    `examples` + `kind` (alternative to sibling fields)
