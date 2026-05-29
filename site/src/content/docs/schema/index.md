---
title: "Overview"
description: "Overview of the Specs component schema"
---

The `@directededges/specs-schema` package defines the TypeScript types and JSON Schema for a **component spec** — a structured, platform-agnostic description of a design-system component.

## Spec Architecture

Every generated spec follows this tree — from a single-element icon to a complex composite with dozens of variants.

<pre style="line-height:1.6">
components:
└─ {component name}                        → <a href="/specs/schema/component/">Component</a>
  ├─ <a href="/specs/schema/anatomy/">anatomy</a>:
  │ └─ {element name}: { type, slot }
  ├─ <a href="/specs/schema/props/">props</a>:
  │ └─ {prop name}: { type, default, … }
  ├─ default:                              → <a href="/specs/schema/variants/">Variant</a>
  │ ├─ <a href="/specs/schema/layout/">layout</a>:
  │ │ └─ - {parent}:
  │ │   └─ - {child}
  │ └─ <a href="/specs/schema/elements/">elements</a>:
  │   └─ {element name}:
  │     ├─ content                         → <a href="/specs/schema/prop-binding/">PropBinding</a>
  │     ├─ <a href="/specs/schema/children/">children</a>                        → <a href="/specs/schema/children/">Children</a> (slot fills → <a href="/specs/schema/slot-content-ref/">SlotContentRef</a>)
  │     └─ <a href="/specs/schema/styles/">styles</a>:                      (48 properties)
  │       ├─ color                         → <a href="/specs/schema/token-reference/">TokenReference</a>, <a href="/specs/schema/gradient-value/">GradientValue</a>
  │       ├─ spacing, size                 → <a href="/specs/schema/token-reference/">TokenReference</a>, <a href="/specs/schema/conditional/">Conditional</a>
  │       ├─ layout                        → <a href="/specs/schema/token-reference/">TokenReference</a>, <a href="/specs/schema/conditional/">Conditional</a>
  │       ├─ <a href="/specs/schema/typography/">typography</a>                  → <a href="/specs/schema/token-reference/">TokenReference</a>
  │       ├─ <a href="/specs/schema/effects/">effects</a>                     → <a href="/specs/schema/token-reference/">TokenReference</a>
  │       ├─ cornerRadius                  → <a href="/specs/schema/corners/">Corners</a>
  │       ├─ padding, strokeWeight         → <a href="/specs/schema/sides/">Sides</a>
  │       ├─ visibility                    → <a href="/specs/schema/prop-binding/">PropBinding</a>
  │       └─ …                             <a href="/specs/schema/styles/">see full list</a>
  ├─ variants:                             → <a href="/specs/schema/variants/">Variant</a>[]
  │ └─ - <a href="/specs/schema/prop-configurations/">configuration</a>:
  │     <a href="/specs/schema/layout/">layout</a>:
  │     <a href="/specs/schema/elements/">elements</a>:                      (layered styling and binding changes)
  ├─ invalidVariantCombinations:           → <a href="/specs/schema/prop-configurations/">PropConfigurations</a>[]
  ├─ <a href="/specs/schema/subcomponents/">subcomponents</a>:
  │ └─ {name}: { …same shape as above }
  ├─ <a href="/specs/schema/metadata/">metadata</a>:
  │ └─ <a href="/specs/schema/config/">config</a>:
  ├─ <a href="/specs/schema/instance-examples/">instanceExamples</a>:                   → <a href="/specs/schema/instance-examples/">InstanceExample</a>  <span class="sl-badge pro-badge">Pro</span>
  │ └─ {name}: { title, propConfigurations }
  └─ <a href="/specs/schema/slot-content/">slotContentExamples</a>:                → <a href="/specs/schema/slot-content/">SlotContent</a>  <span class="sl-badge pro-badge">Pro</span>
    └─ {name}: { <a href="/specs/schema/anatomy/">anatomy</a>, <a href="/specs/schema/elements/">elements</a>, <a href="/specs/schema/layout/">layout</a> }
</pre>

**Start at `default`.** The default variant is the complete baseline — every element fully described with styles, content, and layout. This is the component at rest.

**Variants are deltas.** Each entry in `variants` carries a [`configuration`](/specs/schema/prop-configurations/) (which prop values activate it) and only the properties that *change*. Consumers resolve the final state by merging applicable overrides onto the default, in order. See [Variants](/specs/schema/variants/) and the [Variant Layering](/specs/guides/variant-layering/) guide.

**Style values can be rich.** Any style property might be a raw literal, a [`TokenReference`](/specs/schema/token-reference/) pointing to a design token, a [`PropBinding`](/specs/schema/prop-binding/) driven by a prop, or a [`Conditional`](/specs/schema/conditional/) that switches on prop state. Composite values like [`Typography`](/specs/schema/typography/), [`Effects`](/specs/schema/effects/), [`GradientValue`](/specs/schema/gradient-value/), [`Corners`](/specs/schema/corners/), and [`Sides`](/specs/schema/sides/) have their own shapes.

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
