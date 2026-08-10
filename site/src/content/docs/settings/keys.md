---
title: "Keys"
description: "Transform property and element key names to a consistent naming convention"
---

Key name transformation strategy.

## Options

- **Default**: `SAFE`
- **Values**:
  - `SAFE` - Preserve structure without corrupting special characters
  - `CAMEL` - camelCase
  - `SNAKE` - snake_case
  - `KEBAB` - kebab-case
  - `PASCAL` - PascalCase
  - `TRAIN` - Train-Case

### Comparison

Input: `Background color` or `background-color`

| Format | Result |
|--------|--------|
| `SAFE` | `Background color` (preserved) |
| `CAMEL` | `backgroundColor` |
| `SNAKE` | `background_color` |
| `KEBAB` | `background-color` |
| `PASCAL` | `BackgroundColor` |
| `TRAIN` | `Background-Color` |

## Path

`config.format.keys`

### Example

```yaml
config:
  format:
    keys: CAMEL  # Transform keys to camelCase
```

Every value other than `SAFE` is a lossy projection of the Figma name. Names that cannot be reconstructed from the formatted key are preserved in `$extensions.com.figma.name` on the definition, so the spec stays reversible into Figma.

## See Also

- [Figma Keys](/settings/figma-keys/) - The convention your Figma file uses, and the target keys reverse into
- [Key Formatting guide](/guides/key-formatting/) - Detailed formatting behavior and edge cases
