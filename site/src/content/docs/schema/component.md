---
title: "Component"
description: "Top-level shape of a component spec"
---

The `Component` type is the root object of every spec. It contains the component's structure, properties, default appearance, and variant overrides.

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | Yes | Component name |
| `anatomy` | [`Anatomy`](/specs/schema/anatomy/) | Yes | Map of named elements that make up the component |
| `props` | [`Props`](/specs/schema/props/) | No | Configurable input properties |
| `default` | [`Variant`](/specs/schema/variants.md/#variant) | Yes | Default variant — the baseline appearance |
| `variants` | [`Variant[]`](variants.md) | No | Layered variant overrides |
| `invalidVariantCombinations` | [`PropConfigurations[]`](prop-configurations.md) | No | Prop combinations that are not valid together |
| `subcomponents` | [`Subcomponents`](/specs/schema/subcomponents/) | No | Embedded child component definitions |
| `metadata` | [`Metadata`](/specs/schema/metadata/) | No | Generation metadata (author, schema version, config) |
| `instanceExamples` | [`InstanceExamples`](/specs/schema/instance-examples/) | No | **Pro.** Documented whole-component usage examples (emitted only with a Pro license) |
| `slotContentExamples` | `Record<string, `[`SlotContent`](/specs/schema/slot-content/)`>` | No | **Pro.** Named slot-content fills, referenced by [`SlotContentRef`](/specs/schema/slot-content-ref/) from slot bindings and from `Element.propConfigurations` slot-prop entries |
| `images` | `Record<string, ImageData>` | No | Registry of image data keyed by id, referenced by `Styles.backgroundImage`, `ImageBinding` examples, and `ImageProp` defaults. Each entry carries the Figma identity in `$extensions['com.figma'].imageHash`; resolution adds `src` (asset path, `data:` URI, or URL) without replacing it. Emitted when [`processing.images`](/specs/schema/config/#processingimages) is configured |

## Examples and composed content

Several optional fields document configured and composed usages of a component. Each has its own page:

- [`InstanceExamples`](/specs/schema/instance-examples/) — pre-configured whole-component usages.
- [`SlotContent`](/specs/schema/slot-content/) — the `anatomy + elements + layout` triplet used as a named slot fill, stored in `slotContentExamples`.
- [`SlotContentRef`](/specs/schema/slot-content-ref/) — the `$slotContent` pointer that references a fill.
- [`Composition`](/specs/schema/composition/) — a named, authored unit of composed content (system-scoped, external composition files).
- [`Children`](/specs/schema/children/) — an element's children, including slot bindings that carry example fills.
