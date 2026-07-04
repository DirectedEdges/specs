---
title: "css"
description: "Emit a CSS file with custom property rules per component element"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a `{Component}.styles.css` file for each component. Each anatomy element becomes a CSS selector; token references become `var(--)` declarations; variant props become `[data-*]` attribute selectors. Boolean props use presence selectors (`[data-prop]`); string-valued props use value selectors (`[data-prop="value"]`).

## Use When

- You want a baseline stylesheet that mirrors the component's Figma token application.
- You want to wire up tokens in CSS without manually translating spec values.
- You want attribute-scoped variant overrides that align with your component's data attributes.

## Invocation

```bash
specs transform css
```

## Output

Each component subfolder receives a `generated/{Component}.styles.css` file, PascalCase-prefixed with the component name (e.g. `generated/DsAlert.styles.css`). When subcomponents are present, each also receives a `generated/{Sub}.styles.css` inside its own named subfolder, prefixed with just the subcomponent's own name — see [Subcomponent Output](#subcomponent-output) below.

## Example Output

An Alert component with `severity` and `dismissible` variant props, and anatomy elements `root`, `icon`, and `body`:

```css
/* Generated. Do not edit — regenerate with `specs transform`. */

.ds-alert {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface-neutral);
  border-radius: var(--radius-lg);
}

.ds-alert__icon {
  flex-shrink: 0;
  width: var(--size-icon-md);
  height: var(--size-icon-md);
  fill: var(--color-icon-neutral);
}

.ds-alert__body {
  flex: 1;
  color: var(--color-text-primary);
  font: var(--font-body-sm);
}

/* Variant: severity */

.ds-alert[data-severity="warning"] {
  background: var(--color-surface-warning);
}

.ds-alert[data-severity="warning"] .ds-alert__icon {
  fill: var(--color-icon-warning);
}

.ds-alert[data-severity="error"] {
  background: var(--color-surface-error);
}

.ds-alert[data-severity="error"] .ds-alert__icon {
  fill: var(--color-icon-error);
}

/* Variant: dismissible */

.ds-alert[data-dismissible] {
  padding-inline-end: var(--space-10);
}

/* Compound variant: severity + dismissible */

.ds-alert[data-severity="error"][data-dismissible] .ds-alert__icon {
  fill: var(--color-icon-error-strong);
}
```

Root element selectors use the component's kebab-cased name. Child elements use the `__element` BEM suffix. Variants use `[data-propName]` presence selectors for boolean props and `[data-propName="value"]` value selectors for string enum props, with camelCase prop names kebabized. Compound selectors combine multiple variant attributes for intersection overrides.

## Token Resolution

Token references are resolved to CSS `var(--)` based on `config.format.tokens`:

| Format | Resolution |
|--------|------------|
| `TOKEN` / `TOKEN_NAME` / `FIGMA_NAME` / `TOKEN_FIGMA_EXTENSIONS` | Path-derived kebab variable: `Color/Surface/Neutral` → `var(--color-surface-neutral)` |
| `FIGMA_SYNTAX_WEB` | Spec value is already the CSS var name — used verbatim |
| `CUSTOM` | Uses `$cssVar` field if present, otherwise path derivation |
| `FIGMA_SYNTAX_IOS` / `FIGMA_SYNTAX_ANDROID` | Path derivation fallback |

## Config

No transformer-specific options. Token format comes from `config.format.tokens`. Selector strategy for variant props comes from [`config.processing.states`](/specs/settings/states/).

```yaml
config:
  format:
    tokens: TOKEN        # controls how token vars are named
  processing:
    states:              # optional — omit to keep data-* attribute selectors
      hover:
        prop: state
        value: hover
      disabled:
        prop: isDisabled
  transformers:
    - name: css
```

When `processing.states` is absent, all variant props produce `[data-*]` selectors (the default shown in the example above). When present, classified props emit semantic CSS pseudo-classes and ARIA attribute selectors instead.

### Disabled guard on hover and active

When the `disabled` concept is configured in `processing.states`, the transformer automatically appends `:not(:disabled):not([aria-disabled="true"])` to every `:hover` and `:active` selector — including compound variants that mix a data attribute with `:hover` or `:active`. This prevents hover and active styles from firing on disabled elements without any extra CSS to write.

```css
/* disabled concept configured → hover and active are guarded */
.ds-button:hover:not(:disabled):not([aria-disabled="true"]) { … }
.ds-button:active:not(:disabled):not([aria-disabled="true"]) { … }

/* data attribute + :hover compound variant also receives the guard */
.ds-button[data-variant="primary"]:hover:not(:disabled):not([aria-disabled="true"]) { … }
```

Selectors that are not `:hover` or `:active` (e.g. `:focus-within`, `:disabled` itself) are never guarded.

## Structural Presence and Stacking

Two structural adjustments are derived from comparing the default layout against every variant layout — no configuration needed.

**Structurally-absent elements.** When a variant's layout includes an element the default layout omits, that element is hidden at the base (`display: none`) and un-hidden only under the variant selector(s) that include it:

```css
.ds-select__clear-icon {
  display: none;
}

.ds-select[data-clearable] .ds-select__clear-icon {
  display: flex;
}
```

**Stacking and containing blocks.** Any element with `position: ABSOLUTE` in the spec needs its layout parent to establish a containing block, or `inset`/offset values resolve against the viewport instead. The transformer adds `position: relative` to that parent automatically. Non-absolute siblings of the absolute element also get `position: relative` — without it, the absolutely-positioned element paints above them regardless of Figma layer order, since only positioned elements participate in stacking order in DOM paint sequence:

```css
.ds-badge__container {
  position: relative; /* containing block for .ds-badge__dot */
}

.ds-badge__label {
  position: relative; /* keeps layer order vs. the absolute dot */
}
```

`position: relative` is only added when the element doesn't already declare its own `position` value.

## Subcomponent Output

When subcomponents are present in `variants.yaml`, each subcomponent gets its own `{Sub}.styles.css` inside a named subfolder. The subfolder name is the subcomponent's key in the spec (e.g. `group`, `item`), and the filename prefix is just that subcomponent's own PascalCase name — the folder already disambiguates it from the parent. The BEM root class inside the file is scoped to the subcomponent's kebab-cased key, not the parent component.

```
dsActionList/
  generated/
    DsActionList.styles.css    ← parent component stylesheet (.ds-action-list)
  group/
    generated/
      Group.styles.css         ← subcomponent stylesheet (.group)
  item/
    generated/
      Item.styles.css          ← subcomponent stylesheet (.item)
```

The subcomponent stylesheet follows the same structure as the parent — default element blocks first, then variant blocks — but BEM selectors are scoped to the subcomponent's own kebab-cased key, not the parent component name:

```css
/* Generated. Do not edit — regenerate with `specs transform`. */

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.group__label {
  color: var(--color-text-secondary);
  font: var(--font-label-xs);
}

/* Variant: divider */

.group[data-divider] {
  border-top: 1px solid var(--color-border-subtle);
}
```

Subcomponent stylesheets are fully self-contained — elements and variants from the parent component never appear in them. Configure subcomponent discovery in [`config.processing.subcomponents`](/specs/settings/subcomponents/).

## See Also

- [Transforms overview](/specs/cli/transforms/)
- [`processing.states` config](/specs/settings/states/) — classify variant props as semantic states
- [`contract` transformer](/specs/cli/transforms/contract/)
- [`react` transformer](/specs/cli/transforms/react/) — imports this stylesheet into the generated and authored components
- [tokens config](/specs/settings/tokens/)
