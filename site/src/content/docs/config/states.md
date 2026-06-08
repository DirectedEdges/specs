---
title: "States"
description: "Classify Figma variant props as browser-driven or consumer-controlled states for deterministic CSS and contract output"
---

`processing.states` classifies your library's Figma variant props as semantic states, enabling two downstream behaviors:

- The [`css` transformer](/specs/cli/transforms/css/) emits real CSS pseudo-classes and ARIA attribute selectors instead of `data-*` attributes for classified props.
- The [`contract` transformer](/specs/cli/transforms/contract/) omits browser-driven props from generated Props interfaces.

Declare the classification once and both transforms apply it consistently.

## How it works

The same config drives both CSS and contract output — classify a prop once, and both transforms apply it consistently.

### Props from Figma

These props are typical outputs from `specs generate` — the raw Figma variant structure before any state classification is applied:

```yaml
props:
  state:
    type: string
    default: rest
    enum:
      - rest
      - hover
      - pressed    # cross-platform name; maps to :active on web
  isDisabled:      # library uses "is" prefix convention
    type: boolean
    default: false
  focused:
    type: boolean
    default: false
```

`processing.states` acts on these props during `specs transform` — to determine CSS selector strategy and contract inclusion. The `api.yaml` itself is not modified.

### State concepts

Each concept resolves to a canonical CSS selector and determines whether the prop is included in or omitted from the generated Props interface.

| Concept | CSS selector(s) | Contract |
|---------|----------------|----------|
| `hover` | `:hover` | omitted |
| `active` | `:active` | omitted |
| `focus` | `:focus-visible` | omitted |
| `focus-visible` | `:focus-visible` | omitted |
| `focus-within` | `:focus-within` | omitted |
| `placeholder-shown` | `:placeholder-shown` | omitted |
| `disabled` | `:disabled, [aria-disabled="true"]` | included |
| `readonly` | `[readonly], [aria-readonly="true"]` | included |
| `required` | `[required], [aria-required="true"]` | included |
| `invalid` | `[aria-invalid="true"]` | included |
| `valid` | `[aria-invalid="false"]` | included |
| `selected` | `[aria-selected="true"]` | included |
| `checked` | `:checked, [aria-checked="true"]` | included |
| `indeterminate` | `:indeterminate, [aria-checked="mixed"]` | included |
| `expanded` | `[aria-expanded="true"]` | included |
| `collapsed` | `[aria-expanded="false"]` | included |
| `pressed` | `[aria-pressed="true"]` | included |
| `busy` | `[aria-busy="true"]` | included |
| `current` | `[aria-current="true"]` | included |

### Mapping Props to Concepts

Declare mappings under `processing.states` in your [specs configuration](/config/). Use `prop` to name the Figma variant prop and `value` for the specific enum value that activates the concept.

```yaml title="Partial specs.config.yaml"
config:
  processing:
    states:
      active:
        prop: state
        # Figma value "pressed" → active concept → :active on web
        value: pressed
      disabled:
        # "is" prefix convention → disabled concept → :disabled / aria-disabled
        prop: isDisabled
```

Figma naming conventions don't need to match the concept name. Many design systems name their pointer-down state `pressed` rather than `active` because `pressed` is platform-neutral — it maps to `:active` on web, `UIControlState.highlighted` on iOS, and press `Indication` in Compose. Naming it `active` in Figma would embed a web-specific term into a shared design language. Similarly, a library using `isDisabled` as its boolean prop convention is still expressing the `disabled` concept.

:::tip Setting up for the first time?
Run the [**CSS States Setup** skill](https://github.com/DirectedEdges/specs/blob/main/packages/cli/src/transforms/Css.states-setup.md) in Claude Code — it scans your specs output directory, matches variant props against the concept table, and proposes a ready-to-paste `processing.states` block.
:::

### CSS transform

Without `states` config, all variant props produce `data-*` attribute selectors:

```css
/* Without states config */
.ds-text-input[data-state="hover"] { … }
.ds-text-input[data-is-disabled] { … }       /* boolean prop → presence selector */
.ds-text-input[data-focused] { … }            /* boolean prop → presence selector */
```

With `states` config, classified props produce semantic selectors:

```css
/* With states config — disabled concept configured */
.ds-text-input:hover:not(:disabled):not([aria-disabled="true"]) { … }
.ds-text-input:disabled,
.ds-text-input[aria-disabled="true"] { … }
.ds-text-input:focus-within { … }
```

Props not listed in `states` continue to emit as `data-*` attribute selectors. Unmatched values on a classified prop (e.g. the `rest` default on a `state` prop) are treated as the base state and skipped — the base block already covers them.

### Contract transform

Browser-driven concepts (`hover`, `active`, `focus`, `focus-within`, etc.) are omitted from generated Props interfaces — the browser fires these without the application setting anything. Consumer-controlled concepts (`disabled`, `readOnly`, `validation`, etc.) are included — the consumer sets them and the component bridges them to the appropriate HTML or ARIA attribute.

```typescript
// state and focused omitted — browser-driven, never set by consumers
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
      # Concept key → { prop, value?, contract? }
      # value: the Figma variant value that activates this concept (defaults to "true" for booleans)
      # contract: rarely needed — derived from the concept
      hover:
        prop: state
        value: hover
      active:
        prop: state
        value: pressed       # Figma uses cross-platform name "pressed"; concept maps to :active
      focus-within:
        prop: focused        # boolean prop; value defaults to "true"
      disabled:
        prop: isDisabled     # library uses "is" prefix convention
      readonly:
        prop: readOnly
      invalid:
        prop: validation
        value: invalid       # only one enum value maps to this concept
      expanded:
        prop: expanded
```

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `prop` | `string` | Yes | — | Figma variant prop name (e.g. `state`, `disabled`, `readOnly`) |
| `value` | `string` | No | `"true"` | Figma enum value that activates this concept. Omit for boolean props. |
| `contract` | `"omit"` \| `"keep"` | No | concept default | Override the concept's default contract behavior. Rarely needed. |


Run [`specs transform css`](/specs/cli/commands/transform/) to regenerate stylesheets after updating this config. Absence of `processing.states` is safe — all variant props continue to emit as `data-*` selectors.

## Path

`config.processing.states`

## See Also

- [`css` transformer](/specs/cli/transforms/css/) — CSS output affected by this classification
- [`contract` transformer](/specs/cli/transforms/contract/) — Props interface affected by `contract: omit`
- [`subcomponents`](/specs/config/subcomponents/) — another presence-driven `processing` option
