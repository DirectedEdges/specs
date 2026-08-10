---
title: "Figma Keys"
description: "Declare the naming convention your Figma file uses, so formatted keys stay reversible"
---

The naming convention your Figma file uses for layer names and component property names.

Where [`keys`](/settings/keys/) controls what the spec *emits*, `figmaKeys` describes what the Figma file *contains*. Declaring it gives every formatted key a defined name to reverse back into when a spec is rendered into Figma.

## Options

- **Default**: `SENTENCE`
- **Values**:
  - `SENTENCE` - First word capitalized, rest lowercase (`Icon leading`)
  - `TITLE` - Every word capitalized (`Icon Leading`)

Only the two conventions observed in real Figma files are accepted. This is deliberately narrower than `keys`.

## Path

`config.format.figmaKeys`

### Example

```yaml
config:
  format:
    figmaKeys: TITLE   # Figma layer names are Title Case
    keys: CAMEL        # spec emits camelCase
```

## Why it matters

Declaring the convention your file actually uses keeps specs quiet. A file authored in Title Case but read as sentence case treats every name as divergent, so each anatomy element and prop carries a preserved copy of its Figma name — noise that buries the names genuinely worth fixing.

Names that fall outside the declared convention, or outside the safe character set, are still fully supported. Their Figma name is recorded in `$extensions.com.figma.name` on the definition.

## See Also

- [Keys](/settings/keys/) - the output naming convention
- [Key Formatting guide](/guides/key-formatting/) - the safe key grammar and round-trip behavior
