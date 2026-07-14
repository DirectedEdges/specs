# ADR: Image content — `ImageValue` fills, an `images` registry, `ImageProp`, and `ImageBinding`

**Branch**: `063-image-content`
**Created**: 2026-07-14
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Images are unrepresented in the schema today. A Figma node can carry an **image paint** — a fill of `type: 'IMAGE'` referencing an `imageHash`, with a `scaleMode` (`FILL` / `FIT` / `CROP` / `TILE`) — set directly on a container, rectangle, or ellipse. Design systems use images in two distinct ways:

- **Image as a fill.** The image sits directly on a layer of a broader component — a card's hero banner, a container with a photographic background. There is no separate "image component"; the image is a property of the layer.
- **Image as a sourced prop.** A component such as `dsImage` or `dsAvatar` exposes a `source`-like property, and its content is whatever image is passed in. The image is component input, flowing to an inner layer's fill via a prop binding.

Neither is expressible today:

- `Styles.backgroundColor`, `fillColor`, `strokes` are all typed `ColorStyle` (`string | ColorObject | TokenReference | GradientValue | null`) — **color-semantics only**. There is no fill value that can hold an image, so an image paint is silently dropped by the transformer.
- `types/Props.ts` `AnyProp` is `BooleanProp | StringProp | EnumProp | SlotProp | NumberProp`. There is **no image prop type**, so an image-source property has nowhere to land (a `StringProp` cannot carry the reference an image needs, and its `examples` are arbitrary strings).
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
- **Reference key → `$image`.** Follows the schema's `$`-prefixed pointer convention (`$token`, `$binding`, `$slotContent`); names the act of pointing at a stored image.
- **Scale mode values → Figma's `FILL` / `FIT` / `CROP` / `TILE`.** No two code platforms agree on names (CSS `object-fit: cover/contain`, SwiftUI `.scaledToFill()/.scaledToFit()`, Compose `ContentScale.Crop/Fit/FillBounds`), and mapping is lossy in every direction. Rule 3 applies: defer to Figma's model where no code-platform consensus exists and deviating is costly. SCREAMING_CASE per the Styles enum-casing rule. `ImageScaleMode` is a closed, non-token-bindable set → a named type (Constitution "structural enums vs. `Style`"). It is optional on `ImageValue`; absence means `FILL` (Figma's default).

---

## Decision Drivers

- **Both DS patterns must be expressible** — image-on-a-layer (fill) and image-as-input (prop, bound into a nested instance) are both real; the schema should not force one into the other's shape.
- **Store the bytes once, reference many times** — the same image appears across variants (default / hover / focus) and across a fill and the prop that feeds it. Inline duplication is unacceptable; a referenced registry mirrors `slotContentExamples` dedup (ADR-047).
- **Reuse the established binding pattern** — a bound prop that carries an authoring-default value already exists as `SlotBinding` (ADR-047: `PropBinding` + `examples?: SlotContentRef[]`). Images follow the same shape, not a new one.
- **Portable, self-contained by default** — a bare Figma `imageHash` is useless outside Figma. The stored form must be resolvable by a downstream consumer (a data URI by default, or an emitted asset path / external URL by config).
- **No color-semantics pollution** — `ColorStyle` (shared by `textColor`, `strokes`, `fillColor`, `backgroundColor`) must stay color-only; an image is not a color.
- **Minimal surface** — a plain string registry value and a minimal prop type; example data attaches at the binding, not duplicated onto the prop definition.
- **Additive-only** — new optional types, fields, and schema definitions; no existing type or schema changes (MINOR bump).
- **Type ↔ schema parity** — every new `types/` field has a matching `schema/` definition (Constitution I).
- **No runtime logic** — this package gains only type declarations and schema definitions (Constitution II).

---

## Options Considered

### Option A: Unified model — `images` registry + `backgroundImage` fill + `ImageProp` + `ImageBinding`, all referencing the registry *(Selected)*

Four additions that compose:

- **`Component.images`** — a registry (`Record<string, string>`) holding each distinct image's data once, keyed by id. The value is the image data itself — a `data:` URI (default), an external URL, or an emitted asset path (per `Config.format.imageData`). Lives in the *examples* concern (ADR-061), beside `slotContentExamples`. Answers Q2.
- **`Styles.backgroundImage`** — a new fill key whose value is an `ImageValue` (`{ $image, scaleMode? }`, where `$image` references the registry), an `ImageBinding` (a prop-bound fill), a `TokenReference`, a `Conditional`, or `null`. Answers Q1's fill arm.
- **`ImageProp`** — a new `AnyProp` member (`type: 'image'`). Minimal: no `examples` on the prop itself. Answers Q1's sourced-prop arm.
- **`ImageBinding`** — `PropBinding` plus `examples?: ImageValue[]` (the authoring-default images seen in Figma). Used where an image prop is bound — on a leaf's `backgroundImage`, or in a nested instance's `propConfigurations`. Mirrors `SlotBinding` (ADR-047).

The two patterns unify through the registry. **Image sourced as a component prop** (`dsImage`, and `dsAvatar` referencing it):

```yaml
# dsImage — api.yaml
props:
  source:
    type: image

# dsImage — variants.yaml (the leaf's fill is bound to the prop; examples ride the binding)
default:
  elements:
    image:
      styles:
        backgroundImage:
          $binding: "#/props/source"
          examples:
            - $image: "dsImage.examples#/images/poolsideTropicalParadise"

# dsImage — examples.yaml
images:
  poolsideTropicalParadise: "data:image/jpeg;base64,/9j/4AAQ..."
```

```yaml
# dsAvatar — api.yaml (references dsImage)
props:
  image:
    type: image
    nullable: true
elements:
  root: { type: container }
  imageComponent: { type: instance, instanceOf: dsImage }

# dsAvatar — variants.yaml (forward the avatar's image prop into the nested dsImage instance)
default:
  elements:
    imageComponent:
      propConfigurations:
        source:
          $binding: "#/props/image"
          examples:
            - $image: "dsAvatar.examples#/images/userPhoto"
```

**Image painted directly on a layer** (no image component):

```yaml
# dsAvatar — variants.yaml
default:
  elements:
    root:
      styles:
        backgroundImage:
          $image: "dsAvatar.examples#/images/userPhoto"

# dsAvatar — examples.yaml (either case)
images:
  userPhoto: "data:image/png;base64,iVBORw0KG..."
```

**Pros**:
- Expresses **both** DS patterns without forcing either into the other; a designer's choice of "image fill on a container" vs. "`<dsImage source>` component" round-trips faithfully.
- One registry, referenced by both fills and props → no cross-variant or fill-vs-prop duplication (mirrors `slotContentExamples`).
- `ImageBinding` reuses the exact `SlotBinding` shape (`PropBinding` + `examples?`) — no new binding concept, just an image-typed payload.
- `ColorStyle` stays color-only; no semantic pollution.
- Registry value is one plain string; the embed-vs-reference trade-off is a single `Config.format.imageData` lever, not a schema-shape difference.

**Cons / Trade-offs**:
- Largest surface of the options: one new `Styles` key, one new `AnyProp` member, one new binding type, one new `Component` field, and supporting value types. Justified because each addition answers a distinct, real need and reuses existing patterns.
- Introduces an image-data emission concern (embed vs. reference) that the transformer must resolve; governed by the new `Config.format.imageData` lever.

---

### Option B: Fill-only — overload `ColorStyle` with an image arm; no prop type *(Rejected)*

Add an `ImageValue` arm to `ColorStyle` (so `backgroundColor` can hold an image) and stop there.

**Rejected because**: it pollutes a type literally named `ColorStyle` — shared by `textColor`, `fillColor`, and `strokes` — allowing "an image as a text color," which is nonsensical and un-validatable. It also leaves the sourced-prop pattern (`dsAvatar`/`dsImage`) unexpressible: there is still no image prop type and no place to store or reference the example data. Violates the color-semantics driver and only solves half the problem.

---

### Option C: Prop-only / image-as-component — model every image as a `dsImage` subcomponent with a `source` `StringProp` *(Rejected)*

Treat all imagery as an inner `dsImage`/`dsAvatar` instance carrying a string `source` prop; no fill representation.

**Rejected because**: it cannot represent an image paint set **directly on an arbitrary container** — the common Figma case with no separate component — without fabricating a synthetic component that does not exist in the design. It discards `scaleMode` (a `StringProp` src has no render mode), and `StringProp` cannot carry or dedupe example data. Forces a component abstraction onto data that is often just a layer fill. Violates the "both patterns" and "store bytes once" drivers.

---

### Option D: Inline the data on each fill, no registry *(Rejected)*

Put the image data directly on `ImageValue` (`{ data: "...base64..." , scaleMode }`), with no `Component.images`.

**Rejected because**: the same image recurs across variants and across a fill and its feeding prop; inlining base64 duplicates it every time, bloating output and precluding dedup. Contradicts the "store once, reference many" driver and diverges from the established `slotContentExamples` registry pattern.

---

## Decision

Add an `images` registry to `Component`, an `ImageValue`-bearing `backgroundImage` fill key to `Styles`, an `ImageProp` to the prop union, and an `ImageBinding` (PropBinding + image examples) usable on the fill and in `propConfigurations` — all referencing the registry. New types live in a new `types/Image.ts`. A `Config.format.imageData` lever governs whether stored images embed their data (default) or reference an emitted asset.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Image.ts` *(new)* | Add `ImageScaleMode = 'FILL' \| 'FIT' \| 'CROP' \| 'TILE'` | MINOR |
| `types/Image.ts` *(new)* | Add `ImageValue` (`{ $image: string; scaleMode?: ImageScaleMode }`) | MINOR |
| `types/Image.ts` *(new)* | Add `Images = Record<string, string>` (registry: id → data URI / URL / path) | MINOR |
| `types/Image.ts` *(new)* | Add `ImageProp` (`type: 'image'`) | MINOR |
| `types/Image.ts` *(new)* | Add `ImageBinding` (`PropBinding & { examples?: ImageValue[] }`) | MINOR |
| `types/Styles.ts` | Add `export type ImageStyle = ImageValue \| ImageBinding \| TokenReference \| Conditional \| null` | MINOR |
| `types/Styles.ts` | Add field `backgroundImage: ImageStyle` to `Styles` | MINOR |
| `types/Styles.ts` | Add `'backgroundImage'` to the `StyleKey` union | MINOR |
| `types/Props.ts` | Add `ImageProp` to the `AnyProp` union | MINOR |
| `types/PropConfigurations.ts` | Add `ImageBinding` to the `PropConfigurationValue` union | MINOR |
| `types/Component.ts` | Add field `images?: Images` to `Component` | MINOR |
| `types/index.ts` | Re-export `ImageScaleMode`, `ImageValue`, `Images`, `ImageProp`, `ImageBinding`, `ImageStyle` | MINOR |
| `types/Config.ts` | Add `format.imageData?: 'EMBED' \| 'REFERENCE'` to `Config` and `ResolvedConfig` | MINOR |

**Example — new shapes** (`types/Image.ts`):
```yaml
# Scale mode — structural enum, not token-bindable, Figma vocabulary (rule 3). Optional; default FILL.
ImageScaleMode: "'FILL' | 'FIT' | 'CROP' | 'TILE'"

# A paint value: a reference into an images registry plus optional scale mode
ImageValue:
  $image: string            # pointer, e.g. "#/images/userPhoto" or "dsAvatar.examples#/images/userPhoto"
  scaleMode?: ImageScaleMode

# Registry: id → the image data itself (data URI by default; URL or emitted path per Config.format.imageData)
Images: "Record<string, string>"   # keys ^[a-zA-Z0-9_-]+$

# Image-valued prop — minimal; example images live on the binding, not here
ImageProp:
  type: "image"
  default?: string | null    # an images reference, or null
  nullable?: boolean
  $extensions?: PropExtensions

# A bound image prop carrying authoring-default example images (mirrors SlotBinding, ADR-047)
ImageBinding:
  $binding: string           # inherited from PropBinding, e.g. "#/props/source"
  examples?: ImageValue[]
```

**Example — `Styles` additions** (`types/Styles.ts`):
```yaml
# Within the Styles Partial — sibling to backgroundColor
Styles:
  backgroundColor: ColorStyle
  # Image fill on a layer: a static ImageValue, a prop-bound ImageBinding, a token, a conditional, or null. Non-text elements.
  backgroundImage: ImageStyle

# New named value type — image-semantics counterpart to ColorStyle
ImageStyle: "ImageValue | ImageBinding | TokenReference | Conditional | null"
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/styles.schema.json` | Add property `backgroundImage` → `#/definitions/ImageStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add definitions `ImageStyleValue`, `ImageValue`, `ImageBinding`, `ImageScaleModeValue` | MINOR |
| `schema/component.schema.json` | Add property `images` → `#/definitions/Images` on the component object | MINOR |
| `schema/component.schema.json` | Add definition `Images` | MINOR |
| `schema/component.schema.json` | Add `#/definitions/ImageProp` to the `AnyProp` `oneOf` and define `ImageProp` | MINOR |
| `schema/component.schema.json` | Add `ImageBinding` to the `PropConfigurationValue` `oneOf` (and define it, or `$ref` the shared definition) | MINOR |

**Example — new shapes** (`schema/styles.schema.json`):
```yaml
backgroundImage:
  $ref: "#/definitions/ImageStyleValue"
  description: "Image fill painted on the layer. Present on non-text element types. Represented in Figma as an IMAGE-type fill."

ImageValue:
  type: object
  description: "An image paint — a reference into an images registry plus optional scale mode."
  properties:
    $image:    { type: string, description: "Pointer into an images registry, e.g. '#/images/userPhoto'." }
    scaleMode: { $ref: "#/definitions/ImageScaleModeValue" }
  required: ["$image"]
  additionalProperties: false

ImageBinding:
  type: object
  description: "A prop-bound image fill carrying authoring-default example images (PropBinding + examples)."
  properties:
    $binding:  { type: string }
    examples:  { type: array, items: { $ref: "#/definitions/ImageValue" } }
  required: ["$binding"]
  additionalProperties: false

ImageScaleModeValue:
  type: string
  enum: ["FILL", "FIT", "CROP", "TILE"]
  description: "How the image scales into its layer. Figma vocabulary — structural, not token-bindable. Absent = FILL."

ImageStyleValue:
  description: "Image fill value — a static ImageValue, a prop-bound ImageBinding, a token reference, a conditional, or null."
  oneOf:
    - { $ref: "#/definitions/ImageValue" }
    - { $ref: "#/definitions/ImageBinding" }
    - { $ref: "#/definitions/TokenReference" }
    - { $ref: "#/definitions/Conditional" }
    - { type: "null" }
```

**Example — new shapes** (`schema/component.schema.json`):
```yaml
# On the component object, beside slotContentExamples (the "examples" concern)
images:
  $ref: "#/definitions/Images"
  description: "Registry of image data referenced by fills (ImageValue.$image), ImageBinding examples, and ImageProp default. De-duplicated by the transformer."

Images:
  type: object
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      type: string
      description: "Image data — a data: URI (default), an external URL, or an emitted asset path, per Config.format.imageData."
  additionalProperties: false

ImageProp:
  type: object
  description: "Image-valued property. Example images ride on the ImageBinding at the binding site, not here."
  properties:
    type:     { type: string, const: "image" }
    default:  { type: ["string", "null"] }
    nullable: { type: boolean }
    $extensions: { $ref: "#/definitions/PropExtensions" }
  required: ["type"]
  patternProperties: { "^\\$": {} }
  additionalProperties: false
```

### Notes

- **Reference form.** `$image` and `ImageProp.default` are pointers into an `images` registry. In a single-file spec the pointer is root-relative (`#/images/userPhoto`), consistent with `PropBinding.$binding`. In concern-split output (ADR-061) it carries the component + concern prefix (`dsAvatar.examples#/images/userPhoto`); the cross-file addressing follows ADR-061, not this ADR.
- **Why `ImageValue` is an object, not a bare pointer.** Unlike `SlotContentRef` (a plain `$slotContent` pointer), an image fill also carries `scaleMode`, so the value is an object. The *data* lives in the registry; only the pointer + render mode live on the fill — hence no duplication across variants.
- **`ImageBinding` reuses `SlotBinding`'s shape.** ADR-047 established `PropBinding` + `examples?` for a bound prop with an authoring default. `ImageBinding` is that pattern with `examples?: ImageValue[]`. It appears both on `Styles.backgroundImage` (a leaf whose fill is prop-driven) and in `propConfigurations` (forwarding an image into a nested instance's image prop).
- **`Config.format.imageData` — the storage lever (answers Q2).** `EMBED` (default) emits each registry value as a self-contained `data:` URI; `REFERENCE` emits an external URL or an emitted asset path, keeping specs small. The **registry shape is identical either way** — one string per id; only its content differs. Actual asset emission is a transformer/CLI concern (this package stays logic-free).
- **`backgroundImage` optional & non-text.** `Styles` is a `Partial`; the key is present only where an image paint exists (containers, rectangles, ellipses — not `TEXT`/`GLYPH`, which use `fillColor`). `additionalProperties: false` on `Styles` requires the property be declared for valid output.
- **Registry keys** use the same `^[a-zA-Z0-9_-]+$` pattern as `slotContentExamples`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `ImageScaleMode` ↔ `ImageScaleModeValue` (`enum ["FILL","FIT","CROP","TILE"]`).
  - `ImageValue` (`{ $image, scaleMode? }`) ↔ `#/definitions/ImageValue` (`$image` required, `scaleMode` optional).
  - `ImageBinding` (`{ $binding, examples? }`) ↔ `#/definitions/ImageBinding`.
  - `ImageStyle` (`ImageValue | ImageBinding | TokenReference | Conditional | null`) ↔ `ImageStyleValue` (`oneOf` of the same five).
  - `Styles.backgroundImage` ↔ `Styles.properties.backgroundImage`; `StyleKey` gains `'backgroundImage'`.
  - `Images` (`Record<string, string>`) ↔ `#/definitions/Images`; `Component.images` ↔ component `images` property.
  - `ImageProp` ↔ `#/definitions/ImageProp`, added to `AnyProp` `oneOf` (matching the `AnyProp` TS union).
  - `ImageBinding` added to `PropConfigurationValue` ↔ added to the `PropConfigurationValue` schema `oneOf`.
  - `Config.format.imageData` ↔ `format.imageData` (`enum ["EMBED","REFERENCE"]`) in the Config schema.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must extract `IMAGE`-type fills → `backgroundImage`, populate the `images` registry (dedup by `imageHash`), emit `ImageProp` for image-valued Figma props with `ImageBinding` examples, and honor `format.imageData` (embed vs. emit asset). Both runtimes: Plugin `getImageByHash(...).getBytesAsync()`; REST images endpoint. | New extraction + registry/dedup logic; recompile against new types. The largest downstream work item. |
| `specs-cli` | New keys/registry may appear in validated & serialized output; `format.imageData` becomes a config option; asset emission may write sidecar files when `REFERENCE`. | Recompile against new schema; surface `format.imageData`; implement asset-file emission for `REFERENCE` mode. |
| `specs-plugin-2` | New keys/registry may appear in plugin-side output. | Recompile against new types; extract image fills/props in the plugin runtime. |

---

## Semver Decision

**Version bump**: `0.28.0 → 0.28.0` (`MINOR`; lands within the in-progress, unreleased `0.28.0`)

**Justification**: Every change is additive — a new `types/Image.ts` module, one new optional `Styles` key, one new `AnyProp` member, one widened `PropConfigurationValue` union, one new optional `Component` field, one new optional `Config` field, and their additive schema definitions. No existing type, field, or schema property is removed, renamed, or restructured; `ColorStyle` is untouched. Additive changes are `MINOR` per Constitution III and the Versioning policy. Because `0.28.0` is unreleased, the additions ride within that MINOR release.

---

## Consequences

- Spec output faithfully represents imagery in both DS patterns — image-on-a-layer (`backgroundImage`) and image-as-input (`ImageProp` bound via `ImageBinding` into a fill or a nested instance) — in both Plugin and REST runtimes. Image fills are no longer silently dropped.
- A single `Component.images` registry stores each image once; fills, bindings, and props reference it, so no image duplicates across variants or between a fill and its feeding prop.
- Example images ride on the binding (`ImageBinding.examples`), exactly like slot authoring defaults (`SlotBinding.examples`) — one binding pattern, not two.
- Specs choose their portability/size trade-off via `Config.format.imageData`: `EMBED` (default) for self-contained `data:` URIs, `REFERENCE` for small specs plus emitted asset files.
- `ColorStyle` remains color-only; `backgroundImage` is a distinct, bindable/conditional paint, so conditional visibility and sourced-image props work with no special casing.
- Reverse-direction tooling (`figma-from-specs`) gains named keys to reconstruct an `ImagePaint` (`$image` → `imageHash` via the registry, `scaleMode` direct) and to write image-valued component props.
- `ImageScaleMode`, `ImageValue`, `Images`, `ImageProp`, `ImageBinding`, and `ImageStyle` become part of the public type surface, subject to Constitution III stability rules.
- Consumers validating against `schema/*` must adopt `0.28.0`; components carrying `backgroundImage`, `images`, or an `image` prop would fail validation against `0.27.0` (`additionalProperties: false`).
