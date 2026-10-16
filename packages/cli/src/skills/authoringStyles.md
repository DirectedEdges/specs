---
name: specs-cli.author.styles
description: The styles map for authoring specs — every style property by shape, exactly which accept a $token, how composite tokens relate to Figma text and effect styles, and where $binding and Conditional are legal. Load when authoring variants.yaml.
---
<!--
  Canonical skill emitted by `specs skills install` — overwritten on every
  refresh; do not edit in place. Local customizations belong in your own
  separate skill.
-->

# Authoring styles

**Prerequisite:** `specs-cli.author.primer`.

Styles live per element, in `variants.yaml`: fully on every element under `default.elements.<el>.styles`, and as deltas under `variants[].elements.<el>.styles`. The schema source of truth is `styles.schema.json#/definitions/Styles`; every property below names its definition there.

## The property map

Properties group by the shape of their value. A property not in this table does not exist — `Styles` rejects unknown keys.

| Group | Properties | Value shape |
|---|---|---|
| Numbers | `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `opacity`, `rotation`, `cornerSmoothing`, `maxLines` | number, `$token`, or null (`NumberStyleValue`) |
| Colors | `backgroundColor`, `textColor`, `fillColor`, `strokes` | `{r,g,b,a}` object, gradient, `$token`, or null (`ColorStyleValue`) |
| Sides | `padding`, `strokeWeight` | single value or `{top, end, bottom, start}`, each number or `$token` (`SidesStyleValue`) |
| Corners | `cornerRadius` | single value or `{topLeft, topRight, bottomRight, bottomLeft}`, each number or `$token` (`CornersStyleValue`) |
| Deep: typography | `typography` | `$token` (a named text style) **or** inline `Typography` — `fontFamily`, `fontSize`, `fontStyle`, `lineHeight`, `letterSpacing`, `textCase`, `textDecoration`, `paragraphSpacing`, … Inline members each accept `$token` |
| Deep: effects | `effects` | `$token` (a named effect style) or an effects array (`EffectsStyleValue`) — shadows, blurs |
| Deep: image | `backgroundImage` | `ImageValue` or `$token` (`ImageStyleValue`) |
| Booleans | `clipsContent`, `wrap`, `locked`, `itemReverseZIndex` | boolean, `$token`, or null (`BooleanStyleValue`) |
| Bindable boolean | `visible` | boolean, `$token`, `$binding`, or `Conditional` (`BooleanBindableStyleValue`) — the one style a prop may drive directly |
| Spacing | `itemSpacing` | number when uniform, `{horizontal, vertical}` when the gaps differ, or `$token` (`ItemSpacingStyleValue`) |
| Strings | `layoutSizingHorizontal`, `layoutSizingVertical`, `primaryAxisSizingMode`, `textAlignVertical`, `strokeAlign` | string or `$token` (`StringStyleValue` / `MixedStringStyleValue`) |
| Other | `strokeDashPattern`, `aspectRatio` | per their definitions; neither accepts `$token` |

## Structural properties are never token-bound

These carry layout structure, take only their enum (or null), and reject `$token` — the schema says "Structural property — not token-bindable" on each:

| Property | Values |
|---|---|
| `layoutMode` | `NONE`, `HORIZONTAL`, `VERTICAL` |
| `position` | `AUTO`, `ABSOLUTE` |
| `mainAxisAlignment` | `START`, `END`, `CENTER`, `SPACE_BETWEEN` |
| `crossAxisAlignment` | `START`, `END`, `CENTER`, `STRETCH`, `BASELINE` |
| `wrapAlignment` | `START`, `SPACE_BETWEEN` |
| `textAlignHorizontal` | `START`, `CENTER`, `END`, `JUSTIFY` (logical inline-axis directions) |
| `textOverflow` | `CLIP`, `ELLIPSIS` |
| Offsets: `top`, `start`, `end`, `bottom`, `centerHorizontalOffset`, `centerVerticalOffset` | number (with `position: ABSOLUTE`) |

## Tokens

A token reference is `{$token: "<path>", $type: "<type>"}`. Rules:

- **Copy the path exactly as the catalogue spells it.** Token path format is the library's, not yours — read names verbatim from `analysis/styling.byToken.yaml` (e.g. a library may use `Color/Primary`, slash-separated, where another uses dots). Common `$type` values: `color`, `dimension`, `typography`, `effect`.
- **The token must exist in the source library.** `specs validate` checks every `$token` against the render caches and errors on one the library does not have; a class it cannot check is stated in a note. A token you invented will not resolve on any platform.
- **Prefer a token wherever one exists.** A literal where the system has a token is a consistency defect, not a shortcut. Check how sibling components style the same property (`analysis/styling.byComponent.yaml`).
- **Composite tokens bind whole nodes.** `typography: {$token, $type: typography}` corresponds to a Figma *text style*; `effects: {$token, $type: effect}` to a Figma *effect style*. Use the composite when the library has a named style; go inline only when it does not.

## Bindings and conditionals in styles

- `$binding` in styles is legal **only on `visible`** — e.g. `visible: {$binding: '#/props/showIcon'}`. Prop-driven content and instance swaps bind on the element's `content` / `instanceOf`, not in styles.
- A `Conditional` resolves a value from a bound prop: `{if: {condition: …, then: …, else: …}}`. Reach for it only when a variant delta cannot express the difference — variants are the primary mechanism for "this prop value changes this style".

## Defaults and deltas

`default.elements.<el>.styles` carries the complete baseline for the element. A variant's `styles` carries only what that configuration changes — never restate the baseline. The resolved component is every matching variant layered onto the default in order, like a cascade.
