# Gemini Architect Reaction

## Overall read

The direction is getting stronger as ADR-042, 047, and 048 converge on a coherent model: `Composition` is the reusable structural unit, slot fill is treated as prop assignment rather than as a separate semantic channel, and Figma provenance is being kept out of the core contract via `$extensions['com.figma']`.

From an architecture perspective, the remaining decisions should optimize for three things above all else:

1. One durable canonical form on the wire.
2. Clear semantic boundaries between authored content, consumer references, and tool-specific provenance.
3. A schema surface that stays legible after more composition use cases arrive, not just the first nested-slot case.

My strongest reaction is that ADR-049 should resolve toward a stricter, more canonical model rather than a more expressive one. The examples make it clear that the real danger is not lack of power. It is drift, ambiguity, and a public contract that starts elegant and becomes difficult to teach.

---

## 1. Flat vs. nested for compositions

Recommendation: choose **flat only**.

This is the most important decision, and the examples make the tradeoff fairly stark. The nested form is attractive at first read because it preserves locality, but it does not scale. Once recursion reaches real page depth, the author must parse structure, instance configuration, and slot filling across several indentation regimes at once. That is a readability problem now, and a maintenance problem later.

The flat form has the better long-term properties:

- It gives compositions stable names and addresses.
- It makes reuse explicit instead of accidental.
- It keeps depth from turning into formatting noise.
- It creates a surface that tooling can inspect, validate, diff, catalog, and potentially render independently.

The architectural point here is that nested form optimizes for authoring convenience at the call site, while flat form optimizes for system comprehension. For a shared schema, system comprehension should win.

I would avoid accepting both forms. "Both" feels user-friendly but is usually the start of contract entropy. Once two equivalent encodings are allowed, every downstream consumer pays for that flexibility forever, and every style guide has to recover a convention the schema declined to enforce.

If there is a desire to preserve nested author ergonomics, that should live in tooling as an authoring affordance that compiles down to the flat wire format, not in the schema itself.

---

## 2. Consolidated `examples` vs. sibling `slotContent` + `instanceExamples`

Recommendation: keep the **sibling fields**.

The current split is semantically cleaner than the consolidated `examples` alternative.

`instanceExamples` and `slotContent` are not merely two storage locations for the same kind of thing. They represent different author intents:

- `instanceExamples` documents whole-component usage.
- `slotContent` defines reusable compositions that fill slots.

That distinction is worth preserving directly in the contract. A unified `examples` record would trade a slightly tidier container for a more ambiguous public API, and would push semantic discrimination onto `kind` values that every consumer must filter and interpret.

That is the wrong kind of unification. It compresses storage, not meaning.

The CheckboxGroup scratchpad is useful because it reveals the pressure toward consolidation, but it also shows the cost: once `nestedSlotContent` appears, the schema starts naming roles that are really properties of reference context, not properties of the composition itself. That is a sign the model is being bent around organization rather than around stable semantics.

My recommendation is:

- keep `slotContent`
- keep `instanceExamples`
- do not introduce `nestedSlotContent` as a schema-level kind

If a composition is structurally the same thing, it should stay the same thing. The call site already tells you whether it is being used as a top-level slot fill or a nested one.

---

## 3. Separated vs. converged `anatomy` / `elements`

Recommendation: keep them **separated**.

ADR-042 made the right choice here.

The most important durability argument is not just consistency with `Variant`; it is preservation of conceptual roles:

- `anatomy` declares what exists
- `elements` declares what is configured about what exists

That separation is a strong modeling property. It keeps structural identity distinct from authored values and makes sparse `elements` possible without weakening the structural declaration.

A converged map would feel lighter in a toy example, but over time it would blur concerns and create a second style of expressing structure in the schema. It would also make promotion from composition to component more awkward, exactly where consistency should help most.

If authors later complain about verbosity, the right response is likely tooling support or better examples, not a second structural idiom.

---

## 4. Naming the composition shape

Recommendation: keep **`Composition`**.

It is not perfect, but it is the best option in the current set because it is broad enough to survive expansion across slot, instance-adjacent, layout, and page scopes without pulling the concept toward a narrower metaphor.

Most alternatives are more evocative and less durable:

- `Fragment` is overloaded by React.
- `Layout` is already occupied.
- `Content` is too generic.
- `View` and `Block` are overloaded across ecosystems.

`Composition` is slightly abstract, but public schema names benefit from being slightly abstract when the concept is foundational and cross-cutting.

---

## 5. Naming the composition reference

Recommendation: keep **`$composition`** and keep the value as a **JSON Pointer**.

This is the right level of explicitness. It parallels `$binding` well enough to feel like part of the same family without collapsing the semantics together.

The more important part is the JSON Pointer value. That makes scope explicit in the payload rather than implicit in convention. Given the deliberate split between component-scoped and system-scoped registries, that explicitness is a strength, not noise.

I would resist any move back toward bare key strings. They are lighter to type and heavier to reason about.

---

## 6. Where the Figma authoring default lives

Recommendation: keep **`SlotBinding.$extensions['com.figma'].default`**.

This feels architecturally sound.

The decision correctly preserves a boundary between:

- core authored contract
- platform-specific provenance

That distinction matters. Figma's default rendered slot content is important source information, but it is not universal component semantics. Encoding it in `$extensions` is the right signal to consumers and leaves the core contract clean.

I would only suggest one discipline here: maintain a very hard line that anything under `$extensions['com.figma']` is observational or provenance-oriented, not normative for non-Figma consumers. If that line blurs later, the namespace stops doing its job.

---

## 7. Unify `SlotBinding` and `CompositionRef`, or keep them parallel

Recommendation: keep them **parallel but distinct**.

They are similar in shape but not in role.

- `SlotBinding` expresses that an element's children are bound to a slot prop.
- `CompositionRef` expresses that a consumer is assigning a composition value to a slot prop.

Those are mirror-adjacent concepts, not the same concept.

Trying to unify them would reduce surface area nominally while increasing cognitive load materially. A schema this structural should prefer a small amount of duplication over role ambiguity.

That said, I would be careful to keep their naming, pointer semantics, and documentation closely aligned so the model still feels coherent.

---

## 8. If consolidation ever lands anyway

If the project eventually chooses a consolidated field despite the concerns above, I would still avoid `nestedSlotContent` as a distinct kind.

The separate kind is a smell. It encodes placement history into the type system. A composition should not change identity because it is referenced one level deeper.

If consolidation happens, I would prefer the narrowest possible enum:

- `instance`
- `slotContent`

and let nestedness be inferred from reference topology.

---

## 9. What still needs tightening

The ADR set is directionally coherent, but a few durability details need firmer treatment before this becomes a stable public contract.

### Validation responsibilities

Cycle detection, pointer resolution, and slot-fit validation are correctly identified as tool responsibilities, but they should be stated more normatively and more uniformly. Right now they read as acknowledged consequences. For a contract this reference-heavy, they are part of the effective architecture.

I would want a follow-on ADR or an explicit validation section that says, in substance:

- consumers MUST reject unresolved composition pointers
- consumers MUST reject reference cycles
- consumers SHOULD validate slot compatibility at the consume site

Without that, the schema risks becoming formally clear and operationally uneven.

### Registry boundaries

The split between component-scoped and system-scoped registries is sound, but it should remain very explicit that this is a scoping distinction, not a type distinction. The same reference form reaching two homes is good. Introducing subtly different semantics by home would be dangerous.

### One canonical wire format

This is worth stating plainly in ADR-049 once chosen. If the schema accepts only one representation for nested compositions, future ADRs should treat alternate authoring forms as tooling concerns unless there is a compelling interoperability reason to elevate them into the contract.

---

## Bottom line

If I were optimizing for clarity and durability, I would choose the following package of decisions:

- **Flat-only** nested composition references via `$composition` and JSON Pointer
- **Sibling** `slotContent` and `instanceExamples`, not a unified `examples` bucket
- **Separated** `anatomy` and `elements` inside `Composition`
- Keep the names **`Composition`** and **`$composition`**
- Keep Figma defaults on **`SlotBinding.$extensions['com.figma'].default`**
- Keep **`SlotBinding`** and **`CompositionRef`** distinct

That package is not the shortest surface area, but it is the clearest one. More importantly, it creates a contract that can absorb future composition work without having to explain multiple equivalent encodings or role-specific pseudo-types that exist mainly to organize examples.