# Button

> Structural index. Start here; reference `button.yaml` for definitive decisions on any styling, token, dimension, or per-variant value. The comprehensive scripted reference is in [`button.docs.md`](button.docs.md).

## Props

| Prop | Type | Default | Values |
|---|---|---|---|
| variant | enum | `secondary` | primary, secondary, danger, invisible |
| size | enum | `medium` | small, medium, large |
| state | enum | `rest` | rest, focus, hover, pressed, disabled, inactive |
| alignContent | enum | `center` | center, start |
| counter | boolean | `false` | true, false |
| dropdown | boolean | `false` | true, false |
| leadingVisual | string \| null | `null` | e.g. `search` |
| trailingVisual | string \| null | `null` | e.g. `link-external` |

## Anatomy

| Element | Type | instanceOf | Visibility / notes |
|---|---|---|---|
| root | container | — | — |
| search | instance | `search` | when `leadingVisual != null` |
| button | text | — | content `"Button"` |
| counterLabel | instance | `counterLabel` | when `counter` |
| trailingVisual | instance | `linkExternal` | when `trailingVisual != null` |
| dropdown | instance | `textCaret` | when `dropdown` |
| centered | container | — | detected: variant=secondary, size=medium, state=rest, alignContent=start |

## Default Layout

- root
  - search
  - button
  - counterLabel
  - trailingVisual
  - dropdown

## Layout Deltas

### alignContent=start

- root
  - centered
    - search
    - button
    - counterLabel
    - trailingVisual
  - dropdown
    - dropdown

### variant=danger, state=pressed, alignContent=start

- root
  - search
  - button
  - counterLabel
  - dropdown
    - dropdown
  - trailingVisual

_(variant=danger, size={small,large}, state=pressed, alignContent=start: same shape as alignContent=start.)_

## Typography

Default value per text element. `**` marks elements whose value varies by variant — load `button.yaml` for the full set.

| Element | Property | Default value |
|---|---|---|
| button | typography | `Body/Medium Bold` ** |
| button | textColor | `mode/button/default/fgColor/rest` ** |

## Bindings

- `search.visible` ← `leadingVisual != null`
- `search.instanceOf` ← `leadingVisual`
- `counterLabel.visible` ← `counter`
- `trailingVisual.visible` ← `trailingVisual != null`
- `trailingVisual.instanceOf` ← `trailingVisual`
- `dropdown.visible` ← `dropdown`

## Invalid Combinations

None.

## Subcomponents

- **ButtonGroup** — composes 2–5 Button instances. Props: `2ndButton`–`5thButton` (boolean), `size`, `variant`. See [`buttongroup.md`](buttongroup.md).

## Provenance

schema 0.18.0 · author Nathan Curtis · 2026-04-24 · node 30258:5582

---

Definitive decisions live in `button.yaml`: exact token paths, dimensions, per-variant color values, padding, typography, effects.
