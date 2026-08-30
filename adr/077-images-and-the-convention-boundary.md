# ADR: Images Stay Figma-Side — the Boundary Between Detection and Binding

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
figma:
  images:
    backgroundImage: true
    match: "DS Image"          # the designated image component
    sourceProps: [imageSource] # the forwarding prop
```

ADR-073 through ADR-076 build a general mechanism that looks like a superset of it: name a designated component for a primitive, map its styles onto props. The obvious move is to fold `images` into `platforms.<id>.primitives.image` and have one mechanism instead of two.

That move is wrong, and understanding why produces the rule that makes the whole set coherent — so it is worth an ADR rather than a footnote.

Two facts resist the merge:

**There is no `image` element type.** `ElementType` is `text | glyph | vector | container | slot | instance | line | ellipse | rectangle | polygon | star`. An image in a spec is one of two things: a `Styles.backgroundImage` on a container, or an `instance` of the designated image component that the transformer already routed. Neither is a primitive element awaiting resolution. ADR-074 fixed `PrimitiveKind` as a subset of `ElementType`, and `image` is not a member of that set.

**`images`' members are Figma detection facts, not code bindings.** `backgroundImage: true` says *this library expresses images as container fills* — an authoring fact about the Figma file. `sourceProps` names *raw Figma code-only prop names*. `match` names *a Figma component*. Every one answers "what is in this file," and every one is identical no matter which platform the run targets.

---

## Decision Drivers

- **The classification rule (ADR-071) applies to every member individually.** A block does not move because it is thematically adjacent; each member moves only if it describes the code library
- **`PrimitiveKind` stays a subset of `ElementType` (ADR-074).** A kind that no spec can contain is a kind no generator can act on
- **Additive-only.** `conventions.figma.images` shipped in 0.31.0 and is consumed by both runtimes. Moving it is a MAJOR break
- **One mechanism per problem, not one mechanism for adjacent problems.** Constitution III argues against surface, and equally against a unification that makes two different things look the same
- **The boundary must be stateable in one sentence**, or authors will keep asking which block a new convention belongs in

---

## Options Considered

Two decisions: whether `images` moves, and whether the primitive vocabulary widens.

---

## Decision 1 — Does `conventions.figma.images` move to `platforms`?

### Option 1A: It stays, unchanged, and nothing about it is duplicated *(Selected)*

`conventions.figma.images` keeps all three members and all of ADR-063's behavior. The `platforms` namespace gains nothing image-related.

**Pros**:

- Every member passes the ADR-071 test on the Figma side. `backgroundImage`, `sourceProps`, and `match` are all facts about the Figma file, all invariant across platforms
- Purely additive across the whole set. No consumer of 0.31.0 breaks, and ADR-063's dual model — nested component *or* layer fill — survives intact
- The image path is already complete. The transformer routes an image through the designated component, so the spec carries an `instance`, and every generator already knows what to do with an instance. There is no unresolved primitive left for a binding to fix
- Refusing a cosmetic unification keeps the boundary honest, which is the actual deliverable of this ADR

**Cons / Trade-offs**:

- Two blocks name a designated component — `figma.images.match` and `platforms.<id>.primitives.*.component` — and a reader may reasonably ask why. Decision 1's boundary rule is the answer, and it must be in both doc comments
- A design system whose image component is named differently in code than in Figma has no place to say so. Also true of every other component the transformer routes, and out of scope here

---

### Option 1B: Move `images` wholesale to `platforms.<id>.primitives.image` *(Rejected)*

**Rejected because**: it puts Figma facts in a platform-keyed map, forcing `backgroundImage: true` and the raw Figma `sourceProps` names to be restated identically under `web`, `ios`, and `android` — reintroducing exactly the drift ADR-071 eliminated. It is also a MAJOR break of a contract published this release, and it destroys ADR-063's dual model, whose fill-versus-component choice is a property of the Figma file.

---

### Option 1C: Split it — `match` moves, `backgroundImage` and `sourceProps` stay *(Rejected)*

**Rejected because**: `match` is a **Figma component name**, used to recognize an instance in the file. Moving it to a platform block would make one name serve two incompatible jobs — recognizing a Figma node and naming a code component — with no way to express that they differ. It also splits one coherent block across two namespaces, so an author must know the classification rule to find either half.

---

### Option 1D: Dual-declare — leave it, and mirror it under `platforms` *(Rejected)*

**Rejected because**: two sources of truth for one fact, with no rule for which wins when they disagree. Every argument ADR-071 made against re-declaration applies inside a single file.

---

## Decision 2 — Does the primitive vocabulary widen beyond text, glyph, and container?

### Option 2A: Exactly `text | glyph | container` — closed, and open to additive extension *(Selected)*

`PrimitiveKind` stays the three kinds ADR-074 defined. `image` is not added. `vector`, `line`, `ellipse`, `rectangle`, `polygon`, and `star` are not added. `slot` and `instance` are permanently excluded.

| `ElementType` | Bindable | Why |
|---|---|---|
| `text` | Yes | Every DS has a designated text component |
| `glyph` | Yes | Every DS has a designated icon component |
| `container` | Yes | Every DS has a layout primitive (ADR-076) |
| `vector`, `line`, `ellipse`, `rectangle`, `polygon`, `star` | Not yet | No DS ships a designated component for these; they are decorative geometry. Additive if that changes |
| `slot` | Never | A hole in a component, not a thing to render |
| `instance` | Never | Already names its component. A binding could silently replace a component a designer placed deliberately |
| *(no `image` type exists)* | N/A | Images are a style or an already-routed instance, not a primitive element |

**Pros**:

- Every bindable kind corresponds to something a spec can actually contain, so no binding is unreachable
- The three selected kinds are the ones every design system implements, which is why they are the ones compositions are made of
- Excluding `instance` protects designer intent from configuration — the one place where a binding could do real damage
- The vocabulary widens additively, so deferring the geometry kinds costs nothing

**Cons / Trade-offs**:

- A design system with a designated divider or rule component gets no binding for a `line`. Additive later, and `line` is not clearly the right trigger anyway

---

### Option 2B: Add `image` for symmetry *(Rejected)*

**Rejected because**: it would never fire. There is no `image` element for a generator to match, so the key would be inert configuration — worse than absent, because it implies a capability that does not exist.

---

### Option 2C: Open the vocabulary to any `ElementType` *(Rejected)*

**Rejected because**: `slot` and `instance` must be excluded on their merits, and a schema-level enum is the only place to enforce it. An open vocabulary also loses validation on typos, which ADR-074 and ADR-075 both chose to keep.

---

## Decision

### The boundary rule

> **A Figma convention decides what a node *is*. A platform convention decides what a primitive *becomes*.**

`conventions.figma` classifies and detects: which layer names mean glyph, which variant prop means hover, which component is the image component, whether images are expressed as fills. Its answers are the same for every consumer of the file.

`conventions.platforms` binds and emits: which component a text primitive becomes on this platform, what its props are called. Its answers differ per target by design.

Images sit entirely on the first side. Text, glyph, and container detection sits on the first side too — `figma.glyphs.match` is what makes a node a `glyph` at all — and their *binding* sits on the second. The two halves of glyph handling in two namespaces is the rule working, not a seam.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | *(no change to `figma.images`)* | — |
| `Conventions.ts` | `PrimitiveKind` documented as closed at `'text' \| 'glyph' \| 'container'`, with the exclusion rationale | PATCH |
| `Conventions.ts` | Doc comments on `figma` and `platforms` state the boundary rule | PATCH |

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | `description` on the `figma` and `platforms` properties states the boundary rule | PATCH |

### Notes

This ADR changes no shape. Its output is a rule and a rejection, both of which need a durable record — the merge in Option 1B is the obvious next move for anyone reading ADR-073 through ADR-076 without it.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — documentation-only, applied to both artifacts
- **Parity check**: `Conventions.figma` and `Conventions.platforms` doc comments ↔ the corresponding `description` fields

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| All | None — no shape change | None |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **PATCH**

**Justification**: documentation only. No type, property, or default changes. Constitution III.

---

## Consequences

- ADR-063's image model is untouched and stays correct. The one primitive already routed through a designated component keeps its transform-time path
- The primitive vocabulary is three kinds, each corresponding to a real `ElementType`, each with a real designated component in every design system
- `slot` and `instance` are permanently unbindable, so conventions can never override a component a designer placed
- Authors have a one-sentence test for where a new convention belongs, which is what keeps `conventions.figma` from re-accumulating code-side facts
- Two members name a designated component for two different reasons. The doc comments carry the distinction, and it is a genuine cost of the boundary rather than a flaw in it
