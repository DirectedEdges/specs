---
title: "Keys"
description: "Transform property and element key names to a consistent naming convention"
---

Key name transformation strategy. A run choice in `config/settings.yaml` — any value produces a correct spec, just with differently formatted keys.

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

`spec.keys` in `config/settings.yaml`

### Example

```yaml
spec:
  keys: CAMEL  # Transform keys to camelCase
```

Every value other than `SAFE` is a lossy projection of the Figma name. Names that cannot be reconstructed from the formatted key are preserved in `$extensions.com.figma.name` on the definition, so the spec stays reversible into Figma.

## What the transformation can break

The projection is lossy in one way that bites downstream: **a word boundary
before a digit does not survive `CAMEL`**. `Brightness 1` becomes
`brightness1` — and nothing can tell afterwards that it was ever two words,
because camelCase has no way to mark a boundary in front of a digit.

Anything that later derives a name from the key inherits that loss. The worked
example is icon glyphs: the asset file on disk is named from the same rule, so
every derivation — fetch, emitted code, the Icons page — lands on
`brightness1.svg`, with no hyphen a human might expect. The derivations agree
with each other by design; what they agree on is the post-transformation name,
not the Figma one.

Changing `spec.keys` on an existing workspace changes every key in the spec and
every name derived from one. Treat it as a migration: regenerate, re-emit, and
expect diffs everywhere — there is no compatibility layer that maps old keys to
new ones.

The exact value is also enforced: an unrecognized value (including a
case variant like `camel`) is not silently corrected. The run warns, names the
valid values, and uses the default.

## See Also

- [Figma Keys](/settings/figma-keys/) - The convention your Figma file uses, and the target keys reverse into
- [Key Formatting guide](/guides/key-formatting/) - Detailed formatting behavior and edge cases
