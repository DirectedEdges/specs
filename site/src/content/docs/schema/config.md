---
title: "Config"
description: "Generation configuration — format, inclusion, and processing options"
---

Controls how specs are generated. See the [settings reference](/specs/settings/) for detailed explanations of each option.

## `format`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`output`](/specs/settings/output-format/) | `'JSON' \| 'YAML'` | `'JSON'` | Output file format |
| [`keys`](/specs/guides/key-formatting/) | `'SAFE' \| 'CAMEL' \| 'SNAKE' \| 'KEBAB' \| 'PASCAL' \| 'TRAIN'` | `'SAFE'` | Key casing style |
| [`layout`](/specs/guides/data-layout/) | `'LAYOUT' \| 'PARENT_CHILDREN' \| 'BOTH'` | `'LAYOUT'` | Element hierarchy representation |
| [`tokens`](/specs/settings/tokens/) | `'TOKEN' \| 'TOKEN_NAME' \| 'TOKEN_FIGMA_EXTENSIONS' \| 'FIGMA_NAME' \| 'CUSTOM' \| 'FIGMA_SYNTAX_WEB' \| 'FIGMA_SYNTAX_IOS' \| 'FIGMA_SYNTAX_ANDROID'` | `'TOKEN'` | Token reference output format — `FIGMA_SYNTAX_*` emit per-platform Figma code syntax, falling back to `TOKEN` |
| [`color`](/specs/settings/color/) | `ColorFormat` | `'HEX'` | Color value output format — `HEX`, `HEXA`, `RGB`, `RGBA`, `HSLA`, `HSB`, `OKLCH`, `OKLAB`, or `OBJECT` |

## `include`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`invalidVariants`](/specs/settings/invalid-variants/) | `boolean` | `false` | Include variants marked invalid |
| [`invalidCombinations`](/specs/guides/invalid-variant-combinations/) | `boolean` | `true` | Include `invalidVariantCombinations` list |
| [`emptyVariants`](/specs/settings/empty-variants/) | `boolean` | `false` | Include variants with no element overrides |
| [`defaultSlotContent`](/specs/guides/default-slot-content/) | `boolean` | `false` | **Pro.** Emit the component's default slot content into `Component.slotContentExamples` (structurally detected slot fills). Ignored on the free tier |
| [`imageData`](/specs/guides/images/) | `boolean` | `false` | Process image fills and props — emit `Styles.backgroundImage`, `ImageProp`, and the `Component.images` registry. When `false`, images are not processed |

`instanceExamples` has no `include` flag — emitting it is driven by the presence of [`processing.instanceExamples`](#processinginstanceexamples) (Pro only), like `subcomponents`.

## `processing`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`subcomponents`](/specs/guides/subcomponent-scoping/) | `object` | — | Subcomponent detection. Absent = no detection. See [`processing.subcomponents`](#processingsubcomponents) |
| [`glyphNamePattern`](/specs/guides/glyph-name-pattern/) | `string` | — | Name prefix for identifying glyph/icon instances |
| [`codeOnlyPropsPattern`](/specs/guides/code-only-props/) | `string` | — | Name pattern for code-only prop containers |
| [`slotConstraints`](/specs/guides/slot-constraints/) | `boolean` | `false` | Emit `minChildren`, `maxChildren`, `anyOf` on slot props |
| [`variantDepth`](/specs/guides/variant-depth/) | `1 \| 2 \| 3 \| 9999` | `9999` | Maximum variant nesting depth (9999 = unlimited) |
| [`details`](/specs/guides/variant-layering/) | `'FULL' \| 'LAYERED'` | `'LAYERED'` | Output detail level |
| [`inferNumberProps`](/specs/guides/number-inference/) | `boolean` | `false` | Infer number-typed props from Figma variant values |
| [`collapsePrimitiveWrapper`](/specs/settings/collapse-primitive-wrapper/) | `boolean` | `false` | Strip plain container wrappers around a single text/glyph child and promote the leaf to spec root |
| [`instanceExamples`](/specs/guides/instance-examples/) | `object` | — | **Pro.** Instance example detection. Absent = no detection; ignored on the free tier. See [`processing.instanceExamples`](#processinginstanceexamples) |
| [`states`](/specs/settings/states/) | `object` | — | Concept-keyed map classifying Figma variant props as semantic states. Absent = all variant props emit as `data-*` attribute selectors. See [`processing.states`](#processingstates) |
| [`imageComponent`](/specs/guides/images/) | `object` | — | Designated image component. Absent = image fills emit as `Styles.backgroundImage` on containers only. Requires `include.imageData`. See [`processing.imageComponent`](#processingimagecomponent) |

### `processing.subcomponents`

Presence of this block is the on-switch for [subcomponent detection](/specs/guides/subcomponent-scoping/).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'NESTED' \| 'PAGE'` | `'NESTED'` | Where to search — the component's own anatomy, or the whole Figma page |
| `match` | `string[]` | *(required)* | Template patterns defining which assets are subcomponents. `{C}` = component name, `{S}` = subcomponent name (e.g. `'{C} / {S}'`) |
| `exclude` | `string[]` | — | Patterns to exclude from matches, same placeholders |

### `processing.instanceExamples`

**Pro.** Presence of this block is the on-switch for [instance example detection](/specs/guides/instance-examples/).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'PAGE' \| 'FILE'` | `'PAGE'` | Where to search for candidate instances |
| `match` | `string[]` | — | Optional name filter. `{C}` = component name (e.g. `'{C} Example'`). When omitted, every in-scope instance of the component qualifies |
| `exclude` | `string[]` | — | Patterns to exclude from matches, `{C}` placeholder |
| `parentNames` | `string[]` | — | A candidate's immediate parent frame or section must match one of these names |

### `processing.states`

A map keyed by [state concept](/specs/settings/states/) name (e.g. `hover`, `disabled`, `readonly`). Each entry classifies one Figma variant prop as that semantic state:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prop` | `string` | *(required)* | Figma variant prop name (e.g. `state`, `isDisabled`) |
| `value` | `string` | `"true"` | Variant value that activates this concept (e.g. `"hover"`). Omit for boolean props |
| `contract` | `'omit' \| 'keep'` | *(per concept)* | Contract generation override — exclude (`omit`, browser-driven) or retain (`keep`, consumer-controlled) the prop in generated Props interfaces |

### `processing.imageComponent`

Selects the [image representation mode](/specs/guides/images/) when `include.imageData` is on. Absent = background fills only.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | *(required)* | The designated image component's name (e.g. `DS Image`). Instances of it are treated as the image primitive |
| `sourceProperty` | `string` | *(required)* | The image component's source prop. Host image props forward into it via `propConfigurations` |
| `fallback` | `boolean` | `true` | Whether image fills outside the designated component still emit as `backgroundImage`. When `false`, the component is the only image representation and stray fills are skipped |

## DEFAULT_CONFIG

The only runtime export from `@directededges/specs-schema`. Provides defaults for all config properties that have a default value. Typed as `ResolvedConfig` — all defaulted properties are required:

```ts
const DEFAULT_CONFIG: ResolvedConfig = {
  processing: {
    slotConstraints: false,
    collapsePrimitiveWrapper: false,
    variantDepth: 9999,
    details: 'LAYERED',
    inferNumberProps: false,
  },
  format: {
    output: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
    color: 'HEX',
  },
  include: {
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
    defaultSlotContent: false,
    imageData: false,
  },
  transformers: [],
};
```

The object-valued options (`subcomponents`, `instanceExamples`, `states`, `imageComponent`) and the pattern strings (`glyphNamePattern`, `codeOnlyPropsPattern`) are **deliberately absent** — they are feature toggles whose *presence* is the on-switch. Absence means "feature off"; there is no meaningful default value to provide, and they are typed as optional on `ResolvedConfig` for exactly that reason. They are never `null`: a `null` would introduce a third state ("present but empty") that no consumer distinguishes from absence, so the schema does not allow it. (`include.defaultSlotContent` and `include.imageData` look similar but are gates over independently-detected data rather than detectors, so they carry a real `false` default.)
