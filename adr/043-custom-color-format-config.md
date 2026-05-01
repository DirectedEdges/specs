# ADR: Custom Color Format Configuration

**Branch**: `043-custom-color-format-config`
**Created**: 2026-05-01
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-009 replaced bare hex strings with the structured `ColorValue` object across all color-bearing properties (`backgroundColor`, `fillColor`, `textColor`, `strokes`, gradient stops, shadows). `ColorValue` carries `colorSpace`, `components`, `alpha`, and an optional `hex` fallback — a rich, DTCG-aligned representation.

However, many consumers prefer a **flat string** representation of color values rather than the full object. Common use cases include:

- Code generation pipelines that need `#FF6600` or `hsla(24, 100%, 50%, 1)` directly
- Documentation tools that display human-readable color values
- Legacy system integration that expects a specific color notation

The previous version of Specs (v1) supported a format toggle between hex and HSLA. Figma's own UI exposes a broader set of color formats:

- **HEX** — `#RRGGBB` (6-digit, no alpha)
- **HEXA** — `#RRGGBBAA` (8-digit, with alpha)
- **RGB** — `rgb(R, G, B)` functional notation
- **HSLA** — `hsla(H, S%, L%, A)` functional notation
- **HSB** — `hsb(H, S%, B%)` (Figma's native model, also known as HSV)
- **CSS** — CSS Color Level 4 `color()` functional notation (e.g., `color(display-p3 0.5 0.2 0.8)`)

The `Config.format` section already houses output-shaping options (`output`, `keys`, `layout`, `tokens`). A color format option fits naturally alongside these.

---

## Decision Drivers

- **Additive change**: Must be a new optional field to avoid a MAJOR bump. Absence preserves existing `ColorValue` object behaviour.
- **Type ↔ schema symmetry**: The new field must appear in both `Config` / `ResolvedConfig` types and `component.schema.json`.
- **No runtime logic**: The type/schema package defines the enum values only. Formatting logic belongs in `specs-from-figma`.
- **Enum casing convention**: String literal unions in config use `SCREAMING_CASE` per the constitution.
- **Figma parity**: The enum values should cover all formats available in Figma's colour picker UI.
- **Default preserves current behaviour**: When the config field is absent or set to the default, output must remain unchanged (structured `ColorValue` objects).

---

## Options Considered

### Option A: Add `format.color` with `OBJECT` default *(Selected)*

Add an optional `color` field to `Config.format` with a string enum covering all Figma formats plus the current structured object as the default.

Enum values: `'OBJECT' | 'HEX' | 'HEXA' | 'RGB' | 'HSLA' | 'HSB' | 'CSS'`

- `OBJECT` — current `ColorValue` object output (default, preserves backwards compatibility)
- `HEX` — 6-digit hex string `#RRGGBB`
- `HEXA` — 8-digit hex string `#RRGGBBAA`
- `RGB` — `rgb(R, G, B)` or `rgba(R, G, B, A)` functional notation
- `HSLA` — `hsla(H, S%, L%, A)` functional notation
- `HSB` — `hsb(H, S%, B%)` notation (Figma's native colour model)
- `CSS` — CSS Color Level 4 `color()` notation

**Pros**:
- Fits naturally into the existing `format` section alongside `output`, `keys`, `layout`, `tokens`
- `OBJECT` default preserves exact current behaviour — no breaking change
- Covers all Figma UI formats plus the structured object
- Follows established pattern: enum string union, optional with default

**Cons / Trade-offs**:
- When a non-`OBJECT` format is selected, the output type for color positions changes from `ColorValue` to `string`, which means the TypeScript type for color-bearing properties becomes less precise at compile time (consumers must check `Config.format.color` to know the runtime shape)

---

### Option B: Add a top-level `colorFormat` field outside `format` *(Rejected)*

Place the field at `Config.colorFormat` rather than `Config.format.color`.

**Rejected because**: All other output-shaping format options live under `Config.format`. Placing this outside breaks the organisational convention and makes the config harder to reason about.

---

### Option C: Boolean `flattenColors` toggle with a separate `colorNotation` field *(Rejected)*

A boolean to opt into string output plus a separate notation selector.

**Rejected because**: Requires two fields where one suffices. The `OBJECT` enum value already serves as the "don't flatten" mode, making a boolean redundant.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Config.ts` | Add optional `color` field to `Config.format` | MINOR |
| `Config.ts` | Add required `color` field to `ResolvedConfig.format` | MINOR |
| `Config.ts` | Add `color: 'OBJECT'` to `DEFAULT_CONFIG.format` | MINOR |
| `index.ts` | Export `ColorFormat` type | MINOR |

**New type** (`types/Config.ts`):
```yaml
# New named type
ColorFormat: "'OBJECT' | 'HEX' | 'HEXA' | 'RGB' | 'HSLA' | 'HSB' | 'CSS'"

# Config.format — before
format:
  output?: 'JSON' | 'YAML'
  keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN'
  layout?: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH'
  tokens?: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM'

# Config.format — after
format:
  output?: 'JSON' | 'YAML'
  keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN'
  layout?: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH'
  tokens?: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM'
  color?: ColorFormat    # optional — MINOR

# ResolvedConfig.format — after (required, with default)
format:
  output: 'JSON' | 'YAML'
  keys: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN'
  layout: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH'
  tokens: 'TOKEN' | 'TOKEN_NAME' | 'TOKEN_FIGMA_EXTENSIONS' | 'FIGMA_NAME' | 'CUSTOM'
  color: ColorFormat     # required in resolved config

# DEFAULT_CONFIG.format — after
format:
  output: 'JSON'
  keys: 'SAFE'
  layout: 'LAYOUT'
  tokens: 'TOKEN'
  color: 'OBJECT'        # preserves current behaviour
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `color` property to `Config.format` | MINOR |

**New property** (`schema/component.schema.json` — under `#/definitions/Config/properties/format/properties`):
```yaml
color:
  type: string
  enum:
    - OBJECT
    - HEX
    - HEXA
    - RGB
    - HSLA
    - HSB
    - CSS
  default: OBJECT
  description: >-
    Color value output format. OBJECT emits the full ColorValue object
    (colorSpace, components, alpha, hex). All other values emit a
    formatted color string. Defaults to OBJECT.
```

### Notes

- The `ColorFormat` named type follows the pattern established by other config enums. While most config values are inline literal unions, a named export is justified here because downstream consumers need to reference this type when implementing format-specific logic.
- When `format.color` is not `OBJECT`, every property currently typed as `ColorValue` in the output will instead contain a `string`. This affects `backgroundColor`, `fillColor`, `textColor`, `strokes`, gradient stop `color`, and shadow `color`. The type/schema package does **not** change these property types — the runtime formatting is a `specs-from-figma` concern. The schema already accommodates string values in `ColorStyleValue` and related definitions.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — one new optional property `color` is added to `Config.format` in both TypeScript types and JSON schema.
- **Parity check**: `Config.format.color` (type) ↔ `#/definitions/Config/properties/format/properties/color` (schema). Same enum values, same default, same optionality.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must read `resolvedConfig.format.color` and format `ColorValue` objects into the requested string notation when not `OBJECT` | Implement colour formatting logic for each enum value |
| `specs-cli` | Passes config to `specs-from-figma`; no CLI-specific logic needed | Recompile against updated types |
| `specs-plugin` | Passes config to `specs-from-figma`; may expose a UI dropdown for the new option | Recompile; optionally add UI control |

---

## Semver Decision

**Version bump**: `0.20.0 → 0.21.0` (`MINOR`)

**Justification**: All changes are additive optional fields on existing types. No existing field is removed, renamed, or has its type signature altered. This is a MINOR bump per constitution §Versioning: "MINOR for additive types or new optional fields."

---

## Consequences

- Consumers can configure `format.color` to receive flat colour strings instead of `ColorValue` objects, matching their downstream toolchain's expected notation
- The `OBJECT` default preserves full backwards compatibility — existing integrations are unaffected
- `specs-from-figma` gains responsibility for colour space conversion logic (e.g., sRGB → HSL) when non-`OBJECT` formats are selected
- All Figma-native colour formats are supported, achieving parity with the Figma UI colour picker
- Future colour formats can be added to the enum as a MINOR change
