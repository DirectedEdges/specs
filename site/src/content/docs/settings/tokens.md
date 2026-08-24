---
title: "Tokens"
description: "Control how design token references are serialized in the spec output"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Style properties in a spec frequently reference design tokens — the colors, spacing, and typography defined as Figma variables or published styles. The `tokens` option controls **how those references are serialized**, ranging from a minimal name string to a rich object carrying full Figma provenance.

Different consumers need different levels of detail: a documentation site just needs the token name, a code generator needs a structured reference with a type hint, a Figma-native tool needs raw variable IDs, and a team with a bespoke token system needs to inject its own mapping entirely. One format can't satisfy all of these — so `tokens` selects a single **profile** applied uniformly to every token reference in the output, both variables and published named styles. A run choice in `config/settings.yaml`: every profile serializes the same references correctly, just at different levels of detail.

## Configuration

```yaml
spec:
  tokens: TOKEN  # Default — DTCG-aligned objects
```

**Default:** `TOKEN`.

## Result

Under the default `TOKEN` profile, the `DS Alert` root's `backgroundColor` is emitted as a structured, typed reference:

```json
{
  "default": {
    "elements": {
      "root": {
        "styles": {
          "backgroundColor": {
            "$token": "DS Color/Alert/Info/Background",
            "$type": "color"
          }
        }
      }
    }
  }
}
```

Switching the profile reshapes that one reference — from the full object above down to a bare `"DS Color/Alert/Info/Background"` string under `TOKEN_NAME`, or up to an object with embedded Figma IDs under `TOKEN_FIGMA_EXTENSIONS`.

## Profiles

The same `backgroundColor` reference, serialized under each profile:

| Profile | What it emits | Example output |
|---------|---------------|----------------|
| `TOKEN` *(default)* | A DTCG-aligned object: the token path plus its `$type`. No tool-specific metadata. | `{ "$token": "DS Color/Alert/Info/Background", "$type": "color" }` |
| `TOKEN_NAME` | The token path only, as a plain string with no wrapper object. The most compact format. | `"DS Color/Alert/Info/Background"` |
| `TOKEN_FIGMA_EXTENSIONS` | Same as `TOKEN`, plus a `$extensions["com.figma"]` block with raw Figma identifiers. | `{ "$token": "…", "$type": "color", "$extensions": { "com.figma": { … } } }` |
| `FIGMA_NAME` | The raw Figma-native name as a plain string, exactly as it appears in the file. | `"DS Color/Alert/Info/Background"` |
| `CUSTOM` | Your own token object injected via `applyCustomTokens`, used verbatim. References without a `$custom` object fall back to `TOKEN_FIGMA_EXTENSIONS`. | `{ "name": "color-alert-info-bg", "value": "{color.alert.info.bg}" }` |
| `FIGMA_SYNTAX_WEB` | The Web code-syntax name a designer set in Figma. Falls back to `TOKEN` when none is defined. | `"--ds-color-alert-info-bg"` |
| `FIGMA_SYNTAX_IOS` | The iOS code-syntax name. Falls back to `TOKEN` when none is defined. | `"DSColor.alertInfoBg"` |
| `FIGMA_SYNTAX_ANDROID` | The Android code-syntax name. Falls back to `TOKEN` when none is defined. | `"R.color.ds_alert_info_bg"` |

For variables the path includes the collection (`DS Color/…`); for named styles it is the style name as-is (e.g. `Body/Medium`).

### TOKEN_FIGMA_EXTENSIONS

The full shape adds raw Figma provenance under `$extensions`. For variables the block carries `id`, `rawValue`, `name`, and `collectionName`; for named styles it carries `id` and `name`:

```json
{
  "backgroundColor": {
    "$token": "DS Color/Alert/Info/Background",
    "$type": "color",
    "$extensions": {
      "com.figma": {
        "id": "VariableID:123:456",
        "rawValue": "#E8F1FBFF",
        "name": "Alert/Info/Background",
        "collectionName": "DS Color"
      }
    }
  }
}
```

### CUSTOM

`CUSTOM` substitutes your own token shapes for Specs' built-in ones. Before generating, run [`applyCustomTokens`](/cli/commands/apply-custom-tokens/) to inject a `$custom` object onto each variable and style in your fetched data; when `CUSTOM` is active, that object becomes the property value verbatim. References that never received a `$custom` object fall back to the `TOKEN_FIGMA_EXTENSIONS` shape.

```json
{
  "backgroundColor": { "name": "color-alert-info-bg", "value": "{color.alert.info.bg}" },
  "borderColor": {
    "$token": "DS Color/Alert/Info/Element",
    "$type": "color",
    "$extensions": { "com.figma": { "id": "VariableID:789:012", "rawValue": "#1B6FD6FF", "name": "Alert/Info/Element", "collectionName": "DS Color" } }
  }
}
```

The profile requires an extra step between `fetch` and `generate`:

```bash
specs fetch                              # 1. Download raw Figma data
specs applyCustomTokens mapping.json     # 2. Inject $custom objects into the data
specs generate                           # 3. Generate — uses $custom objects verbatim
```

The `applyCustomTokens` command auto-discovers variables/styles files from `data.directory` and `data.sources` in `config/settings.yaml`, or accepts explicit `-v`/`-s` paths. See [`applyCustomTokens` command](/cli/commands/apply-custom-tokens/) for the full mapping file format and pipeline details.

### FIGMA_SYNTAX_WEB / FIGMA_SYNTAX_IOS / FIGMA_SYNTAX_ANDROID

These emit the developer-facing token name a designer assigned for a specific platform via Figma's [code syntax](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/) — `WEB`, `iOS`, or `ANDROID`:

```yaml
backgroundColor: --ds-color-alert-info-bg     # FIGMA_SYNTAX_WEB
backgroundColor: DSColor.alertInfoBg          # FIGMA_SYNTAX_IOS
backgroundColor: R.color.ds_alert_info_bg     # FIGMA_SYNTAX_ANDROID
```

When a token has no code syntax defined for the chosen platform, the profile **falls back to the `TOKEN` output** for that reference, so these profiles are always safe to select.

## When to use each profile

- **`TOKEN`** — Default. Platform-neutral consumers that need structured, typed references without Figma-specific metadata. Good for code generators, documentation tools, and cross-platform design systems.
- **`TOKEN_NAME`** — Consumers that only need a lookup key. The most compact format, ideal for token-resolution pipelines that already have a registry.
- **`TOKEN_FIGMA_EXTENSIONS`** — Consumers that need to trace tokens back to their Figma source — variable IDs, raw resolved values, collection names. Useful for debugging, plugin integrations, or migration tooling.
- **`FIGMA_NAME`** — Teams whose token systems mirror the Figma variable structure directly and expect Figma-native naming.
- **`CUSTOM`** — Teams with a bespoke token format (Style Dictionary references, custom JSON shapes). Requires running `specs applyCustomTokens` first.
- **`FIGMA_SYNTAX_WEB` / `FIGMA_SYNTAX_IOS` / `FIGMA_SYNTAX_ANDROID`** — Consumers that want the platform-specific token name designers set in Figma's code syntax. Tokens lacking code syntax for the chosen platform fall back to `TOKEN` output.

## Path

`spec.tokens` in `config/settings.yaml`

## See Also

- [`applyCustomTokens` command](/cli/commands/apply-custom-tokens/) — mapping file format and pipeline for the `CUSTOM` profile
- [ADR 007 — Token Reference Config](https://github.com/DirectedEdges/specs/blob/main/adr/007-token-reference-config.md) — the decision consolidating token formatting into a single enum
