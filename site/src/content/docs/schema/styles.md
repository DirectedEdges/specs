---
title: "Styles"
description: "Style properties and value types"
tableOfContents: false
---

The `Styles` object holds visual properties for an element. Every property is optional. Which properties are evaluated depends on the element type. Source: [`packages/schema/types/Styles.ts`](https://github.com/DirectedEdges/specs/blob/main/packages/schema/types/Styles.ts).

| Property | Value type | Figma key (if different) |
|---|---|---|
| [`aspectRatio`](/schema/styles/aspect-ratio/) | `AspectRatioValue` | — |
| [`backgroundBlur`](/schema/effects/background-blur/) | `Blur` | *(via `effects`)* |
| [`backgroundColor`](/schema/styles/background-color/) | `ColorStyle` | `fills` <small>[ADR 009](https://github.com/DirectedEdges/specs/blob/main/adr/009-color-values.md)</small> |
| [`backgroundImage`](/schema/styles/background-image/) | `ImageValue`<br>`TokenReference` | `fills` (IMAGE) <small>[ADR 063](https://github.com/DirectedEdges/specs/blob/main/adr/063-image-content.md)</small> |
| [`bottom`](/schema/styles/bottom/) | `PositionOffset` | `y` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`centerHorizontalOffset`](/schema/styles/center-horizontal-offset/) | `PositionOffset` | `x` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`centerVerticalOffset`](/schema/styles/center-vertical-offset/) | `PositionOffset` | `y` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`clipsContent`](/schema/styles/clips-content/) | `Style` | — |
| [`cornerRadius`](/schema/styles/corner-radius/) | `Style`<br>`Corners` | — |
| [`cornerSmoothing`](/schema/styles/corner-smoothing/) | `Style` | — |
| [`crossAxisAlignment`](/schema/styles/cross-axis-alignment/) | `CrossAxisAlignment` | `counterAxisAlignItems` <small>[ADR 040](https://github.com/DirectedEdges/specs/blob/main/adr/040-layout-alignment.md)</small> |
| [`effects`](/schema/effects/) | `TokenReference`<br>`Effects` | — |
| [`end`](/schema/styles/end/) | `PositionOffset` | `x` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`fillColor`](/schema/styles/fill-color/) | `ColorStyle` | `fills` <small>[ADR 013](https://github.com/DirectedEdges/specs/blob/main/adr/013-icon-fillColor.md)</small> |
| [`fontFamily`](/schema/typography/font-family/) | `string`<br>`TokenReference` | *(via `typography`)* |
| [`fontSize`](/schema/typography/font-size/) | `number`<br>`TokenReference` | *(via `typography`)* |
| [`fontStyle`](/schema/typography/font-style/) | `string`<br>`TokenReference` | *(via `typography`)* |
| [`hangingList`](/schema/typography/hanging-list/) | `boolean` | *(via `typography`)* |
| [`hangingPunctuation`](/schema/typography/hanging-punctuation/) | `boolean` | *(via `typography`)* |
| [`height`](/schema/styles/height/) | `Style` | — |
| [`itemReverseZIndex`](/schema/styles/item-reverse-z-index/) | `Style` | — |
| [`itemSpacing`](/schema/styles/item-spacing/) | `Style`<br>`ItemSpacing` | — |
| [`layerBlur`](/schema/effects/layer-blur/) | `Blur` | *(via `effects`)* |
| [`layoutMode`](/schema/styles/layout-mode/) | `LayoutMode` | — |
| [`layoutSizingHorizontal`](/schema/styles/layout-sizing-horizontal/) | `Style` | — |
| [`layoutSizingVertical`](/schema/styles/layout-sizing-vertical/) | `Style` | — |
| [`leadingTrim`](/schema/typography/leading-trim/) | `string` | *(via `typography`)* |
| [`letterSpacing`](/schema/typography/letter-spacing/) | `number`<br>`TokenReference` | *(via `typography`)* |
| [`lineHeight`](/schema/typography/line-height/) | `number`<br>`string`<br>`TokenReference` | *(via `typography`)* |
| [`listSpacing`](/schema/typography/list-spacing/) | `number` | *(via `typography`)* |
| [`locked`](/schema/styles/locked/) | `Style` | — |
| [`mainAxisAlignment`](/schema/styles/main-axis-alignment/) | `MainAxisAlignment` | `primaryAxisAlignItems` <small>[ADR 040](https://github.com/DirectedEdges/specs/blob/main/adr/040-layout-alignment.md)</small> |
| [`maxHeight`](/schema/styles/max-height/) | `Style` | — |
| [`maxLines`](/schema/styles/max-lines/) | `Style` | — |
| [`maxWidth`](/schema/styles/max-width/) | `Style` | — |
| [`minHeight`](/schema/styles/min-height/) | `Style` | — |
| [`minWidth`](/schema/styles/min-width/) | `Style` | — |
| [`opacity`](/schema/styles/opacity/) | `Style` | — |
| [`padding`](/schema/styles/padding/) | `Style`<br>`Sides` | — |
| [`paragraphIndent`](/schema/typography/paragraph-indent/) | `number`<br>`TokenReference` | *(via `typography`)* |
| [`paragraphSpacing`](/schema/typography/paragraph-spacing/) | `number`<br>`TokenReference` | *(via `typography`)* |
| [`position`](/schema/styles/position/) | `Position` | `layoutPositioning` <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`primaryAxisSizingMode`](/schema/styles/primary-axis-sizing-mode/) | `Style` | — |
| [`rotation`](/schema/styles/rotation/) | `Style` | — |
| [`shadows`](/schema/effects/shadows/) | `Shadow[]` | *(via `effects`)* |
| [`start`](/schema/styles/start/) | `PositionOffset` | `x` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`strokeAlign`](/schema/styles/stroke-align/) | `Style` | — |
| [`strokeDashPattern`](/schema/styles/stroke-dash-pattern/) | `StrokeDashPattern` | `strokeDashes` <small>[ADR 059](https://github.com/DirectedEdges/specs/blob/main/adr/059-border-style.md)</small> |
| [`strokeWeight`](/schema/styles/stroke-weight/) | `Style`<br>`Sides` | — |
| [`strokes`](/schema/styles/strokes/) | `ColorStyle` | — |
| [`textAlignHorizontal`](/schema/styles/text-align-horizontal/) | `TextAlignHorizontal` | `textAlignHorizontal` (remapped) <small>[ADR 064](https://github.com/DirectedEdges/specs/blob/main/adr/064-text-align-horizontal.md)</small> |
| [`textAlignVertical`](/schema/styles/text-align-vertical/) | `Style` | — |
| [`textCase`](/schema/typography/text-case/) | `string` | *(via `typography`)* |
| [`textColor`](/schema/styles/text-color/) | `ColorStyle` | `fills` <small>[ADR 009](https://github.com/DirectedEdges/specs/blob/main/adr/009-color-values.md)</small> |
| [`textDecoration`](/schema/typography/text-decoration/) | `string` | *(via `typography`)* |
| [`textOverflow`](/schema/styles/text-overflow/) | `TextOverflow` | `textTruncation` (remapped) <small>[ADR 062](https://github.com/DirectedEdges/specs/blob/main/adr/062-text-truncation.md)</small> |
| [`top`](/schema/styles/top/) | `PositionOffset` | `y` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> |
| [`typography`](/schema/typography/) | `TokenReference`<br>`Typography` | — |
| [`visible`](/schema/styles/visible/) | `boolean`<br>`TokenReference`<br>`PropBinding`<br>`Conditional` | — |
| [`width`](/schema/styles/width/) | `Style` | — |
| [`wrap`](/schema/styles/wrap/) | `Style` | `layoutWrap` <small>[ADR 039](https://github.com/DirectedEdges/specs/blob/main/adr/039-wrap-alignment.md)</small> |
| [`wrapAlignment`](/schema/styles/wrap-alignment/) | `WrapAlignment` | `counterAxisAlignContent` <small>[ADR 039](https://github.com/DirectedEdges/specs/blob/main/adr/039-wrap-alignment.md)</small> |

Element-type applicability (`container`/`text`/`glyph`/`vectors`/`line`) moves to per-property pages once those exist.
