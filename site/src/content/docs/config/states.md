---
title: "States"
description: "Classify Figma variant props as browser-driven or consumer-controlled states for deterministic CSS and contract output"
---

`processing.states` classifies your library's Figma variant props as semantic states, enabling two downstream behaviors: the [`css` transformer](/specs/cli/transforms/css/) emits real CSS pseudo-classes and ARIA attribute selectors instead of `data-*` attributes for classified props, and the [`contract` transformer](/specs/cli/transforms/contract/) omits browser-driven props from generated Props interfaces.

Without this config, every variant prop emits as a `data-*` attribute selector and appears in the contract. With it, the classification is declared once and applied deterministically everywhere.

## Output

### Given this API from Figma

These props are typical outputs from `specs generate` — the raw Figma variant structure before any state classification is applied:

```yaml
props:
  state:
    type: string
    default: rest
    enum:
      - rest
      - hover
      - pressed
  disabled:
    type: boolean
    default: false
  focused:
    type: boolean
    default: false
```

`processing.states` acts on these props downstream — during `specs transform` — to determine CSS selector strategy and contract inclusion. The `api.yaml` itself is not modified.

### CSS

Without `states` config, all variant configuration props produce `data-*` attribute selectors:

```css
/* Without states config */
.ds-text-input[data-state="hover"] { … }
.ds-text-input[data-disabled="true"] { … }
.ds-text-input[data-focused="true"] { … }
```

With `states` config, classified props produce semantic selectors:

```css
/* With states config */
.ds-text-input:hover { … }
.ds-text-input:disabled,
.ds-text-input[aria-disabled="true"] { … }
.ds-text-input:focus-within { … }
```

Props not listed in `states` continue to emit as `data-*` attribute selectors. A `null` value means "this is the base/default state — skip variant output entirely" (the base block already covers it).

Comma-separated selector strings (e.g. `':disabled, [aria-disabled="true"]'`) expand into multiple parallel rules automatically.

### Contract

Props with `contract: omit` are excluded from generated Props interfaces. Browser-driven states are never consumer props — the browser fires `:hover`, `:active`, and `:focus-within` without the application setting anything. Omitting them produces a cleaner, more accurate interface.

Props with `contract: keep` (or no `contract` field) remain in the interface. The consumer sets these and the component implementation bridges them to the appropriate HTML or ARIA attribute.

```typescript
// contract: omit — browser-driven, excluded from interface
// state (hover, pressed) and focused (:focus-within) are never set by consumers

// contract: keep — consumer-controlled, retained in interface
interface TextInputProps {
  disabled?: boolean;   // bridges to :disabled / aria-disabled
  readOnly?: boolean;   // bridges to [readonly] / aria-readonly
  validation?: 'none' | 'invalid';  // bridges to aria-invalid
}
```

## Configuration

```yaml
config:
  processing:
    states:
      - prop: state
        contract: omit       # browser-driven — never a consumer prop
        values:
          rest: null         # base state — skip variant output entirely
          default: null
          hover: ":hover"
          active: ":active"
          pressed: ":active"
      - prop: disabled
        contract: keep       # consumer sets this; component bridges to :disabled / aria-disabled
        values:
          "true": ':disabled, [aria-disabled="true"]'
      - prop: focused
        contract: omit       # browser-driven — :focus-within fires without a prop
        values:
          "true": ":focus-within"
      - prop: readOnly
        contract: keep       # consumer sets this; component bridges to [readonly] / aria-readonly
        values:
          "true": "[readonly], [aria-readonly=\"true\"]"
      - prop: validation
        contract: keep       # consumer controls validation state
        values:
          invalid: "[aria-invalid=\"true\"]"
      - prop: expanded
        contract: keep       # consumer controls open/closed
        values:
          "true": "[aria-expanded=\"true\"]"
```

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `prop` | `string` | Yes | — | Figma variant prop name (e.g. `state`, `disabled`, `focused`) |
| `values` | `Record<string, string \| null>` | Yes | — | Maps each prop value to a CSS selector suffix, or `null` to skip the variant |
| `contract` | `"omit"` \| `"keep"` | No | `"keep"` | Whether to include this prop in generated contracts |

## State classification guide

| Prop | Values | Recommended `contract` | Rationale |
|------|--------|----------------------|-----------|
| `state` | `hover`, `pressed`, `active` | `omit` | Browser pseudo-classes — not consumer props |
| `disabled` | `true` | `keep` | Consumer sets it; maps to `:disabled` / `aria-disabled` |
| `focused` | `true` | `omit` | Browser-driven — `:focus-within` fires automatically |
| `readOnly` | `true` | `keep` | Consumer sets it; maps to `[readonly]` / `aria-readonly` |
| `validation` | `invalid` | `keep` | Consumer controls validation state |
| `expanded` | `true` | `keep` | Consumer controls open/closed |

Run [`specs transform css`](/specs/cli/commands/transform/) to regenerate stylesheets after updating this config. Absence of `processing.states` is safe — all variant props continue to emit as `data-*` selectors.

## Path

`config.processing.states`

## See Also

- [`css` transformer](/specs/cli/transforms/css/) — CSS output affected by this classification
- [`contract` transformer](/specs/cli/transforms/contract/) — Props interface affected by `contract: omit`
- [`subcomponents`](/specs/config/subcomponents/) — another presence-driven `processing` option
