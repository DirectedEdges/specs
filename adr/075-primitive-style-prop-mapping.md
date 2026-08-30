# ADR: `props` — a Closed, Per-Primitive Map onto a Component's Props

**Branch**: `075-primitive-style-prop-mapping`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-074 establishes that a `text` element resolves to a bound component at emit time. Naming the component is the easy half. The hard half is what happens to everything the element carries.

```yaml
label:
  styles:
    textColor:   {$token: Color/On surface, $type: color}
    typography:  {$token: Typography/font__200__regular, $type: typography}
    maxWidth:    {$token: Constants/Sizing/48x, $type: dimension}
    layoutSizingHorizontal: HUG
    textOverflow: ELLIPSIS
    maxLines: 1
  content: Label
```

Two of these are what a text component's props exist for. The rest are styling applied to the box — sizing, truncation, layout — which a design system's text component takes as passed styling, not as configured props. A generator that maps nothing emits `<DsText style={{color: ..., font: ...}}>`, the component in name only. A generator that maps everything invents props that do not exist.

The mapping is small, and it is small in a **specific, per-primitive way**:

- **Text** takes a colour and a type treatment. Nothing else
- **Glyph** takes a colour and a name. Its size comes from sizing and layout styling, not from a prop
- **Container** takes almost nothing. `backgroundColor`, `padding`, `cornerRadius`, `strokes` are applied styling, not configured props

Two constraints from the naming survey shape the defaults:

| Concept | CSS / React | SwiftUI | Compose |
|---|---|---|---|
| Text colour | `color` | `.foregroundStyle` | `color` param on `Text` |
| Icon colour | `color` / `fill` | `.foregroundStyle` | `tint` / `color` param on `Icon` |
| Type treatment | `font`, `font-family` | `.font(...)` | `style` param (`TextStyle`) |
| Passed styling | `style` / `sx` / `className` | modifier chain | `Modifier` |

**Colour has a shared term.** CSS and Compose both say `color`, for text and icon alike; SwiftUI's `foregroundStyle` is the outlier. Constitution VI rule 1 (2+ code platforms agree) selects `color`.

**Type treatment has no shared term and no shared *shape*.** A text component may take a single prop naming a text style, or none at all. And a `typography` style arrives in two forms — `TokenReference` (a named text style) or a resolved `Typography` object (family, weight, size) — which want different destinations.

---

## Decision Drivers

- **Declared, not inferred.** A prop name is a fact about a code library. Guessing one produces code that does not compile
- **The mappable surface is small and known per primitive.** A design system's text component does not take `padding` as a prop. Permitting the mapping makes the contract describe libraries that do not exist
- **Defaults only where a term is genuinely shared.** A default that is right half the time is worse than none, because it fails silently
- **Everything unmapped falls back.** A style with no mapping reaches the output through the path the generator already uses, and a prop value the component does not accept falls back to the component's own default
- **No logic in configuration.** Conventions declare mappings; they do not carry expressions or conditionals
- **Absence means one thing (ADR-071).** A member absent inside a declared block takes the documented default; a block absent means no convention
- **Do not duplicate the token pipeline.** Token naming already has an owner
- **No spec-shape change (ADR-074)** and **Constitution III**

---

## Options Considered

Six decisions: the member's name, its shape, which sources are mappable per primitive, the defaults, the typography axis, and the fate of everything else.

---

## Decision 1 — What to call the member

### Option 1A: `props` *(Selected)*

**Pros**:

- Says what it produces. The right-hand side of every entry is a prop name on the bound component
- Avoids the ambiguity a style-flavoured name creates. `styleProps` invites the reader to ask "is this becoming a `propConfiguration` or a `styles` property?" — a live question in this schema, since elements carry both, and the answer is unambiguously the former
- The sources are **not** all styles. Glyph maps `content` to a `name` prop (Decision 3), so a style-flavoured name would already be wrong

**Cons / Trade-offs**:

- `props` is a common word in a schema that already has `Props`, `PropBinding`, and `propConfigurations`. Its position under a primitive binding disambiguates it, and the alternatives all carry the ambiguity above

---

### Option 1B: `styleProps` *(Rejected)*

**Rejected because**: it muddles which of the element's two channels — `styles` or `propConfigurations` — the mapping feeds, and it is inaccurate for the glyph's `content` source.

---

### Option 1C: `mappings` / `bindings` *(Rejected)*

**Rejected because**: `binding` is load-bearing already (`PropBinding`, `$binding`, `SlotBinding`, `ImageBinding`) and means a prop reference inside a spec — a different concept entirely. `mappings` says nothing about what is produced.

---

## Decision 2 — The shape of the mapping

### Option 2A: A source-to-prop-name map *(Selected)*

```yaml
primitives:
  text:
    component: DsText
    props:
      textColor: color        # source → prop name
      typography: typography
```

**Pros**:

- Lookup runs in the direction a generator walks: it iterates what the element carries and asks each thing "am I a prop?"
- A source maps to at most one prop, which keeps the mapping total and unambiguous
- Purely declarative — a two-column table, nothing to evaluate

**Cons / Trade-offs**:

- Cannot express one prop consuming several sources. No case in the closed sets of Decision 3 needs it

---

### Option 2B: Inverted — prop name to source *(Rejected)*

**Rejected because**: it inverts the generator's traversal and permits two props to claim one source with no rule for which wins.

---

### Option 2C: A template or expression per prop *(Rejected)*

**Rejected because**: it puts an evaluator in the configuration file, which every consumer must then implement identically.

---

## Decision 3 — Which sources are mappable, per primitive

### Option 3A: A closed set per primitive kind *(Selected)*

| Primitive | Mappable sources | Everything else |
|---|---|---|
| `text` | `textColor`, `typography` | Passed styling |
| `glyph` | `fillColor`, `content` | Passed styling |
| `container` | `layoutMode` (ADR-076) | Passed styling |

Each primitive kind gets its own binding type, so `text.props.padding` is a validation error rather than a mapping that silently never fires.

```yaml
primitives:
  text:
    component: DsText
    props:
      textColor: color
      typography: typography
  glyph:
    component: DsIcon
    props:
      fillColor: color
      content: name
  container:
    component: {HORIZONTAL: DsRow, VERTICAL: DsColumn, NONE: DsBox}
```

**Pros**:

- Matches what design system components actually take. Text takes a colour and a type treatment; an icon takes a colour and a name; a layout box takes a direction. Sizing, spacing, radius, and truncation are applied styling on all three
- The glyph's size comes from `width`/`height`/`layoutSizing*` as passed styling, which is where it already is — so an icon needs no size prop, and one design system's `XS`/`S`/`M` enum does not become a modelling problem for every other
- A container's `backgroundColor`, `padding`, `cornerRadius`, and `strokes` stay styling, which is what they are. Nothing tempts an author to invent props for them
- Closed sets are validatable. An open map over all of `Styles` would accept `text.props.aspectRatio` and produce nothing
- The sets are small enough to read at a glance, which is the real test of whether the contract describes reality

**Cons / Trade-offs**:

- Three binding types instead of one. The alternative is one permissive type that describes libraries that do not exist
- Widening a set is a schema change rather than a configuration change. Correct — adding a mappable source is a claim about what design systems take as props, and it should be argued once rather than per workspace
- A design system with a genuine `size` prop on its icon cannot map to it. Deliberate: sizing is expressed as sizing, and this keeps one concept in one channel

---

### Option 3B: An open map over every `Styles` key *(Rejected)*

The first draft's selection: `props` keys constrained only to the `Styles` key set.

**Rejected because**: it lets an author map `padding`, `aspectRatio`, or `rotation` on a text primitive, none of which is a prop on any design system's text component. A contract that permits configurations no library implements is a contract that has to be explained rather than read. It also cannot express the glyph's `content` source, which is not a style at all.

---

### Option 3C: Closed sets, but shared across primitives *(Rejected)*

**Rejected because**: the three sets are disjoint. `textColor` is meaningless on a container, `layoutMode` on a glyph. A shared set would be the union, which is Option 3B with extra steps.

---

## Decision 4 — Which mappings have defaults

### Option 4A: Colour and glyph name default; nothing else *(Selected)*

Inside a **declared** primitive binding:

| Primitive | Default | Basis |
|---|---|---|
| `text` | `textColor: color` | Constitution VI rule 1 — CSS and Compose agree on `color` |
| `glyph` | `fillColor: color` | Same term |
| `glyph` | `content: name` | No code-platform consensus (SwiftUI `systemName`, Compose `imageVector`); rule 3 selects for consumer clarity, and `name` is what the spec calls a glyph's content |
| `text` | `typography` — **no default** | No shared term, and many components have no such prop (Decision 5) |
| `container` | *(none)* | `layoutMode` maps to a direction prop only in the single-component idiom (ADR-076) |

An author overrides by declaring the key, and suppresses by mapping it to `null`.

**Pros**:

- Consistent with ADR-071: defaults apply *inside* a declared block, never to conjure the block itself. Declaring `text: {component: DsText}` asserts this library has a text primitive; that it takes a `color` prop is a safe read
- The colour defaults are justified by the naming survey, not by convenience
- Covers the common case with zero configuration — `glyph: {component: DsIcon}` alone emits `<DsIcon color="..." name="info" />`
- `null` gives an explicit, greppable way to say "this component has no such prop," distinct from "I forgot"

**Cons / Trade-offs**:

- SwiftUI's `foregroundStyle` means the iOS entry usually overrides. Rule 1 selects by code-platform majority; the override is one line
- `content: name` is the one default not backed by a cross-platform term

---

### Option 4B: No defaults at all *(Rejected)*

**Rejected because**: it makes the minimal useful binding four lines instead of one, for the mappings that are near-universal.

---

## Decision 5 — The typography axis

A `typography` style arrives as either a `TokenReference` (`{$token: Typography/font__200__regular}`) or a resolved `Typography` object, depending on `Settings` and on whether the designer used a text style.

### Option 5A: Two sinks — a declared prop for the token form, the passed-styling prop for the object form *(Selected)*

- **Token form** → the prop named by `props.typography`, if declared. No default
- **Object form** → the **passed-styling prop**, named by `stylesProp`. No default
- Either sink undeclared → the generator's existing style emission, unchanged (Decision 6)

```yaml
primitives:
  text:
    component: DsText
    props:
      typography: typography    # token form lands here
    stylesProp: sx              # object form joins everything else here
```

```jsx
// token form, prop declared
<DsText typography="font__200__regular">Label</DsText>

// object form — the type treatment is one part of what sx carries,
// alongside the sizing and layout styling that was never a prop
<DsText
  sx={{
    maxWidth: 384,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 400,
    WebkitLineClamp: 1,
  }}
>Label</DsText>
```

**Pros**:

- Matches how design systems work. A text component's type prop accepts *named* styles; ad-hoc family/weight/size has no prop anywhere and must go somewhere raw
- The two forms are distinguishable structurally — `TokenReference` has `$token`, the object does not — so routing needs no configuration and no inference
- `stylesProp` is the destination for **everything** unmapped (Decision 6), not a typography-specific hatch. The resolved type treatment is one contributor among several

**Cons / Trade-offs**:

- One source with two destinations is the only such case, forced by the style's own union type
- The prop's *value shape* differs per platform — a React `sx` object, a Compose `Modifier`. The convention names the prop; producing the value stays generator logic

---

### Option 5B: One typography prop, always *(Rejected)*

**Rejected because**: it cannot express the object form. A resolved `Typography` object passed to a prop expecting a named style is wrong on every platform.

---

### Option 5C: The passed-styling prop always; no typography prop *(Rejected)*

**Rejected because**: it throws away the token, which is the most valuable thing in a text element's styles. A design system's text component exists to accept `typography="font__200__regular"`.

---

### Option 5D: Split the style key in the spec *(Rejected)*

**Rejected because**: it changes the spec to solve a conventions problem, violating ADR-074, and it is a MAJOR break of a composite ADR-005 deliberately consolidated.

---

## Decision 6 — Everything else falls back

### Option 6A: Unmapped sources fall back to styling; unmatched values fall back to the component's default *(Selected)*

Two fallbacks, at two levels:

- **Unmapped source** → emitted exactly as today: into `stylesProp` if one is declared, otherwise through whatever class, inline-style, or modifier mechanism the generator already uses. Nothing is dropped
- **Unmatched value** → a prop value the component does not accept is omitted, and the component's own default applies. A design system's type prop has a reserved set of accepted names; a value outside it is simply not passed

`stylesProp` names the prop that receives passed styling. It replaces the first draft's `stylePropName`, which described the *name of a prop* rather than the prop itself.

**Pros**:

- Fidelity loss is impossible by construction. The worst outcome of an incomplete mapping is verbose output, never missing design intent
- Partial adoption is safe: declare `component` alone, get a correctly-named component with everything else behaving as before
- Sizing, spacing, and layout styling — `width`, `maxWidth`, `padding`, `itemSpacing`, `layoutSizing*` — are handled by this rule with no special case, because Decision 3 makes them unmappable everywhere
- The value-level fallback keeps the ADR out of a judgement it should not make. Whether a token name matches a component's accepted set is the design system's business; the rule is "pass it when it works, default when it does not"

**Cons / Trade-offs**:

- Output can be verbose: a component with both props and a large passed-styling object. Visible and fixable
- Detecting an unaccepted value requires the generator to know the component's accepted set, which it may not. Where it cannot tell, it passes the value through and the component's own runtime handling applies — the same outcome by a different route

---

### Option 6B: Drop unmapped sources *(Rejected)*

**Rejected because**: silent fidelity loss, worst exactly when a team is adopting the feature.

---

### Option 6C: Error on any unmapped source *(Rejected)*

**Rejected because**: Decision 3's closed sets guarantee most styles are unmapped by design. This would make generation impossible.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added `TextBinding`, `GlyphBinding`, `ContainerBinding` — one per `PrimitiveKind`, each with `component`, a closed `props?`, and `stylesProp?` | MINOR |
| `Conventions.ts` | `PlatformConventions.primitives` typed per kind rather than by one shared binding type | MINOR |
| `Conventions.ts` | `ResolvedConventions`: within a declared binding, `text.props.textColor` → `'color'`; `glyph.props.fillColor` → `'color'`; `glyph.props.content` → `'name'` | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
TextBinding:
  component: string
  props?:
    textColor?: string | null    # default 'color'
    typography?: string | null   # no default
  stylesProp?: string

GlyphBinding:
  component: string
  props?:
    fillColor?: string | null    # default 'color'
    content?: string | null      # default 'name'
  stylesProp?: string

ContainerBinding:
  component: string | {HORIZONTAL?, VERTICAL?, NONE?}   # ADR-076
  props?:
    layoutMode?: string | null   # no default
  stylesProp?: string
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `#/definitions/TextBinding`, `GlyphBinding`, `ContainerBinding`; each `props` object closed with `additionalProperties: false` and its own named properties | MINOR |
| `conventions.schema.json` | `primitives` properties `$ref` the matching per-kind definition | MINOR |

### Notes

`props` is closed per kind with `additionalProperties: false`, so a source that is not mappable for that primitive is a validation error. This is the enforcement that makes Decision 3 real rather than advisory.

Prop *names* are unconstrained strings: a prop name belongs to the target library and the schema has no standing to police it. `null` means "no prop for this source" and suppresses a default.

`stylesProp` is a **name only**. What is placed in it — an `sx` object, a `Modifier` chain — is generator logic (Constitution II).

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: each `*Binding` type ↔ its definition; each closed `props` ↔ a closed object schema with the same named properties

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | None beyond ADR-073's read-path change | Update the read path |
| `figma-from-specs` | None | Recompile |
| `react-from-specs` | Apply `props` before falling back to styling; route `typography` by form | Implement |
| `webcomponents-from-specs` | Same, with attribute-name semantics | Implement |
| `specs-cli` | Resolve the three defaults inside a declared binding | Implement resolution |
| `specs-plugin-2` | None beyond ADR-073 | Update the read path |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: additive optional fields and new definitions on types introduced in the same release. Constitution III.

---

## Consequences

- The mappable surface is small, closed, and per-primitive: text takes a colour and a type treatment, a glyph a colour and a name, a container a direction. Everything else is styling, and the schema enforces it
- Icon sizing stays sizing. A design system's icon size enum never becomes a prop-mapping problem
- The minimum useful binding is one line. `glyph: {component: DsIcon}` emits `<DsIcon color="..." name="info" />`
- Fidelity loss from an incomplete mapping is impossible; the cost is verbosity, which is visible
- Unmatched prop values fall back to the component's default rather than being forced through, so the conventions file never has to enumerate a design system's accepted value sets
- Widening a mappable set is a schema change. That is a feature: it makes "design systems take this as a prop" a claim argued once
