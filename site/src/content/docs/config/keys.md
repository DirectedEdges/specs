---
title: "Keys"
description: "Transform property and element key names to a consistent naming convention"
---

**Config path:** `config.format.keys`

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

## Examples

Input: `Background color` or `background-color`

| Format | Result |
|--------|--------|
| `SAFE` | `Background color` (preserved) |
| `CAMEL` | `backgroundColor` |
| `SNAKE` | `background_color` |
| `KEBAB` | `background-color` |
| `PASCAL` | `BackgroundColor` |
| `TRAIN` | `Background-Color` |

```yaml
config:
  format:
    keys: CAMEL  # Transform keys to camelCase
```

## See Also

- [Key Formatting guide](/specs/guides/key-formatting/) - Detailed formatting behavior and edge cases
