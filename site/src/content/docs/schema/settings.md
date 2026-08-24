---
title: "Settings"
description: "Choices about a run — sources, spec output, and assets"
---

Controls how a run behaves. Changing a setting produces **different** output, never incorrect output: a different team reading the same library may set every one of these differently and each result is correct.

Authored in `config/settings.yaml`. Members are grouped by concern, and each concern carries its own `directory`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `author` | `string` | — | Author recorded in generated spec metadata |
| `data` | `object` | — | Source acquisition and the directory holding fetched, computed, and authored data |
| `spec` | `object` | — | The generated spec — where it lands, how it is split, what it contains, how values are serialized |
| `assets` | `object` | — | Shared resources every code output points at: icons, images, generated CSS, fonts |

## `data`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `directory` | `string` | — | Directory holding fetched downloads, computed caches, extracted assets, and authored inputs |
| `sources` | `object` | — | Sources the workspace reads from, keyed by source name |

### `data.sources.<name>`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | *(required)* | Figma file key the source reads from |
| `fetch` | `string[]` | — | Artifacts to download (e.g. `file`, `variables`, `styles`, `icons`) |

## `spec`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `directory` | `string` | — | Directory the generated spec is written to |
| [`format`](/settings/output-format/) | `'JSON' \| 'YAML'` | `'JSON'` | Serialization format |
| [`keys`](/guides/key-formatting/) | `'SAFE' \| 'CAMEL' \| 'SNAKE' \| 'KEBAB' \| 'PASCAL' \| 'TRAIN'` | `'SAFE'` | Key casing style |
| [`layout`](/guides/data-layout/) | `'LAYOUT' \| 'PARENT_CHILDREN' \| 'BOTH'` | `'LAYOUT'` | Element hierarchy representation |
| [`tokens`](/settings/tokens/) | `'TOKEN' \| 'TOKEN_NAME' \| 'TOKEN_FIGMA_EXTENSIONS' \| 'FIGMA_NAME' \| 'CUSTOM' \| 'FIGMA_SYNTAX_WEB' \| 'FIGMA_SYNTAX_IOS' \| 'FIGMA_SYNTAX_ANDROID'` | `'TOKEN'` | Token reference output format |
| [`color`](/settings/color/) | `ColorFormat` | `'HEX'` | Color value output format |
| [`variantDepth`](/guides/variant-depth/) | `1 \| 2 \| 3 \| 9999` | `9999` | Maximum variant nesting depth (9999 = unlimited) |
| [`details`](/guides/variant-layering/) | `'FULL' \| 'LAYERED'` | `'LAYERED'` | Output detail level |
| [`collapsePrimitiveWrapper`](/settings/collapse-primitive-wrapper/) | `boolean` | `false` | Strip plain container wrappers around a single text/glyph child and promote the leaf to spec root |
| [`invalidVariants`](/settings/invalid-variants/) | `boolean` | `false` | Include variants marked invalid |
| [`invalidCombinations`](/guides/invalid-variant-combinations/) | `boolean` | `true` | Include `invalidVariantCombinations` list |
| [`emptyVariants`](/settings/empty-variants/) | `boolean` | `false` | Include variants with no element overrides |
| [`defaultSlotContent`](/guides/default-slot-content/) | `boolean` | `false` | **Pro.** Emit the component's default slot content into `Component.slotContentExamples`. Ignored on the free tier |
| `splitComponents` | `boolean` | `true` | Write one file per component rather than a single combined library file |
| `splitConcerns` | `boolean` | `true` | Write one file per concern (api, styling, variants) |
| `useSubfolders` | `boolean` | `true` | Nest each component's files in a subfolder named for the component |

## `assets`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `directory` | `string` | — | Directory holding shared assets |

Grouped by consumer rather than producer: icons, images, generated CSS, and fonts arrive from fetch, from generate, from transform, or from a process outside this tool — and every code output points at them, whatever the platform.

## DEFAULT_SETTINGS

A runtime export from `@directededges/specs-schema`. Provides defaults for every setting that has one. Typed as `ResolvedSettings` — all defaulted properties are required:

```ts
const DEFAULT_SETTINGS: ResolvedSettings = {
  spec: {
    format: 'JSON',
    keys: 'SAFE',
    layout: 'LAYOUT',
    tokens: 'TOKEN',
    color: 'HEX',
    variantDepth: 9999,
    details: 'LAYERED',
    collapsePrimitiveWrapper: false,
    invalidVariants: false,
    invalidCombinations: true,
    emptyVariants: false,
    defaultSlotContent: false,
  },
};
```

Directories, `sources`, and `author` carry no default: the consumer supplies them, and this package has no basis for choosing one. They stay optional on `ResolvedSettings` for exactly that reason.

The three split flags are different. Every downstream command — `transform`, `analyze`, `render` — reads the split layout, so the shape of generated output is not a per-consumer choice; leaving each consumer to pick its own default is how the same workspace ends up emitting two layouts. `DEFAULT_SETTINGS` carries them as `true` and they are required on `ResolvedSettings`.
