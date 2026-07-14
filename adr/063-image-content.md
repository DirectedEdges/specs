# ADR: Image content — `backgroundImage` fill, an `images` registry, `ImageProp`, and `ImageBinding`

**Branch**: `063-image-content`
**Created**: 2026-07-14
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Images are unrepresented in the schema today. A Figma node can carry an **image paint** — a fill of `type: 'IMAGE'` referencing an `imageHash`, with a `scaleMode` (`FILL` / `FIT` / `CROP` / `TILE`) — set directly on a container, rectangle, or ellipse. Design systems use images in two distinct ways:

- **Image as a nested component.** The design system has a designated image primitive (e.g. `dsImage`) exposing a source-like property, and other components (e.g. `dsAvatar`) nest an instance of it and forward their own image prop into it. The image is component input, flowing through a nested instance.
- **Image as a layer fill.** There is no designated image component; the image sits directly on a container layer of a broader component — a card's hero banner, a photographic background.

Neither is expressible today:

- `Styles.backgroundColor`, `fillColor`, `strokes` are all typed `ColorStyle` (`string | ColorObject | TokenReference | GradientValue | null`) — **color-semantics only**. There is no fill value that can hold an image, so an image paint is silently dropped by the transformer.
- `types/Props.ts` `AnyProp` is `BooleanProp | StringProp | EnumProp | SlotProp | NumberProp`. There is **no image prop type**, so an image-source property has nowhere to land (a `StringProp` cannot carry the registry reference an image needs, and its `examples` are arbitrary strings).
- There is **no place to store example image data**. `Component` holds a `slotContentExamples` registry (ADR-047) and an `instanceExamples` registry (ADR-046), but nothing for images. The actual pixels a fill points at — the avatar photo, the hero image — have no home, and a bare Figma `imageHash` is meaningless outside the originating Figma file.

The result is a fidelity gap: any component whose design contract includes imagery loses that information entirely, in both the Plugin and REST runtimes.

This ADR establishes two things:

1. **How image sourcing is modelled** — as a nested image component, a layer fill, or both, and how the transformer chooses.
2. **How image data is stored and referenced** — where the data lives and how fills, bindings, and props point at it.

### Naming — how each platform models this

Per Constitution VI (code-platforms-first), comparing the targets:

| Platform | Layer image API | Scale/fit |
|----------|-----------------|-----------|
| Web (CSS) | `background-image: url(...)` | `object-fit` / `background-size`: `cover` / `contain` |
| Web (React) | `<img src>`, `background-image` | `object-fit: cover / contain` |
| iOS (SwiftUI) | `.background { Image(...) }` | `.scaledToFill()` / `.scaledToFit()` |
| Android (Compose) | `Image(...)` / `Modifier.paint` | `ContentScale.Crop` / `Fit` |
| Figma | `ImagePaint` (fill, `type: 'IMAGE'`) | `scaleMode: FILL / FIT / CROP / TILE` |

- **Fill key → `backgroundImage`.** CSS names exactly `background-image`, a longhand sibling of `background-color`; the schema already has `backgroundColor`. Rule 1 (a term 2+ code platforms share — CSS + React/DOM `background-image`) selects `backgroundImage`, and it parallels the existing key. A node can carry an image over a color, so a **separate key** (not an arm on `backgroundColor`) also matches CSS, where the two coexist.
- **Reference key → `$image`.** Follows the schema's `$`-prefixed pointer convention (`$token`, `$binding`, `$slotContent`); names the act of pointing at a stored image.
- **Scale mode values → `COVER` / `CONTAIN`.** Two concepts — fill-the-box-and-crop vs. fit-entirely-inside — are named differently on every platform (see the Scale/fit column above). Reading against Constitution VI:
  - **Cover concept**: no two code platforms share a term (CSS `cover`, SwiftUI `fill`, Compose `Crop`) → rule 1 yields nothing; rule 2 applies → favor a single strong code platform → web `cover`.
  - **Contain concept**: SwiftUI (`fit`) and Compose (`Fit`) agree, so strict rule 1 would suggest `FIT`, while CSS says `contain`. We deliberately take **`contain`** to keep a **single-origin, coherent pair** — `cover`/`contain` are the two CSS keywords, the most recognized pairing in code — rather than splitting the pair across vocabularies (`cover`/`fit`).
  - **Avoiding Figma's `FILL` is itself a driver**: CSS `object-fit: fill` and Compose `FillBounds` both mean *stretch, ignoring aspect ratio* — the opposite behaviour — so `FILL` is a false friend for the web/Android audience. `cover` carries no such collision.
  - SCREAMING_CASE per the Styles enum-casing rule → `'COVER' | 'CONTAIN'`, exactly as ADR-062 rendered CSS's `clip`/`ellipsis` as `TextOverflow = 'CLIP' | 'ELLIPSIS'`. `ImageScaleMode` is a closed, non-token-bindable set → a named type.
  - The transformer remaps Figma's `FILL → COVER` and `FIT → CONTAIN` (the same one-way value map ADR-062 uses for `textTruncation` and `mainAxisAlignment` for `MIN`/`MAX`). **`CROP` and `TILE` remain out of scope** — `CROP` needs a crop transform (deferred, below) and `TILE` has no clean cover/contain analogue.

---

## Decision Drivers

- **Both DS patterns must be expressible** — nested-image-component and image-as-a-layer-fill are both real; the schema should not force one into the other's shape. Which one the transformer emits is a **config choice**, not an inference.
- **Bindings flow through props, not fills** — when a designated image component exists, a parent forwards its image prop into the nested instance via `propConfigurations` (the same channel as every other forwarded prop), *not* by prop-binding a `backgroundImage` style. `backgroundImage` is reserved for the distinct no-component case.
- **Store the data once, reference many times** — the same image appears across variants (default / hover / focus) and across a fill and the prop that feeds it. Inline duplication is unacceptable; a referenced registry mirrors `slotContentExamples` dedup (ADR-047).
- **Reuse the established binding pattern** — a bound prop that carries an authoring-default value already exists as `SlotBinding` (ADR-047: `PropBinding` + `examples?: SlotContentRef[]`). Images follow the same shape with an image payload.
- **Portable, self-contained by default** — a bare Figma `imageHash` is useless outside Figma. The stored value must be resolvable by a downstream consumer (a `data:` URI, an external URL, or an emitted asset path).
- **Room to grow without breaking** — `backgroundImage` is an **object**, not a bare pointer, so `scaleMode` (now) and `rotation` / `opacity` / `filters` (later) attach as optional subproperties additively.
- **No color-semantics pollution** — `ColorStyle` (shared by `textColor`, `strokes`, `fillColor`, `backgroundColor`) must stay color-only; an image is not a color.
- **Additive-only** — new optional types, fields, and schema definitions; no existing type or schema changes (MINOR bump).
- **Type ↔ schema parity** (Constitution I) and **no runtime logic** (Constitution II).

---

## Options Considered

### Option A: Config-driven dual model — nested image component *or* `backgroundImage` fallback, both over one `images` registry *(Selected)*

- **`Component.images`** — a registry (`Record<string, string>`) holding each distinct image's data once, keyed by id. The value is the data itself — a `data:` URI, external URL, or emitted asset path. Lives in the *examples* concern (ADR-061), beside `slotContentExamples`. Answers Q2.
- **`ImageProp`** (`type: 'image'`) — the type of an image source property (the designated component's source prop, and any parent prop forwarded into it). Minimal: no `examples` on the prop.
- **`ImageBinding`** — `PropBinding` + `examples?: ImageValue[]`, used **in `propConfigurations`** to forward a parent image prop into a nested image instance's source prop, carrying the authoring-default image seen in Figma. Mirrors `SlotBinding` (ADR-047).
- **`Styles.backgroundImage`** — an `ImageValue` object (`{ $image, scaleMode? }`) or `null`; the **fallback** for a container image fill when no image component is configured.
- **`Config.processing.imageComponent`** — `{ name, sourceProperty }` or absent, selecting the mode; **`Config.include.imageData`** — the on/off switch.

**How the config drives it** (`Config.processing.imageComponent`):

- **absent / `null`** → images are processed only as `backgroundImage` on `container` elements.
- **present** → both `name` and `sourceProperty` are required. The transformer treats instances of `name` as the image primitive and forwards image props into its `sourceProperty` via `propConfigurations`; any image fill **not** on that component falls back to `backgroundImage` on containers.

Nothing is processed at all unless `Config.include.imageData` is `true`.

**Image as a nested component** (`imageComponent: { name: dsImage, sourceProperty: source }`):

```yaml
# dsAvatar — api.yaml
props:
  image:
    type: image
    nullable: true
elements:
  root:           { type: container }
  imageComponent: { type: instance, instanceOf: dsImage }

# dsAvatar — variants.yaml  (bind via propConfigurations on the nested instance — NOT via backgroundImage)
default:
  elements:
    imageComponent:
      propConfigurations:
        source:
          $binding: "#/props/image"
          examples:
            - $image: "dsAvatar.examples#/images/userPhoto"

# dsAvatar — examples.yaml
images:
  userPhoto: "data:image/png;base64,iVBORw0KG..."
```

**Image as a layer fill** (`imageComponent` absent):

```yaml
# card — variants.yaml
default:
  elements:
    root:
      styles:
        backgroundImage:
          $image: "card.examples#/images/hero"
          scaleMode: COVER         # optional; COVER | CONTAIN; absent = COVER

# card — examples.yaml
images:
  hero: "data:image/jpeg;base64,/9j/4AAQ..."
```

**Pros**:
- Expresses **both** DS patterns; the choice is an explicit, deterministic config, not a heuristic.
- Nested-component sourcing flows through `propConfigurations` like every other forwarded prop — no special "bindable fill" concept; `backgroundImage` stays a plain fill.
- One registry, referenced by fills, bindings, and props → no cross-variant or fill-vs-prop duplication (mirrors `slotContentExamples`).
- `ImageBinding` reuses the exact `SlotBinding` shape — no new binding concept.
- `backgroundImage` as an object leaves a clean, additive path for `rotation`/`opacity`/`filters` later.
- `ColorStyle` stays color-only.

**Cons / Trade-offs**:
- Two code paths (component vs. fallback) the transformer must implement, gated by config.
- Per-fill `rotation`/`opacity` are deferred (see Out of Scope), so a rotated/faded standalone image fill is not yet fully faithful in the fallback path.

---

### Option B: Fill-only — overload `ColorStyle` with an image arm; no prop type, no component mode *(Rejected)*

**Rejected because**: it pollutes a type literally named `ColorStyle` — shared by `textColor`, `fillColor`, and `strokes` — allowing "an image as a text color," which is nonsensical. It also cannot express the nested-image-component pattern (no image prop, no forwarding), and gives example data no home. Solves only half the problem and violates the color-semantics driver.

---

### Option C: Component-only — always model images through a designated image component; no `backgroundImage` fallback *(Rejected)*

**Rejected because**: it cannot represent an image paint set **directly on an arbitrary container** when the design system has **no** image component — a common Figma case — without fabricating a synthetic component that does not exist in the design. The fallback fill is necessary; hence the config-driven duality of Option A.

---

### Option D: Inline the data on each fill, no registry *(Rejected)*

**Rejected because**: the same image recurs across variants and across a fill and its feeding prop; inlining base64 duplicates it every time, bloating output and precluding dedup. Contradicts the "store once, reference many" driver and diverges from `slotContentExamples`.

---

## Decision

Add an `images` registry to `Component`, an `ImageValue`-typed `backgroundImage` fallback fill to `Styles`, an `ImageProp` to the prop union, and an `ImageBinding` (PropBinding + image examples) used in `propConfigurations`. Gate the whole feature on `Config.include.imageData` and select the mode with `Config.processing.imageComponent`. New types live in a new `types/Image.ts`.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Image.ts` *(new)* | Add `ImageScaleMode = 'COVER' \| 'CONTAIN'` | MINOR |
| `types/Image.ts` *(new)* | Add `ImageValue` (`{ $image: string; scaleMode?: ImageScaleMode }`) | MINOR |
| `types/Image.ts` *(new)* | Add `Images = Record<string, string>` (registry: id → data URI / URL / path) | MINOR |
| `types/Image.ts` *(new)* | Add `ImageProp` (`type: 'image'`) | MINOR |
| `types/Image.ts` *(new)* | Add `ImageBinding` (`PropBinding & { examples?: ImageValue[] }`) | MINOR |
| `types/Styles.ts` | Add field `backgroundImage: ImageValue \| null` to `Styles` | MINOR |
| `types/Styles.ts` | Add `'backgroundImage'` to the `StyleKey` union | MINOR |
| `types/Props.ts` | Add `ImageProp` to the `AnyProp` union | MINOR |
| `types/PropConfigurations.ts` | Add `ImageBinding` to the `PropConfigurationValue` union | MINOR |
| `types/Component.ts` | Add field `images?: Images` to `Component` | MINOR |
| `types/index.ts` | Re-export `ImageScaleMode`, `ImageValue`, `Images`, `ImageProp`, `ImageBinding` | MINOR |
| `types/Config.ts` | Add `include.imageData?: boolean` (default false) to `Config` / required on `ResolvedConfig` | MINOR |
| `types/Config.ts` | Add `processing.imageComponent?: { name: string; sourceProperty: string }` to `Config` and `ResolvedConfig` | MINOR |

**Example — new shapes** (`types/Image.ts`):
```yaml
# Scale mode — web vocabulary (CSS object-fit), SCREAMING_CASE. Not token-bindable. Optional; default COVER.
ImageScaleMode: "'COVER' | 'CONTAIN'"

# A layer-fill value: a reference into the images registry plus optional scale mode. An OBJECT so
# rotation/opacity/filters can be added later as optional subproperties without a breaking change.
ImageValue:
  $image: string            # pointer, e.g. "#/images/hero" or "card.examples#/images/hero"
  scaleMode?: ImageScaleMode

# Registry: id → the image data itself (data: URI, external URL, or emitted asset path)
Images: "Record<string, string>"   # keys ^[a-zA-Z0-9_-]+$

# Image-valued prop — minimal; example images live on the binding, not here
ImageProp:
  type: "image"
  default?: string | null    # an images reference, or null
  nullable?: boolean
  $extensions?: PropExtensions

# A bound image prop carrying the authoring-default example image (mirrors SlotBinding, ADR-047).
# Used in propConfigurations to forward a parent image prop into a nested image instance's source prop.
ImageBinding:
  $binding: string           # inherited from PropBinding, e.g. "#/props/image"
  examples?: ImageValue[]
```

**Example — `Styles` addition** (`types/Styles.ts`):
```yaml
# Within the Styles Partial — sibling to backgroundColor. Fallback container fill only
# (the nested-image-component path binds through propConfigurations, not here).
Styles:
  backgroundColor: ColorStyle
  backgroundImage: ImageValue | null    # non-text elements; absent = no image fill
```

**Example — `Config` additions** (`types/Config.ts`):
```yaml
# Config.include
imageData?: boolean            # default false — process images at all

# Config.processing — absent = backgroundImage-on-containers-only; present = require both fields
imageComponent?:
  name: string                 # designated image component name (e.g. "dsImage")
  sourceProperty: string       # its image source prop name (e.g. "source")
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/styles.schema.json` | Add property `backgroundImage` → `#/definitions/ImageStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add definitions `ImageStyleValue`, `ImageValue`, `ImageScaleModeValue` | MINOR |
| `schema/component.schema.json` | Add property `images` → `#/definitions/Images` on the component object | MINOR |
| `schema/component.schema.json` | Add definition `Images` | MINOR |
| `schema/component.schema.json` | Add `#/definitions/ImageProp` to the `AnyProp` `oneOf` and define `ImageProp` | MINOR |
| `schema/component.schema.json` | Add `#/definitions/ImageBinding` to the `PropConfigurationValue` `oneOf` and define it | MINOR |
| Config schema | Add `include.imageData` (boolean) and `processing.imageComponent` (`{ name, sourceProperty }`, both required when present) | MINOR |

**Example — new shapes** (`schema/styles.schema.json`):
```yaml
backgroundImage:
  $ref: "#/definitions/ImageStyleValue"
  description: "Fallback container image fill (used when no image component is configured). Represented in Figma as an IMAGE-type fill."

ImageValue:
  type: object
  description: "A layer image fill — a reference into an images registry plus optional scale mode."
  properties:
    $image:    { type: string, description: "Pointer into an images registry, e.g. '#/images/hero'." }
    scaleMode: { $ref: "#/definitions/ImageScaleModeValue" }
  required: ["$image"]
  additionalProperties: false

ImageScaleModeValue:
  type: string
  enum: ["COVER", "CONTAIN"]
  description: "How the image scales into its layer (CSS object-fit vocabulary). Structural, not token-bindable. Absent = COVER. Transformer remaps Figma FILL→COVER, FIT→CONTAIN."

ImageStyleValue:
  description: "Container image fill value — an ImageValue object, or null."
  oneOf:
    - { $ref: "#/definitions/ImageValue" }
    - { type: "null" }
```

**Example — new shapes** (`schema/component.schema.json`):
```yaml
# On the component object, beside slotContentExamples (the "examples" concern)
images:
  $ref: "#/definitions/Images"
  description: "Registry of image data referenced by backgroundImage fills (ImageValue.$image), ImageBinding examples, and ImageProp default. De-duplicated by the transformer."

Images:
  type: object
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      type: string
      description: "Image data — a data: URI, an external URL, or an emitted asset path."
  additionalProperties: false

ImageProp:
  type: object
  description: "Image-valued property. The authoring-default image rides on the ImageBinding at the binding site, not here."
  properties:
    type:     { type: string, const: "image" }
    default:  { type: ["string", "null"] }
    nullable: { type: boolean }
    $extensions: { $ref: "#/definitions/PropExtensions" }
  required: ["type"]
  patternProperties: { "^\\$": {} }
  additionalProperties: false

ImageBinding:
  type: object
  description: "A prop-bound image forwarded into a nested image instance's source prop, with authoring-default examples."
  properties:
    $binding: { type: string }
    examples: { type: array, items: { $ref: "#/definitions/ImageValue" } }
  required: ["$binding"]
  additionalProperties: false
```

### Notes

- **Sourcing binds through `propConfigurations`, never through `backgroundImage`.** A parent forwarding an image into a nested image component uses an `ImageBinding` under that instance's `propConfigurations`, exactly like any other forwarded prop. `Styles.backgroundImage` carries only a static/example `ImageValue` for the no-component fallback.
- **`scaleMode` placement.** For the **image component**, `scaleMode` (`COVER`/`CONTAIN`) is an ordinary prop/variant of that component (e.g. an `EnumProp` with `enum: ["COVER","CONTAIN"]`) — no schema-special handling. For the **fallback fill**, it is `ImageValue.scaleMode`. Answering the sibling-vs-subproperty question: it is a **subproperty** of the `backgroundImage` object.
- **Why `backgroundImage` is an object.** It already needs `$image` + optional `scaleMode`, and modelling it as an object (not a bare pointer) means `rotation`, `opacity`, and `filters` can be added later as optional subproperties without a breaking change. This also keeps a fill's own opacity/rotation distinct from the node's `styles.opacity`/`styles.rotation`.
- **Registry value & data storage (answers Q2).** Each entry is one string: a `data:` URI (self-contained), an external URL, or an emitted asset path. `imageHash` is **not** stored — it is Figma's byte-fetch key, resolved at extraction time into the stored value; the `$image` pointer replaces it. Whether the transformer emits inline data or an external asset is a transformer/CLI concern (this package stays logic-free).
- **Reference form.** `$image` and `ImageProp.default` are pointers into an `images` registry — root-relative (`#/images/hero`) in a single-file spec, or carrying the component + concern prefix (`card.examples#/images/hero`) in concern-split output (ADR-061); the cross-file addressing follows ADR-061, not this ADR.
- **`ImageBinding` reuses `SlotBinding`'s shape** (ADR-047: `PropBinding` + `examples?`), here with `examples?: ImageValue[]`.
- **`backgroundImage` optional & non-text.** `Styles` is a `Partial`; present only where a container image fill exists (not `TEXT`/`GLYPH`). `additionalProperties: false` on `Styles` requires the property be declared for valid output.

### Out of scope (deferred)

The Figma `ImagePaint` surface is larger than this ADR; the following are intentionally excluded and can be added additively later:

- **`CROP` / `TILE` scale modes** (Figma) — `CROP` requires a crop transform; `TILE` has no clean cover/contain analogue. Only `COVER` / `CONTAIN` are supported.
- **Per-fill `rotation` and `opacity`** — for the **image-component** path these are already expressible on the **instance element's** `styles.rotation` / `styles.opacity`; for the **fallback fill** they would become optional subproperties of the `backgroundImage` object, but their cross-platform mapping (CSS/iOS/Android) is unresolved, so they are deferred. The object shape reserves room for them.
- **`imageTransform`** (crop/pan matrix), **`scalingFactor`** (TILE zoom), **`filters`** (exposure/contrast/saturation/temperature/tint/highlights/shadows) — not modelled.
- **`visible`** on the paint — a paint-level visibility toggle is not surfaced; layer visibility is already handled by `styles.visible`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `ImageScaleMode` ↔ `ImageScaleModeValue` (`enum ["COVER","CONTAIN"]`).
  - `ImageValue` (`{ $image, scaleMode? }`) ↔ `#/definitions/ImageValue` (`$image` required, `scaleMode` optional).
  - `Styles.backgroundImage` (`ImageValue | null`) ↔ `Styles.properties.backgroundImage` → `ImageStyleValue`; `StyleKey` gains `'backgroundImage'`.
  - `Images` (`Record<string, string>`) ↔ `#/definitions/Images`; `Component.images` ↔ component `images` property.
  - `ImageProp` ↔ `#/definitions/ImageProp`, added to `AnyProp` `oneOf`.
  - `ImageBinding` ↔ `#/definitions/ImageBinding`, added to `PropConfigurationValue` `oneOf`.
  - `Config.include.imageData` ↔ `include.imageData` (boolean); `Config.processing.imageComponent` ↔ `processing.imageComponent` (`{ name, sourceProperty }`, both required when present).

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | When `include.imageData` is true: extract `IMAGE` fills, dedup into the `images` registry, and either forward into the configured `imageComponent` via `propConfigurations` (`ImageBinding`) or emit `backgroundImage` on containers. Both runtimes: Plugin `getImageByHash(...).getBytesAsync()`; REST images endpoint. | New extraction/registry/dedup logic and the component-vs-fallback branch; recompile against new types. The largest downstream work item. |
| `specs-cli` | New keys/registry may appear in output; `include.imageData` and `processing.imageComponent` become config options; asset emission may write sidecar files. | Recompile against new schema; surface the new config; implement asset-file emission for the URL/path form. |
| `specs-plugin-2` | New keys/registry may appear in plugin-side output. | Recompile against new types; extract image fills/props in the plugin runtime. |

---

## Semver Decision

**Version bump**: `0.28.0 → 0.28.0` (`MINOR`; lands within the in-progress, unreleased `0.28.0`)

**Justification**: Every change is additive — a new `types/Image.ts` module, one new optional `Styles` key, one new `AnyProp` member, one widened `PropConfigurationValue` union, one new optional `Component` field, two new optional `Config` fields, and their additive schema definitions. No existing type, field, or schema property is removed, renamed, or restructured; `ColorStyle` is untouched. Additive changes are `MINOR` per Constitution III and the Versioning policy. Because `0.28.0` is unreleased, the additions ride within that MINOR release.

---

## Consequences

- Spec output faithfully represents imagery in both DS patterns — nested image component (via `propConfigurations` + `ImageBinding`) and layer fill (via `backgroundImage`) — selected deterministically by `Config.processing.imageComponent`, and gated by `Config.include.imageData`. Image fills are no longer silently dropped.
- A single `Component.images` registry stores each image once; fills, bindings, and props reference it, so no image duplicates across variants or between a fill and its feeding prop.
- Sourcing an image into a component flows through the normal prop-forwarding channel (`propConfigurations`), keeping `backgroundImage` a plain, unbound fill and avoiding a second "bindable fill" concept.
- Example images ride on the binding (`ImageBinding.examples`), exactly like slot authoring defaults (`SlotBinding.examples`).
- `ColorStyle` remains color-only; `backgroundImage` is a distinct fill whose object shape reserves room for `rotation`/`opacity`/`filters` without a future break.
- Reverse-direction tooling (`figma-from-specs`) gains named keys to reconstruct an `ImagePaint` (`$image` → `imageHash` via the registry; `scaleMode` inverts the remap — `COVER → FILL`, `CONTAIN → FIT`) and to write image-valued component props.
- `ImageScaleMode`, `ImageValue`, `Images`, `ImageProp`, and `ImageBinding` become part of the public type surface, subject to Constitution III stability rules.
- Consumers validating against `schema/*` must adopt `0.28.0`; components carrying `backgroundImage`, `images`, or an `image` prop would fail validation against `0.27.0` (`additionalProperties: false`).
