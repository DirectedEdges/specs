# ADR: Slotting Content into Nested Instances

**Branch**: `examples-slots-instances`
**Created**: 2026-05-22
**Status**: ACCEPTED — supersedes the deferred `Element.overrides` design (retained below as Option C, *rejected*)
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-046 — Slots & Slot References](046-slots-and-slot-references), [ADR-047 — Component Slot Examples](047-component-slot-examples), [ADR-048 — Component Instance Examples](048-component-instance-examples)

---

## Context

The current slot-content reference model supports **single-hop** slot filling, with content configurations stored in `SlotContent` triplets within `Component.slotContentExamples`, linked by a `SlotContentRef`. This approach works for straightforward scenarios, such as:

1. Default slot fills for a component.
2. Slot fills one instance boundary deep, such as directly configuring `PropConfigurations[<slotKey>]` at the parent instance boundary.

However, this model faces limitations when authored content spans **multiple instance boundaries**. Specifically, it struggles to maintain accurate slot references when intermediate instances do not expose slots, as shown:

```text
DS Page (component)
  └─ children (SLOT)              ← composed content lives here
       └─ FilterGrid (INSTANCE)   ← exposes NO slot for what's filled below
            ├─ FilterHeader (INSTANCE)   ← non-slot boundary
            │    └─ DS Row (INSTANCE)    ← HAS a slot + composition (FILLED)
            └─ FilterContent (INSTANCE)  ← non-slot boundary
                 └─ DS Row (INSTANCE)    ← HAS a slot + composition (FILLED)
```

In this case:
- `FilterGrid`, being an `instanceOf` reference, is treated as a leaf node in `DS Page`'s slot fill.
- Its internals, including the further nested components (`FilterHeader` and `FilterContent`), are unreachable for configuration through the current `SlotContent` approach.

This limitation complicates scenarios where deeply nested configurations are required, as it creates gaps in the slot filling mechanism.

---

The core challenge is that slot-based composition typically operates as **configuration**, not an **override**. A slot is meant to encapsulate and expose its content for external configuration, adhering to a component's public API. However, when slot fills depend on deep paths through unexposed intermediate instances, even legitimate configurations are misattributed or omitted due to the current model's depth handling. 

Moving forward, any solution must address these challenges in a way that:
- Respects component encapsulation and public API boundaries.
- Preserves the clarity and locality of configurations in the specification.
- Aligns with the existing `slotContentExamples` structure without requiring disruptive changes to core types.

With these principles in mind, the next section explores alternative approaches to improve the model while retaining compatibility.