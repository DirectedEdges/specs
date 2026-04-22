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

## `format`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `output` | `'JSON' \| 'YAML'` | `'JSON'` | Output file format |
| `keys` | `'SAFE' \| 'CAMEL' \| 'SNAKE' \| 'KEBAB' \| 'PASCAL' \| 'TRAIN'` | `'SAFE'` | Key casing style |
| `layout` | `'LAYOUT' \| 'PARENT_CHILDREN' \| 'BOTH'` | `'LAYOUT'` | Element hierarchy representation |
| `tokens` | `'TOKEN' \| 'TOKEN_NAME' \| 'TOKEN_FIGMA_EXTENSIONS' \| 'FIGMA_NAME' \| 'CUSTOM'` | `'TOKEN'` | Token reference output format |

## `include`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `invalidVariants` | `boolean` | `false` | Include variants marked invalid |
| `invalidCombinations` | `boolean` | `true` | Include `invalidVariantCombinations` list |
| `emptyVariants` | `boolean` | `false` | Include variants with no element overrides |

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
  },
  include: {
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
  },
};
```

Feature-toggle properties (`subcomponents`, `glyphNamePattern`, `codeOnlyPropsPattern`) are absent from `DEFAULT_CONFIG` — their absence means the feature is disabled.
