# ADR: `props` — a Closed, Concept-Keyed Map onto a Component's Props

**Branch**: `075-primitive-style-prop-mapping`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: A closed `props` map on each binding routes `color`, `typography`, `content` and `direction` onto a platform's own prop names.
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

The mappable surface is small, and small in a **specific, per-primitive way**:

- **Text** takes a colour, its content, and a type treatment. Nothing else
- **Glyph** takes a colour and its content — the glyph name. Its size comes from sizing and layout styling, not from a prop
- **Container** takes a direction, and only in the idiom where direction is a prop rather than a component choice (ADR-076). `backgroundColor`, `padding`, `cornerRadius`, `strokes` are applied styling

Two constraints from the naming survey shape the defaults:

| Concept | CSS / React | SwiftUI | Compose |
|---|---|---|---|
| Text colour | `color` | `.foregroundStyle` | `color` param on `Text` |
| Icon colour | `color` / `fill` | `.foregroundStyle` | `tint` / `color` param on `Icon` |
| Type treatment | `font`, `font-family` | `.font(...)` | `style` param (`TextStyle`) |
| Glyph content | `name` (varies) | `systemName` | `imageVector` |
| Passed styling | `style` / `sx` / `className` | modifier chain | `Modifier` |

**Colour has a shared term.** CSS and Compose both say `color`, for text and icon alike; SwiftUI's `foregroundStyle` is the outlier. Constitution VI rule 1 (2+ code platforms agree) selects `color`.

**Type treatment and glyph content do not.** Neither has a cross-platform term, and a text component may take no type prop at all. And a `typography` style arrives in two forms — `TokenReference` (a named text style) or a resolved `Typography` object — which want different destinations.

---

## Decision Drivers

- **Declared, not inferred.** A prop name is a fact about a code library. Guessing one produces code that does not compile
- **The mappable surface is small and known per primitive.** A design system's text component does not take `padding` as a prop. Permitting the mapping makes the contract describe libraries that do not exist
- **One concept, one key.** A concept expressed with two different spellings on two primitives is a contract that has to be memorized rather than read
- **Defaults only where a term is genuinely shared** — or where the concept's own name is the obvious neutral choice
- **Everything unmapped falls back.** An unmapped source reaches the output through the path the generator already uses; a prop value the component does not accept falls back to the component's own default
- **No logic in configuration.** Conventions declare mappings; they do not carry expressions or conditionals
- **Absence means one thing (ADR-071)** — a member absent inside a declared block takes the documented default; a block absent means no convention
- **Do not duplicate the token pipeline**, **no spec-shape change (ADR-074)**, **Constitution III**

---

## Options Considered

Seven decisions: the member's name, its shape, what its keys name, which concepts are mappable per primitive, the defaults, the typography axis, and the fate of everything else.

---

## Decision 1 — What to call the member

### Option 1A: `props` *(Selected)*

**Pros**:

- Says what it produces. The right-hand side of every entry is a prop name on the bound component
- Avoids the ambiguity a style-flavoured name creates. `styleProps` invites the reader to ask "is this becoming a `propConfiguration` or a `styles` property?" — a live question in this schema, since elements carry both, and the answer is unambiguously the former
- The sources are **not** all styles. Glyph maps its `content`, so a style-flavoured name would already be wrong

**Cons / Trade-offs**:

- `props` is a common word in a schema that already has `Props`, `PropBinding`, and `propConfigurations`. Its position under a primitive binding disambiguates it, and the alternatives carry the ambiguity above

---

### Option 1B: `styleProps` *(Rejected)*

**Rejected because**: it muddles which of the element's two channels — `styles` or `propConfigurations` — the mapping feeds, and it is inaccurate for the glyph's content.

---

### Option 1C: `mappings` / `bindings` *(Rejected)*

**Rejected because**: `binding` is load-bearing already (`PropBinding`, `$binding`, `SlotBinding`, `ImageBinding`) and means a prop reference inside a spec — a different concept. `mappings` says nothing about what is produced.

---

## Decision 2 — The shape of the mapping

### Option 2A: A key-to-prop-name map *(Selected)*

```yaml
primitives:
  text:
    component: DsText
    props:
      color: color            # key → prop name
      typography: typography
```

**Pros**:

- Lookup runs in the direction a generator walks: it iterates what the element carries and asks each thing "am I a prop?"
- A key maps to at most one prop, which keeps the mapping total and unambiguous
- Purely declarative — a two-column table, nothing to evaluate

**Cons / Trade-offs**:

- Cannot express one prop consuming several keys. No case in the closed sets of Decision 4 needs it

---

### Option 2B: Inverted — prop name to key *(Rejected)*

**Rejected because**: it inverts the generator's traversal and permits two props to claim one key with no rule for which wins.

---

### Option 2C: A template or expression per prop *(Rejected)*

**Rejected because**: it puts an evaluator in the configuration file, which every consumer must then implement identically.

---

## Decision 3 — What the map's keys name

### Option 3A: Concepts *(Selected)*

The key names the **concept being mapped**, not the spec member that happens to carry it. Which member feeds a concept is fixed per primitive and is the transformer's business, not the author's:

| Primitive | Concept key | Fed by |
|---|---|---|
| `text` | `color` | `Styles.textColor` |
| `text` | `content` | `Element.content` |
| `text` | `typography` | `Styles.typography` |
| `glyph` | `color` | `Styles.fillColor` |
| `glyph` | `content` | `Element.content` |
| `container` | `direction` | `Styles.layoutMode` |

```yaml
text:
  props:
    color: color
glyph:
  props:
    color: tint       # same concept, same key, different prop
```

**Pros**:

- One concept, one key. Colour is `color` on both text and glyph, where spec-key naming would say `textColor` on one and `fillColor` on the other — two spellings of one idea, for a reason (which `Styles` member holds it) that an author configuring a code library has no reason to care about
- The keys read as a vocabulary rather than as an index into another type. `color`, `typography`, `content`, `direction` is a list a design system author recognizes; `textColor`, `fillColor`, `layoutMode` is a list they have to translate
- Makes the identity defaults of Decision 5 natural: the neutral prop name for the `color` concept is `color`
- Decouples the contract from `Styles`. Renaming or recomposing a style member does not churn the conventions vocabulary, and the `Styles` key set stops being part of the conventions schema's validation surface
- `content` is not a style at all, so a spec-key vocabulary was already mixed — concepts make the set coherent

**Cons / Trade-offs**:

- One indirection to learn: `color` on a glyph means `fillColor`. Documented in the type, and the alternative is the same indirection with a worse-fitting name
- Two concepts could in principle be fed by one member, or one concept by different members on different primitives. The second already happens (colour), by design; the first does not arise in the closed sets

---

### Option 3B: Spec keys — `textColor`, `fillColor`, `layoutMode` *(Rejected)*

The previous draft's selection.

**Rejected because**: it splits one concept across two keys for a reason internal to `Styles`, and it cannot name the glyph's content, which is not a style. It also ties the conventions vocabulary to a type it has no reason to track.

---

### Option 3C: Target prop names as keys, with the concept implicit *(Rejected)*

**Rejected because**: it is Decision 2's rejected inversion wearing different clothes — the key would vary per platform, so no two platform entries would share a vocabulary and nothing could be validated.

---

## Decision 4 — Which concepts are mappable, per primitive

### Option 4A: A closed set per primitive kind *(Selected)*

| Primitive | Mappable concepts | Everything else |
|---|---|---|
| `text` | `color`, `content`, `typography` | Passed styling |
| `glyph` | `color`, `content` | Passed styling |
| `container` | `direction` | Passed styling |

Each kind gets its own binding type, so `text.props.padding` is a validation error rather than a mapping that silently never fires.

```yaml
primitives:
  text:
    component: DsText
    props:
      typography: typography
  glyph:
    component: DsIcon
  container:
    component: {HORIZONTAL: DsRow, VERTICAL: DsColumn, NONE: DsBox}
```

**Pros**:

- Matches what design system components actually take. Text takes a colour and a type treatment; an icon takes a colour and a name; a layout box takes a direction. Sizing, spacing, radius, and truncation are applied styling on all three
- A glyph's size comes from `width`/`height`/`layoutSizing*` as passed styling, which is where it already is — so an icon needs no size prop, and one design system's `XS`/`S`/`M` enum does not become a modelling problem for every other
- A container's `backgroundColor`, `padding`, `cornerRadius`, `strokes`, and `backgroundImage` stay styling, which is what they are
- Closed sets are validatable. An open map would accept `text.props.aspectRatio` and produce nothing
- The sets are small enough to read at a glance, which is the real test of whether the contract describes reality

**Cons / Trade-offs**:

- Three binding types instead of one. The alternative is one permissive type that describes libraries that do not exist
- Widening a set is a schema change rather than a configuration change. Correct — adding a mappable concept is a claim about what design systems take as props, argued once rather than per workspace
- A design system with a genuine `size` prop on its icon cannot map to it. Deliberate: sizing is expressed as sizing, keeping one concept in one channel

---

### Option 4B: An open map over every concept *(Rejected)*

**Rejected because**: it lets an author map padding or rotation on a text primitive, neither of which is a prop on any design system's text component. A contract that permits configurations no library implements has to be explained rather than read.

---

### Option 4C: Closed sets, but shared across primitives *(Rejected)*

**Rejected because**: the sets overlap only on `color`. A shared set would be their union, which is Option 4B with extra steps, and it would permit `typography` on a container.

---

## Decision 5 — Which mappings have defaults

### Option 5A: The concept's own name, where a survey supports it or nothing better exists *(Selected)*

Inside a **declared** primitive binding:

| Primitive | Concept | Default | Basis |
|---|---|---|---|
| `text` | `color` | `color` | Constitution VI rule 1 — CSS and Compose agree |
| `glyph` | `color` | `color` | Same term |
| `text` | `content` | *(none)* | Absence is not "no channel": it means the component takes content as **children**, the common code shape (`<DsText>Label</DsText>`). Naming a prop says it takes the string instead (`<EgdsText text="Label" />`) |
| `glyph` | `content` | `content` | No code-platform consensus (SwiftUI `systemName`, Compose `imageVector`); rule 3 selects for consumer clarity, and the concept's own name is the neutral choice. A glyph's content **defaults to a prop** where text's does not, because an icon's name cannot be children |
| `text` | `typography` | *(none)* | No shared term, and many components have no such prop (Decision 6) |
| `container` | `direction` | *(none)* | Meaningful only in the single-component idiom (ADR-076) |

An author overrides by declaring the key, and suppresses by mapping it to `null`.

**Pros**:

- Consistent with ADR-071: defaults apply *inside* a declared block, never to conjure the block itself. Declaring `text: {component: DsText}` asserts this library has a text primitive; that it takes a `color` prop is a safe read
- The colour defaults are justified by the naming survey, not by convenience
- Where no survey settles it, the concept's own name is the honest neutral. `content: content` says "this prop carries the glyph's content" and imports no platform's idiom — where `name` silently picked React's
- Covers the common case with zero configuration: `glyph: {component: DsIcon}` alone emits `<DsIcon color="..." content="info" />`
- `null` is an explicit, greppable way to say "this component has no such prop," distinct from "I forgot"

**Cons / Trade-offs**:

- SwiftUI's `foregroundStyle` means the iOS entry usually overrides. Rule 1 selects by code-platform majority; the override is one line
- `content` as a prop name is less idiomatic than `name` in a React design system. It is a default, and `content: name` is one line

---

### Option 5B: `content` defaults to `name` *(Rejected)*

**Rejected because**: `name` is one platform's spelling presented as neutral. SwiftUI says `systemName`, Compose `imageVector`, and no two agree — so rule 1 yields nothing and rule 2 would have to nominate a single strong platform, which for an icon's identifier is arbitrary. The concept's own name imports nothing.

---

### Option 5C: No defaults at all *(Rejected)*

**Rejected because**: it makes the minimal useful binding four lines instead of one, for the mappings that are near-universal.

---

## Decision 6 — The typography axis

A `typography` style arrives as either a `TokenReference` (`{$token: Typography/font__200__regular}`) or a resolved `Typography` object, depending on `Settings` and on whether the designer used a text style.

### Option 6A: Two sinks — a declared prop for the token form, the passed-styling prop for the object form *(Selected)*

- **Token form** → the prop named by `props.typography`, if declared. No default
- **Object form** → the **passed-styling prop**, named by `stylesProp`. No default
- Either sink undeclared → the generator's existing style emission, unchanged (Decision 7)

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
- `stylesProp` is the destination for **everything** unmapped (Decision 7), not a typography-specific hatch. The resolved type treatment is one contributor among several

**Cons / Trade-offs**:

- One concept with two destinations is the only such case, forced by the style's own union type
- The prop's *value shape* differs per platform — a React `sx` object, a Compose `Modifier`. The convention names the prop; producing the value stays generator logic

---

### Option 6B: One typography prop, always *(Rejected)*

**Rejected because**: a resolved `Typography` object passed to a prop expecting a named style is wrong on every platform.

---

### Option 6C: The passed-styling prop always; no typography prop *(Rejected)*

**Rejected because**: it throws away the token, which is the most valuable thing in a text element's styles.

---

### Option 6D: Split the style key in the spec *(Rejected)*

**Rejected because**: it changes the spec to solve a conventions problem, violating ADR-074, and is a MAJOR break of a composite ADR-005 deliberately consolidated.

---

## Decision 7 — Everything else falls back

### Option 7A: Unmapped sources fall back to styling; unmatched values fall back to the component's default *(Selected)*

- **Unmapped source** → emitted exactly as today: into `stylesProp` if declared, otherwise through whatever class, inline-style, or modifier mechanism the generator already uses. Nothing is dropped
- **Unmatched value** → a prop value the component does not accept is omitted, and the component's own default applies. A design system's type prop has a reserved set of accepted names; a value outside it is simply not passed

`stylesProp` names the prop that receives passed styling. It replaces the first draft's `stylePropName`, which named a prop's name rather than the prop.

**Pros**:

- Fidelity loss is impossible by construction. The worst outcome of an incomplete mapping is verbose output, never missing design intent
- Partial adoption is safe: declare `component` alone, get a correctly-named component with everything else behaving as before
- Sizing, spacing, and layout styling are handled with no special case, because Decision 4 makes them unmappable everywhere
- The value-level fallback keeps the ADR out of a judgement it should not make. Whether a token name matches a component's accepted set is the design system's business

**Cons / Trade-offs**:

- Output can be verbose: a component with both props and a large passed-styling object. Visible and fixable
- Detecting an unaccepted value requires the generator to know the component's accepted set, which it may not. Where it cannot tell, it passes the value through and the component's own runtime handling applies — the same outcome by a different route

---

### Option 7B: Drop unmapped sources *(Rejected)*

**Rejected because**: silent fidelity loss, worst exactly when a team is adopting the feature.

---

### Option 7C: Error on any unmapped source *(Rejected)*

**Rejected because**: Decision 4's closed sets guarantee most styles are unmapped by design.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added `TextBinding`, `GlyphBinding`, `ContainerBinding` — one per `PrimitiveKind`, each with `component`, a closed concept-keyed `props?`, and `stylesProp?` | MINOR |
| `Conventions.ts` | `TextBinding.props.content` — the text string's destination. No default: absent = children, a name = that prop, `null` = no channel | MINOR |
| `Conventions.ts` | `PlatformConventions.primitives` typed per kind rather than by one shared binding type | MINOR |
| `Conventions.ts` | `ResolvedConventions`: within a declared binding, `text.props.color` → `'color'`; `glyph.props.color` → `'color'`; `glyph.props.content` → `'content'` | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
TextBinding:
  component: string
  props?:
    color?: string | null        # from Styles.textColor; default 'color'
    content?: string | null      # from Element.content; no default = children
    typography?: string | null   # from Styles.typography; no default
  stylesProp?: string

GlyphBinding:
  component: string
  props?:
    color?: string | null        # from Styles.fillColor; default 'color'
    content?: string | null      # from Element.content; default 'content'
  stylesProp?: string

ContainerBinding:
  component: string | {HORIZONTAL?, VERTICAL?, NONE?}   # ADR-076
  props?:
    direction?: string | null    # from Styles.layoutMode; no default
  stylesProp?: string
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `#/definitions/TextBinding`, `GlyphBinding`, `ContainerBinding`; each `props` object closed with `additionalProperties: false` and its own named concept properties | MINOR |
| `conventions.schema.json` | `primitives` properties `$ref` the matching per-kind definition | MINOR |

### Notes

`props` is closed per kind with `additionalProperties: false`, so a concept that is not mappable for that primitive is a validation error. This is the enforcement that makes Decision 4 real rather than advisory.

The keys are **concepts**, not `Styles` members. Which member feeds each concept is documented on the type and fixed per primitive; the `Styles` key set is therefore *not* part of the conventions schema's validation surface, and renaming a style member does not churn this vocabulary.

Prop *names* are unconstrained strings: a prop name belongs to the target library and the schema has no standing to police it. `null` means "no prop for this concept" and suppresses a default.

`stylesProp` is a **name only**. What is placed in it — an `sx` object, a `Modifier` chain — is generator logic (Constitution II).

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: each `*Binding` type ↔ its definition; each closed `props` ↔ a closed object schema with the same named concept properties

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

- The mappable surface is a small, closed, concept-keyed set per primitive: text takes a colour, its content and a type treatment; a glyph a colour and its content; a container a direction. Everything else is styling, and the schema enforces it
- One concept, one key. `color` means colour on both text and glyph; which `Styles` member feeds it is the transformer's business
- The conventions vocabulary is decoupled from `Styles`. Renaming a style member does not touch this contract
- Icon sizing stays sizing. A design system's icon size enum never becomes a prop-mapping problem
- The minimum useful binding is one line. `glyph: {component: DsIcon}` emits `<DsIcon color="..." content="info" />`
- Fidelity loss from an incomplete mapping is impossible; the cost is verbosity, which is visible
- Unmatched prop values fall back to the component's default, so the conventions file never enumerates a design system's accepted value sets
- Widening a mappable set is a schema change. That is a feature: it makes "design systems take this as a prop" a claim argued once
