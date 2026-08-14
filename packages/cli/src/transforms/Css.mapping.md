# CSS Transformer — Style Mapping Reference

Documents how each spec style key maps to a CSS declaration. The transformer
reads `variants.yaml` (concern: `variants`) alongside `api.yaml` (concern: `api`).

---

## Element class naming

Each key in `default.elements` becomes a CSS class:

| Element key | CSS class |
|-------------|-----------|
| `root` | `.{component}` |
| any other | `.{component}__{element-in-kebab}` |

Component and element keys are converted from camelCase to kebab-case:
`egdsButton` → `.egds-button`, `startVisualAndLabel` → `.egds-button__start-visual-and-label`.

---

## Variant selectors

Each `variants[].configuration` key/value pair becomes a `data-*` attribute selector
on the root class:

```
configuration: { appearance: outline, state: hover }
  → .egds-button[data-appearance="outline"][data-state="hover"]
```

Variants are emitted in **schema order** — this is intentional. `variants.yaml` orders
single-prop variants before multi-prop compound variants, which produces the correct
CSS cascade matching the variant-layering algorithm. Do not reorder.

Child element overrides under a variant use a descendant selector:

```css
.egds-button[data-appearance="outline"] .egds-button__label { ... }
```

---

## Token references (phase 1)

Token references (`{ $token: "Color/Primary", $type: "color" }`) are emitted as CSS
custom property references derived from the token path:

```
Color/Primary           → var(--color-primary)
Constants/Spacing/5x    → var(--constants-spacing-5x)
Typography/font__300__medium → var(--typography-font--300--medium)
```

These are valid CSS and immediately usable if the consumer defines the variables.
Phase 2 will replace them with properly resolved names from `token-mappings.json`.

---

## Style key mappings

### Colors

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `backgroundColor` | `background` | `null` → `transparent` |
| `textColor` | `color` | `null` → `transparent` |
| `fillColor` | `fill` | SVG/glyph elements only. `null` → `transparent` |

Color values: token refs → `var(--)`, hex strings → as-is, `ColorObject` → `hex` field
if present, else `currentColor`. Gradients deferred to phase 2.

### Opacity

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `opacity` | `opacity` | Number 0–1. Token refs supported. |

### Border

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `strokes` | `border-color` | `null` → `transparent` |
| `strokeWeight` | `border-width` | Scalar → px. `Sides` object → per-side shorthand. |
| `strokeAlign` | *(skipped)* | No direct CSS equivalent. `INSIDE` requires a `box-shadow: inset` workaround; `OUTSIDE` requires `outline`. `CENTER` matches default CSS border behavior. Consumer must implement. |

### Corner radius

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `cornerRadius` | `border-radius` | Scalar/token → single value. `Corners` object (`topStart topEnd bottomEnd bottomStart`) → four-value shorthand. |

### Effects

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `effects` | `box-shadow` | Token refs only in phase 1 — emitted as `box-shadow: var(--)`. Inline `Effects` objects (shadows/blur) deferred to phase 2. `filter`/`backdrop-filter` distinction resolved in phase 2. |

### Dimensions

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `width` | `width` | px. Zero values omitted. |
| `height` | `height` | px. Zero values omitted. |
| `minWidth` | `min-width` | px. |
| `minHeight` | `min-height` | px. |
| `maxWidth` | `max-width` | px. |
| `maxHeight` | `max-height` | px. |

### Padding

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `padding` | `padding` | Scalar/token → single value. `Sides` object (`top end bottom start`) → four-value shorthand using physical properties (`top right bottom left`). |

### Typography

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `typography` (TokenReference) | `font` | Token ref → `font: var(--)`. Phase 2 resolves to named text style. |
| `typography.fontSize` | `font-size` | px if number; `var(--)` if TokenReference. |
| `typography.fontFamily` | `font-family` | String or TokenReference → `var(--)`. |
| `typography.fontStyle` | `font-weight` / `font-style` | String parsed for weight name + italic suffix; TokenReference → `font-weight: var(--)`. |
| `typography.lineHeight` | `line-height` | Passed through as-is (number or string like "150%"). |
| `typography.letterSpacing` | `letter-spacing` | px if number; `var(--)` if TokenReference. |
| `typography.textCase` | `text-transform` | `UPPER`→uppercase, `LOWER`→lowercase, `TITLE`→capitalize, `ORIGINAL`→none |
| `typography.textDecoration` | `text-decoration` | `UNDERLINE`→underline, `STRIKETHROUGH`→line-through, `NONE`→none |

### Text alignment

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `textAlignHorizontal` | `text-align` | `LEFT`→left, `CENTER`→center, `RIGHT`→right, `JUSTIFIED`→justify |
| `textAlignVertical` | *(skipped)* | Handled by flex parent's `align-items` in most cases. |

### Aspect ratio

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `aspectRatio` | `aspect-ratio` | `AspectRatioValue { x, y }` → `aspect-ratio: x / y`. `null` omitted. |

### Visibility and overflow

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `visible: false` | `display: none` | Only emitted when explicitly false. |
| `clipsContent: true` | `overflow: hidden` | |
| `clipsContent: false` | `overflow: visible` | |

### Transform

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `rotation` | `transform: rotate(Xdeg)` | Zero rotation omitted. Token refs supported. |

### Position and offsets

| Spec key | CSS property | Notes |
|----------|-------------|-------|
| `position: ABSOLUTE` | `position: absolute` | `AUTO` omitted (default flex-child behavior). |
| `top` | `inset-block-start` | Logical property. px or percentage string. |
| `bottom` | `inset-block-end` | Logical property. |
| `start` | `inset-inline-start` | Logical property (LTR: left). |
| `end` | `inset-inline-end` | Logical property (LTR: right). |
| `centerHorizontalOffset` | *(skipped)* | No CSS equivalent. |
| `centerVerticalOffset` | *(skipped)* | No CSS equivalent. |

---

## Layout group (flex)

Layout rules require cross-key context and are handled separately from atomic mappings.
All rules below are only emitted when `layoutMode` is `HORIZONTAL` or `VERTICAL`.

### Flex container rules

| Spec key | CSS property | Value mapping |
|----------|-------------|---------------|
| `layoutMode: HORIZONTAL` | `display: flex; flex-direction: row` | |
| `layoutMode: VERTICAL` | `display: flex; flex-direction: column` | |
| `mainAxisAlignment` | `justify-content` | `START`→flex-start (omitted, default), `END`→flex-end, `CENTER`→center, `SPACE_BETWEEN`→space-between |
| `crossAxisAlignment` | `align-items` | `START`→flex-start (omitted, default), `END`→flex-end, `CENTER`→center, `STRETCH`→stretch, `BASELINE`→baseline |
| `wrap: true` | `flex-wrap: wrap` | |
| `wrapAlignment` | `align-content` | `START`→flex-start, `SPACE_BETWEEN`→space-between. Only emitted when `wrap: true`. |
| `itemSpacing` | `gap` | px, token ref, or `ItemSpacing { horizontal, vertical }` → `gap: row col` |

### Sizing within parent

These apply to a child element describing how it sizes relative to its parent flex container.
They are emitted regardless of whether the element is itself a flex container.

| Spec value | CSS output | Condition |
|-----------|-----------|-----------|
| `layoutSizingHorizontal: HUG` | `width: fit-content` | Shrink-wrap content horizontally |
| `layoutSizingHorizontal: FILL` | `flex-grow: 1` | Fill parent's main axis (assumes parent is HORIZONTAL flex) |
| `layoutSizingVertical: HUG` | `height: fit-content` | Shrink-wrap content vertically |
| `layoutSizingVertical: FILL` | `align-self: stretch` | Fill parent's cross axis (assumes parent is flex) |
| `layoutSizingHorizontal: FIXED` | *(omitted)* | Explicit width is emitted via `width` key |
| `layoutSizingVertical: FIXED` | *(omitted)* | Explicit height is emitted via `height` key |

**Note:** `FILL` mappings assume knowledge of the parent's flex direction. An element with
`layoutSizingHorizontal: FILL` inside a VERTICAL parent would need `width: 100%` instead of
`flex-grow: 1`. The transformer emits the horizontal-axis default; adjust for vertical parents.

---

## Skipped keys

| Spec key | Reason |
|----------|--------|
| `locked` | Figma layer lock — no CSS equivalent |
| `cornerSmoothing` | Figma squircle algorithm — no CSS equivalent |
| `itemReverseZIndex` | Figma auto-layout z-index reversal — no CSS equivalent |
| `primaryAxisSizingMode` | Figma internal (AUTO vs FIXED on main axis) — no CSS equivalent |
| `layoutMode: NONE` | No auto-layout — emits no flex rules |
| `strokeAlign` | No direct equivalent; see Border section above |
| `textAlignVertical` | Handled by parent flex `align-items` in most cases |
| `centerHorizontalOffset` / `centerVerticalOffset` | No CSS equivalent for CENTER-constrained Figma positioning |
| Inline `Effects` objects | Deferred to phase 2 (shadow/blur property disambiguation) |
| Gradient color values | Deferred to phase 2 |

---

## Phase 2: token resolution

Phase 2 will replace `var(--derived-token-name)` placeholders with resolved CSS variable
names sourced from `token-mappings.json` (produced by `specs fetch` + `applyCustomTokens`).

The resolution strategy — which variable naming format to use, how to handle
`$brand`/`$theme` template variables, and how to fall back when a token is unmapped —
is to be planned separately.
