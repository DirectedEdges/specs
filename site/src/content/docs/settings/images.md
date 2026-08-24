---
title: "Images"
description: "Process image fills and image-source props — the figma.images block and its representation triggers"
---

Image processing is controlled by one block: `figma.images`. A library fact, declared in `config/conventions.yaml` — how a library expresses images is a property of the library, and a wrong declaration loses images rather than merely reshaping them. The block's **presence** is the on-switch (like `subcomponents`), and each member is an **independent representation trigger**. Absent by default, so components are unchanged unless the library declares the convention.

## `figma.images`

Three triggers, combinable freely:

- **`backgroundImage`** — the library expresses images as `IMAGE`-type fills on container elements, emitted as [`Styles.backgroundImage`](/schema/styles/). When paired with `match`, this doubles as the fallback for fills outside the designated component.
- **`match`** — the name of the library's designated image component: instances of it are the image primitive, and their image routes through the source prop (`sourceProps[0]`) via `propConfigurations`. Requires a non-empty `sourceProps`.
- **`sourceProps`** — code-only prop names (exact, raw Figma names — the same convention as subcomponent and glyph patterns) that re-type from `StringProp` to [`ImageProp`](/schema/props/) on any component. The **first** entry is the designated image component's own source prop.

Background fills only:

```yaml
figma:
  images:
    backgroundImage: true
```

Component with background-fill fallback — image props route through `DS Image`; any image fill outside it still emits as `backgroundImage`:

```yaml
figma:
  images:
    backgroundImage: true
    match: DS Image
    sourceProps: [source, image]
```

Component only — the designated component is the sole image representation; stray fills are not detected:

```yaml
figma:
  images:
    match: DS Image
    sourceProps: [source]
```

Typed image props only — re-type `image`-named code-only props without detecting fills or designating a component:

```yaml
figma:
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
      userPhoto:
        src: "_images/89b270d29dd5ea753b71af11bfcf1bf0ecc851cf.png"
        $extensions:
          com.figma:
            imageHash: 89b270d29dd5ea753b71af11bfcf1bf0ecc851cf
```

When the `images` block is absent, none of this is emitted.

## Properties

`figma.images`:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `backgroundImage` | `boolean` | No | `false` | Detect image fills on containers as `Styles.backgroundImage`; the fallback for stray fills when `match` is set |
| `match` | `string` | No | — | Designated image component name (e.g. `DS Image`). Requires a non-empty `sourceProps` — `sourceProps[0]` is its source prop |
| `sourceProps` | `string[]` | No | — | Raw Figma code-only prop names that re-type to `ImageProp` on any component |

## Object Fit

Image fills carry an optional `objectFit` using CSS `object-fit` vocabulary — `COVER` (default) or `CONTAIN`. Figma's `scaleMode` is remapped: `FILL → COVER`, `FIT → CONTAIN`, with `CROP`/`TILE` lossily coerced to `COVER` so no image fill is dropped. For a designated image component, expose fit as an ordinary prop of that component instead.

## Storage and Two-Phase Resolution

Each `images` entry is an object holding the Figma identity in `$extensions['com.figma'].imageHash` and — once resolved — a `src` (an emitted asset path, the standard resolved form; a `data:` URI and external URL are also valid). Two-phase, structurally: `src` absent means **unresolved** (the detect phase); the resolution step — `specs generate --get-images` — writes each distinct image to `_images/<imageHash>.<ext>` inside the output directory and **adds** `src` (a spec-file-relative path), so the identity survives for reverse-direction tooling. `$image` pointers always resolve to a registry entry, so they never dangle.

The REST runtime resolves entries via a second call (Get Image Fills, whose S3 URLs expire ~14 days), downloading the bytes into emitted files — never persisting the URL or embedding base64. The Figma plugin cannot write files or embed raw bytes on the asset (saved-data limits), so it emits identity-only entries and duplicates detected images into the Foundations section's Images subsection for human reference.

## Path

`figma.images` in `config/conventions.yaml`

**Legacy name**: in the pre-split `specs.config.yaml`, this block was `config.processing.images` and the designated component was named by `imageComponent`. That file is no longer read — [`specs migrate config`](/cli/commands/migrate/) converts it, moving `imageComponent` to `match`.

## See Also

- [Guide: Images](/guides/images/) — the two patterns end to end
- [Schema: Styles](/schema/styles/) — the `backgroundImage` value shape
- [Schema: Props](/schema/props/) — the `ImageProp` shape
- [Schema: Component](/schema/component/) — the `images` registry
