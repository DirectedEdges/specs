---
title: "Config"
description: "Generation configuration — processing, format, and inclusion options"
---

Controls how specs are generated. See the [feature guides](/specs/features/) for detailed explanations of each option.

## `processing`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `subcomponents` | `object` | — | Subcomponent detection — `scope` (NESTED or PAGE), `match` patterns, `exclude` patterns. Absent = no detection |
| `glyphNamePattern` | `string` | — | Name prefix for identifying glyph/icon instances |
| `codeOnlyPropsPattern` | `string` | — | Name pattern for code-only prop containers |
| `slotConstraints` | `boolean` | `false` | Emit `minChildren`, `maxChildren`, `anyOf` on slot props |
| `variantDepth` | `1 \| 2 \| 3 \| 9999` | `9999` | Maximum variant nesting depth (9999 = unlimited) |
| `details` | `'FULL' \| 'LAYERED'` | `'LAYERED'` | Output detail level |
| `inferNumberProps` | `boolean` | `false` | Infer number-typed props from Figma variant values |
| `instanceExamples` | `object` | — | **Pro.** Instance example detection — `scope` (PAGE or FILE), `match` patterns, `exclude` patterns, `parentNames` filter. Absent = no detection. Ignored on the free tier |

## `format`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `output` | `'JSON' \| 'YAML'` | `'JSON'` | Output file format |
| `keys` | `'SAFE' \| 'CAMEL' \| 'SNAKE' \| 'KEBAB' \| 'PASCAL' \| 'TRAIN'` | `'SAFE'` | Key casing style |
| `layout` | `'LAYOUT' \| 'PARENT_CHILDREN' \| 'BOTH'` | `'LAYOUT'` | Element hierarchy representation |
| `tokens` | `'TOKEN' \| 'TOKEN_NAME' \| 'TOKEN_FIGMA_EXTENSIONS' \| 'FIGMA_NAME' \| 'CUSTOM' \| 'FIGMA_SYNTAX_WEB' \| 'FIGMA_SYNTAX_IOS' \| 'FIGMA_SYNTAX_ANDROID'` | `'TOKEN'` | Token reference output format — `FIGMA_SYNTAX_*` emit per-platform Figma code syntax, falling back to `TOKEN` |
| `color` | `ColorFormat` | `'HEX'` | Color value output format — `HEX`, `HEXA`, `RGB`, `RGBA`, `HSLA`, `HSB`, `OKLCH`, `OKLAB`, or `OBJECT` |

## `include`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `invalidVariants` | `boolean` | `false` | Include variants marked invalid |
| `invalidCombinations` | `boolean` | `true` | Include `invalidVariantCombinations` list |
| `emptyVariants` | `boolean` | `false` | Include variants with no element overrides |
| `defaultSlotContent` | `boolean` | `false` | **Pro.** Emit the component's default slot content into `Component.slotContentExamples` (structurally detected slot fills). Ignored on the free tier |

`instanceExamples` has no `include` flag — emitting it is driven by the presence of [`processing.instanceExamples`](#processing) (Pro only), like `subcomponents`.

## DEFAULT_CONFIG

The only runtime export from `@directededges/specs-schema`. Provides defaults for all config properties that have a default value. Typed as `ResolvedConfig` — all defaulted properties are required:

```ts
const DEFAULT_CONFIG: ResolvedConfig = {
  processing: {
    slotConstraints: false,
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
};
```

Feature-toggle properties (`subcomponents`, `instanceExamples`, `glyphNamePattern`, `codeOnlyPropsPattern`) are absent from `DEFAULT_CONFIG` — their absence means the feature is disabled. (The `include.defaultSlotContent` flag is a gate, not a detector, so it carries a `false` default.)
