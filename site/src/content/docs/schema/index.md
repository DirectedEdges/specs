---
title: "Overview"
description: "Overview of the Specs component schema"
---

The `@directededges/specs-schema` package defines the TypeScript types and JSON Schema for a **component spec** — a structured, platform-agnostic description of a design-system component.

## Spec Architecture

Every generated spec follows this tree — from a single-element icon to a complex composite with dozens of variants.

<pre style="line-height:1.6">
components:
└─ {component name}                        → <a href="/schema/component/">Component</a>
  ├─ <a href="/schema/anatomy/">anatomy</a>:
  │ └─ {element name}: { type, slot }
  ├─ <a href="/schema/props/">props</a>:
  │ └─ {prop name}: { type, default, … }
  ├─ default:                              → <a href="/schema/variants/">Variant</a>
  │ ├─ <a href="/schema/layout/">layout</a>:
  │ │ └─ - {parent}:
  │ │   └─ - {child}
  │ └─ <a href="/schema/elements/">elements</a>:
  │   └─ {element name}:
  │     ├─ content                         → <a href="/schema/prop-binding/">PropBinding</a>
  │     ├─ <a href="/schema/children/">children</a>                        → <a href="/schema/children/">Children</a> (slot fills → <a href="/schema/slot-content-ref/">SlotContentRef</a>)
  │     └─ <a href="/schema/styles/">styles</a>:                      (48 properties)
  │       ├─ color                         → <a href="/schema/token-reference/">TokenReference</a>, <a href="/schema/gradient-value/">GradientValue</a>
  │       ├─ spacing, size                 → <a href="/schema/token-reference/">TokenReference</a>, <a href="/schema/conditional/">Conditional</a>
  │       ├─ layout                        → <a href="/schema/token-reference/">TokenReference</a>, <a href="/schema/conditional/">Conditional</a>
  │       ├─ <a href="/schema/typography/">typography</a>                  → <a href="/schema/token-reference/">TokenReference</a>
  │       ├─ <a href="/schema/effects/">effects</a>                     → <a href="/schema/token-reference/">TokenReference</a>
  │       ├─ cornerRadius                  → <a href="/schema/corners/">Corners</a>
  │       ├─ padding, strokeWeight         → <a href="/schema/sides/">Sides</a>
  │       ├─ visibility                    → <a href="/schema/prop-binding/">PropBinding</a>
  │       └─ …                             <a href="/schema/styles/">see full list</a>
  ├─ variants:                             → <a href="/schema/variants/">Variant</a>[]
  │ └─ - <a href="/schema/prop-configurations/">configuration</a>:
  │     <a href="/schema/layout/">layout</a>:
  │     <a href="/schema/elements/">elements</a>:                      (layered styling and binding changes)
  ├─ invalidVariantCombinations:           → <a href="/schema/prop-configurations/">PropConfigurations</a>[]
  ├─ <a href="/schema/subcomponents/">subcomponents</a>:
  │ └─ {name}: { …same shape as above }
  ├─ <a href="/schema/metadata/">metadata</a>:
  │ ├─ <a href="/schema/conventions/">conventions</a>:
  │ └─ <a href="/schema/settings/">settings</a>:
  ├─ <a href="/schema/instance-examples/">instanceExamples</a>:                   → <a href="/schema/instance-examples/">InstanceExample</a>  <span class="sl-badge pro-badge">Pro</span>
  │ └─ {name}: { title, propConfigurations }
  └─ <a href="/schema/slot-content/">slotContentExamples</a>:                → <a href="/schema/slot-content/">SlotContent</a>  <span class="sl-badge pro-badge">Pro</span>
    └─ {name}: { <a href="/schema/anatomy/">anatomy</a>, <a href="/schema/elements/">elements</a>, <a href="/schema/layout/">layout</a> }
</pre>

**Start at `default`.** The default variant is the complete baseline — every element fully described with styles, content, and layout. This is the component at rest.

**Variants are deltas.** Each entry in `variants` carries a [`configuration`](/schema/prop-configurations/) (which prop values activate it) and only the properties that *change*. Consumers resolve the final state by merging applicable overrides onto the default, in order. See [Variants](/schema/variants/) and the [Variant Layering](/guides/variant-layering/) guide.

**Style values can be rich.** Any style property might be a raw literal, a [`TokenReference`](/schema/token-reference/) pointing to a design token, a [`PropBinding`](/schema/prop-binding/) driven by a prop, or a [`Conditional`](/schema/conditional/) that switches on prop state. Composite values like [`Typography`](/schema/typography/), [`Effects`](/schema/effects/), [`GradientValue`](/schema/gradient-value/), [`Corners`](/schema/corners/), and [`Sides`](/schema/sides/) have their own shapes.

### Conventions

- **`Style`** — A value that can be a literal (`string | number | boolean | null`), a [`TokenReference`](/schema/token-reference/), a [`PropBinding`](/schema/prop-binding/), or a [`Conditional`](/schema/conditional/).
- **`Record<string, T>`** — An object keyed by user-defined names (element names, prop names, etc.) with values of type `T`.
- **`$ref`** — A JSON Pointer or URI reference linking to another part of the spec or an external definition.
- **`$binding`** — A JSON Pointer to a prop (e.g. `#/props/label`), creating a dynamic link between a prop value and a style or element property.

## Package Exports

The package exports TypeScript types for every node in the schema, plus two runtime values:

```ts
import type { Component } from '@directededges/specs-schema';
import { DEFAULT_SETTINGS, DEFAULT_PIPELINE } from '@directededges/specs-schema';
```

`DEFAULT_SETTINGS` and `DEFAULT_PIPELINE` are the only runtime exports. All other exports are type-only.

There is no defaults export for [Conventions](/schema/conventions/): a convention's absence means the library declares no such convention, and nothing can supply that.
