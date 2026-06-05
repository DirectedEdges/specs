# CSS Transformer — Token Resolution Design

How `specs transform css` resolves token references to `var(--)` declarations.

---

## The Problem

The spec file contains token references in whatever format the consumer chose at generation time. The CSS transformer needs to emit `var(--css-custom-property-name)` for each one. These are different namespaces, and the mapping between them is not always derivable from the token path alone.

### Token reference shapes in the spec (by format)

| `format.tokens` config | Shape in spec | Example |
|---|---|---|
| `TOKEN` *(default)* | `{ $token, $type }` object | `{ $token: "DS Color/Alert/Info/Background", $type: "color" }` |
| `TOKEN_FIGMA_EXTENSIONS` | `{ $token, $type, $extensions }` object | same + `$extensions.com.figma.id` |
| `TOKEN_NAME` | plain string (token path) | `"DS Color/Alert/Info/Background"` |
| `FIGMA_NAME` | plain string (Figma-native name) | `"DS Color/Alert/Info/Background"` |
| `FIGMA_SYNTAX_WEB` | plain string (designer-set CSS name) or fallback `TOKEN` | `"--ds-color-alert-info-bg"` |
| `FIGMA_SYNTAX_IOS` | plain string (iOS name) | `"DSColor.alertInfoBg"` |
| `FIGMA_SYNTAX_ANDROID` | plain string (Android name) | `"R.color.ds_alert_info_bg"` |
| `CUSTOM` | arbitrary object (verbatim from `$custom`) | `{ name: "color-alert-info-bg", value: "{color.alert.info.bg}" }` |

---

## Resolution Logic

Resolution is determined by `config.format.tokens`. Three branches:

---

### Branch 1 — `FIGMA_SYNTAX_WEB`

The spec value is already the CSS variable name set by the designer in Figma. Use it directly.

The profile falls back to `TOKEN` shape when no web code syntax is defined for a token — in those cases the value is `{ $token, $type }`, handled by Branch 3 (path derivation).

```
spec value: "--ds-color-alert-info-bg"   → var(--ds-color-alert-info-bg)
spec value: { $token: "...", $type: "..." }   → path derivation (no web syntax set)
```

Detection: string values beginning with `--` are CSS variable names; object values fall through to path derivation.

---

### Branch 2 — `CUSTOM`

`$custom` objects are placed verbatim from the variables file into the spec by `applyCustomTokens`. Because each variable gets a unique `$custom` object, the relationship is reversible: the spec value can be matched back to its source variable in the variables file.

**Resolution chain (in priority order):**

**Step 1 — `$cssVar` in the spec value**

If the `$custom` object contains a `$cssVar` field, use it directly. No external lookup needed.

```yaml
# spec value (CUSTOM format)
backgroundColor:
  name: color-alert-info-bg
  value: "{color.alert.info.bg}"
  $cssVar: "--color-alert-info-bg"     ← use this
```

```
var(--color-alert-info-bg)
```

**Step 2 — Reverse lookup in the variables file**

If `$cssVar` is absent, load the variables file (passed via flag or config) and build a reverse index:

```
JSON.stringify($custom) → codeSyntax.WEB
```

Find the variable whose `$custom` matches the spec value, then use its `codeSyntax.WEB` as the CSS variable name.

```
spec value: { name: "color-alert-info-bg", value: "{...}" }
  ↓ match in variables file
variables["VariableID:123:456"].$custom matches
  ↓
variables["VariableID:123:456"].codeSyntax.WEB = "--color-alert-info-bg"
  ↓
var(--color-alert-info-bg)
```

This works because `applyCustomTokens` ensures a 1:1 relationship between variables and their `$custom` objects.

**Step 3 — Path derivation**

If neither `$cssVar` nor a variables file match is available, fall back to path derivation (see Branch 3).

---

### Branch 3 — Everything else (`TOKEN`, `TOKEN_FIGMA_EXTENSIONS`, `TOKEN_NAME`, `FIGMA_NAME`, platform syntaxes for iOS/Android)

Derive the CSS variable name by kebabizing the token path:

- For `TOKEN` / `TOKEN_FIGMA_EXTENSIONS`: use the `$token` string
- For `TOKEN_NAME` / `FIGMA_NAME`: use the plain string value
- For iOS/Android syntax strings: these are not CSS-derivable; emit a placeholder comment

**Kebabization rules (always applied):**

CSS custom properties are always kebab-case regardless of the token format or key casing in the spec.

```
"DS Color/Alert/Info/Background"  →  var(--ds-color-alert-info-bg)
"Typography/Font/300, Regular"    →  var(--typography-font-300-regular)
"shadow__high_elevation"          →  var(--shadow-high-elevation)
```

Transform steps, in order:
1. `, ` → `-`
2. `/` → `-`
3. `\s+` → `-`
4. `_+` → `-`
5. `-+` → `-` (dedupe)
6. lowercase
7. strip leading `-`

---

## Resolution Table

| `format.tokens` | Step 1 | Step 2 | Step 3 |
|---|---|---|---|
| `FIGMA_SYNTAX_WEB` | string starts with `--` → use directly | `{ $token }` fallback → path derivation | — |
| `CUSTOM` | `$custom.$cssVar` → use directly | variables file reverse lookup → `codeSyntax.WEB` | path derivation |
| `TOKEN` | — | — | kebabize `$token` path |
| `TOKEN_FIGMA_EXTENSIONS` | — | — | kebabize `$token` path |
| `TOKEN_NAME` | — | — | kebabize string value |
| `FIGMA_NAME` | — | — | kebabize string value |
| `FIGMA_SYNTAX_IOS` / `ANDROID` | — | — | not CSS-derivable → placeholder |

---

## Variables File

For Branch 2 step 2, the transformer needs the fetched variables file. This is supplied via:

- `--variables <path>` flag on `specs transform`
- `config.dataDirectory` / `config.sources` (same resolution as `generate`)

The file is only loaded when `format.tokens: CUSTOM` and `$cssVar` is absent from the spec value. It is never required for other branches.

---

## Open Questions

1. **Named styles**: Typography and effects token references may be named Figma styles (`FigmaStyle { id, name }`) rather than variables. These don't have `codeSyntax.WEB`. Branch 3 path derivation applies, using the style name as the path. Are there cases where named styles need CSS variable resolution beyond kebabization?

2. **Partial coverage**: When `FIGMA_SYNTAX_WEB` has fallback `TOKEN` values (tokens with no web code syntax set), path derivation is used for those tokens. Should the transformer warn when this occurs, since the output is a best-guess?
