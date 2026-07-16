---
title: "Images"
description: "Process image fills and image-source props — the processing.images block and its representation triggers"
---

Image processing is controlled by one config block: `processing.images`. Its **presence** is the on-switch (like `subcomponents`), and each member is an **independent representation trigger**. Absent by default, so components are unchanged unless you opt in.

## `processing.images`

Three triggers, combinable freely:

- **`backgroundImage`** — detect `IMAGE`-type fills on container elements and emit them as [`Styles.backgroundImage`](/specs/schema/styles/). When paired with `imageComponent`, this doubles as the fallback for fills outside the designated component.
- **`imageComponent`** — designate an image component by name: instances of it are the image primitive, and their image routes through the source prop (`sourceProps[0]`) via `propConfigurations`. Requires a non-empty `sourceProps`.
- **`sourceProps`** — code-only prop names (exact, raw Figma names — the same convention as subcomponent and glyph patterns) that re-type from `StringProp` to [`ImageProp`](/specs/schema/props/) on any component. The **first** entry is the designated image component's own source prop.

Background fills only:

```yaml
config:
  processing:
    images:
      backgroundImage: true
```

Component with background-fill fallback — image props route through `dsImage`; any image fill outside it still emits as `backgroundImage`:

```yaml
config:
  processing:
    images:
      backgroundImage: true
      imageComponent: dsImage
      sourceProps: [source, image]
```

Component only — the designated component is the sole image representation; stray fills are not detected:

```yaml
config:
  processing:
    images:
      imageComponent: dsImage
      sourceProps: [source]
```

Typed image props only — re-type `image`-named code-only props without detecting fills or designating a component:

```yaml
config:
  processing:
    images:
      sourceProps: [image]
```

## Result

With images processing on, images are stored once in the `Component.images` registry and referenced by `$image`. A layer fill lands on `backgroundImage`; a sourced image forwards through `propConfigurations` as an `ImageBinding`:

```yaml
components:
  dsAvatar:
    title: DS Avatar
    props:
      image:
        type: image
        nullable: true
    default:
      elements:
        imageComponent:
          propConfigurations:
            source:
              $binding: "#/props/image"
              examples:
                - $image: "dsAvatar.examples#/images/userPhoto"
    images:
      userPhoto: "_images/89b270d29dd5ea753b71af11bfcf1bf0ecc851cf.png"
```

When the `images` block is absent, none of this is emitted.

## Properties

`processing.images`:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `backgroundImage` | `boolean` | No | `false` | Detect image fills on containers as `Styles.backgroundImage`; the fallback for stray fills when `imageComponent` is set |
| `imageComponent` | `string` | No | — | Designated image component name (e.g. `dsImage`). Requires a non-empty `sourceProps` — `sourceProps[0]` is its source prop |
| `sourceProps` | `string[]` | No | — | Raw Figma code-only prop names that re-type to `ImageProp` on any component |

## Object Fit

Image fills carry an optional `objectFit` using CSS `object-fit` vocabulary — `COVER` (default) or `CONTAIN`. Figma's `scaleMode` is remapped: `FILL → COVER`, `FIT → CONTAIN`, with `CROP`/`TILE` lossily coerced to `COVER` so no image fill is dropped. For a designated image component, expose fit as an ordinary prop of that component instead.

## Storage and Two-Phase Resolution

Each `images` value is one string: an emitted asset path (the standard resolved form), a `data:` URI, an external URL, or a `figma:<imageRef>` **placeholder** for image bytes not yet fetched. Detection emits references and (possibly placeholder) registry entries; a later resolution step — `specs generate --get-images` — writes each distinct image to `_images/<imageHash>.<ext>` inside the output directory and swaps each placeholder for the file's spec-file-relative path. `$image` pointers always resolve to a registry entry, so they never dangle.

The REST runtime resolves placeholders via a second call (Get Image Fills, whose S3 URLs expire ~14 days), downloading the bytes into emitted files — never persisting the URL or embedding base64. The Figma plugin cannot write files or embed raw bytes on the asset (saved-data limits), so it emits `figma:` placeholders and duplicates detected images into the Styling Inventory for human reference.

## Paths

- `config.processing.images`

## See Also

- [Guide: Images](/specs/guides/images/) — the two patterns end to end
- [Schema: Styles](/specs/schema/styles/) — the `backgroundImage` value shape
- [Schema: Props](/specs/schema/props/) — the `ImageProp` shape
- [Schema: Component](/specs/schema/component/) — the `images` registry
