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

Uses your own token shapes instead of Specs' built-in formats. Before generating, you run the [`applyCustomTokens`](/specs/cli/commands/apply-custom-tokens/) command to inject a `$custom` object onto each variable and style in your fetched data. When `CUSTOM` is active, that object becomes the property value verbatim. References without `$custom` fall back to the `TOKEN_FIGMA_EXTENSIONS` shape.

```yaml
# This variable had $custom injected — your object, verbatim
backgroundColor:
  name: color-text-primary
  value: "{color.text.primary}"

# This variable had no $custom — falls back to TOKEN_FIGMA_EXTENSIONS
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

#### `FIGMA_SYNTAX_WEB` / `FIGMA_SYNTAX_IOS` / `FIGMA_SYNTAX_ANDROID`

The developer-facing token name a designer assigned for a specific platform via Figma's [code syntax](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/) — `WEB`, `iOS`, or `ANDROID`. Each profile emits that platform's code syntax string:

```yaml
backgroundColor: --ds-color-text-primary    # FIGMA_SYNTAX_WEB
backgroundColor: DSColor.textPrimary        # FIGMA_SYNTAX_IOS
backgroundColor: R.color.ds_text_primary    # FIGMA_SYNTAX_ANDROID
```

When a token has no code syntax defined for the chosen platform, the profile **falls back to the `TOKEN` output** for that reference, so these profiles are always safe to select. Use them to match the token naming your platform code already expects.

### Profile Comparison

| Profile | Output shape | Includes type | Includes Figma IDs | Custom mapping |
|---------|-------------|---------------|-------------------|----------------|
| `TOKEN` | `{ $token, $type }` | Yes | No | No |
| `TOKEN_NAME` | `"name.path"` | No | No | No |
| `TOKEN_FIGMA_EXTENSIONS` | `{ $token, $type, $extensions }` | Yes | Yes | No |
| `FIGMA_NAME` | `"Collection/Path"` | No | No | No |
| `CUSTOM` | User-defined or fallback | Varies | Fallback only | Yes |
| `FIGMA_SYNTAX_WEB` | Platform code syntax string, or `TOKEN` fallback | Fallback only | No | No |
| `FIGMA_SYNTAX_IOS` | Platform code syntax string, or `TOKEN` fallback | Fallback only | No | No |
| `FIGMA_SYNTAX_ANDROID` | Platform code syntax string, or `TOKEN` fallback | Fallback only | No | No |

## When to Use Each Profile

- **`TOKEN`** — Default. Use for platform-neutral consumers that need structured token references without Figma-specific metadata. Good for code generators, documentation tools, and cross-platform design systems.
- **`TOKEN_NAME`** — Use when consumers only need a lookup key. The most compact format, ideal for token resolution pipelines that already have a registry.
- **`TOKEN_FIGMA_EXTENSIONS`** — Use when consumers need to trace tokens back to their Figma source — variable IDs, raw resolved values, collection names. Useful for debugging, Figma plugin integrations, or migration tooling.
- **`FIGMA_NAME`** — Use when consumers expect Figma-native naming with slash delimiters. Good for teams whose token systems mirror the Figma variable structure directly.
- **`CUSTOM`** — Use when your team has a bespoke token format (e.g., Style Dictionary references, custom JSON shapes). Requires running `specs applyCustomTokens` first to inject `$custom` objects into your fetched data files.
- **`FIGMA_SYNTAX_WEB` / `FIGMA_SYNTAX_IOS` / `FIGMA_SYNTAX_ANDROID`** — Use when consumers want the platform-specific token name designers set in Figma's code syntax for Web, iOS, or Android. Tokens lacking code syntax for the chosen platform fall back to `TOKEN` output.

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

The `CUSTOM` profile requires an extra step between `fetch` and `generate`:

```bash
specs fetch                              # 1. Download raw Figma data
specs applyCustomTokens mapping.json     # 2. Inject $custom objects into the data
specs generate                           # 3. Generate — uses $custom objects verbatim
```

See the [`applyCustomTokens` command](/specs/cli/commands/apply-custom-tokens/) for the full mapping file format, data impact examples, and pipeline details.

## Further Reading

- [ADR 007 — Token Reference Config](https://github.com/DirectedEdges/specs/blob/main/adr/007-token-reference-config.md) — architecture decision record consolidating the token format into a single enum
- [CLI Configuration](/specs/config/) — full config reference
