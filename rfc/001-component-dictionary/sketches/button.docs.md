# Button

> Comprehensive scripted reference. Every section below is a deterministic projection of `button.yaml` — no inference, no prose narrative. For a compact orientation, see [`button.md`](button.md). For definitive precision, see `button.yaml`.

## Overview

Button has 8 props, 7 anatomy elements, and 51 variant configurations. Includes 1 subcomponent.

**Variant axes.** `alignContent` (2 values), `size` (3 values), `state` (6 values), `variant` (4 values).

**Boolean toggles.** `counter`, `dropdown`.

## Anatomy

| Element | Type | Notes |
|---|---|---|
| root | container | — |
| search | instance | instanceOf: `search` |
| button | text | content `"Button"` |
| counterLabel | instance | instanceOf: `counterLabel` |
| trailingVisual | instance | instanceOf: `linkExternal` |
| dropdown | instance | instanceOf: `textCaret` |
| centered | container | detected in: variant=secondary, size=medium, state=rest, alignContent=start |

---

## API

### Properties

| Property | Type | Values | Default | Notes |
|---|---|---|---|---|
| `alignContent` | string | `center` \| `start` | center | — |
| `counter` | boolean | `true` \| `false` | `false` | — |
| `dropdown` | boolean | `true` \| `false` | `false` | — |
| `leadingVisual` | string | `search`, … | `null` | nullable; toggles `leadingVisual` visibility |
| `size` | string | `small` \| `medium` \| `large` | medium | — |
| `state` | string | `rest` \| `focus` \| `hover` \| `pressed` \| `disabled` \| `inactive` | rest | — |
| `trailingVisual` | string | `link-external`, … | `null` | nullable; toggles `trailingVisual` visibility |
| `variant` | string | `primary` \| `secondary` \| `danger` \| `invisible` | secondary | — |

---

## Subcomponents

### ButtonGroup

**Anatomy**

| Element | Type | Notes |
|---|---|---|
| root | container | — |
| firstButton | instance | instanceOf: `button` |
| button | instance | instanceOf: `button` |
| lastButton | instance | instanceOf: `button` |

**Properties**

| Property | Type | Values | Default |
|---|---|---|---|
| `2ndButton` | boolean | `true` \| `false` | `true` |
| `3rdButton` | boolean | `true` \| `false` | `false` |
| `4thButton` | boolean | `true` \| `false` | `false` |
| `5thButton` | boolean | `true` \| `false` | `false` |
| `size` | string | `medium` \| `small` | medium |
| `variant` | string | `secondary` \| `primary` \| `danger` | secondary |

**Default layout**

- root
  - firstButton
  - button
  - button
  - button
  - button
  - lastButton

---

## Layout

### Default Tree

- root
  - search
  - button
  - counterLabel
  - trailingVisual
  - dropdown

### Variant Tree Deltas

**alignContent=start**

- root
  - centered
    - search
    - button
    - counterLabel
    - trailingVisual
  - dropdown
    - dropdown

**variant=danger, state=pressed, alignContent=start**

- root
  - search
  - button
  - counterLabel
  - dropdown
    - dropdown
  - trailingVisual

_(plus 2 more 4-axis configurations restructuring root identically to alignContent=start)_

---

## Structure

### Dimensions & Spacing

| Element | Property | Value |
|---|---|---|
| root | cornerRadius | `functional/size/borderRadius/medium` |
| root | strokeWeight | `1` |
| root | padding | `pattern/size/control/medium/paddingBlock` × `pattern/size/control/medium/paddingInline/normal` |
| root | itemSpacing | `pattern/size/control/medium/gap` |
| search | width, height | `16` |
| counterLabel | height | `18` |
| trailingVisual | width, height | `16` |
| dropdown | width, height | `16` |
| centered | itemSpacing | `8` |

### Auto-Layout

| Element | Mode | Main Align | Cross Align | H Sizing | V Sizing |
|---|---|---|---|---|---|
| root | HORIZONTAL | CENTER | CENTER | HUG | HUG |
| button | — | — | — | HUG | HUG |
| counterLabel | — | — | — | HUG | — |
| centered | HORIZONTAL | — | CENTER | HUG | HUG |

### Typography

| Element | Typography | Text Color | Content |
|---|---|---|---|
| button | `Body/Medium Bold` | `mode/button/default/fgColor/rest` | `"Button"` |

---

## Color & Appearance

### Tokens by Element (Default)

| Element | Property | Value |
|---|---|---|
| root | backgroundColor | `mode/button/default/bgColor/rest` |
| root | strokes | `mode/button/default/borderColor/rest` |
| button | textColor | `mode/button/default/fgColor/rest` |

### Variant Color Deltas

| Variant | Element | Property | Value |
|---|---|---|---|
| state=focus | root | strokes | `mode/focus/outlineColor` |
| state=hover | root | backgroundColor | `mode/button/default/bgColor/hover` |
| state=hover | root | strokes | `mode/button/default/borderColor/hover` |
| state=pressed | root | backgroundColor | `mode/button/default/bgColor/active` |
| state=pressed | root | strokes | `mode/button/default/borderColor/hover` |
| state=disabled | root | strokes | `mode/button/default/borderColor/disabled` |
| state=disabled | button | textColor | `mode/fgColor/disabled` |
| state=inactive | root | backgroundColor | `mode/button/inactive/bgColor` |
| state=inactive | root | strokes | `null` |
| state=inactive | button | textColor | `mode/button/inactive/fgColor` |
| variant=primary | root | backgroundColor | `mode/button/primary/bgColor/rest` |
| variant=primary | root | strokes | `mode/button/primary/borderColor/rest` |
| variant=primary | button | textColor | `mode/button/primary/fgColor/rest` |
| variant=danger | root | strokes | `mode/button/danger/borderColor/rest` |
| variant=danger | button | textColor | `mode/button/danger/fgColor/rest` |
| variant=invisible | root | backgroundColor | `mode/button/invisible/bgColor/rest` |
| variant=invisible | root | strokes | `null` |
| variant=invisible | button | textColor | `mode/button/invisible/fgColor/rest` |

_(plus ~25 more two- and three-axis variant color deltas across primary/danger/invisible × hover/pressed/disabled/inactive)_

### Effects (Default)

| Element | Effects | Opacity |
|---|---|---|
| root | `_component/button/default/shadow/resting` | 1.0 |

### Variant Effects Deltas

| Variant | Element | Effects |
|---|---|---|
| state=focus | root | `null` |
| state=hover | root | `shadow/resting/small` |
| state=pressed | root | `shadow/inset` |
| state=disabled | root | `null` |
| state=inactive | root | `null` |
| variant=invisible | root | `null` |
| variant=primary, state=focus | root | `_component/button/primary/shadow/selected` |
| variant=primary, state=pressed | root | `_component/button/primary/shadow/selected` |
| variant=danger, state=pressed | root | `_component/button/danger/shadow/selected` |
| variant=danger, state=disabled | root | `_component/button/default/shadow/resting` |

---

## Conditional Logic

- **search** (`styles.visible`): `false` if `leadingVisual == null` else `true`
- **search** (`instanceOf`): bound to `leadingVisual`
- **counterLabel** (`styles.visible`): bound to `counter`
- **trailingVisual** (`styles.visible`): `false` if `trailingVisual == null` else `true`
- **trailingVisual** (`instanceOf`): bound to `trailingVisual`
- **dropdown** (`styles.visible`): bound to `dropdown`

---

## Token Index

### color

| Token | Used by |
|---|---|
| `mode/button/default/borderColor/rest` | root (default) |
| `mode/button/default/bgColor/rest` | root (default) |
| `mode/button/default/fgColor/rest` | button (default) |
| `mode/focus/outlineColor` | root (state=focus, variant=primary+focus, variant=danger+focus, variant=invisible+focus) |
| `mode/button/default/borderColor/hover` | root (state=hover, state=pressed) |
| `mode/button/default/bgColor/hover` | root (state=hover) |
| `mode/button/default/bgColor/active` | root (state=pressed) |
| `mode/button/default/borderColor/disabled` | root (state=disabled) |
| `mode/fgColor/disabled` | button (state=disabled) |
| `mode/button/inactive/bgColor` | root (state=inactive, variant=primary+inactive, variant=invisible+inactive) |
| `mode/button/inactive/fgColor` | button (state=inactive across variants) |
| `mode/button/primary/borderColor/rest` | root (variant=primary) |
| `mode/button/primary/bgColor/rest` | root (variant=primary) |
| `mode/button/primary/fgColor/rest` | button (variant=primary) |

_(plus ~20 more color tokens covering primary/danger/invisible state combinations)_

### dimension

| Token | Used by |
|---|---|
| `functional/size/borderRadius/medium` | root (default + 16 focus and small/large state configurations) |
| `pattern/size/control/medium/gap` | root (default) |
| `pattern/size/control/medium/paddingBlock` | root (default) |
| `pattern/size/control/medium/paddingInline/normal` | root (default) |
| `pattern/size/control/small/gap` | root (size=small) |
| `pattern/size/control/small/paddingBlock` | root (size=small) |
| `pattern/size/control/small/paddingInline/condensed` | root (size=small) |
| `pattern/size/control/large/gap` | root (size=large) |
| `pattern/size/control/large/paddingBlock` | root (size=large) |
| `pattern/size/control/large/paddingInline/spacious` | root (size=large) |

### effects

| Token | Used by |
|---|---|
| `_component/button/default/shadow/resting` | root (default), root (variant=danger, state=disabled) |
| `shadow/resting/small` | root (state=hover) |
| `shadow/inset` | root (state=pressed) |
| `_component/button/primary/shadow/selected` | root (variant=primary, state=focus / state=pressed) |
| `_component/button/danger/shadow/selected` | root (variant=danger, state=pressed) |

### typography

| Token | Used by |
|---|---|
| `Body/Medium Bold` | button (default) |
| `Body/Small Bold` | button (size=small) |

---

## Provenance

- **Component:** Button
- **Author:** Nathan Curtis
- **Last updated:** 2026-04-24
- **Schema:** v0.18.0
- **Source node:** `30258:5582` (COMPONENT_SET)
- **Page ID:** `136:1805`
- **Generator config:** details: LAYERED, variantDepth: 9999, keys: CAMEL, layout: LAYOUT, tokens: TOKEN
