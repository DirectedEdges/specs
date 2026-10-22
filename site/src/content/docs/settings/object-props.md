---
title: "objectProps"
description: "Fold separator-named Figma properties into one object prop with named members"
---

When declared, component property names containing the separator fold into one [`ObjectProp`](/schema/props/#objectprop): `margin.compact` and `margin.expanded` become a single `margin` prop with `compact` and `expanded` members. A library fact: it states that the library authors object-prop members as separator-delimited flat names — absence means no folding, and a property name containing the separator stays a flat prop.

| | |
|---|---|
| **File** | `config/conventions/figma.yaml` |
| **Path** | `objectProps` |
| **Type** | object |
| **Default** | — (absent; no folding) |

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `separator` | string | `.` | The member-name separator in flat property names |

## Example

```yaml
objectProps:
  separator: "."   # Fold margin.compact + margin.expanded into one margin prop
```

## Result

The example uses variant properties named `margin.compact` and `margin.expanded`, each with options `none`, `small`, and `large`.

**Without** the convention (absent) they stay two unrelated flat props:

```json
{
  "props": {
    "marginCompact": { "type": "string", "default": "none", "enum": ["none", "small", "large"] },
    "marginExpanded": { "type": "string", "default": "none", "enum": ["none", "small", "large"] }
  }
}
```

**With** the convention they fold into one object prop whose members keep their own typing:

```json
{
  "props": {
    "margin": {
      "type": "object",
      "members": {
        "compact": { "type": "string", "default": "none", "enum": ["none", "small", "large"] },
        "expanded": { "type": "string", "default": "none", "enum": ["none", "small", "large"] }
      }
    }
  }
}
```

Each folded member records its flat Figma source name in `$extensions['com.figma'].name`, so writing back to Figma reverses the fold without re-deriving names. Variant configurations and instance examples set the folded prop with a member-keyed value — see [PropConfigurations](/schema/prop-configurations/).

Members are one level deep: scalars only (boolean, string, enum, number), no slots, images, or nested objects. Member names must not begin with `$`.

## Further reading

- [ObjectProp](/schema/props/#objectprop) for the emitted prop shape.
- [Conventions](/schema/conventions/#objectprops) for the schema definition of this convention.
