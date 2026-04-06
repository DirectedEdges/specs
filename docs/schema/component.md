---
title: Component
order: 1
description: Top-level shape of a component spec
---

# Component

The `Component` type is the root object of every spec. It contains the component's structure, properties, default appearance, and variant overrides.

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | Yes | Component name |
| `anatomy` | [`Anatomy`](anatomy.md) | Yes | Map of named elements that make up the component |
| `props` | [`Props`](props.md) | No | Configurable input properties |
| `default` | [`Variant`](variants.md#variant) | Yes | Default variant — the baseline appearance |
| `variants` | [`Variant[]`](variants.md) | No | Layered variant overrides |
| `invalidVariantCombinations` | [`PropConfigurations[]`](prop-configurations.md) | No | Prop combinations that are not valid together |
| `subcomponents` | [`Subcomponents`](subcomponents.md) | No | Embedded child component definitions |
| `metadata` | [`Metadata`](metadata.md) | No | Generation metadata (author, schema version, config) |
