---
title: Schema Reference
order: 1
description: Overview of the Specs component schema
---

# Schema Reference

The `@directededges/specs-schema` package defines the TypeScript types and JSON Schema for a **component spec** — a structured, platform-agnostic description of a design-system component.

## What a Component Spec Contains

A spec captures everything a consumer needs to understand a component's structure, properties, visual styles, and variant behavior:

| Section | Purpose |
|---------|---------|
| [Component](component.md) | Top-level shape — the root object of every spec |
| [Anatomy](anatomy.md) | Element tree — the named parts that make up the component |
| [Props](props.md) | Configurable inputs — booleans, enums, strings, numbers, slots |
| [Styles](styles.md) | Visual properties — colors, spacing, typography, effects |
| [Variants](variants.md) | Layered overrides — how the component changes across prop combinations |
| [Subcomponents](subcomponents.md) | Embedded child components — scoped, referenced siblings |
| [PropBinding](prop-binding.md) | Dynamic links between props and element/style properties |
| [PropConfigurations](prop-configurations.md) | Prop value maps for variant activation and invalid combinations |
| [Metadata](metadata.md) | Generation metadata — author, schema version, source |
| [Config](config.md) | Generation configuration — processing, format, inclusion options |
| [TokenReference](token-reference.md) | Design token reference following the DTCG format |
| [Conditional](conditional.md) | Conditional style values driven by prop state |
| [Sides](sides.md) | Per-side positional values for padding and stroke weight |
| [Corners](corners.md) | Per-corner positional values for corner radius |
| [GradientValue](gradient-value.md) | Linear, radial, and angular gradient definitions |
| [Typography](typography.md) | Text style properties — font, spacing, formatting |
| [Effects](effects.md) | Shadow and blur effect definitions |

## How to Read These Docs

Each page documents one major section of the spec. Property tables list every field with its type, whether it's required or optional, and a short description.

### Conventions

- **`Style`** — A value that can be a literal (`string | number | boolean | null`), a [`TokenReference`](token-reference.md), a [`PropBinding`](prop-binding.md), or a [`Conditional`](conditional.md).
- **`Record<string, T>`** — An object keyed by user-defined names (element names, prop names, etc.) with values of type `T`.
- **`$ref`** — A JSON Pointer or URI reference linking to another part of the spec or an external definition.
- **`$binding`** — A JSON Pointer to a prop (e.g. `#/props/label`), creating a dynamic link between a prop value and a style or element property.

## Package Exports

The package exports TypeScript types for every node in the schema, plus one runtime value:

```ts
import type { Component } from '@directededges/specs-schema';
import { DEFAULT_CONFIG } from '@directededges/specs-schema';
```

`DEFAULT_CONFIG` is the only runtime export. All other exports are type-only.
