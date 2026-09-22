---
title: "styles"
description: "The stylesheet the scaffold imports: one rule per anatomy element, variant selectors, token vars"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The component's baseline stylesheet, derived from what Figma applied: a rule per anatomy element, token references as `var(--)`, and a selector per variant. React emits one file, `styles.css`. Web Components emits two — `host.css` and `light.css` — because a shadow boundary means one file cannot do both jobs.

## Shape

```css
/* Generated. Do not edit — regenerate with `specs react`. */

@layer specs {

.alert, .alert * {
  box-sizing: border-box;
}

.alert {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface-neutral);
  border-radius: var(--radius-lg);
}

.alert__icon {
  flex-shrink: 0;
  width: var(--size-icon-md);
  height: var(--size-icon-md);
  fill: var(--color-icon-neutral);
}

/* Variant: severity */

.alert[data-severity="warning"] {
  background: var(--color-surface-warning);
}

.alert[data-severity="warning"] .alert__icon {
  fill: var(--color-icon-warning);
}

/* Compound variant: severity + dismissible */

.alert[data-severity="error"][data-dismissible] .alert__icon {
  fill: var(--color-icon-error-strong);
}

}
```

| Emitted | Rule |
|---|---|
| `.component` | The root, the component's key kebab-cased |
| `.component__element` | A child, BEM-suffixed with its anatomy name |
| `[data-prop]` | A boolean variant prop — presence, not value |
| `[data-prop="value"]` | An enum variant prop, prop name kebabized |
| `[data-a][data-b]` | A compound variant, for intersection overrides |
| `@layer specs { … }` | Everything, so a consumer's unlayered CSS wins without a specificity fight |

The `data-*` attributes here are exactly what the [scaffold](/code/scaffold/) writes on the root.

## The Web Components split

`host.css` styles the element itself and its shadow-root children — the same content as the React sheet, with `:host` in place of the root class.

```css
:host, :host * { box-sizing: border-box; }

:host {
  display: flex;
  flex-direction: row;
  gap: var(--space-2);
}

.alert__icon { … }
```

`light.css` styles content a consumer slots in, which the shadow root cannot reach. It selects the tag from the light DOM instead of `:host`, and it is a plain import, not part of the element's adopted styles.

```css
ui-alert, ui-alert * { box-sizing: border-box; }
```

The split is not a preference. A single file would silently fail on whichever side it was not written for.

## Token resolution

Token references become `var(--)` names according to `spec.tokens` in `config/settings.yaml`.

| Format | Resolution |
|---|---|
| `TOKEN` / `TOKEN_NAME` / `FIGMA_NAME` / `TOKEN_FIGMA_EXTENSIONS` | Path-derived kebab variable: `Color/Surface/Neutral` → `var(--color-surface-neutral)` |
| `FIGMA_SYNTAX_WEB` | The spec value is already the CSS var name — used verbatim |
| `CUSTOM` | `$cssVar` when present, otherwise path derivation |
| `FIGMA_SYNTAX_IOS` / `FIGMA_SYNTAX_ANDROID` | Path derivation fallback |

What those names resolve *against* is [`cssvars.css`](/code/cssvars/). See the [tokens setting](/settings/tokens/).

## State selectors

With no [`states` convention](/settings/states/) configured, every variant prop produces a `[data-*]` selector. Configured, classified props emit the semantic pseudo-class or ARIA selector instead — `:hover`, `:disabled`, `[aria-invalid="true"]`.

When a `disabled` concept is configured, every `:hover` and `:active` selector is appended with `:not(:disabled):not([aria-disabled="true"])`, including compound selectors that mix a data attribute with one of them. Hover styles do not fire on a disabled control, with no extra CSS to write.

```css
.button:hover:not(:disabled):not([aria-disabled="true"]) { … }
.button[data-variant="primary"]:hover:not(:disabled):not([aria-disabled="true"]) { … }
```

Selectors that are not `:hover` or `:active` — `:focus-within`, `:disabled` itself — are never guarded.

## Structural fixes

Two adjustments come from comparing the default layout against every variant layout. Neither is configurable, because neither is a preference.

**Structurally-absent elements.** An element a variant includes but the default omits is hidden at the base and un-hidden under the variants that include it.

```css
.select__clear-icon { display: none; }
.select[data-clearable] .select__clear-icon { display: flex; }
```

**Stacking and containing blocks.** An absolutely-positioned element needs its layout parent to establish a containing block, or its offsets resolve against the viewport. That parent gets `position: relative`. So do the absolute element's non-absolute siblings — without it, the absolute element paints above them regardless of Figma layer order, since only positioned elements participate in DOM paint sequence.

```css
.badge__container { position: relative; } /* containing block for .badge__dot */
.badge__label     { position: relative; } /* keeps layer order vs. the absolute dot */
```

`position: relative` is added only when the element does not already declare its own `position`.

## Subcomponents

A subcomponent gets its own stylesheet in its own directory, scoped to its own key — `.checkbox-control`, not the parent's class. Parent elements and parent variants never appear in it, so the file is complete on its own and a subcomponent used elsewhere still styles correctly.

## See Also

- [cssvars](/code/cssvars/) — what these `var()` references resolve against
- [scaffold](/code/scaffold/) — where the class names and data attributes are written
- [`states` convention](/settings/states/) — classify variant props as semantic states
- [tokens setting](/settings/tokens/) — how token names are derived
