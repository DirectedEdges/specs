---
title: "States"
description: "Classify Figma variant props as browser-driven or consumer-controlled states for deterministic CSS and contract output"
---

`processing.states` classifies your library's Figma variant props as semantic states, enabling two downstream behaviors: the [`css` transformer](/specs/cli/transforms/css/) emits real CSS pseudo-classes and ARIA attribute selectors instead of `data-*` attributes for classified props, and the [`contract` transformer](/specs/cli/transforms/contract/) omits browser-driven props from generated Props interfaces.

Without this config, every variant prop emits as a `data-*` attribute selector and appears in the contract. With it, the classification is declared once and applied deterministically everywhere.

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

## Effect on CSS output

Without `states` config, all variant configuration props produce `data-*` attribute selectors:

```css
/* Without states config */
.ds-button[data-state="hover"] { … }
.ds-button[data-disabled="true"] { … }
```

With `states` config, classified props produce semantic selectors:

```css
/* With states config */
.ds-button:hover { … }
.ds-button:disabled,
.ds-button[aria-disabled="true"] { … }
```

Props not listed in `states` continue to emit as `data-*` attribute selectors. A `null` value means "this is the base/default state — skip variant output entirely" (the base block already covers it).

Comma-separated selector strings (e.g. `':disabled, [aria-disabled="true"]'`) expand into multiple parallel rules automatically.

## Effect on contract output

Props with `contract: omit` are excluded from generated Props interfaces. Browser-driven states like `hover` and `pressed` are never consumer props — the browser fires `:hover` and `:active` without the application setting anything. Omitting them produces a cleaner, more accurate interface.

Props with `contract: keep` (or no `contract` field) remain in the interface. The consumer sets these and the component implementation bridges them to the appropriate HTML attribute or ARIA attribute.

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
