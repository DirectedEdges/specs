---
title: "css"
description: "Emit a CSS file with custom property rules per component element"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a `styles.css` file for each component. Each anatomy element becomes a CSS selector; token references become `var(--)` declarations; variant props become `[data-*]` attribute selectors.

## Use When

- You want a baseline stylesheet that mirrors the component's Figma token application.
- You want to wire up tokens in CSS without manually translating spec values.
- You want attribute-scoped variant overrides that align with your component's data attributes.

## Invocation

```bash
specs transform css
```

## Output

Each component subfolder receives a `styles.css` file.

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

.ds-alert[data-dismissible="true"] {
  padding-inline-end: var(--space-10);
}

/* Compound variant: severity + dismissible */

.ds-alert[data-severity="error"][data-dismissible="true"] .ds-alert__icon {
  fill: var(--color-icon-error-strong);
}
```

Root element selectors use the component's kebab-cased name. Child elements use the `__element` BEM suffix. Variants use `[data-propName="value"]` attribute selectors, with camelCase prop names kebabized. Compound selectors combine multiple variant attributes for intersection overrides.

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

## See Also

- [Transforms overview](/specs/cli/transforms/)
- [`processing.states` config](/specs/config/states/) — classify variant props as semantic states
- [`contract` transformer](/specs/cli/transforms/contract/)
- [`styling` transformer](/specs/cli/transforms/styling/)
- [tokens config](/specs/config/tokens/)
