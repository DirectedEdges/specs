---
title: "css"
description: "Emit a CSS file with custom property rules per component element"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a `styles.css` file for each component. Each anatomy element becomes a CSS selector; token references become `var(--)` declarations; variant props become `[data-*]` attribute selectors. Boolean props use presence selectors (`[data-prop]`); string-valued props use value selectors (`[data-prop="value"]`).

## Use When

- You want a baseline stylesheet that mirrors the component's Figma token application.
- You want to wire up tokens in CSS without manually translating spec values.
- You want attribute-scoped variant overrides that align with your component's data attributes.

## Invocation

```bash
specs transform css
```

## Output

Each component subfolder receives a `styles.css` file. When subcomponents are present, each also receives a `styles.css` inside its own named subfolder — see [Subcomponent Output](#subcomponent-output) below.

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

No transformer-specific options. Token format comes from `config.format.tokens`. Selector strategy for variant props comes from [`config.processing.states`](/specs/config/states/).

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

## Subcomponent Output

When subcomponents are present in `variants.yaml`, each subcomponent gets its own `styles.css` inside a named subfolder. The subfolder name is the subcomponent's key in the spec (e.g. `group`, `item`). The BEM root class is scoped to the subcomponent's kebab-cased key, not the parent component.

```
dsActionList/
  styles.css          ← parent component stylesheet (.ds-action-list)
  group/
    styles.css        ← subcomponent stylesheet (.ds-action-list-group)
  item/
    styles.css        ← subcomponent stylesheet (.ds-action-list-item)
```

The subcomponent `styles.css` follows the same structure as the parent — default element blocks first, then variant blocks — but scoped entirely to the subcomponent class:

```css
/* Generated. Do not edit — regenerate with `specs transform`. */

.ds-action-list-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.ds-action-list-group__label {
  color: var(--color-text-secondary);
  font: var(--font-label-xs);
}

/* Variant: divider */

.ds-action-list-group[data-divider] {
  border-top: 1px solid var(--color-border-subtle);
}
```

Subcomponent stylesheets are fully self-contained — elements and variants from the parent component never appear in them. Configure subcomponent discovery in [`config.processing.subcomponents`](/specs/config/subcomponents/).

## See Also

- [Transforms overview](/specs/cli/transforms/)
- [`processing.states` config](/specs/config/states/) — classify variant props as semantic states
- [`contract` transformer](/specs/cli/transforms/contract/)
- [`styling` transformer](/specs/cli/transforms/styling/)
- [tokens config](/specs/config/tokens/)
