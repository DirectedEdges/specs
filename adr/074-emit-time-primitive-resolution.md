# ADR: Primitives Resolve to Components at Emit Time, Not in the Spec

**Branch**: `074-emit-time-primitive-resolution`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-073 establishes `conventions.platforms.<id>` as the home for spec→code conventions. This ADR decides the single most consequential thing about them: **when** a primitive becomes a component, and therefore what the spec contains.

An element captured from Figma is one of a closed set of kinds (`types/Element.ts`):

```ts
export type ElementType =
  | 'text' | 'glyph' | 'vector' | 'container'
  | 'slot' | 'instance' | 'line' | 'ellipse'
  | 'rectangle' | 'polygon' | 'star';
```

Three of these — `text`, `glyph`, `container` — are what compositions are made of. A design system implements each with a designated component. The question is whether that substitution happens on the way *in* (the transformer writes `type: instance, instanceOf: dsText` into the spec) or on the way *out* (the spec keeps `type: text`, and each generator emits its own platform's component).

ADR-063 already made the in-bound choice, for images: when `conventions.figma.images.match` names a designated image component, the transformer routes the image through it, and the spec carries a nested instance. That was sound for images because the routing was driven by something **the Figma file actually contains** — an instance of the designated image component was already there, and the transformer was recognizing it, not inventing it.

Text and glyph layers are different. A Figma text layer inside a slot's default content is a `TEXT` node. There is no `DsText` instance to recognize. Substituting one would mean the transformer **fabricating structure the source does not have** — and fabricating it differently depending on which platform it was told to serve.

---

## Decision Drivers

- **One spec serves every platform.** A spec is the durable, platform-neutral artifact. The moment it names `DsText`, it is a React spec, and iOS and Web Components need their own copies of the same design
- **Do not fabricate what the source does not carry.** The transformer's contract is fidelity to Figma. An instance that exists nowhere in the file is an invention, and inventions are unverifiable against the source
- **Deterministic output.** Same input → identical output. If the transformer's output depends on which platform the run was configured for, the spec is no longer a function of the Figma file alone
- **Round-trip fidelity.** `figma-from-specs` renders a spec back onto the canvas. It must be able to reconstruct a text layer; it cannot reconstruct one from an instance of a component that does not exist in the Figma library
- **No spec-shape change.** A resolution mechanism that requires new element types, new `Component` members, or changes to `Styles` is a mechanism that has leaked into the wrong artifact
- **No logic in the schema package (Constitution II).** The package declares the binding; consumers apply it
- **Absence means one thing (ADR-071).** No binding declared = the generator's existing behavior, unchanged

---

## Options Considered

Two decisions: when resolution happens, and what it applies to.

---

## Decision 1 — When a primitive becomes a component

### Option 1A: Emit-time resolution — the spec stays primitive *(Selected)*

The spec is unchanged by this entire ADR set. `label` stays `type: text` with its styles and content. At generation, a platform generator reads `conventions.platforms[itsId].primitives.text` and, if a binding is declared, emits the bound component instead of its host element.

```yaml
# spec — one artifact, unchanged, platform-neutral
elements:
  label:
    styles:
      textColor: {$token: Color/On surface, $type: color}
      typography: {$token: Typography/font__200__regular, $type: typography}
      maxLines: 1
    content: Label
```

```yaml
# conventions.yaml — the platform-specific half
platforms:
  web:
    primitives:
      text: {component: DsText}
  ios:
    primitives:
      text: {component: Text}
```

```jsx
// React emission
<DsText color="on-surface" typography="font__200__regular" maxLines={1}>Label</DsText>
```

```swift
// SwiftUI emission — same spec, different binding
Text("Label").foregroundStyle(.onSurface).font(.font200Regular).lineLimit(1)
```

**Pros**:

- The spec stays one artifact for every platform, which is the entire premise of ADR-073. Adding Android adds a conventions key and changes no spec byte
- The transformer stays a pure function of the Figma file. Determinism holds, and nothing in the transformer needs to know a platform exists
- `figma-from-specs` round-trips unharmed: a `type: text` element renders back to a `TEXT` node
- Nothing is fabricated. Every element in the spec corresponds to a node that was in the file
- The generators are where the platform knowledge already is. Each one already decides what host element a primitive becomes; the binding redirects an existing decision rather than adding a stage
- Retroactive: a spec generated before this ADR resolves under it with no regeneration

**Cons / Trade-offs**:

- Every generator implements resolution. Three transformers repeat the lookup — mitigable with a shared helper, but the logic is not free
- A spec read on its own does not reveal which component the design system uses. The answer is one file away, in conventions, rather than inline
- Two artifacts must be shipped together to reproduce an emission. A spec alone is no longer sufficient input to a generator — though it already was not, since `Settings` also shapes output

---

### Option 1B: Transform-time promotion — the transformer writes the instance *(Rejected)*

The transformer rewrites the text layer into `type: instance, instanceOf: dsText` with `propConfigurations`, and every generator gets composed components for free.

```yaml
elements:
  label:
    instanceOf: dsText
    propConfigurations:
      color: on-surface
      typography: font__200__regular
```

**Rejected because**: it commits the spec to one platform. `instanceOf: dsText` is React's answer; SwiftUI's is `Text` and Web Components' is `ds-text`, and one spec cannot hold all three in one field. Producing per-platform specs multiplies the artifact that is supposed to be the single source of truth, and makes the transformer's output depend on run configuration rather than on the Figma file — breaking determinism.

It also breaks the round trip. `figma-from-specs` reading `instanceOf: dsText` would look for a `dsText` component in the Figma library and not find one, because the source was a plain text layer.

Note this is *not* an argument against ADR-063. Image routing promotes an instance the Figma file already contains. Promoting text fabricates one it does not.

---

### Option 1C: Hybrid — promote, but retain the raw layer under `$extensions` *(Rejected)*

**Rejected because**: it keeps every cost of 1B and adds one. The spec is still platform-committed in its primary shape, still non-deterministic, still larger — and now carries two representations of one element, which means two things can disagree and consumers must decide which is authoritative. It answers the fidelity objection to 1B without answering the platform objection, which is the one that matters.

---

### Option 1D: Resolve in the schema package — a helper that maps element + conventions → component *(Rejected)*

**Rejected because**: Constitution II. `@directededges/specs-schema` declares types and JSON Schema and contains no runtime logic. A resolver is runtime logic, and it would drag platform-emission concerns into the package every consumer depends on.

---

## Decision 2 — What resolution applies to

### Option 2A: Descendant elements of the three primitive kinds *(Selected)*

Resolution applies to an element when **all** of the following hold:

- Its `ElementType` is `text`, `glyph`, or `container`
- It is not the anatomy root of the component being generated
- A binding for that kind is declared under the run's platform id

It applies uniformly wherever elements appear: component anatomy, `slotContentExamples`, `Composition.slotContent`, and `instanceExamples`. There is no separate composition-only rule — a text layer is a text layer.

**Pros**:

- The trigger is the element's own declared type. No inference, no heuristics, no new spec member to consult
- Uniform across every place elements appear, which is what makes it useful for compositions without being special-cased to them
- Excluding the anatomy root is necessary: the root **is** the component being generated. Resolving a container root to `DsBox` would emit `DsBox` where `DsCard` is being defined

**Cons / Trade-offs**:

- `vector`, `line`, `ellipse`, `rectangle`, `polygon`, `star` get no binding. They are rarer and have no obvious designated component; the vocabulary is open to them additively if that changes
- `slot` and `instance` are deliberately excluded — a slot is a hole, and an instance already names its component

---

### Option 2B: Every element type, with bindings optional per kind *(Rejected)*

**Rejected because**: `instance` and `slot` have no coherent binding. An `instance` already carries `instanceOf`; overriding it would let conventions silently replace a component the designer explicitly placed. A `slot` is an absence.

---

### Option 2C: Composition contexts only — `slotContentExamples` and `slotContent` *(Rejected)*

**Rejected because**: it makes the same text layer resolve differently depending on where it sits, for no reason a reader could predict. The gap is real in plain anatomy too — a card's title is a text layer wherever it is described.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| *(none)* | The spec contract is unchanged — no change to `Element`, `ElementType`, `Component`, `SlotContent`, or `Styles` | — |
| `Conventions.ts` | Added `PlatformConventions.primitives?: Partial<Record<PrimitiveKind, PrimitiveBinding>>` | MINOR |
| `Conventions.ts` | Added `PrimitiveKind = 'text' \| 'glyph' \| 'container'` — the bindable subset of `ElementType` | MINOR |
| `Conventions.ts` | Added `PrimitiveBinding` with `component` (shape defined by ADR-075 and ADR-076) | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PlatformConventions:
  primitives?:
    text?:      {component: ...}
    glyph?:     {component: ...}
    container?: {component: ...}
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `primitives` to `#/definitions/PlatformConventions`; added `#/definitions/PrimitiveBinding`; `primitives` keys constrained to the `PrimitiveKind` enum | MINOR |

### Notes

`PrimitiveKind` is a **closed** enum and a strict subset of `ElementType`. Keeping it closed makes an unbindable or misspelled kind a validation error rather than a silently-ignored key, and keeping it a subset means the vocabulary never invents a kind the spec cannot produce. Widening it later is additive.

That the spec contract does not change is the load-bearing outcome of this ADR, not an incidental one. If implementation finds it needs a new spec member, the resolution model is wrong.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `PrimitiveKind` ↔ an `enum` on the `primitives` property names; `PrimitiveBinding` ↔ `#/definitions/PrimitiveBinding`. No spec-side definition is touched, so parity for `component.schema.json` is trivially preserved

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | **None.** It never sees `platforms`, and it emits primitives exactly as it does today | Recompile |
| `figma-from-specs` | **None.** It renders `type: text` back to a `TEXT` node, unchanged | Recompile |
| `react-from-specs` | Implements resolution: consult the binding before emitting a host element | Implement; behavior is opt-in via a declared binding |
| `webcomponents-from-specs` | Same | Implement |
| `specs-cli` | Pass the resolved platform entry to transformers; select the platform id from `Settings`/`Pipeline` | Wire through |
| `specs-plugin-2` | None | Recompile |
| Existing specs | **None.** Every spec already on disk resolves under this ADR with no regeneration | None |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: additive optional fields and new definitions only; the spec contract is untouched. Constitution III.

---

## Consequences

- The spec remains platform-neutral and remains a pure function of the Figma file. Determinism and round-trip fidelity are preserved by construction, not by care
- Resolution is a generator responsibility. Each platform transformer gains a lookup before emitting a primitive; a shared helper is an implementation convenience, not a contract
- Specs generated before this change gain designated-component output with no regeneration — the binding is applied at read time
- A spec is no longer sufficient on its own to reproduce an emission; the conventions file must travel with it. This was already true of `Settings`
- Reading a spec does not tell you which component the design system uses. That is now deliberately one indirection away, and documentation must say so
