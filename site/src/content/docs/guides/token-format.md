---
title: "Token Format"
description: "Control how design token references are serialized in the spec output"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Style properties in a component spec often reference design tokens — colors, spacing, typography values defined as Figma variables or published styles. The `tokens` format option controls **how those references are serialized**, ranging from minimal name strings to rich objects with full Figma provenance metadata.

## The Problem

Different consumers need different levels of token detail. A documentation site just needs the token name. A code generator needs a structured reference with a type hint. A Figma-native tool needs raw variable IDs and collection names. A team with a custom token system needs to inject their own mapping entirely. One serialization format can't satisfy all of these.

## What It Does

The `tokens` option selects a serialization profile applied uniformly to every token reference in the output — both Figma variables and published named styles.

### Available Profiles

#### `TOKEN` (Default)

A structured object aligned with the W3C Design Tokens Community Group (DTCG) format. Contains the token's dot-delimited path and its type. No tool-specific metadata.

```yaml
backgroundColor:
  $token: DS Color.Text.Primary
  $type: color
```

For variables, the path is `collection.name` with slashes converted to dots. For named styles, the path is the style name with slashes converted to dots.

#### `TOKEN_NAME`

A plain dot-delimited string — the token path only, with no wrapper object:

```yaml
backgroundColor: DS Color.Text.Primary
```

The most compact format. Use when consumers only need to look up the token by name.

#### `TOKEN_FIGMA_EXTENSIONS`

Same as `TOKEN`, plus a `$extensions["com.figma"]` block carrying the raw Figma identifiers:

```yaml
backgroundColor:
  $token: DS Color.Text.Primary
  $type: color
  $extensions:
    com.figma:
      id: "VariableID:123:456"
      rawValue: "#1a1a1a"
      name: Text/Primary
      collectionName: DS Color
```

For variables, extensions include `id`, `rawValue`, `name`, and `collectionName`. For named styles, extensions include `id` and `name`.

#### `FIGMA_NAME`

The raw Figma-native name as a plain string, with original slash delimiters preserved:

```yaml
backgroundColor: DS Color/Text/Primary    # variable (collection/path)
typography: Body/Medium                    # named style (name only)
```

Variables include the collection name as a prefix; named styles use the style name as-is.

#### `CUSTOM`

Delegates serialization to a custom token mapping. If a variable or style has a `$custom` metadata object (injected via the `applyCustomTokens` CLI command), that object is used verbatim as the property value. References without `$custom` fall back to the `TOKEN_FIGMA_EXTENSIONS` shape.

```yaml
# With $custom mapping applied
backgroundColor:
  name: color-text-primary
  value: "{color.text.primary}"

# Without $custom — falls back to TOKEN_FIGMA_EXTENSIONS
borderColor:
  $token: DS Color.Border.Default
  $type: color
  $extensions:
    com.figma:
      id: "VariableID:789:012"
      rawValue: "#e0e0e0"
      name: Border/Default
      collectionName: DS Color
```

### Profile Comparison

| Profile | Output shape | Includes type | Includes Figma IDs | Custom mapping |
|---------|-------------|---------------|-------------------|----------------|
| `TOKEN` | `{ $token, $type }` | Yes | No | No |
| `TOKEN_NAME` | `"name.path"` | No | No | No |
| `TOKEN_FIGMA_EXTENSIONS` | `{ $token, $type, $extensions }` | Yes | Yes | No |
| `FIGMA_NAME` | `"Collection/Path"` | No | No | No |
| `CUSTOM` | User-defined or fallback | Varies | Fallback only | Yes |

## When to Use Each Profile

- **`TOKEN`** — Default. Use for platform-neutral consumers that need structured token references without Figma-specific metadata. Good for code generators, documentation tools, and cross-platform design systems.
- **`TOKEN_NAME`** — Use when consumers only need a lookup key. The most compact format, ideal for token resolution pipelines that already have a registry.
- **`TOKEN_FIGMA_EXTENSIONS`** — Use when consumers need to trace tokens back to their Figma source — variable IDs, raw resolved values, collection names. Useful for debugging, Figma plugin integrations, or migration tooling.
- **`FIGMA_NAME`** — Use when consumers expect Figma-native naming with slash delimiters. Good for teams whose token systems mirror the Figma variable structure directly.
- **`CUSTOM`** — Use when your team has a bespoke token format (e.g., Style Dictionary references, custom JSON shapes). Requires running `specs applyCustomTokens` first to inject `$custom` objects into your fetched data files.

## Configuration

Set `tokens` under `model.format` in your config file:

```yaml
# specs.config.yaml
model:
  format:
    tokens: TOKEN    # Default — DTCG-aligned objects
```

**Default**: `TOKEN`.

### Using CUSTOM

The `CUSTOM` profile requires a preparatory step:

```bash
# 1. Inject custom token mappings into fetched data
specs applyCustomTokens mapping.json

# 2. Generate specs — CUSTOM profile uses the injected $custom objects
specs generate data/library.file.json -c Button
```

See the [applyCustomTokens command](/specs/cli/commands/apply-custom-tokens/) for details on the mapping format.

## Further Reading

- [ADR 007 — Token Reference Config](https://github.com/DirectedEdges/specs/blob/main/adr/007-token-reference-config.md) — architecture decision record consolidating the token format into a single enum
- [CLI Configuration](/specs/config/) — full config reference
