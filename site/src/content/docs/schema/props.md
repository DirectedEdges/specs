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
| `nullable` | `boolean` | No | Whether `null` is a valid value — absent means `false` |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

### StringProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'string'` | Yes | |
| `default` | `string \| null` | No | Deprecated — use `examples` |
| `nullable` | `boolean` | No | Whether `null` is a valid value — absent means `true` |
| `examples` | `string[]` | No | Example values |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

A `StringProp` is distinguished from an `EnumProp` by the absence of `enum`.

### NumberProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'number'` | Yes | |
| `default` | `number` | No | Default value |
| `nullable` | `boolean` | No | Whether `null` is a valid value — absent means `true` (since 0.29.0) |
| `examples` | `number[]` | No | Example values |

Inferred from Figma variant values when [`conventions.figma.inferNumberProps`](/schema/conventions/#figma) is enabled.

### SlotProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'slot'` | Yes | |
| `default` | `string \| null` | No | Default slot content |
| `nullable` | `boolean` | No | Whether `null` is a valid value — absent means `true` |
| `minChildren` | `number` | No | Minimum number of children the slot accepts (since 0.25.0) |
| `maxChildren` | `number` | No | Maximum number of children the slot accepts (since 0.25.0) |
| `anyOf` | `string[]` | No | Permitted component type names (since 0.14.0) |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

Slot constraint properties (`minChildren`, `maxChildren`, `anyOf`) are emitted when [`conventions.figma.slotConstraints`](/schema/conventions/#figma) is declared.

### ImageProp

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'image'` | Yes | |
| `default` | `string \| null` | No | Default image — an `images` registry reference, or null |
| `nullable` | `boolean` | No | Whether `null` is a valid value — absent means `true` |
| `$extensions` | `PropExtensions` | No | Vendor extensions |

An image-valued property (e.g. a `dsImage` `source` prop). The authoring-default image rides on the [`ImageBinding`](/schema/prop-configurations/) at the binding site, not on the prop. Emitted for code-only props named in [`figma.images.sourceProps`](/schema/conventions/#figmaimages) (since 0.28.0).

## Nullability

`nullable` is optional on every prop kind that carries it. Its absence is meaningful, and what it means depends on whether the prop's value set is open or closed:

| Prop kind | Absent `nullable` means | Why |
|-----------|-------------------------|-----|
| `StringProp` | `true` | Open value set — nothing enumerates it |
| `NumberProp` | `true` | Open value set |
| `SlotProp` | `true` | Open content set; a slot may be empty |
| `ImageProp` | `true` | Open value set |
| `EnumProp` | `false` | `enum` lists every accepted value, and `null` is not one of them |
| `BooleanProp` | *(no field)* | Booleans are never nullable |

An explicit `nullable: false` on an open-valued prop asserts that a value always exists — useful when a code-only prop was authored with a non-empty default:

```yaml
props:
  # No nullable key — accepts null
  label:
    type: string
  # Explicitly asserts a value is always present
  headingLevel:
    type: number
    default: 2
    nullable: false
```

## Extensions

The `$extensions` object holds vendor-specific metadata. Currently only the `com.figma` extension is defined.

### FigmaPropExtension

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Figma property type (e.g. `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `VARIANT`) |
| `source` | `FigmaCodeOnlySource` | Present when the prop originates from a code-only prop layer |
| `name` | `string` | The Figma property name, present only when the prop key cannot reconstruct it — see [Key Formatting](/guides/key-formatting/) |

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
- [ADR 066 — Lossless Key Formatting](https://github.com/DirectedEdges/specs/blob/main/adr/066-lossless-key-formatting.md) — adds `name` to `FigmaPropExtension` so lossy key formats stay reversible
