# ADR: Images Are a Bindable Primitive, and the Read-Side / Write-Side Boundary

**Branch**: `077-images-and-the-convention-boundary`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-063 gave images the first primitive-to-component mapping this schema ever had:

```yaml
images:
  backgroundImage: true
  match: "DS Image"          # the designated Figma image component
  sourceProps: [imageSource] # the forwarding prop
```

It is a **dual** model, and the two halves have different fates under ADR-073 – ADR-076:

- **Image as a nested component.** The Figma library has a designated image component and the designer placed an instance of it. The transformer recognizes the instance, and the spec carries `type: instance`. This half is complete — an instance names its component, and every generator already handles instances
- **Image as a layer fill.** There is no instance; the image is a paint on a container, and the spec carries `Styles.backgroundImage`. This half is **not** complete. No component is named anywhere, and each platform's answer differs: `DsImage` in React, `<ds-image>` in Web Components, `Image` in SwiftUI, `AsyncImage` in Compose

The second half has exactly the dispersion that motivated this whole ADR set. An image component's name and props vary across platforms precisely as a text component's do, and a generator handed a `backgroundImage` today emits a CSS background or a modifier — never the design system's image component, even when one exists.

The first draft of this ADR argued the opposite: that images should stay entirely on the Figma side, on the grounds that `image` is not an `ElementType` and that `images`' members are Figma detection facts. The second half of that argument holds. The first half does not — it proves only that an image is not recorded as an *element*, which is a fact about storage, not about whether the primitive needs a binding.

ADR-073 also changed the ground this sits on. Figma is now a platform key, not a sibling namespace, so "stays Figma-side" no longer names a different kind of place — it names a different platform's entry in the same map.

---

## Decision Drivers

- **The classification rule (ADR-071) applies to every member individually.** A block does not move because it is thematically adjacent; each member is placed by what it describes
- **Platform dispersion is the test for a binding.** If the answer differs per platform, it belongs in that platform's entry. If it is the same for every consumer of an artifact, it belongs to the platform that produced the artifact
- **Do not fabricate, and do not infer (ADR-074).** A binding's trigger must be a fact the spec already carries
- **Preserve ADR-063's dual model.** The fill-versus-component choice is a property of the Figma file and must survive
- **One mechanism per problem.** Two ways to name an image component, with no rule for which wins, is worse than either alone
- **The boundary must be stateable in one sentence**, or authors will keep asking which entry a new convention belongs in

---

## Options Considered

Two decisions: whether `image` becomes a bindable primitive, and where ADR-063's existing members land.

---

## Decision 1 — Is `image` a bindable primitive kind?

### Option 1A: Yes — `image` joins the vocabulary, triggered by `Styles.backgroundImage` *(Selected)*

`PrimitiveKind` becomes `text | glyph | container | image`. The `image` kind is matched not by an element type but by an element carrying a non-null `Styles.backgroundImage` (ADR-074 Decision 2).

```yaml
platforms:
  react:
    primitives:
      image:
        component: DsImage
        styleProps:
          objectFit: fit
  swiftui:
    primitives:
      image:
        component: Image
        styleProps:
          objectFit: contentMode
```

```jsx
// container with a backgroundImage, react binding declared
<DsImage src={...} fit="cover" />
```

**Pros**:

- Answers the dispersion directly. An image component's name and props vary per platform exactly as a text component's do, and this is the mechanism built for that
- Completes ADR-063 rather than contradicting it. The nested-component half was already component-routed; this gives the layer-fill half the same destination, arrived at on the write side instead of the read side
- The trigger is a fact the spec already carries, satisfying ADR-074's no-inference rule. `backgroundImage` is present or it is not
- `styleProps` earns its keep here immediately: `objectFit` is CSS `object-fit`, SwiftUI `contentMode`, Compose `contentScale` — three names for one concept, which is the case ADR-075 exists for
- Composes cleanly with `container`. A container with a background image gets the container binding for its box and the image binding for its fill; neither displaces the other

**Cons / Trade-offs**:

- `PrimitiveKind` is no longer a subset of `ElementType`, and the vocabulary now has two trigger mechanisms. That rule was tidy but described where primitives are *recorded*, not what they are
- Two paths can now produce a design system image component: the transformer routing an instance (ADR-063) and a generator resolving a fill. They cannot collide — a spec element is one or the other, never both — but a reader must know both exist
- A library that declares `backgroundImage: true` *and* an image binding gets components where it may have wanted CSS backgrounds. Absence is the off switch: declare no `image` binding

---

### Option 1B: No — images stay entirely read-side *(Rejected)*

The first draft's selection.

**Rejected because**: it leaves the layer-fill half of ADR-063 with no component on any platform, which is the gap this ADR set exists to close. The supporting argument — that `image` is not an `ElementType` — proves only that images are recorded as a style. Where a primitive is *stored* is not what makes it a primitive; a text layer and a background image both name a thing the design system implements with a component.

---

### Option 1C: Route the fill to a component in the transformer, as ADR-063 routes the instance *(Rejected)*

**Rejected because**: it is ADR-074 Option 1B, applied to one primitive. The transformer would fabricate an instance the Figma file does not contain, commit the spec to one platform's component name, break determinism, and break the round trip — `figma-from-specs` cannot render `instanceOf: DsImage` back to a paint on a container.

---

## Decision 2 — Where ADR-063's existing members land

### Option 2A: Split by what each member describes — detection stays read-side, binding is new *(Selected)*

| Member | Lands at | Because |
|---|---|---|
| `backgroundImage` | `platforms.figma.images.backgroundImage` | Declares that *this Figma library* expresses images as container fills. An authoring fact about the file, identical for every consumer |
| `sourceProps` | `platforms.figma.images.sourceProps` | Names **raw Figma code-only prop names**. Meaningless outside Figma |
| `match` | `platforms.figma.images.match` | Names a **Figma component**, used to recognize an instance in the file. It is a Figma identifier, not a code one |
| *(new)* `component` | `platforms.<id>.primitives.image.component` | Names the **code** component a fill becomes. Differs per platform |
| *(new)* `styleProps` | `platforms.<id>.primitives.image.styleProps` | Names that platform's props. Differs per platform |

Nothing moves out of `images`; the block relocates only by ADR-073's one-level change, and its three members keep their meanings exactly.

**Pros**:

- Each member is placed by what it describes, applying ADR-071's rule member by member rather than block by block
- No duplication and no ambiguity. `images.match` and `primitives.image.component` name components in two different languages — one Figma, one code — and neither can substitute for the other
- ADR-063's dual model survives untouched, including the deliberate case where both are enabled and the fill is the fallback
- Purely additive to ADR-063. No member changes shape or meaning

**Cons / Trade-offs**:

- Two members name an image component. The distinction is real (Figma name versus code name) but must be carried in both doc comments or it will read as redundancy
- Image handling is described in two entries of the platform map. Correct — it *is* two things — but it is more to hold in mind than text, which is described in one

---

### Option 2B: Move `match` to the platform binding, keep the rest *(Rejected)*

**Rejected because**: `match` is the Figma component's name, used to recognize a node. Moving it to a code platform's entry would make one field serve two incompatible jobs with no way to say they differ — and a library whose Figma component is "DS Image" while React's is `DsImage` could express only one.

---

### Option 2C: Move all of `images` to each code platform's entry *(Rejected)*

**Rejected because**: `backgroundImage` and `sourceProps` are invariant across platforms, so this forces identical restatement under every platform key — the drift ADR-071 exists to end.

---

## Decision

### The boundary rule

> **A read-side convention decides what a node *is*. A write-side convention decides what a primitive *becomes*.**

Read-side members classify and detect within a platform's own artifacts: which layer names mean glyph, which variant prop means hover, which component is the image component, whether images are expressed as fills. Their answers are the same for every consumer of that platform's artifacts.

Write-side members bind and emit: which component a primitive becomes on that platform, what its props are called. Their answers differ per target by design.

**Neither side is a platform.** A platform can have both, and Figma is the one that does today — read-side because `specs-from-figma` reads it, and eligible for write-side because `figma-from-specs` renders to it. That is why ADR-073 puts every platform in one map with one shape rather than fencing Figma off.

Images sit on both sides, and so does the glyph primitive: `platforms.figma.glyphs.match` is what makes a node a `glyph` at all, and `platforms.react.primitives.glyph.component` is what it becomes. Two halves in two entries is the rule working, not a seam.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | `PrimitiveKind` includes `'image'` (declared in ADR-074) | — |
| `Conventions.ts` | `PlatformConventions.images` unchanged in shape; relocated only by ADR-073 | — |
| `Conventions.ts` | Doc comments distinguish `images.match` (a Figma component name) from `primitives.image.component` (a code component name), and state the read-side / write-side rule | PATCH |

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | `description` on `images.match` and on `primitives` states the boundary rule and the two-languages distinction | PATCH |

### Notes

This ADR declares no new field of its own. Its output is the `image` kind (carried by ADR-074's enum), the placement table, and the boundary rule — and the rule is what stops `conventions` re-accumulating code facts in a platform's read-side members, or vice versa.

The two image paths cannot collide. An element is either an `instance` of the designated component, in which case ADR-063's transform-time routing already applied and no binding is consulted, or it is an element carrying `backgroundImage`, in which case only the binding applies.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — the `image` enum member is ADR-074's change; everything here is documentation, applied to both artifacts
- **Parity check**: `PrimitiveKind`'s `image` member ↔ the `primitives` `propertyNames.enum`; doc comments ↔ the corresponding `description` fields

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | None beyond ADR-073's read-path change | Update the read path |
| `figma-from-specs` | None now; the rule makes room for Figma-side bindings later | Recompile |
| `react-from-specs` | Resolve `backgroundImage` through the `image` binding when one is declared | Implement |
| `webcomponents-from-specs` | Same | Implement |
| `specs-cli` | None beyond ADR-073 | — |
| `specs-plugin-2` | None beyond ADR-073 | Update the read path |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **PATCH**

**Justification**: this ADR adds documentation only. The one type change it depends on — `image` in `PrimitiveKind` — is declared and bumped by ADR-074. Constitution III.

---

## Consequences

- Both halves of ADR-063's dual model now reach a design system component: the instance half at transform time, the fill half at emit time, per platform
- `PrimitiveKind` is a vocabulary of four with two trigger mechanisms. The unifying property is not where a primitive is stored but that its trigger is already in the spec
- Two members name an image component, in two different languages. The doc comments carry the distinction; it is a genuine cost of the split, not a flaw in it
- The boundary rule is about direction of travel, not about Figma. Any platform can hold both sides, which is what keeps ADR-073's single map honest
- `slot` and `instance` remain permanently unbindable, so conventions can never override a component a designer placed
