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
| `slotConstraints` | `boolean` | `false` | Emit `minItems`, `maxItems`, `anyOf` on slot props |
| `variantDepth` | `1 \| 2 \| 3 \| 9999` | `9999` | Maximum variant nesting depth (9999 = unlimited) |
| `details` | `'FULL' \| 'LAYERED'` | `'LAYERED'` | Output detail level |
| `inferNumberProps` | `boolean` | `false` | Infer number-typed props from Figma variant values |
| `instanceExamples` | `object` | — | Instance example detection — `scope` (PAGE or FILE), `match` patterns, `exclude` patterns, `parentNames` filter. Absent = no detection |

## `format`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `output` | `'JSON' \| 'YAML'` | `'JSON'` | Output file format |
| `keys` | `'SAFE' \| 'CAMEL' \| 'SNAKE' \| 'KEBAB' \| 'PASCAL' \| 'TRAIN'` | `'SAFE'` | Key casing style |
| `layout` | `'LAYOUT' \| 'PARENT_CHILDREN' \| 'BOTH'` | `'LAYOUT'` | Element hierarchy representation |
| `tokens` | `'TOKEN' \| 'TOKEN_NAME' \| 'TOKEN_FIGMA_EXTENSIONS' \| 'FIGMA_NAME' \| 'CUSTOM'` | `'TOKEN'` | Token reference output format |
| `color` | `ColorFormat` | `'HEX'` | Color value output format — `HEX`, `HEXA`, `RGB`, `RGBA`, `HSLA`, `HSB`, `OKLCH`, `OKLAB`, or `OBJECT` |

## `include`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `invalidVariants` | `boolean` | `false` | Include variants marked invalid |
| `invalidCombinations` | `boolean` | `true` | Include `invalidVariantCombinations` list |
| `emptyVariants` | `boolean` | `false` | Include variants with no element overrides |
| `slotContentExamples` | `boolean` | `false` | Emit `Component.slotContentExamples` (structurally detected slot fills) |
| `instanceExamples` | `boolean` | `false` | Emit `Component.instanceExamples` (requires `processing.instanceExamples` detection) |

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
    slotContentExamples: false,
    instanceExamples: false,
  },
};
```

Feature-toggle properties (`subcomponents`, `instanceExamples`, `glyphNamePattern`, `codeOnlyPropsPattern`) are absent from `DEFAULT_CONFIG` — their absence means the feature is disabled. (The `include.slotContentExamples` / `include.instanceExamples` flags are gates, not detectors, so they carry `false` defaults.)
