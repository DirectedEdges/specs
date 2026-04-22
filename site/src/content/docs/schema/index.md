---
title: "Schema Reference"
description: "Overview of the Specs component schema"
---

The `@directededges/specs-schema` package defines the TypeScript types and JSON Schema for a **component spec** — a structured, platform-agnostic description of a design-system component.

## What a Component Spec Contains

A spec captures everything a consumer needs to understand a component's structure, properties, visual styles, and variant behavior:

| | Page | Purpose |
|---|------|---------|
| **Spec structure** | [Component](/specs/schema/component/) | Top-level shape — the root object of every spec |
| | [Anatomy](/specs/schema/anatomy/) | Element tree — the named parts that make up the component |
| | [Elements](/specs/schema/elements/) | Element runtime properties — children, styles, content |
| | [Layout](/specs/schema/layout/) | Recursive tree representation of element nesting |
| | [Props](/specs/schema/props/) | Configurable inputs — booleans, enums, strings, numbers, slots |
| | [Styles](/specs/schema/styles/) | Visual properties — colors, spacing, typography, effects |
| | [Variants](/specs/schema/variants/) | Layered overrides — how the component changes across prop combinations |
| | [Subcomponents](/specs/schema/subcomponents/) | Embedded child components — scoped, referenced siblings |
| **Value types** | [TokenReference](/specs/schema/token-reference/) | Design token reference following the DTCG format |
| | [PropBinding](/specs/schema/prop-binding/) | Dynamic links between props and element/style properties |
| | [PropConfigurations](/specs/schema/prop-configurations/) | Prop value maps for variant activation and invalid combinations |
| | [Conditional](/specs/schema/conditional/) | Conditional style values driven by prop state |
| | [GradientValue](/specs/schema/gradient-value/) | Linear, radial, and angular gradient definitions |
| | [Typography](/specs/schema/typography/) | Text style properties — font, spacing, formatting |
| | [Effects](/specs/schema/effects/) | Shadow and blur effect definitions |
| | [Sides](/specs/schema/sides/) | Per-side positional values for padding and stroke weight |
| | [Corners](/specs/schema/corners/) | Per-corner positional values for corner radius |
| **Generation** | [Metadata](/specs/schema/metadata/) | Generation metadata — author, schema version, source |
| | [Config](/specs/schema/config/) | Generation configuration — processing, format, inclusion options |

### Conventions

- **`Style`** — A value that can be a literal (`string | number | boolean | null`), a [`TokenReference`](/specs/schema/token-reference/), a [`PropBinding`](/specs/schema/prop-binding/), or a [`Conditional`](/specs/schema/conditional/).
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
