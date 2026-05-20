---
title: "Tokens"
description: "Control how design token references are serialized in the spec output"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Token reference format profile.

## Options

- **Default**: `TOKEN`
- **Values**:
  - `TOKEN` - Resolved token values with collection/name references
  - `TOKEN_NAME` - Token name only (no collection prefix)
  - `TOKEN_FIGMA_EXTENSIONS` - Token with Figma-specific extension data
  - `FIGMA_NAME` - Raw Figma variable/style names as-is
  - `CUSTOM` - Custom token objects injected via `applyCustomTokens`. Variables/styles with `$custom` use that object verbatim as the property value; those without fall back to `TOKEN_FIGMA_EXTENSIONS` format.
  - `FIGMA_SYNTAX_WEB` - The token's Figma code syntax for the Web platform. Tokens without a Web code syntax fall back to `TOKEN` output.
  - `FIGMA_SYNTAX_IOS` - The token's Figma code syntax for the iOS platform. Tokens without an iOS code syntax fall back to `TOKEN` output.
  - `FIGMA_SYNTAX_ANDROID` - The token's Figma code syntax for the Android platform. Tokens without an Android code syntax fall back to `TOKEN` output.

> **Using CUSTOM**: First run `specs applyCustomTokens <mapping>` to inject `$custom` objects into your fetched data files, then run `batch` or `generate`. The `applyCustomTokens` command auto-discovers variables/styles files from `dataDirectory` and `sources` in this config, or accepts explicit `-v`/`-s` paths. See [applyCustomTokens command](/specs/cli/commands/apply-custom-tokens/) for details.

## Path

`config.format.tokens`

### Example

```yaml
config:
  format:
    tokens: TOKEN  # Default resolved token references
```

## See Also

- [Token Format guide](/specs/guides/token-format/) - Detailed format comparisons and examples
