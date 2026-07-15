---
title: "Images"
description: "Capture image fills and image-source props — as a designated image component or a container background fill"
---

Design systems use images two ways, and Specs captures both. Sometimes an image is a **layer fill** — a card with a photographic background, a hero banner painted directly on a container. Other times it flows through a dedicated **image component** — a `dsImage` or `dsAvatar` with a `source`-like prop that renders whatever image is passed in. Which one you get is a config choice, not a guess.

## The Problem

Until now the schema had no representation for images at all. An `IMAGE`-type fill on a Figma node was silently dropped, there was no image prop type, and the actual pixels an image points at had nowhere to live. Any component whose design contract includes imagery lost that information entirely.

## What It Does

When [`include.imageData`](/specs/settings/images/) is enabled, the engine captures image fills and image-source props and stores each distinct image once in a `Component.images` registry, referenced by an `$image` pointer:

```yaml
default:
  elements:
    root:
      styles:
        backgroundImage:
          $image: "card.examples#/images/hero"
          objectFit: COVER          # COVER (default) or CONTAIN

images:
  hero: "_images/705867125834a686a51bdf161a0a39cdba0f9a58.jpg"
```

## The Two Patterns

### Image as a layer fill

No designated image component — the image is painted directly on a container. It lands on [`Styles.backgroundImage`](/specs/schema/styles/) as an `ImageValue` (`{ $image, objectFit? }`). This is the default when no image component is configured.

### Image as a component

Your system has a designated image primitive (say `dsImage`) with an image `source` prop, and other components nest it. The parent forwards its own image prop into the nested instance through `propConfigurations` — the same channel as every other forwarded prop — carrying the authoring-default image as an example:

```yaml
# dsAvatar references dsImage
dsAvatar:
  props:
    image:
      type: image
      nullable: true
  elements:
    imageComponent:
      type: instance
      instanceOf: dsImage

  default:
    elements:
      imageComponent:
        propConfigurations:
          source:
            $binding: "#/props/image"
            examples:
              - $image: "dsAvatar.examples#/images/userPhoto"
```

Sourcing binds through `propConfigurations`, never through `backgroundImage` — `backgroundImage` is reserved for the no-component fill case.

## Configuration

Everything is gated by `include.imageData`. The presence and shape of [`processing.imageComponent`](/specs/settings/images/) selects the mode:

```yaml
# specs.config.yaml
config:
  include:
    imageData: true            # required — process images at all
  processing:
    imageComponent:            # optional — designate an image component
      name: dsImage
      sourceProperty: source
      fallback: true           # optional; default true
```

| Mode | Config | Behavior |
|------|--------|----------|
| Background fill only | no `imageComponent` | Every image fill → `backgroundImage` on containers |
| Component + fill | `imageComponent`, `fallback: true` (default) | Image props route through the component; stray fills still fall back to `backgroundImage` |
| Component only | `imageComponent`, `fallback: false` | The component is the **only** image representation; stray fills are not emitted (a diagnostic is surfaced) |

## Object Fit

`objectFit` uses CSS `object-fit` vocabulary — `COVER` (fill the box and crop, the default) or `CONTAIN` (fit entirely inside). Figma's `scaleMode` is remapped: `FILL → COVER`, `FIT → CONTAIN`, and `CROP`/`TILE` are lossily coerced to `COVER` so no image fill is dropped. For a designated image component, expose fit as an ordinary prop of that component instead.

## How Image Data Is Stored

The `images` registry stores each image once. A value is an emitted asset path (the standard resolved form), a `data:` URI, an external URL, or — when the bytes have not been fetched yet — a `figma:<imageRef>` **placeholder**. Image processing is two-phase:

The Figma plugin cannot embed raw image bytes on the component asset (Figma caps saved data), so it emits `figma:` placeholders and additionally duplicates each detected image into the **Foundations** section for human reference. The REST/CLI path is how you get actual image files.

1. **Detect** (`include.imageData`) — emit `$image` references and the registry, values possibly `figma:` placeholders.
2. **Resolve** (CLI's `generate` command only) — `specs generate --get-images` fetches the bytes, writes each distinct image once to `_images/<imageHash>.<ext>` inside the output directory, and swaps each placeholder for the file's path relative to the referencing spec file.
:::

## Further Reading

- [`include.imageData` and `processing.imageComponent`](/specs/settings/images/) — config reference
- [Schema: Styles](/specs/schema/styles/) — the `backgroundImage` value shape
- [Schema: Props](/specs/schema/props/) — the `ImageProp` shape
- [Schema: Prop Configurations](/specs/schema/prop-configurations/) — the `ImageBinding` shape
- [Schema: Component](/specs/schema/component/) — the `images` registry
