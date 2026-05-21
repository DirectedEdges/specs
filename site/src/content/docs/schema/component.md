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
| `instanceExamples` | `Record<string, InstanceExample>` | No | **Pro.** Documented scalar-prop usage examples for this component (emitted only with a Pro license) |
| `slotContent` | [`Compositions`](#composition) | No | Named slot-content entries, referenced by JSON Pointer from slot bindings and from `Element.propConfigurations` slot-prop entries |

## `InstanceExample`

A pre-configured usage of the whole component for documentation. Scalar prop values only — `PropBinding` and slot fills live on `Element.propConfigurations`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | No | Human-readable label for the example |
| `propConfigurations` | `Record<string, string \| number \| boolean>` | No | Scalar prop values for the example |

## `CompositionGroup`

The structural triplet — anatomy, elements, layout — that makes up one fragment of a `Composition`. Carries no metadata of its own; identity, title, and description live at the `Composition` level.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `anatomy` | [`Anatomy`](/specs/schema/anatomy/) | Yes | Element type map for this fragment |
| `elements` | [`Elements`](/specs/schema/elements/) | Yes | Element-level content, styles, and prop configurations |
| `layout` | `LayoutNode[]` | Yes | Tree ordering of elements |

## `Composition`

A named, authored unit of composed content. Carries `title` / `description` and a required `groups` map of one or more `CompositionGroup` fragments. Every entry in `Component.slotContent` (and in external composition files) is a `Composition`.

The required `main` fragment inside `groups` is the primary content. Additional sibling fragments accumulate when nested slot fills are pulled up into addressable peers of `main` instead of being embedded inline — this is how recursively-related content stays together under one heading while still being individually addressable.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | No | Human-readable label for the composition |
| `description` | `string` | No | Purpose and usage notes for documentation tooling |
| `groups` | `{ main: CompositionGroup } & Record<string, CompositionGroup>` | Yes | Named `CompositionGroup` fragments; `main` is required, other keys are sibling fragments |

`Compositions` (`Record<string, Composition>`) is the registry shape used by `Component.slotContent` and by external composition files.

A `CompositionRef.$composition` pointer at the composition level (e.g. `"#/components/pill/slotContent/composedLabel"`) resolves to `main`. A deeper pointer (`".../groups/<key>"`) targets a specific `CompositionGroup`.
