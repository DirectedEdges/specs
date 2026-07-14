---
title: "Images"
description: "Process image fills and image-source props — the imageData gate and the imageComponent mode selector"
---

Image processing is controlled by two config keys: `include.imageData` turns it on, and `processing.imageComponent` selects how images are represented. Both are off/absent by default, so components are unchanged unless you opt in.

## `include.imageData`

The on-switch. When `true`, the engine captures `IMAGE`-type fills and image-source props — emitting [`Styles.backgroundImage`](/specs/schema/styles/), [`ImageProp`](/specs/schema/props/), and the [`Component.images`](/specs/schema/component/) registry. When `false` (default), images are not processed at all.

```yaml
config:
  include:
    imageData: true
```

## `processing.imageComponent`

Selects the mode. **Absent** means image fills are emitted only as `backgroundImage` on container elements. **Present** designates an image component: instances of `name` are treated as the image primitive, and image props forward into its `sourceProperty` via `propConfigurations`.

Background-fill only — no designated component:

```yaml
config:
  include:
    imageData: true
  # no processing.imageComponent
```

Component with background-fill fallback (default) — image props route through `dsImage`; any image fill outside it still emits as `backgroundImage`:

```yaml
config:
  include:
    imageData: true
  processing:
    imageComponent:
      name: dsImage
      sourceProperty: source
```

Component only — the designated component is the sole image representation; stray fills are not emitted:

```yaml
config:
  include:
    imageData: true
  processing:
    imageComponent:
      name: dsImage
      sourceProperty: source
      fallback: false
```

## Result

With `imageData` on, images are stored once in the `Component.images` registry and referenced by `$image`. A layer fill lands on `backgroundImage`; a sourced image forwards through `propConfigurations` as an `ImageBinding`:

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
      userPhoto: "data:image/png;base64,iVBORw0KG..."
```

When `imageData` is `false`, none of this is emitted.

## Properties

`processing.imageComponent`:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | The designated image component name (e.g. `dsImage`) |
| `sourceProperty` | `string` | Yes | — | The image source prop name on that component (e.g. `source`) |
| `fallback` | `boolean` | No | `true` | Whether image fills outside the component still emit as `backgroundImage` on containers. `false` = the component is the only image representation; stray fills are not emitted (a diagnostic is surfaced) |

`name` and `sourceProperty` are both required when `imageComponent` is present.

## Scale Mode

Image fills carry an optional `scaleMode` using CSS `object-fit` vocabulary — `COVER` (default) or `CONTAIN`. Figma's `FILL`/`FIT` are remapped to `COVER`/`CONTAIN`; `CROP` and `TILE` are unsupported. For a designated image component, expose scale as an ordinary prop of that component instead.

## Storage and Two-Phase Resolution

Each `images` value is one string: a `data:` URI, external URL, emitted asset path, or a `figma:<imageRef>` **placeholder** for image bytes not yet fetched. Detection emits references and (possibly placeholder) registry entries; a later resolution step — a `--get-images` run or subsequent command — swaps placeholders for resolved data. `$image` pointers always resolve to a registry entry, so they never dangle.

The REST runtime resolves placeholders via a second call (Get Image Fills, whose S3 URLs expire ~14 days), fetching bytes to embed. The Figma plugin cannot embed raw bytes on the asset (saved-data limits), so it emits `figma:` placeholders and duplicates detected images into the Styling Inventory for human reference.

## Paths

- `config.include.imageData`
- `config.processing.imageComponent`

## See Also

- [Guide: Images](/specs/guides/images/) — the two patterns end to end
- [Schema: Styles](/specs/schema/styles/) — the `backgroundImage` value shape
- [Schema: Props](/specs/schema/props/) — the `ImageProp` shape
- [Schema: Component](/specs/schema/component/) — the `images` registry
