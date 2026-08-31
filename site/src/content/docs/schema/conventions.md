---
title: "Conventions"
description: "Facts about the libraries a spec was generated from and is generated for, keyed by platform"
---

Declares how each library the pipeline touches is authored, and what it calls things. Every consumer reading the same libraries declares the same values — differing values produce **incorrect** output rather than merely different output: a mismatched pattern leaves a whole class of assets undetected, a mismatched state entry lands a concept on the wrong prop, and a mismatched primitive binding emits a component the design system does not have.

## `platforms`

Conventions are keyed by platform. Figma is one key among the rest — this pipeline reads Figma to produce specs *and* writes specs to produce Figma, so it is a peer rather than a special case. Keys name **implementations**, not platform families: React and Web Components need different vocabularies and get different keys.

```yaml
platforms:
  figma:
    naming: SENTENCE
    glyphs:
      match: 'DS Icon Glyph / {i}'
  react:
    stylesProp: sx
    primitives:
      text:
        component: DsText
```

Absence of `platforms` means nothing is declared at all; absence of one key means that platform declares nothing.

### Authoring

Each platform is authored as its own file in `config/conventions/`, named for the platform id. The file's root **is** the entry — there is no `platforms:` wrapper to repeat:

```
config/
  conventions/
    figma.yaml
    react.yaml
  settings.yaml
  pipeline.yaml
```

```yaml
# config/conventions/figma.yaml
naming: SENTENCE
glyphs:
  match: 'DS Icon Glyph / {i}'
```

Because the filename is the platform id, two files cannot declare the same key and there is no merge rule. Absence of a member means that platform declares no such convention, and the capability it enables does not apply — there is no separate on-switch.

## Platform members

A single shape serves every platform, with every member optional. Members fall into two groups:

- **Encoding** — how this platform expresses something the spec models explicitly. A Figma library has no first-class notion of a subcomponent, so it encodes one in a layer-name pattern.
- **Vocabulary** — which of this platform's components implements a spec concept.

The shape is deliberately permissive: nothing stops a code platform declaring `states`. Discriminating by key would type `figma` differently from every other key, which is the special case the platform map removes.

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
| [`primitives`](#primitives) | `object` | — | *Vocabulary.* Which component implements each spec primitive. Absent = the generator's host-element behavior stands |
| [`stylesProp`](#stylesprop) | `string` | — | *Vocabulary.* Baseline prop receiving unmapped styling. Absent = unmapped styling is dropped |
| [`defaultFillWidth`](#defaultfillwidth) | `number` | — | Container width for a fill-width root. Absent = the rendering tool uses its own fallback |

### `glyphs`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `match` | `string` | *(required)* | Naming pattern identifying glyph assets. `{i}` = icon name (e.g. `'DS Icon Glyph / {i}'`) |

### `codeOnlyProps`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `match` | `string` | *(required)* | Literal layer name identifying the container (e.g. `'Code only props'`) |

### `subcomponents`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'NESTED' \| 'PAGE'` | `'NESTED'` | Where the library keeps subcomponents — the component's own anatomy, or the whole Figma page |
| `match` | `string[]` | *(required)* | Naming patterns identifying subcomponents. `{C}` = component name, `{S}` = subcomponent name |
| `exclude` | `string[]` | — | Patterns the library excludes, same placeholders |

### `instanceExamples`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scope` | `'PAGE' \| 'FILE'` | `'PAGE'` | Where the library keeps instance examples |
| `match` | `string[]` | — | Name filter. `{C}` = component name. Omitted = every in-scope instance qualifies |
| `exclude` | `string[]` | — | Patterns the library excludes, `{C}` placeholder |
| `parentNames` | `string[]` | — | A candidate's immediate parent frame or section must match one of these |

### `images`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `backgroundImage` | `boolean` | `false` | The library expresses images as container fills, emitted as `Styles.backgroundImage` |
| `match` | `string` | — | *Vocabulary.* Figma name of the designated image component (e.g. `DS Image`). Requires a non-empty `sourceProps` |
| `component` | `string` | — | *Vocabulary.* The same component's name on this platform (e.g. `DsImage`) — the translation target for a `match` declared by whichever platform produced the spec |
| `sourceProps` | `string[]` | — | Code-only prop names carrying image sources; the first is the designated component's own source prop |

### `states`

A map keyed by [state concept](/settings/states/) name (e.g. `hover`, `disabled`, `readonly`). Each entry classifies one Figma variant prop as that semantic state:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prop` | `string` | *(required)* | Figma variant prop name (e.g. `state`, `isDisabled`) |
| `value` | `string` | `"true"` | Variant value that activates this concept (e.g. `"hover"`). Omit for boolean props |
| `contract` | `'omit' \| 'keep'` | *(per concept)* | Contract generation override — exclude (`omit`, browser-driven) or retain (`keep`, consumer-controlled) the prop in generated Props interfaces |

### `primitives`

Which of this platform's components implements each spec primitive. Bindings are consulted at **emit time** — the spec keeps `type: text`, and each generator resolves it to its own component, so one spec serves every implementation and no binding is ever written into a spec.

Keys are constrained to the three bindable element types. An image is deliberately absent: it is a paint on an element that is already something else, not a kind of node, so it binds through `images.component` instead.

| Key | Type | Description |
|-----|------|-------------|
| `text` | `object` | The component that means "text" (e.g. `DsText`, `ds-text`, `Text`) |
| `glyph` | `object` | The component that means "glyph" (e.g. `DsIcon`, `ds-icon`) |
| `container` | `object` | The component that means "container" (e.g. `DsBox`, or a Row/Column/Box trio) |

Each binding takes:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `component` | `string` | *(required)* | The component's name on this platform. A container may instead take a `LayoutMode`-keyed map |
| `props` | `object` | — | Concept-to-prop-name map, closed per kind |
| `stylesProp` | `string` | *(platform `stylesProp`)* | Prop receiving everything not mapped by `props`, as passed styling |

`props` keys are **concepts**, not `Styles` members, and the set is closed per primitive — a concept that is not mappable for that kind is a validation error:

| Primitive | Concept | Fed by | Default prop name |
|-----------|---------|--------|-------------------|
| `text` | `color` | `Styles.textColor` | `color` |
| `text` | `typography` | `Styles.typography` | *(none)* |
| `glyph` | `color` | `Styles.fillColor` | `color` |
| `glyph` | `content` | `Element.content` | `content` |
| `container` | `direction` | `Styles.layoutMode` | *(none)* |

A prop name is a string belonging to the target library and is not policed. `null` means this component has no prop for the concept, and suppresses the default.

```yaml
# config/conventions/react.yaml
stylesProp: sx
primitives:
  text:
    component: DsText
    props:
      typography: typography
  glyph:
    component: DsIcon
    props:
      content: name
  container:
    component:
      HORIZONTAL: DsRow
      VERTICAL: DsColumn
      NONE: DsBox
```

A container's `component` accepts either one name or a `LayoutMode`-keyed map, for platforms that express direction by component choice rather than by a prop. The keyed form is legal only for a container — `direction` is not among text's or a glyph's concepts, so nothing would select from the map.

### `stylesProp`

Baseline prop receiving unmapped styling for every primitive on this platform (e.g. `sx`, `style`, `modifier`). A primitive's own `stylesProp` overrides it. A **name only** — what is placed in it is the generator's decision.

### `defaultFillWidth`

Width in pixels of the container this platform places a component in when the component's root resizes to fill its parent.

Applies **only** when the root's `layoutSizingHorizontal` is `FILL`. A root with a fixed or hugging width already states its width and is unaffected, so this can never override what a design declares — the number is the container's width, not the instance's.

```yaml
# config/conventions/figma.yaml
defaultFillWidth: 375
```

It has no default at any level. Absence means this platform declares no width and the rendering tool falls back to its own value.

## Resolution

`ResolvedConventions` applies defaults **inside** any declared platform entry: `naming`, `slotConstraints` and `inferNumberProps` are guaranteed once an entry exists, and within a declared block so are `scope`, `backgroundImage`, `sourceProps`, and each binding's concept prop names. A platform's `stylesProp` is folded into each declared primitive, so a consumer reads one level rather than two.

`platforms` and each key within it stay optional after resolution. Absence means nothing is declared, and nothing can supply that — which is why `DEFAULT_CONVENTIONS` is an empty object rather than a populated one.

## In a spec's metadata

`metadata.conventions` records the **one** platform entry that produced the spec, not every platform the workspace configures. The shape is identical, but absence means something different: here a missing platform did not produce this spec.

```yaml
metadata:
  conventions:
    platforms:
      figma:
        naming: SENTENCE
```
