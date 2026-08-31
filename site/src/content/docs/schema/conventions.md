---
title: "Conventions"
description: "Facts about the Figma library a spec was generated from"
---

Declares how a Figma library is authored and organized. Every consumer reading the same library declares the same values — differing values produce **incorrect** output rather than merely different output: a mismatched pattern leaves a whole class of assets undetected, and a mismatched state entry lands a concept on the wrong prop.

Authored in `config/conventions.yaml`. Absence of a member means the library declares no such convention, and the capability it enables does not apply — there is no separate on-switch.

## `figma`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| [`naming`](/settings/figma-keys/) | `'NONE' \| 'SENTENCE' \| 'TITLE'` | `'NONE'` | Naming convention the Figma file uses — the reversal target for [`settings.spec.keys`](/schema/settings/) |
| [`glyphs`](/guides/glyph-name-pattern/) | `object` | — | Glyph asset naming. Absent = no glyph convention |
| [`codeOnlyProps`](/guides/code-only-props/) | `object` | — | Code-only props container naming. Absent = no such convention |
| [`subcomponents`](/guides/subcomponent-scoping/) | `object` | — | Subcomponent organization and naming. Absent = no subcomponent convention |
| [`instanceExamples`](/guides/instance-examples/) | `object` | — | **Pro.** Instance example organization and naming. Absent = no such convention |
| [`images`](/guides/images/) | `object` | — | How the library expresses images. Absent = no image convention |
| [`slotConstraints`](/guides/slot-constraints/) | `boolean` | `false` | The library authors slot constraints as code-only props |
| [`inferNumberProps`](/guides/number-inference/) | `boolean` | `false` | The library authors numeric props as Figma `TEXT` props with numeric defaults |
| [`states`](/settings/states/) | `object` | — | Concept-keyed map classifying Figma variant props as semantic states |
| [`defaultExampleWidth`](/settings/default-example-width/) | `number` | — | Width in pixels components and examples are authored at, and render at by default. Absent = no declared width |

### `figma.glyphs`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `match` | `string` | *(required)* | Naming pattern identifying glyph assets. `{i}` = icon name (e.g. `'DS Icon Glyph / {i}'`) |

### `figma.codeOnlyProps`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `match` | `string` | *(required)* | Literal layer name identifying the container (e.g. `'Code only props'`) |

### `figma.subcomponents`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'NESTED' \| 'PAGE'` | `'NESTED'` | Where the library keeps subcomponents — the component's own anatomy, or the whole Figma page |
| `match` | `string[]` | *(required)* | Naming patterns identifying subcomponents. `{C}` = component name, `{S}` = subcomponent name |
| `exclude` | `string[]` | — | Patterns the library excludes, same placeholders |

### `figma.instanceExamples`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'PAGE' \| 'FILE'` | `'PAGE'` | Where the library keeps instance examples |
| `match` | `string[]` | — | Name filter. `{C}` = component name. Omitted = every in-scope instance qualifies |
| `exclude` | `string[]` | — | Patterns the library excludes, `{C}` placeholder |
| `parentNames` | `string[]` | — | A candidate's immediate parent frame or section must match one of these |

### `figma.images`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `backgroundImage` | `boolean` | `false` | The library expresses images as container fills, emitted as `Styles.backgroundImage` |
| `match` | `string` | — | Name of the library's designated image component (e.g. `DS Image`). Requires a non-empty `sourceProps` |
| `sourceProps` | `string[]` | — | Code-only prop names carrying image sources; the first is the designated component's own source prop |

### `figma.states`

A map keyed by [state concept](/settings/states/) name (e.g. `hover`, `disabled`, `readonly`). Each entry classifies one Figma variant prop as that semantic state:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prop` | `string` | *(required)* | Figma variant prop name (e.g. `state`, `isDisabled`) |
| `value` | `string` | `"true"` | Variant value that activates this concept (e.g. `"hover"`). Omit for boolean props |
| `contract` | `'omit' \| 'keep'` | *(per concept)* | Contract generation override — exclude (`omit`, browser-driven) or retain (`keep`, consumer-controlled) the prop in generated Props interfaces |

## Resolution

`ResolvedConventions` applies defaults **inside** any declared block: once `subcomponents` is present, its `scope` is guaranteed; once `images` is present, `backgroundImage` and `sourceProps` are.

The blocks themselves stay optional after resolution. Absence means the library declares no such convention, and nothing can supply that — which is why `DEFAULT_SETTINGS` has no conventions counterpart.
