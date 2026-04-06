---
title: Key Formatting
order: 4
description: Transform property and element key names to a consistent naming convention
---

# Key Formatting

Component specs contain hundreds of keys — prop names, anatomy element names, variant configuration keys, layout node names, subcomponent identifiers. In Figma, these names follow whatever convention the designer used: `"Padding Left"`, `"padding-left"`, `"paddingLeft"`, or a mix. The `keys` format option normalizes every key in the output to a single, consistent naming convention.

## The Problem

Inconsistent key naming creates friction for downstream consumers. A code generator expecting `camelCase` breaks on `"Padding Left"`. A CSS-in-JS system expecting `kebab-case` must manually transform `"PaddingLeft"`. Even within a single Figma file, different designers may use different conventions for the same kind of name. Without normalization, consumers inherit this inconsistency.

## What It Does

The `keys` option applies a naming transformation to every key in the spec output. The transformation is applied uniformly across all key types: prop names, anatomy element names, variant configuration keys, enum values, child references, binding paths, layout node names, and subcomponent map keys.

### Available Formats

| Format | Input | Output | Best For |
|--------|-------|--------|----------|
| `SAFE` | `Padding Left` | `Padding Left` | Preserving original Figma names without corruption |
| `CAMEL` | `Padding Left` | `paddingLeft` | JavaScript/TypeScript APIs, React props |
| `SNAKE` | `Padding Left` | `padding_left` | Python, Ruby, database columns |
| `KEBAB` | `Padding Left` | `padding-left` | CSS custom properties, HTML attributes |
| `PASCAL` | `Padding Left` | `PaddingLeft` | C# properties, class names |
| `TRAIN` | `Padding Left` | `Padding-Left` | HTTP headers, title-style identifiers |

### Example Output

Given a component with props `"Has Icon"`, `"Label Text"`, and `"Button Size"`:

**SAFE** (default):
```yaml
props:
  Has Icon:
    type: boolean
  Label Text:
    type: string
  Button Size:
    type: enum
```

**CAMEL**:
```yaml
props:
  hasIcon:
    type: boolean
  labelText:
    type: string
  buttonSize:
    type: enum
```

**SNAKE**:
```yaml
props:
  has_icon:
    type: boolean
  label_text:
    type: string
  button_size:
    type: enum
```

The transformation applies to keys throughout the entire spec — not just props, but anatomy elements, variant names, layout nodes, and all other keyed structures.

## When to Use Each Format

- **`SAFE`** — Default. Use when you want to preserve the original Figma names exactly as authored, including spaces and mixed case. Good for documentation, design-to-dev handoff where Figma names are the source of truth, or when downstream tools handle their own key transformation.
- **`CAMEL`** — Use when your consuming codebase is JavaScript or TypeScript. Props map directly to React component props or JS object keys without additional transformation.
- **`SNAKE`** — Use when your consuming codebase is Python, Ruby, or another language that uses snake_case conventions. Also useful for database schemas.
- **`KEBAB`** — Use when keys feed into CSS custom properties (`--button-size`), HTML attributes, or URL-friendly identifiers.
- **`PASCAL`** — Use when keys map to class names, C# properties, or other PascalCase conventions.
- **`TRAIN`** — Uncommon. Useful for HTTP header-style names or title-case identifiers with hyphen separators.

## Configuration

Set `keys` under `model.format` in your config file:

```yaml
# .specs.config.yaml
model:
  format:
    keys: CAMEL    # Transform all keys to camelCase
```

**Default**: `SAFE` — preserves Figma names without modification.

## Practical Guidance

**Choose one format and use it consistently.** Mixing formats across different spec runs creates the same inconsistency problem you're trying to solve. Set the format once in your config file and leave it.

**`SAFE` is lossless; everything else is lossy.** The `SAFE` format preserves the original name exactly. All other formats discard information (casing, separators, spaces). If you need the original Figma name alongside a transformed key, `SAFE` is the only format that preserves it.

**Match your consuming platform.** If your specs feed a React component library, use `CAMEL`. If they feed a Python SDK, use `SNAKE`. The format should eliminate transformation work for the most common consumer, not add it.

**Special characters are handled gracefully.** Keys containing special characters (slashes, dots, brackets) are cleaned during transformation. The `SAFE` format preserves them as-is; other formats normalize them into the target convention.

## See Also

- [CLI Configuration](../cli/configuration.md) — full config reference
