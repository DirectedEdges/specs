# ADR: Image content — `ImageValue` fills, an `images` registry, and `ImageProp`

**Branch**: `063-image-content`
**Created**: 2026-07-14
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Images are unrepresented in the schema today. A Figma node can carry an **image paint** — a fill of `type: 'IMAGE'` referencing an `imageHash`, with a `scaleMode` (`FILL` / `FIT` / `CROP` / `TILE`) — set directly on a container, rectangle, or ellipse. Design systems use images in two distinct ways:

- **Image as a fill.** The image sits directly on a layer of a broader component — a card's hero banner, a container with a photographic background. There is no separate "image component"; the image is a property of the layer.
- **Image as a sourced prop.** A component such as `Avatar` or `Image` exposes a `source`-like property, and one of its variants renders whatever image is passed in. The image is component input, flowing to an inner layer's fill via a prop binding.

Neither is expressible today:

- `Styles.backgroundColor`, `fillColor`, `strokes` are all typed `ColorStyle` (`string | ColorObject | TokenReference | GradientValue | null`) — **color-semantics only**. There is no fill value that can hold an image, so an image paint is silently dropped by the transformer.
- `types/Props.ts` `AnyProp` is `BooleanProp | StringProp | EnumProp | SlotProp | NumberProp`. There is **no image prop type**, so an image-source property has nowhere to land (a `StringProp` cannot carry the reference-plus-render-mode an image needs, and its `examples` are arbitrary strings).
- There is **no place to store example image data**. `Component` holds a `slotContentExamples` registry (ADR-047) and an `instanceExamples` registry (ADR-046), but nothing for images. The actual pixels a fill points at — the avatar photo, the hero image — have no home, and a bare Figma `imageHash` is meaningless outside the originating Figma file.

The result is a fidelity gap: any component whose design contract includes imagery loses that information entirely, in both the Plugin and REST runtimes.

This ADR establishes two things:

1. **How image sourcing is modelled** — a dedicated image *fill* on `Styles`, a dedicated image *prop* type, or both.
2. **How image data is stored and referenced** — where the bytes/URLs live and how fills and props point at them.

### Naming — how each platform models this

Per Constitution VI (code-platforms-first), comparing the targets:

**Image on a layer**

| Platform | API | Note |
|----------|-----|------|
| Web (CSS) | `background-image: url(...)` | sibling to `background-color` |
| Web (React) | `<img src>`, `background-image` | |
| iOS (SwiftUI) | `.background { Image(...) }` | |
| Android (Compose) | `Modifier.paint(painter)` / `Image(...)` | |
| Figma | `ImagePaint` (fill, `type: 'IMAGE'`) | `scaleMode`, `imageHash` |

- **Fill key → `backgroundImage`.** CSS names exactly `background-image`, a longhand sibling of `background-color`; the schema already has `backgroundColor`. Rule 1 (a term 2+ code platforms share — CSS + the general React/DOM `background-image`) selects `backgroundImage`, and it parallels the existing key. A node can carry an image over a color, so a **separate key** (not an arm on `backgroundColor`) also matches CSS, where the two coexist.
- **Reference/source field → `source`.** React Native's `Image source`, HTML/React `src`. Unabbreviated per the naming rule (`source`, not `src`; `src` is not in the grandfathered list).
- **Scale mode values → Figma's `FILL` / `FIT` / `CROP` / `TILE`.** No two code platforms agree on names (CSS `object-fit: cover/contain`, SwiftUI `.scaledToFill()/.scaledToFit()`, Compose `ContentScale.Crop/Fit/FillBounds`), and mapping is lossy in every direction. Rule 3 applies: defer to Figma's model where no code-platform consensus exists and deviating is costly. SCREAMING_CASE per the Styles enum-casing rule. `ImageScaleMode` is a closed, non-token-bindable set → a named type (Constitution "structural enums vs. `Style`").

---

## Decision Drivers

- **Both DS patterns must be expressible** — image-on-a-layer (fill) and image-as-input (prop) are both real; the schema should not force one into the other's shape.
- **Store the bytes once, reference many times** — the same image appears across variants (default / hover / focus) and across a fill and the prop that feeds it. Inline duplication is unacceptable; a referenced registry mirrors `slotContentExamples` dedup (ADR-047).
- **Portable, self-contained output** — a bare Figma `imageHash` is useless outside Figma. The stored form must be resolvable by a downstream consumer (a data URI, an emitted asset path, or an external URL).
- **No color-semantics pollution** — `ColorStyle` (shared by `textColor`, `strokes`, `fillColor`, `backgroundColor`) must stay color-only; an image is not a color.
- **Bindable like every other paint** — an image fill must accept a `PropBinding` (the sourced-prop case) and a `Conditional`, exactly as `ColorStyle` does.
- **Additive-only** — new optional types, fields, and schema definitions; no existing type or schema changes (MINOR bump).
- **Type ↔ schema parity** — every new `types/` field has a matching `schema/` definition (Constitution I).
- **No runtime logic** — this package gains only type declarations and schema definitions (Constitution II).

---

## Options Considered

### Option A: Unified model — `images` registry + `backgroundImage` fill + `ImageProp`, all referencing the registry *(Selected)*

Three additions that compose:

- **`Component.images`** — a root registry (`Record<string, ImageRef>`) holding each distinct image's stored bytes/URL once, keyed by id. Answers Q2.
- **`Styles.backgroundImage`** — a new fill key whose value is an `ImageValue` (`{ $image, scaleMode }`, where `$image` is a `#/images/<id>` reference), or a `TokenReference` / `PropBinding` / `Conditional` / `null`. Answers Q1's fill arm.
- **`ImageProp`** — a new `AnyProp` member (`type: 'image'`) whose `default`/`examples` are `#/images/<id>` references. Answers Q1's sourced-prop arm.

The two patterns unify through the registry:

```yaml
# Static image painted directly on a layer
styles:
  backgroundImage: { $image: "#/images/hero", scaleMode: FILL }

# Image passed in as a component prop, feeding an inner layer's fill
props:
  avatarSource:
    type: image
    examples: ["#/images/user-1", "#/images/user-2"]
elements:
  photo:
    styles:
      backgroundImage: { $binding: "#/props/avatarSource" }   # PropBinding into the ImageProp

images:
  hero:   { source: "./assets/hero.png",    width: 1200, height: 480 }
  user-1: { source: "data:image/png;base64,iVBOR...", width: 64, height: 64 }
```

**Pros**:
- Expresses **both** DS patterns without forcing either into the other; a designer's choice of "image fill on a container" vs. "`<Avatar source>` component" round-trips faithfully.
- One registry, referenced by both fills and props → no cross-variant or fill-vs-prop duplication (mirrors `slotContentExamples`).
- `backgroundImage` is a `PropBinding`/`Conditional`-capable paint, exactly like `ColorStyle` — the sourced-prop and conditional-visibility cases work with no special handling.
- `ColorStyle` stays color-only; no semantic pollution.
- Storage form is a single flexible `source` string (data URI, emitted path, or URL) — the schema defines the shape; the transformer/Config picks the form.

**Cons / Trade-offs**:
- Largest surface of the three options: one new `Styles` key, one new `AnyProp` member, one new `Component` field, and supporting value/registry types. Justified because each addition answers a distinct, real need.
- Introduces an image-data emission concern (embed vs. reference) that the transformer must resolve; governed by a new `Config.format.imageData` lever (below).

---

### Option B: Fill-only — overload `ColorStyle` with an image arm; no prop type *(Rejected)*

Add an `ImageValue` arm to `ColorStyle` (so `backgroundColor` can hold an image) and stop there.

**Rejected because**: it pollutes a type literally named `ColorStyle` — shared by `textColor`, `fillColor`, and `strokes` — allowing "an image as a text color," which is nonsensical and un-validatable. It also leaves the sourced-prop pattern (`<Avatar source>`) unexpressible: there is still no image prop type, and no place to store the example bytes. Violates the color-semantics driver and only solves half the problem.

---

### Option C: Prop-only / image-as-component — model every image as an `Image` subcomponent with a `source` `StringProp` *(Rejected)*

Treat all imagery as an inner `Image`/`Avatar` component instance carrying a string `source` prop; no fill representation.

**Rejected because**: it cannot represent an image paint set **directly on an arbitrary container** — the common Figma case with no separate component — without fabricating a synthetic `Image` component that does not exist in the design. It discards `scaleMode` (a `StringProp` src has no render mode), and `StringProp` cannot carry binary example data or dedupe it. Forces a component abstraction onto data that is often just a layer fill. Violates the "both patterns" and "store bytes once" drivers.

---

### Option D: Inline the bytes on each fill, no registry *(Rejected)*

Put the `source` bytes directly on `ImageValue`, with no `Component.images`.

**Rejected because**: the same image recurs across variants and across a fill and its feeding prop; inlining base64 duplicates it every time, bloating output and precluding dedup. Contradicts the "store once, reference many" driver and diverges from the established `slotContentExamples` registry pattern.

---

## Decision

Add an image registry to `Component`, an `ImageValue`-bearing `backgroundImage` fill key to `Styles`, and an `ImageProp` to the prop union — all referencing the registry. New types live in a new `types/Image.ts`; schema counterparts live in `component.schema.json` (registry, prop) and `styles.schema.json` (fill value). A `Config.format.imageData` lever governs whether stored images embed their bytes or reference an emitted asset.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Image.ts` *(new)* | Add `ImageScaleMode = 'FILL' \| 'FIT' \| 'CROP' \| 'TILE'` | MINOR |
| `types/Image.ts` *(new)* | Add `ImageValue` (`{ $image: string; scaleMode: ImageScaleMode }`) | MINOR |
| `types/Image.ts` *(new)* | Add `ImageRef` (registry entry) and `Images = Record<string, ImageRef>` | MINOR |
| `types/Image.ts` *(new)* | Add `ImageProp` (`type: 'image'`) | MINOR |
| `types/Styles.ts` | Add `export type ImageStyle = ImageValue \| TokenReference \| PropBinding \| Conditional \| null` | MINOR |
| `types/Styles.ts` | Add field `backgroundImage: ImageStyle` to `Styles` | MINOR |
| `types/Styles.ts` | Add `'backgroundImage'` to the `StyleKey` union | MINOR |
| `types/Props.ts` | Add `ImageProp` to the `AnyProp` union | MINOR |
| `types/Component.ts` | Add field `images?: Images` to `Component` | MINOR |
| `types/index.ts` | Re-export `ImageScaleMode`, `ImageValue`, `ImageRef`, `Images`, `ImageProp`, `ImageStyle` | MINOR |
| `types/Config.ts` | Add `format.imageData?: 'REFERENCE' \| 'EMBED'` to `Config` and `ResolvedConfig` | MINOR |

**Example — new shapes** (`types/Image.ts`):
```yaml
# Scale mode — structural enum, not token-bindable, Figma vocabulary (rule 3)
ImageScaleMode: "'FILL' | 'FIT' | 'CROP' | 'TILE'"

# A paint value: a reference into #/images plus how the image scales into the layer
ImageValue:
  $image: string          # JSON Pointer, e.g. "#/images/hero"
  scaleMode: ImageScaleMode

# A registry entry — the stored image itself
ImageRef:
  source: string          # data URI, emitted asset path, or external URL
  width?: number          # intrinsic pixel width  (optional)
  height?: number         # intrinsic pixel height (optional)
  mimeType?: string       # e.g. "image/png"       (optional)
  $extensions?:           # Figma provenance only (imageHash) — not required by consumers
    com.figma?: { imageHash?: string }

Images: "Record<string, ImageRef>"   # keys ^[a-zA-Z0-9_-]+$

# An image-valued prop; default/examples are #/images references (mirrors SlotProp → SlotContentRef)
ImageProp:
  type: "image"
  default?: string | null
  nullable?: boolean
  examples?: string[]      # each a "#/images/<id>" reference
  $extensions?: PropExtensions
```

**Example — `Styles` additions** (`types/Styles.ts`):
```yaml
# Within the Styles Partial — sibling to backgroundColor
Styles:
  backgroundColor: ColorStyle
  # Image fill painted on a layer. Bindable/conditional like other paints. Non-text elements only.
  backgroundImage: ImageStyle

# New named value type — mirrors ColorStyle but image-semantics
ImageStyle: "ImageValue | TokenReference | PropBinding | Conditional | null"
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/styles.schema.json` | Add property `backgroundImage` → `#/definitions/ImageStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add definitions `ImageStyleValue`, `ImageValue`, `ImageScaleModeValue` | MINOR |
| `schema/component.schema.json` | Add property `images` → `#/definitions/Images` on the component object | MINOR |
| `schema/component.schema.json` | Add definitions `Images`, `ImageRef` | MINOR |
| `schema/component.schema.json` | Add `#/definitions/ImageProp` to the `AnyProp` `oneOf` and define `ImageProp` | MINOR |

**Example — new shapes** (`schema/styles.schema.json`):
```yaml
backgroundImage:
  $ref: "#/definitions/ImageStyleValue"
  description: "Image fill painted on the layer. Present on non-text element types. Represented in Figma as an IMAGE-type fill."

ImageValue:
  type: object
  description: "An image paint — a reference into #/images plus how it scales into the layer."
  properties:
    $image:    { type: string, description: "JSON Pointer to an entry in #/images, e.g. '#/images/hero'." }
    scaleMode: { $ref: "#/definitions/ImageScaleModeValue" }
  required: ["$image", "scaleMode"]
  additionalProperties: false

ImageScaleModeValue:
  type: string
  enum: ["FILL", "FIT", "CROP", "TILE"]
  description: "How the image scales into its layer. Figma vocabulary — structural, not token-bindable."

ImageStyleValue:
  description: "Image fill value — an inline ImageValue, a token reference, a prop binding, a conditional, or null."
  oneOf:
    - { $ref: "#/definitions/ImageValue" }
    - { $ref: "#/definitions/TokenReference" }
    - { $ref: "#/definitions/PropBinding" }
    - { $ref: "#/definitions/Conditional" }
    - { type: "null" }
```

**Example — new shapes** (`schema/component.schema.json`):
```yaml
# On the component object, beside slotContentExamples
images:
  $ref: "#/definitions/Images"
  description: "Registry of images referenced by fills (#/images/<id> from ImageValue.$image) and by ImageProp default/examples. De-duplicated by the transformer."

Images:
  type: object
  patternProperties:
    "^[a-zA-Z0-9_-]+$": { $ref: "#/definitions/ImageRef" }
  additionalProperties: false

ImageRef:
  type: object
  description: "A stored image. `source` is a data URI, an emitted asset path, or an external URL, per Config.format.imageData."
  properties:
    source:   { type: string }
    width:    { type: number }
    height:   { type: number }
    mimeType: { type: string }
    $extensions: { type: object }
  required: ["source"]
  additionalProperties: false

ImageProp:
  type: object
  description: "Image-valued property. default/examples are #/images references."
  properties:
    type:     { type: string, const: "image" }
    default:  { type: ["string", "null"] }
    nullable: { type: boolean }
    examples: { type: array, items: { type: string } }
    $extensions: { $ref: "#/definitions/PropExtensions" }
  required: ["type"]
  patternProperties: { "^\\$": {} }
  additionalProperties: false
```

### Notes

- **Reference form.** `ImageValue.$image` and `ImageProp.examples[]` are root-relative JSON Pointers into `#/images`, consistent with `PropBinding.$binding` (`"#/props/label"`). The `$image` key follows the `$`-prefixed pointer convention (`$token`, `$binding`).
- **Why `ImageValue` is an object, not a bare pointer.** Unlike `SlotContentRef` (a plain pointer string), an image fill also needs `scaleMode`, so the fill value must be an object. The *stored bytes* live in the registry; only the pointer + render mode live on the fill — hence no duplication across variants.
- **`Config.format.imageData` — the storage lever (answers Q2).** `REFERENCE` (default) emits `source` as an emitted asset path or external URL, keeping specs small; `EMBED` emits a `data:` URI so the spec is fully self-contained. The **schema shape is identical either way** — `source` is one string; only its content differs. Actual asset emission is a transformer/CLI concern (this package stays logic-free).
- **`backgroundImage` optional & non-text.** `Styles` is a `Partial`; the key is present only where an image paint exists (containers, rectangles, ellipses — not `TEXT`/`GLYPH`, which use `fillColor`). `additionalProperties: false` on `Styles` requires the property be declared for valid output.
- **Registry keys** use the same `^[a-zA-Z0-9_-]+$` pattern as `slotContentExamples`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `ImageScaleMode` ↔ `ImageScaleModeValue` (`enum ["FILL","FIT","CROP","TILE"]`).
  - `ImageValue` (`{ $image, scaleMode }`) ↔ `#/definitions/ImageValue`.
  - `ImageStyle` (`ImageValue | TokenReference | PropBinding | Conditional | null`) ↔ `ImageStyleValue` (`oneOf` of the same five).
  - `Styles.backgroundImage` ↔ `Styles.properties.backgroundImage`; `StyleKey` gains `'backgroundImage'`.
  - `ImageRef` / `Images` ↔ `#/definitions/ImageRef` / `Images`; `Component.images` ↔ component `images` property.
  - `ImageProp` ↔ `#/definitions/ImageProp`, added to `AnyProp` `oneOf` (matching the `AnyProp` TS union).
  - `Config.format.imageData` ↔ `format.imageData` (`enum ["REFERENCE","EMBED"]`) in the Config schema.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must extract `IMAGE`-type fills → `backgroundImage`, populate the `images` registry (dedup by `imageHash`), emit `ImageProp` for image-valued Figma props, and honor `format.imageData` (embed vs. emit asset). Both runtimes: Plugin `getImageByHash(...).getBytesAsync()`; REST images endpoint. | New extraction + registry/dedup logic; recompile against new types. The largest downstream work item. |
| `specs-cli` | New keys/registry may appear in validated & serialized output; `format.imageData` becomes a config option; asset emission may write sidecar files when `REFERENCE`. | Recompile against new schema; surface `format.imageData`; implement asset-file emission for `REFERENCE` mode. |
| `specs-plugin-2` | New keys/registry may appear in plugin-side output. | Recompile against new types; extract image fills/props in the plugin runtime. |

---

## Semver Decision

**Version bump**: `0.28.0 → 0.28.0` (`MINOR`; lands within the in-progress, unreleased `0.28.0`)

**Justification**: Every change is additive — a new `types/Image.ts` module, one new optional `Styles` key, one new `AnyProp` member, one new optional `Component` field, one new optional `Config` field, and their additive schema definitions. No existing type, field, or schema property is removed, renamed, or restructured; `ColorStyle` is untouched. Additive changes are `MINOR` per Constitution III and the Versioning policy. Because `0.28.0` is unreleased, the additions ride within that MINOR release.

---

## Consequences

- Spec output faithfully represents imagery in both DS patterns — image-on-a-layer (`backgroundImage`) and image-as-input (`ImageProp` bound into a fill) — in both Plugin and REST runtimes. Image fills are no longer silently dropped.
- A single `Component.images` registry stores each image once; fills and props reference it, so no image duplicates across variants or between a fill and its feeding prop.
- Specs choose their portability/size trade-off via `Config.format.imageData`: `EMBED` for self-contained data URIs, `REFERENCE` (default) for small specs plus emitted asset files.
- `ColorStyle` remains color-only; `backgroundImage` is a distinct, `PropBinding`/`Conditional`-capable paint, so conditional visibility and sourced-image props work with no special casing.
- Reverse-direction tooling (`figma-from-specs`) gains named keys to reconstruct an `ImagePaint` (`$image` → `imageHash` via the registry, `scaleMode` direct) and to write image-valued component props.
- `ImageScaleMode`, `ImageValue`, `ImageRef`, `Images`, `ImageProp`, and `ImageStyle` become part of the public type surface, subject to Constitution III stability rules.
- Consumers validating against `schema/*` must adopt `0.28.0`; components carrying `backgroundImage`, `images`, or an `image` prop would fail validation against `0.27.0` (`additionalProperties: false`).
