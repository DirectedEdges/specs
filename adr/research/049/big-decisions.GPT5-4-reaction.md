# Reaction to Big Decisions

Based on ADR-042, ADR-046, ADR-047, ADR-048, ADR-049, the 049 scratchpads, and a narrow read of the current schema surface, the contract feels strongest when it stays opinionated rather than flexible.

## Overall read

The cleanest spine across these ADRs is:

- `Composition` is a reusable structural value.
- `slotContent` is the component-scoped registry for named compositions.
- `propConfigurations` is where a nested instance's prop value gets set.
- Figma-authored defaults stay in `$extensions` on the slot binding.

The options that preserve those roles read coherently. The options that blur role, storage location, or value form feel weaker.

## Reactions by decision

### 1. Flat vs. nested for compositions

My strongest reaction is that ADR-049 should likely land on **flat only**.

The flat scratchpad scales materially better once recursion is real. The nested scratchpad is readable for one or two levels, but by the time the example reaches `Accordion -> CheckboxGroup -> Checkbox -> Badge`, the indentation cost is already doing real damage. That is exactly the kind of pressure a schema should absorb rather than push onto authors.

Flat form also fits the direction already established by ADR-048. `propConfigurations` is the place where a nested instance's prop value is expressed. Adding a `CompositionRef` there is coherent. By contrast:

- **Nested only** keeps locality but loses aliasing and becomes hard to read quickly.
- **Both forms** is tempting, but it weakens canonicality right where the model is starting to become clear.
- **Sibling `slotFills`** undoes the unification ADR-048 just established by splitting one concept across two fields.

So my current preference is:

- `propConfigurations.<slotName>` accepts `{ $composition: "<JSON Pointer>" }`
- component-scoped references resolve into `slotContent`
- system-scoped references resolve into external composition files once that follow-on ADR lands

### 2. Consolidated `examples` vs. sibling `slotContent` + `instanceExamples`

I favor keeping **two sibling fields**.

`instanceExamples` and `slotContent` are not just two storage shapes for similar things. They represent different authoring intents:

- `instanceExamples` documents whole-component usages
- `slotContent` defines reusable structural content fragments

The consolidated `examples` shape adds discriminator bookkeeping without buying enough structural clarity. It also forces every consumer to filter by `kind`, even when that consumer only cares about one category.

The CheckboxGroup scratchpad is useful as pressure-testing, but it reads to me more like evidence that references are working than evidence that consolidation is needed.

### 3. Consolidated vs. separated `anatomy` / `elements` in `Composition`

I would keep **`anatomy` and `elements` separated**.

The current examples do not show enough authoring pain to justify breaking consistency with `Variant`. The split supports a stable mental model across the schema and keeps composition-to-component promotion straightforward. A converged map is superficially simpler, but it creates a one-off hybrid shape that no longer matches the rest of the contract.

This seems like the right place to prefer structural consistency over slight authoring convenience.

### 4. Naming the composition shape

`Composition` still looks like the best available name.

It is somewhat abstract, but the alternatives appear worse:

- `Fragment` brings React baggage
- `Layout` collides with an existing field
- `Content` collides with `Element.content`
- `Slot` collides with slot props
- `Block`, `View`, and `Scene` each import unrelated vocabulary

So my reaction is not that `Composition` is perfect, but that it is the least misleading.

### 5. Naming the `$composition` reference

I would keep **`$composition` with a JSON Pointer value**.

That choice has three concrete strengths:

- it parallels `$binding`
- it keeps scope explicit in the wire format
- it avoids ambiguous bare-key references

I would avoid `$ref` because schema readers already associate that with JSON Schema semantics.

### 6. Where the Figma authoring default lives

I agree with ADR-047's selected position: keep the default on **`SlotBinding.$extensions['com.figma'].default`**.

That is the right semantic home. The field describes Figma authoring provenance attached to a slot binding. It is not general `content`, and it is not a universal runtime rule every consumer should honor. Putting it in `$extensions` makes that boundary explicit.

### 7. Unify `SlotBinding` and `CompositionRef`, or keep parallel

I would keep them **parallel but distinct**.

They may both resolve to a `Composition`, but they do different jobs in the contract:

- `SlotBinding` binds a slot prop
- `CompositionRef` sets a slot prop value

That distinction is enough to justify two shapes for now. Unifying them would reduce surface area slightly but blur role in a part of the model where role matters.

### 8. Naming the consolidated field, if consolidation lands

If consolidation ever lands anyway, `examples` is probably the right field name. But my stronger reaction is that the field should not land at all.

### 9. Naming the `kind` values, if consolidation lands

If consolidation lands anyway, I do **not** think `nestedSlotContent` should be its own `kind`.

That distinction looks reference-site-derived, not shape-derived. At the schema level, it still appears to be a `Composition`. The recursion role seems inferable from where it is referenced.

If a distinction is truly needed later, a second axis such as `role` would be cleaner than multiplying kinds that share the same structure.

## Net assessment

The contract is strongest when it remains explicit about three separations:

- structure vs. usage (`Composition` vs. `InstanceExample`)
- authored slot content vs. authored whole-component examples (`slotContent` vs. `instanceExamples`)
- binding semantics vs. provenance metadata (`SlotBinding` vs. `$extensions.com.figma.default`)

The flat-reference approach for ADR-049 reinforces those separations instead of weakening them.

## Main caveat

My only real caveat is sequencing. **Flat only** becomes substantially more convincing once the external system-scoped compositions file is specified, because then the model is complete end to end. Even so, based on the current read, the flat direction already looks like the stronger schema choice.