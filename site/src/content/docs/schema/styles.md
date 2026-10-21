---
title: "Styles"
description: "Style properties and value types"
tableOfContents: false
---

The `Styles` object holds visual properties for an element. Every property is optional. Which properties are evaluated depends on the element type. Source: [`packages/schema/types/Styles.ts`](https://github.com/DirectedEdges/specs/blob/main/packages/schema/types/Styles.ts).

The Default column is the value a property is treated as having when absent — the value the Figma → spec transform diffs against to decide whether to omit it from output. `—` means the property has no transform-level default (effects properties, and `effects`/`typography` themselves resolve through their own nested defaults).

| Property | Value type | Figma key (if different) | Default |
|---|---|---|---|
| [`aspectRatio`](/schema/styles/aspect-ratio/) | `AspectRatioValue` | — | `null` |
| [`backgroundBlur`](/schema/effects/background-blur/) | `Blur` | *(via `effects`)* | — |
| [`backgroundColor`](/schema/styles/background-color/) | `ColorStyle` | `fills` <small>[ADR 009](https://github.com/DirectedEdges/specs/blob/main/adr/009-color-values.md)</small> | `null` |
| [`backgroundImage`](/schema/styles/background-image/) | `ImageValue`<br>`TokenReference` | `fills` (IMAGE) <small>[ADR 063](https://github.com/DirectedEdges/specs/blob/main/adr/063-image-content.md)</small> | `null` |
| [`bottom`](/schema/styles/bottom/) | `PositionOffset` | `y` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `null` |
| [`centerHorizontalOffset`](/schema/styles/center-horizontal-offset/) | `PositionOffset` | `x` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `null` |
| [`centerVerticalOffset`](/schema/styles/center-vertical-offset/) | `PositionOffset` | `y` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `null` |
| [`clipsContent`](/schema/styles/clips-content/) | `Style` | — | `false` |
| [`cornerRadius`](/schema/styles/corner-radius/) | `Style`<br>`Corners` | — | `0` |
| [`cornerSmoothing`](/schema/styles/corner-smoothing/) | `Style` | — | `0` |
| [`crossAxisAlignment`](/schema/styles/cross-axis-alignment/) | `CrossAxisAlignment` | `counterAxisAlignItems` <small>[ADR 040](https://github.com/DirectedEdges/specs/blob/main/adr/040-layout-alignment.md)</small> | `"START"` |
| [`effects`](/schema/effects/) | `TokenReference`<br>`Effects` | — | `null` |
| [`end`](/schema/styles/end/) | `PositionOffset` | `x` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `null` |
| [`fillColor`](/schema/styles/fill-color/) | `ColorStyle` | `fills` <small>[ADR 013](https://github.com/DirectedEdges/specs/blob/main/adr/013-icon-fillColor.md)</small> | `null` |
| [`fontFamily`](/schema/typography/font-family/) | `string`<br>`TokenReference` | *(via `typography`)* | `null` |
| [`fontSize`](/schema/typography/font-size/) | `number`<br>`TokenReference` | *(via `typography`)* | `16` |
| [`fontStyle`](/schema/typography/font-style/) | `string`<br>`TokenReference` | *(via `typography`)* | `null` |
| [`hangingList`](/schema/typography/hanging-list/) | `boolean` | *(via `typography`)* | `false` |
| [`hangingPunctuation`](/schema/typography/hanging-punctuation/) | `boolean` | *(via `typography`)* | `false` |
| [`height`](/schema/styles/height/) | `Style` | — | `0` |
| [`itemReverseZIndex`](/schema/styles/item-reverse-z-index/) | `Style` | — | `false` |
| [`itemSpacing`](/schema/styles/item-spacing/) | `Style`<br>`ItemSpacing` | — | `0` |
| [`layerBlur`](/schema/effects/layer-blur/) | `Blur` | *(via `effects`)* | — |
| [`layoutMode`](/schema/styles/layout-mode/) | `LayoutMode` | — | `"NONE"` |
| [`layoutSizingHorizontal`](/schema/styles/layout-sizing-horizontal/) | `Style` | — | `"FIXED"` |
| [`layoutSizingVertical`](/schema/styles/layout-sizing-vertical/) | `Style` | — | `"FIXED"` |
| [`leadingTrim`](/schema/typography/leading-trim/) | `string` | *(via `typography`)* | `"NONE"` |
| [`letterSpacing`](/schema/typography/letter-spacing/) | `number`<br>`TokenReference` | *(via `typography`)* | `0` |
| [`lineHeight`](/schema/typography/line-height/) | `number`<br>`string`<br>`TokenReference` | *(via `typography`)* | `"AUTO"` |
| [`listSpacing`](/schema/typography/list-spacing/) | `number` | *(via `typography`)* | `0` |
| [`locked`](/schema/styles/locked/) | `Style` | — | `false` |
| [`mainAxisAlignment`](/schema/styles/main-axis-alignment/) | `MainAxisAlignment` | `primaryAxisAlignItems` <small>[ADR 040](https://github.com/DirectedEdges/specs/blob/main/adr/040-layout-alignment.md)</small> | `"START"` |
| [`maxHeight`](/schema/styles/max-height/) | `Style` | — | `null` |
| [`maxLines`](/schema/styles/max-lines/) | `Style` | — | `null` |
| [`maxWidth`](/schema/styles/max-width/) | `Style` | — | `null` |
| [`minHeight`](/schema/styles/min-height/) | `Style` | — | `0` |
| [`minWidth`](/schema/styles/min-width/) | `Style` | — | `0` |
| [`opacity`](/schema/styles/opacity/) | `Style` | — | `1` |
| [`padding`](/schema/styles/padding/) | `Style`<br>`Sides` | — | `0` |
| [`paragraphIndent`](/schema/typography/paragraph-indent/) | `number`<br>`TokenReference` | *(via `typography`)* | `0` |
| [`paragraphSpacing`](/schema/typography/paragraph-spacing/) | `number`<br>`TokenReference` | *(via `typography`)* | `0` |
| [`position`](/schema/styles/position/) | `Position` | `layoutPositioning` <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `"AUTO"` |
| [`primaryAxisSizingMode`](/schema/styles/primary-axis-sizing-mode/) | `Style` | — | `"AUTO"` |
| [`rotation`](/schema/styles/rotation/) | `Style` | — | `0` |
| [`shadows`](/schema/effects/shadows/) | `Shadow[]` | *(via `effects`)* | — |
| [`start`](/schema/styles/start/) | `PositionOffset` | `x` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `null` |
| [`strokeAlign`](/schema/styles/stroke-align/) | `Style` | — | `"INSIDE"` |
| [`strokeDashPattern`](/schema/styles/stroke-dash-pattern/) | `StrokeDashPattern` | `strokeDashes` <small>[ADR 059](https://github.com/DirectedEdges/specs/blob/main/adr/059-border-style.md)</small> | `null` |
| [`strokeWeight`](/schema/styles/stroke-weight/) | `Style`<br>`Sides` | — | `0` |
| [`strokes`](/schema/styles/strokes/) | `ColorStyle` | — | `null` |
| [`textAlignHorizontal`](/schema/styles/text-align-horizontal/) | `TextAlignHorizontal` | `textAlignHorizontal` (remapped) <small>[ADR 064](https://github.com/DirectedEdges/specs/blob/main/adr/064-text-align-horizontal.md)</small> | `"START"` |
| [`textAlignVertical`](/schema/styles/text-align-vertical/) | `Style` | — | `"TOP"` |
| [`textCase`](/schema/typography/text-case/) | `string` | *(via `typography`)* | `"ORIGINAL"` |
| [`textColor`](/schema/styles/text-color/) | `ColorStyle` | `fills` <small>[ADR 009](https://github.com/DirectedEdges/specs/blob/main/adr/009-color-values.md)</small> | `null` |
| [`textDecoration`](/schema/typography/text-decoration/) | `string` | *(via `typography`)* | `"NONE"` |
| [`textOverflow`](/schema/styles/text-overflow/) | `TextOverflow` | `textTruncation` (remapped) <small>[ADR 062](https://github.com/DirectedEdges/specs/blob/main/adr/062-text-truncation.md)</small> | `"CLIP"` |
| [`top`](/schema/styles/top/) | `PositionOffset` | `y` and constraints <small>[ADR 041](https://github.com/DirectedEdges/specs/blob/main/adr/041-layout-positioning.md)</small> | `null` |
| [`typography`](/schema/typography/) | `TokenReference`<br>`Typography` | — | `null` |
| [`visible`](/schema/styles/visible/) | `boolean`<br>`TokenReference`<br>`PropBinding`<br>`Conditional` | — | `true` |
| [`width`](/schema/styles/width/) | `Style` | — | `0` |
| [`wrap`](/schema/styles/wrap/) | `Style` | `layoutWrap` <small>[ADR 039](https://github.com/DirectedEdges/specs/blob/main/adr/039-wrap-alignment.md)</small> | `false` |
| [`wrapAlignment`](/schema/styles/wrap-alignment/) | `WrapAlignment` | `counterAxisAlignContent` <small>[ADR 039](https://github.com/DirectedEdges/specs/blob/main/adr/039-wrap-alignment.md)</small> | `null` |

Element-type applicability (`container`/`text`/`glyph`/`vectors`/`line`) moves to per-property pages once those exist.
