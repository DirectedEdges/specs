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
