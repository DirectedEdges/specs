# ADR: The Image Component's Code Name, and the Read-Side / Write-Side Boundary

**Branch**: `077-images-and-the-convention-boundary`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-063 gave images the first primitive-to-component mapping this schema ever had, as a **dual** model:

```yaml
images:
  backgroundImage: true
  match: "DS Image"          # the designated Figma image component
  sourceProps: [imageSource] # the forwarding prop
```

- **Image as a nested component.** The library has a designated image component, the designer placed an instance of it, the transformer recognizes it, and the spec carries `type: instance, instanceOf: "DS Image"`
- **Image as a layer fill.** The image is a paint on a container, and the spec carries `Styles.backgroundImage`

An image component's name and props disperse across platforms exactly as a text component's do — `DsImage`, `<ds-image>`, SwiftUI `Image`, Compose `AsyncImage`. So images need a per-platform code name, and they need it by a different route than text, glyph, and container do.

**Text, glyph, and container are Figma primitives. An image is an attribute.** The first three are node kinds: a `TEXT` node, a vector marked as a glyph, a `FRAME`. Each *is* a thing a design system implements with a component, so each resolves as a primitive (ADR-074). An image is not a node kind at all — it is a paint applied to a node, an attribute of something that is already a container. Applying it changes nothing about what the node is. That asymmetry is why images cannot ride the primitive mechanism and need a convention of their own.

It also settles what happens to the fill. **A `backgroundImage` on a container must stay a background image.** Such a container almost always has children — a card with a hero fill, a section with a photographic backdrop, a decorated box. Converting it to an image component would discard its layout role and its children, and would do so on exactly the elements where the fill is most clearly decoration rather than content. Layout components should support `backgroundImage` as applied styling on every platform.

That removes the layer-fill half as a binding site. What remains is the instance half — where the component is real, is named, and needs translating from its Figma name into each platform's.

---

## Decision Drivers

- **A primitive is a node kind; an image is an attribute.** Text, glyph, and container each name what an element *is*, and resolve as primitives. An image is a paint on an element that is already something else, so it needs its own convention rather than a place in the primitive vocabulary
- **A container is a container.** A fill is styling. Nothing about a background image changes what the element is or what it contains
- **Do not fabricate, and do not infer (ADR-074).** A binding must not invent a component, and must not guess from a style's presence what an element means
- **`PrimitiveKind` is the bindable subset of `ElementType` (ADR-074).** A kind whose trigger is not an element's own type is not a primitive kind
- **Platform dispersion is the test for a write-side member.** If the answer differs per platform, it belongs in that platform's entry
- **Preserve ADR-063's dual model.** The fill-versus-component choice is a property of the Figma file and must survive untouched
- **The boundary must be stateable in one sentence**, or authors will keep asking which entry a new convention belongs in

---

## Options Considered

Two decisions: where the image component's code name lives, and what happens to a container's `backgroundImage`.

---

## Decision 1 — Where the image component's per-platform code name lives

### Option 1A: `platforms.<id>.images.component` — mirroring `platforms.figma.images.match` *(Selected)*

The `images` block appears on both sides of the platform map, each side carrying the member appropriate to its direction:

```yaml
platforms:
  figma:
    images:
      backgroundImage: true
      match: "DS Image"          # the Figma component's name
      sourceProps: [imageSource]
  react:
    images:
      component: DsImage         # what "DS Image" is called here
  web-components:
    images:
      component: ds-image
  swiftui:
    images:
      component: Image
```

A generator emitting an element whose `instanceOf` matches `platforms.figma.images.match` emits its own platform's `images.component` instead of the Figma name.

**Pros**:

- Answers the dispersion where the component actually exists. The instance half already names a component; all that is missing is its name in each target language
- Structurally symmetric and self-explaining: `images.match` is the Figma name, `images.component` is the code name, same block name on both sides of one map
- Keeps `PrimitiveKind` a clean subset of `ElementType`. No style-triggered kind, no second trigger mechanism, no exception to explain
- Does not touch `backgroundImage`, so a decorated container stays a decorated container on every platform
- Purely additive to ADR-063. No member changes shape or meaning

**Cons / Trade-offs**:

- It is a **component-name translation**, and the general version of that problem — what every Figma component is called in each target — is unsolved. That is not a reason to withhold this one: because an image is an attribute rather than a primitive, the primitive mechanism can never serve it, so leaving the gap open would mean the one image half that *does* have a real component keeps emitting a Figma name into code. If a general answer arrives later, this is the shape it generalizes
- Two members name an image component. The distinction is real — one Figma identifier, one code identifier — but must be carried in both doc comments or it reads as redundancy

---

### Option 1B: `image` as a primitive kind, triggered by a non-null `Styles.backgroundImage` *(Rejected)*

The previous draft's selection.

**Rejected because**: the trigger is wrong. A container carrying a background image is overwhelmingly a container *with children* — a decorated box, not an image — so the rule would convert layout elements into image components and drop their layout role. It also breaks `PrimitiveKind`'s correspondence with `ElementType` to add a kind that, on the elements where it fires, is usually mistaken.

---

### Option 1C: Refine 1B — trigger on a `backgroundImage` with no children *(Rejected)*

**Rejected because**: it trades a wrong rule for a fragile one. A childless container with a fill may be an image, or a divider, a spacer, or a decorative band; nothing in the spec distinguishes them, so the rule would be inference by proxy — the thing ADR-074 exists to prevent. If a design system wants a fill treated as an image component, the honest expression is an instance of the image component in Figma, which ADR-063 already handles.

---

### Option 1D: Nowhere — the Figma name passes through and generators map it themselves *(Rejected)*

**Rejected because**: it is the status quo, and it leaves each generator to hard-code or guess a name that is a per-library fact. That is precisely a convention.

---

## Decision 2 — What happens to a container's `backgroundImage`

### Option 2A: It stays a style, on every platform, always *(Selected)*

`backgroundImage` is passed styling like `backgroundColor`. It is not mappable as a prop on any primitive (ADR-075 Decision 3), so it falls through to `stylesProp` or to the generator's existing style path, carrying its `objectFit` with it.

**Pros**:

- Preserves what the element is. A container with children and a hero fill emits as that, not as an image with its children lost
- Consistent with ADR-075's rule that a container's `backgroundColor`, `padding`, `cornerRadius`, and `strokes` are applied styling. `backgroundImage` is the same kind of thing and gets the same treatment with no special case
- Preserves ADR-063's dual model exactly: `backgroundImage: true` still means this library expresses images as fills, and fills still emit as fills
- Nothing to configure. There is no switch, because there is no decision to make

**Cons / Trade-offs**:

- A design system with an image component and a Figma library that authors hero images as fills gets CSS backgrounds rather than components. The fix is in Figma — place an instance of the image component — which is the authoring correction, not a tooling accommodation

---

### Option 2B: A per-platform switch to convert fills to the image component *(Rejected)*

**Rejected because**: it re-admits Option 1B behind a flag, and a flag does not make the conversion correct on the elements it would fire on. It also puts a Figma-authoring question — is this fill content or decoration? — into a code platform's entry, where the answer cannot be known.

---

## Decision

### The boundary rule

> **A read-side convention decides what a node *is*. A write-side convention decides what a primitive *becomes*.**

Read-side members classify and detect within a platform's own artifacts: which layer names mean glyph, which variant prop means hover, which component is the image component, whether images are expressed as fills. Their answers are the same for every consumer of that platform's artifacts.

Write-side members bind and emit: which component a primitive becomes on that platform, what its props are called. Their answers differ per target by design.

**Neither side is a platform.** A platform can hold both, and Figma is the one that does today — read-side because `specs-from-figma` reads it, and eligible for write-side because `figma-from-specs` renders to it. That is why ADR-073 puts every platform in one map with one shape rather than fencing Figma off.

Images and glyphs both sit on both sides: `platforms.figma.glyphs.match` is what makes a node a `glyph` at all, and `platforms.react.primitives.glyph.component` is what it becomes. Two halves in two entries is the rule working, not a seam.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added `PlatformConventions.images.component?: string` — the code name for the designated image component | MINOR |
| `Conventions.ts` | Doc comments distinguish `images.match` (a Figma component name) from `images.component` (a code component name), and state the read-side / write-side rule | PATCH |
| `Conventions.ts` | `Styles.backgroundImage` documented as passed styling, never a primitive trigger | PATCH |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PlatformConventions:
  images?:
    # read-side
    backgroundImage?: boolean
    match?: string        # the Figma component's name
    sourceProps?: string[]
    # write-side
    component?: string    # what that component is called on this platform
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `component` to the `images` object in `#/definitions/PlatformConventions` | MINOR |
| `conventions.schema.json` | `description` on `images.match`, `images.component`, and `primitives` states the boundary rule | PATCH |

### Notes

`images.component` is meaningful only alongside a `platforms.figma.images.match` somewhere in the same conventions — it is the translation target for that name. It is not validated against it, because cross-platform-entry validation is resolution logic, not schema (Constitution II); an unmatched `component` is inert.

The `images` block keeps one name on both sides deliberately. Splitting it into `images` (read) and `imageComponent` (write) would hide that the two members are two ends of one fact.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `PlatformConventions.images.component` ↔ the `component` property of the `images` object; doc comments ↔ the corresponding `description` fields

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | None beyond ADR-073's read-path change | Update the read path |
| `figma-from-specs` | None; the rule makes room for Figma-side bindings later | Recompile |
| `react-from-specs` | Emit `images.component` for an instance matching the Figma image component; leave `backgroundImage` as styling | Implement |
| `webcomponents-from-specs` | Same | Implement |
| `specs-cli` | None beyond ADR-073 | — |
| `specs-plugin-2` | None beyond ADR-073 | Update the read path |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: one additive optional field on a block introduced in this release; everything else is documentation. Constitution III.

---

## Consequences

- A container with a background image stays a container, with its fill as styling, on every platform. There is no rule that can convert it and no flag that enables one
- The designated image component gets a per-platform code name, so ADR-063's instance half emits `DsImage` rather than the Figma name
- `PrimitiveKind` stays `text | glyph | container` — a clean subset of `ElementType`, one trigger mechanism, no exceptions
- The primitive vocabulary names node kinds, and images are excluded on principle rather than by omission: an image is an attribute of a node, not a kind of node. That is the rule to apply when the next attribute-shaped concept arrives
- A narrow instance of component-name translation now exists in the contract. The general problem — what every Figma component is called per platform — remains open, and this is the shape a future answer would generalize
- The boundary rule is about direction of travel, not about Figma. Any platform can hold both sides, which is what keeps ADR-073's single map honest
