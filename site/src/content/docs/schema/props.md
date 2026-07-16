---
title: "Props"
description: "Prop kinds, defaults, and extensions"
---

Props define the configurable inputs of a component. Each prop has a type, a default value, and optional extensions.

```ts
type Props = Record<string, AnyProp>;
type AnyProp = BooleanProp | StringProp | EnumProp | NumberProp | SlotProp | ImageProp;
```

## Prop Kinds

### BooleanProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'boolean'` | Yes | |
| `default` | `boolean` | Yes | Default value |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

### EnumProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'string'` | Yes | |
| `default` | `string` | Yes | Default value (must be in `enum`) |
| `enum` | `string[]` | Yes | Allowed values |
| `nullable` | `boolean` | No | Whether `null` is a valid value |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

### StringProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'string'` | Yes | |
| `default` | `string \| null` | No | Deprecated — use `examples` |
| `nullable` | `boolean` | No | Whether `null` is a valid value |
| `examples` | `string[]` | No | Example values |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

A `StringProp` is distinguished from an `EnumProp` by the absence of `enum`.

### NumberProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'number'` | Yes | |
| `default` | `number` | No | Default value |
| `examples` | `number[]` | No | Example values |

Inferred from Figma variant values when [`inferNumberProps`](/specs/schema/config.md/#processing) is enabled.

### SlotProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'slot'` | Yes | |
| `default` | `string \| null` | No | Default slot content |
| `nullable` | `boolean` | No | Whether `null` is a valid value |
| `minChildren` | `number` | No | Minimum number of children the slot accepts (since 0.25.0) |
| `maxChildren` | `number` | No | Maximum number of children the slot accepts (since 0.25.0) |
| `anyOf` | `string[]` | No | Permitted component type names (since 0.14.0) |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

Slot constraint properties (`minChildren`, `maxChildren`, `anyOf`) are emitted when [`slotConstraints`](/specs/schema/config.md/#processing) is enabled in config.

### ImageProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'image'` | Yes | |
| `default` | `string \| null` | No | Default image — an `images` registry reference, or null |
| `nullable` | `boolean` | No | Whether `null` is a valid value |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

An image-valued property (e.g. a `dsImage` `source` prop). The authoring-default image rides on the [`ImageBinding`](/specs/schema/prop-configurations/) at the binding site, not on the prop. Emitted for code-only props named in [`processing.images.sourceProps`](/specs/schema/config/#processingimages) (since 0.28.0).

## Extensions

The `$extensions` object holds vendor-specific metadata. Currently only the `com.figma` extension is defined.

### FigmaPropExtension

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Figma property type (e.g. `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `VARIANT`) |
| `source` | `FigmaCodeOnlySource` | Present when the prop originates from a code-only prop layer |

### FigmaCodeOnlySource

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `'codeOnlyProp'` | Always `'codeOnlyProp'` |
| `layer` | `string` | Sub-layer name in the code-only container |
| `instanceOf` | `string` | Component name, for enum code-only props |

## Further Reading

- [ADR 027 — Code-Only Props](https://github.com/DirectedEdges/specs/blob/main/adr/027-code-only-props.md) — surfaces Figma code-only props with `$extensions` source metadata
- [ADR 028 — Slot Quantity and Content Constraints](https://github.com/DirectedEdges/specs/blob/main/adr/028-slot-constraints.md) — adds `anyOf` to SlotProp; originally added `minItems`/`maxItems` (renamed in ADR-056)
- [ADR 056 — Rename SlotProp.minItems/maxItems → minChildren/maxChildren](https://github.com/DirectedEdges/specs/blob/main/adr/056-slot-children-constraints.md) — aligns field names with Figma native `slotSettings`; adds native `preferredValues` resolution
- [ADR 029 — NumberProp](https://github.com/DirectedEdges/specs/blob/main/adr/029-number-prop.md) — adds the `NumberProp` type with opt-in inference
- [ADR 063 — Image Content](https://github.com/DirectedEdges/specs/blob/main/adr/063-image-content.md) — adds the `ImageProp` type and image fills/registry
