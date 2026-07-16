---
title: "Config"
description: "Generation configuration — format, inclusion, and processing options"
---

Controls how specs are generated. See the [settings reference](/settings/) for detailed explanations of each option.

## `format`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`output`](/settings/output-format/) | `'JSON' \| 'YAML'` | `'JSON'` | Output file format |
| [`keys`](/guides/key-formatting/) | `'SAFE' \| 'CAMEL' \| 'SNAKE' \| 'KEBAB' \| 'PASCAL' \| 'TRAIN'` | `'SAFE'` | Key casing style |
| [`layout`](/guides/data-layout/) | `'LAYOUT' \| 'PARENT_CHILDREN' \| 'BOTH'` | `'LAYOUT'` | Element hierarchy representation |
| [`tokens`](/settings/tokens/) | `'TOKEN' \| 'TOKEN_NAME' \| 'TOKEN_FIGMA_EXTENSIONS' \| 'FIGMA_NAME' \| 'CUSTOM' \| 'FIGMA_SYNTAX_WEB' \| 'FIGMA_SYNTAX_IOS' \| 'FIGMA_SYNTAX_ANDROID'` | `'TOKEN'` | Token reference output format — `FIGMA_SYNTAX_*` emit per-platform Figma code syntax, falling back to `TOKEN` |
| [`color`](/settings/color/) | `ColorFormat` | `'HEX'` | Color value output format — `HEX`, `HEXA`, `RGB`, `RGBA`, `HSLA`, `HSB`, `OKLCH`, `OKLAB`, or `OBJECT` |

## `include`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`invalidVariants`](/settings/invalid-variants/) | `boolean` | `false` | Include variants marked invalid |
| [`invalidCombinations`](/guides/invalid-variant-combinations/) | `boolean` | `true` | Include `invalidVariantCombinations` list |
| [`emptyVariants`](/settings/empty-variants/) | `boolean` | `false` | Include variants with no element overrides |
| [`defaultSlotContent`](/guides/default-slot-content/) | `boolean` | `false` | **Pro.** Emit the component's default slot content into `Component.slotContentExamples` (structurally detected slot fills). Ignored on the free tier |

`instanceExamples` has no `include` flag — emitting it is driven by the presence of [`processing.instanceExamples`](#processinginstanceexamples) (Pro only), like `subcomponents`.

## `processing`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`subcomponents`](/guides/subcomponent-scoping/) | `object` | — | Subcomponent detection. Absent = no detection. See [`processing.subcomponents`](#processingsubcomponents) |
| [`glyphNamePattern`](/guides/glyph-name-pattern/) | `string` | — | Name prefix for identifying glyph/icon instances |
| [`codeOnlyPropsPattern`](/guides/code-only-props/) | `string` | — | Name pattern for code-only prop containers |
| [`slotConstraints`](/guides/slot-constraints/) | `boolean` | `false` | Emit `minChildren`, `maxChildren`, `anyOf` on slot props |
| [`variantDepth`](/guides/variant-depth/) | `1 \| 2 \| 3 \| 9999` | `9999` | Maximum variant nesting depth (9999 = unlimited) |
| [`details`](/guides/variant-layering/) | `'FULL' \| 'LAYERED'` | `'LAYERED'` | Output detail level |
| [`inferNumberProps`](/guides/number-inference/) | `boolean` | `false` | Infer number-typed props from Figma variant values |
| [`collapsePrimitiveWrapper`](/settings/collapse-primitive-wrapper/) | `boolean` | `false` | Strip plain container wrappers around a single text/glyph child and promote the leaf to spec root |
| [`instanceExamples`](/guides/instance-examples/) | `object` | — | **Pro.** Instance example detection. Absent = no detection; ignored on the free tier. See [`processing.instanceExamples`](#processinginstanceexamples) |
| [`states`](/settings/states/) | `object` | — | Concept-keyed map classifying Figma variant props as semantic states. Absent = all variant props emit as `data-*` attribute selectors. See [`processing.states`](#processingstates) |
| [`images`](/guides/images/) | `object` | — | Image processing (ADR-063). Presence is the on-switch; each member is an independent representation trigger. Absent = images are not processed. See [`processing.images`](#processingimages) |

### `processing.subcomponents`

Presence of this block is the on-switch for [subcomponent detection](/guides/subcomponent-scoping/).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'NESTED' \| 'PAGE'` | `'NESTED'` | Where to search — the component's own anatomy, or the whole Figma page |
| `match` | `string[]` | *(required)* | Template patterns defining which assets are subcomponents. `{C}` = component name, `{S}` = subcomponent name (e.g. `'{C} / {S}'`) |
| `exclude` | `string[]` | — | Patterns to exclude from matches, same placeholders |

### `processing.instanceExamples`

**Pro.** Presence of this block is the on-switch for [instance example detection](/guides/instance-examples/).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'PAGE' \| 'FILE'` | `'PAGE'` | Where to search for candidate instances |
| `match` | `string[]` | — | Optional name filter. `{C}` = component name (e.g. `'{C} Example'`). When omitted, every in-scope instance of the component qualifies |
| `exclude` | `string[]` | — | Patterns to exclude from matches, `{C}` placeholder |
| `parentNames` | `string[]` | — | A candidate's immediate parent frame or section must match one of these names |

### `processing.states`

A map keyed by [state concept](/settings/states/) name (e.g. `hover`, `disabled`, `readonly`). Each entry classifies one Figma variant prop as that semantic state:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prop` | `string` | *(required)* | Figma variant prop name (e.g. `state`, `isDisabled`) |
| `value` | `string` | `"true"` | Variant value that activates this concept (e.g. `"hover"`). Omit for boolean props |
| `contract` | `'omit' \| 'keep'` | *(per concept)* | Contract generation override — exclude (`omit`, browser-driven) or retain (`keep`, consumer-controlled) the prop in generated Props interfaces |

### `processing.images`

Presence of this block is the on-switch for [image processing](/guides/images/); each member is an independent representation trigger.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `backgroundImage` | `boolean` | `false` | Detect image fills on containers as `Styles.backgroundImage`; the fallback for stray fills when `imageComponent` is set |
| `imageComponent` | `string` | — | Designated image component name (e.g. `DS Image`). Instances of it are the image primitive; their image routes through `sourceProps[0]`. Requires a non-empty `sourceProps` |
| `sourceProps` | `string[]` | — | Raw Figma code-only prop names that re-type to `ImageProp` on any component; the first entry is the designated component's own source prop |

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
  },
  transformers: [],
};
```

The object-valued options (`subcomponents`, `instanceExamples`, `states`, `images`) and the pattern strings (`glyphNamePattern`, `codeOnlyPropsPattern`) are **deliberately absent** — they are feature toggles whose *presence* is the on-switch. Absence means "feature off"; there is no meaningful default value to provide, and they are typed as optional on `ResolvedConfig` for exactly that reason. They are never `null`: a `null` would introduce a third state ("present but empty") that no consumer distinguishes from absence, so the schema does not allow it. (`include.defaultSlotContent` looks similar but is a gate over independently-detected data rather than a detector, so it carries a real `false` default.)
