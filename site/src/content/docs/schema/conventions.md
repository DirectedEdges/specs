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
specs:
  states:
    disabled:
      prop: isDisabled
primitives:
  dsText:
    elementType: text
    map:
      - source: content
        prop: text
```

Absence of `platforms` means nothing is declared at all; absence of one key means that platform declares nothing.

### Authoring

Each platform is authored as its own file in `config/conventions/`, named for the platform id. The file's root **is** the entry — there is no `platforms:` wrapper to repeat:

```
config/
  conventions/
    figma.yaml
    react.yaml
    specs.yaml
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

Two basenames in the directory are reserved and are not platforms: `specs.yaml` (conventions about [the spec itself](#specs)) and `figma.primitives.yaml` (the [promotion table](#primitives)).

## Platform members

A single shape serves every platform, with every member optional. Members fall into two groups:

- **Encoding** — how this platform expresses something the spec models explicitly. A Figma library has no first-class notion of a subcomponent, so it encodes one in a layer-name pattern.
- **Vocabulary** — which of this platform's components implements a spec concept.

The shape is deliberately permissive: nothing stops a code platform declaring `inferNumberProps`. Discriminating by key would type `figma` differently from every other key, which is the special case the platform map removes.

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
| [`stylesProp`](#stylesprop) | `string` | — | *Vocabulary.* Prop receiving styling no promotion mapped. Absent = unmapped styling is dropped |
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

### `stylesProp`

Prop receiving styling no promotion mapped, for every promoted component on this platform (e.g. `sx`, `style`, `modifier`). A **name only** — what is placed in it is the generator's decision.

### `defaultFillWidth`

Width in pixels of the container this platform places a component in when the component's root resizes to fill its parent.

Applies **only** when the root's `layoutSizingHorizontal` is `FILL`. A root with a fixed or hugging width already states its width and is unaffected, so this can never override what a design declares — the number is the container's width, not the instance's.

```yaml
# config/conventions/figma.yaml
defaultFillWidth: 375
```

It has no default at any level. Absence means this platform declares no width and the rendering tool falls back to its own value.

## `specs`

Conventions about the **spec itself** rather than about any platform. Authored at `config/conventions/specs.yaml` — a reserved basename beside the platform files. Every member names a prop (or an enum value) that exists in `api.yaml`, so a transform reading only the spec can apply it without touching the design tool: the CSS transform applies `states` and never opens a Figma file.

A sibling of `platforms` rather than a member of it: the spec is the hub every platform converts to or from, so making `specs` a platform key would name the hub as one of its own spokes.

These conventions are library-wide. The per-component equivalent is an annotation, which lands in the spec itself (`anatomy.<element>.role`); where both describe the same thing, the annotation wins.

```yaml
# config/conventions/specs.yaml
states:
  disabled:
    prop: isDisabled
  hover:
    prop: state
    value: hover
accessibility:
  label:
    prop: a11yLabel
value:
  prop: progress
  indeterminate: isLoading
```

### `states`

A map keyed by [state concept](/settings/states/) name (e.g. `hover`, `disabled`, `readonly`). Each entry classifies one variant prop as that semantic state:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prop` | `string` | *(required)* | Variant prop name (e.g. `state`, `isDisabled`) |
| `value` | `string` | `"true"` | Variant value that activates this concept (e.g. `"hover"`). Omit for boolean props |
| `contract` | `'omit' \| 'keep'` | *(per concept)* | Contract generation override — exclude (`omit`, browser-driven) or retain (`keep`, consumer-controlled) the prop in generated Props interfaces |

### `accessibility`

Props carrying accessibility semantics no element expresses.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label.prop` | `string` | — | The prop supplying an accessible name for a control with no text of its own — an icon-only button, typically. An element carrying a `label` [part role](/roles/label/) wins over the prop |

### `value`

The props describing a control's value where no element represents it — a progress bar draws its progress rather than writing it. An element carrying a `value` [part role](/roles/value/) wins.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prop` | `string` | *(required)* | The prop carrying the value |
| `indeterminate` | `string` | — | A boolean prop forcing the indeterminate presentation regardless of the value |

`indeterminate` sits here rather than among the state concepts because those are a governed vocabulary: each resolves to a canonical selector, and `indeterminate` there would mean a checkbox's mixed state. A progress bar with no known value is a different fact wearing the same word — it suppresses `aria-valuenow` and has no selector at all.

## `primitives`

Authored at `config/conventions/figma.primitives.yaml` — a reserved basename in the conventions directory, so no platform may take that id. The `figma.` qualifier is deliberate: the table's `source` keys name Figma style properties and its `values` keys name Figma tokens, so the file describes the design tool even though the components it promotes to are not Figma-specific. Sits at the **root** of `Conventions`, beside `platforms` rather than inside a platform. A component's props are the same whichever platform renders it, so the table is stated once.

Each key is one of the design system's own component names. When [`promotePrimitives`](/settings/promote-primitives/) is on, a primitive layer in composed example content is promoted to an instance of the component whose entry best matches it.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `elementType` | `'text' \| 'glyph' \| 'container'` | *(required)* | The anatomy element type this component can be promoted from |
| `map` | `array` | *(required)* | Rules turning the layer's styles into this component's props, in precedence order |

Several entries may share an `elementType` — a design system with a text, a heading and a body component is three entries. `elementType` names the same vocabulary `anatomy` uses, and describes the layer shape a promotion starts *from*, not the component it lands on: a component with its own internal anatomy is a legitimate target for a single drawn layer.

### Rules

| Property | Type | Description |
|----------|------|-------------|
| `source` | `string` | What is read from the captured layer |
| `prop` | `string` | The prop this source's value is written to, as-is |
| `values` | `object` | Literal lookup from what the source carries to the props it writes |

Exactly one of `prop` and `values` is given.

`source` is closed per element type, and honoured by implementations rather than enforced by the schema — so renaming a `Styles` member never invalidates a conventions file:

| Element type | Sources |
|------|---------|
| `text` | `typography`, `typography.fontSize`, `typography.fontFamily`, `typography.fontStyle`, `textColor`, `content` |
| `glyph` | `width`, `height`, `fillColor`, `content` |
| `container` | `layoutMode` |

The dotted sources address inside the `Typography` composite. `typography` is either a token reference or that composite, never both, so `typography` and the `typography.*` sources can never both resolve — declaring both is how one entry serves a layer wearing a text style and one styled ad hoc.

### `values`

A key is a **full token path or a raw scalar**, matched literally. Nothing is derived from part of a token's name, because a prop value need bear no relation to the token that produces it.

```yaml
# config/conventions/figma.primitives.yaml
dsHeading:
  elementType: text
  map:
    - source: typography
      values:
        Typography theme/Headline/M:  { appearance: Headline M }
        Typography theme/Headline/XL: { appearance: Headline XL }
    - source: content
      prop: text

dsIcon:
  elementType: glyph
  map:
    - source: fillColor
      values:                    # colour in, intent out
        Color/Critical: { appearance: error }
        Color/Warning:  { appearance: warning }
    - source: width
      values:
        Constants/Sizing/4x: { size: XS }
    - source: height             # the same axis, reached by a raw value
      values:
        16: { size: XS }
    - source: content
      prop: name
```

A value writes **one or more props**, so one typography token can set `size` and `weight` together where another design system sets a single `appearance`.

### Selection

When several entries share an `elementType`, the one whose rules resolve most often wins; ties break by declaration order. At least one rule must resolve, so `elementType` alone never promotes — a layer is only this component if something about it says so.

When more than one entry resolved, the promoted element records `multipleMatches: true` in its [capture provenance](/settings/promote-primitives/#what-is-recorded-and-why) — a durable note that the mapping was contested, rather than a warning that scrolls past.

A source with no matching row does not resolve. It stays in `styles` and reaches output as passed styling, so a component's narrower prop enum constrains without a separate mechanism.

:::caution[A promoted container must host its own children]
A promoted container's children become the target's slot content, so **that component's root must be the box the children land in**. A layout component that wraps its children in an inner element cannot stand in for one: the container's `gap`, `padding` and alignment land on the outer box while the children sit a level deeper, so spacing is lost — and a wrapper carrying `flex: 1 0 0` inside a `height: fit-content` parent collapses the subtree to zero height.

Neither failure raises an error. Where the constraint does not hold, declare no `container` entry; `text` and `glyph` are unaffected.
:::

## Resolution

`ResolvedConventions` applies defaults **inside** any declared platform entry: `naming`, `slotConstraints` and `inferNumberProps` are guaranteed once an entry exists, and within a declared block so are `scope`, `backgroundImage`, `sourceProps`, and each binding's concept prop names. A platform's `stylesProp` is folded into each declared primitive, so a consumer reads one level rather than two.

A resolver produces a complete entry for any platform it is asked about, **declared or not** — so a consumer reading `figma` gets `naming: NONE` whether or not a `figma.yaml` exists.

What no default can supply is a convention *block*: `glyphs`, `subcomponents`, `images`. Their absence is a statement about the library, and inventing one would fabricate a fact nobody declared. `DEFAULT_CONVENTIONS` is an empty object for the same reason a map has no fixed key to populate — not because the defaults went away.

## In a spec's metadata

`metadata.conventions` records the **one** platform entry that produced the spec, not every platform the workspace configures. The shape is identical, but absence means something different: here a missing platform did not produce this spec.

```yaml
metadata:
  conventions:
    platforms:
      figma:
        naming: SENTENCE
```
