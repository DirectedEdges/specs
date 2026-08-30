# ADR: Mapping a Primitive's Styles onto its Component's Props

**Branch**: `075-primitive-style-prop-mapping`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-074 establishes that a `text` element resolves to a bound component at emit time. Naming the component is the easy half. The hard half is what happens to the element's styles.

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

Six styles, and they do not all want the same fate:

- `textColor` is what the component's own color prop exists for. Emitting it as an inline style on a `DsText` would defeat the point of using `DsText`
- `typography` is a token naming a text style. Whether a prop accepts it depends entirely on the design system
- `maxLines` and `textOverflow` may or may not be props
- `maxWidth` and `layoutSizingHorizontal` are layout facts about the box, not about the text

A generator that maps nothing emits `<DsText style={{color: ..., font: ...}}>` — the component in name only. A generator that maps everything invents props that do not exist. The mapping has to be declared, and the declaration has to say *which* styles become props, *what those props are called*, and *what happens to the rest*.

Two constraints from the naming survey shape the defaults:

| Concept | CSS / React | SwiftUI | Compose |
|---|---|---|---|
| Text color | `color` | `.foregroundStyle` / `.foregroundColor` | `color` param on `Text` |
| Icon color | `color` / `fill` | `.foregroundStyle` | `tint` / `color` param on `Icon` |
| Text style | `font`, `font-family`, `font-size` | `.font(...)` | `style` param (`TextStyle`) |
| Escape hatch | `style` / `sx` / `className` | modifier chain | `Modifier` |

**Color has a shared term.** CSS and Compose both say `color` for both text and icon; SwiftUI's `foregroundStyle` is the outlier. Constitution VI rule 1 (2+ code platforms agree) selects `color` as the default prop name.

**Text style has no shared term and, more importantly, no shared *shape*.** A design system's text component may take a single `typography` / `variant` / `style` prop naming a text style, or it may take no such prop at all and expect the caller to style directly. There is no defensible default. And a `typography` style in a spec arrives in two forms — `TokenReference` (a named text style) or a resolved `Typography` object (family, weight, size, line height) — which want different destinations.

---

## Decision Drivers

- **Declared, not inferred.** A prop name is a fact about a code library. Guessing one produces code that does not compile
- **Defaults only where a term is genuinely shared.** A default that is right half the time is worse than no default, because it fails silently
- **No style is silently dropped.** A style with no mapping must still reach the output through whatever path the generator already uses. Fidelity loss must be impossible by construction, not by diligence
- **No logic in configuration.** Conventions declare mappings; they do not carry expressions, transforms, or conditionals. The moment a convention needs evaluating, it has become code
- **Absence means one thing (ADR-071).** A member absent inside a declared block takes the documented default; a *block* absent means no convention. Both meanings must stay clean here
- **Do not duplicate the token pipeline.** Token naming and resolution already have an owner. A second table restating it will drift
- **Minimal, stable public API (Constitution III)** and **no spec-shape change (ADR-074)**

---

## Options Considered

Five decisions: the mapping's shape, the defaults, the typography axis, whether values are mapped as well as names, and the fate of unmapped styles.

---

## Decision 1 — The shape of the mapping

### Option 1A: `styleProps` — a style-key-to-prop-name map on the binding *(Selected)*

```yaml
platforms:
  react:
    primitives:
      text:
        component: DsText
        styleProps:
          textColor: color        # style key → prop name
          typography: variant
          maxLines: maxLines
          textOverflow: overflow
```

**Pros**:

- Keys are the spec's own `Styles` members, so the left column is a closed, validatable vocabulary the schema already owns
- Lookup runs in the direction a generator walks: it iterates the element's styles and asks each one "am I a prop?"
- A style key maps to at most one prop, which keeps the mapping total and unambiguous
- Purely declarative — a two-column table, nothing to evaluate

**Cons / Trade-offs**:

- Cannot express one prop consuming several styles (a `spacing` prop fed by `padding` *and* `itemSpacing`). No current case needs it, and the inverse map would trade this for a worse ambiguity

---

### Option 1B: `props` — a prop-name-to-style-key map, inverted *(Rejected)*

```yaml
props:
  color: textColor
```

**Rejected because**: it inverts the generator's traversal. Walking an element's styles and reverse-searching the map for each is O(n·m) and, worse, permits two props to claim one style with no rule for which wins. The forward direction cannot express that ambiguity at all.

---

### Option 1C: A template or expression per prop *(Rejected)*

```yaml
props:
  color: "{{ styles.textColor.$token | tokenName }}"
```

**Rejected because**: it puts an evaluator in the configuration file. Every consumer — CLI, plugin, three generators — would need the same expression semantics, and divergence between them produces exactly the silent drift ADR-071 exists to prevent. It also violates the "declare, do not compute" driver outright.

---

## Decision 2 — Which mappings have defaults

### Option 2A: Color defaults per primitive kind; nothing else defaults *(Selected)*

Inside a **declared** primitive binding, one member resolves:

| Primitive | Default `styleProps` entry | Basis |
|---|---|---|
| `text` | `textColor: color` | Constitution VI rule 1 — CSS and Compose agree on `color` |
| `glyph` | `fillColor: color` | Same term; `fillColor` is the spec's glyph fill key (ADR-013) |
| `container` | *(none)* | `backgroundColor` has no shared prop name; layout containers vary too widely |

An author overrides by declaring the key. An author *suppresses* it by mapping it to `null`.

```yaml
text:
  component: DsText            # textColor → color, by default

glyph:
  component: DsIcon
  styleProps:
    fillColor: tint            # override — this library says tint
    size: size

container:
  component: DsBox
  styleProps:
    backgroundColor: background   # no default; declared explicitly
```

**Pros**:

- Consistent with ADR-071's resolution rule: defaults apply *inside* a declared block, never to conjure the block itself. Declaring `text: {component: DsText}` is an assertion that this library has a text primitive, and a text primitive taking a `color` prop is a safe read
- The default is justified by the naming survey rather than by convenience — it is the one term two code platforms share
- Covers the overwhelmingly common case with zero configuration, which is what makes the feature adoptable
- `null` gives an explicit, greppable way to say "this component has no color prop," distinct from "I forgot"

**Cons / Trade-offs**:

- SwiftUI's `foregroundStyle` means the iOS entry almost always overrides. Acceptable — rule 1 selects by code-platform majority, and the override is one line
- Two spellings of "no mapping" (absent-and-defaulted-away vs. explicit `null`) is a subtlety readers must learn

---

### Option 2B: No defaults at all — every mapping declared *(Rejected)*

**Rejected because**: it makes the minimal useful binding four lines instead of one, for the one mapping that is near-universal. ADR-071 explicitly provides for defaults inside a declared block, and this is the clearest case for one.

---

### Option 2C: A rich default table — `maxLines`, `textOverflow`, `padding`, and more *(Rejected)*

**Rejected because**: none of these clear the shared-term bar. `maxLines` is CSS `-webkit-line-clamp`, SwiftUI `lineLimit`, Compose `maxLines`; `textOverflow` is CSS `text-overflow`, Compose `overflow`, SwiftUI `truncationMode`. Defaulting them would emit props that do not exist on two platforms out of three, and the failure is a compile error attributed to the tool.

---

## Decision 3 — The typography axis

A `typography` style arrives as either a `TokenReference` (`{$token: Typography/font__200__regular}`) or a resolved `Typography` object (`{fontFamily, fontSize, fontWeight, lineHeight, ...}`), depending on `Settings` and on whether the designer used a text style. These want different destinations, and neither has a defensible default prop.

### Option 3A: Two sinks — a declared prop for the token form, a declared escape hatch for the object form *(Selected)*

- **Token form** → the prop named by `styleProps.typography`, if declared. No default
- **Object form** → the **style escape hatch**, a prop named by a new `stylePropName` member on the binding. No default
- Either sink undeclared → the generator's existing style emission for that style, unchanged (Decision 5)

```yaml
platforms:
  react:
    primitives:
      text:
        component: DsText
        styleProps:
          typography: typography   # token form lands here
        stylePropName: sx          # object form lands here
  swiftui:
    primitives:
      text:
        component: Text
        stylePropName: modifier    # no typography prop on this component
```

```jsx
// token form, prop declared
<DsText typography="font__200__regular">Label</DsText>

// object form, escape hatch declared
<DsText sx={{fontFamily: 'Inter', fontSize: 14, fontWeight: 400}}>Label</DsText>
```

**Pros**:

- Matches how design systems actually work. A text component's variant prop accepts *named* styles; ad-hoc family/weight/size has no prop anywhere and must go somewhere raw
- The two forms are distinguishable structurally — `TokenReference` has `$token`, the object does not — so routing needs no configuration and no inference
- `stylePropName` is useful well beyond typography: it is the destination for **every** unmapped style (Decision 5), which is what makes Decision 5's no-drop guarantee implementable
- Honest about the absence of a default, which was the finding rather than a gap

**Cons / Trade-offs**:

- One style key with two destinations is the only such case in the mapping. It is a real asymmetry, forced by the style's own union type
- The escape hatch's *value shape* differs per platform — a React `sx` object, a SwiftUI modifier chain. The convention names the prop; producing the value stays generator logic, as it must

---

### Option 3B: One `typography` prop, always *(Rejected)*

**Rejected because**: it cannot express the object form. A resolved `Typography` object passed to a `variant` prop that expects a named style is wrong on every platform, and the alternative — dropping it — loses the design's actual type treatment.

---

### Option 3C: The escape hatch always; no typography prop *(Rejected)*

**Rejected because**: it throws away the token, which is the single most valuable thing in a text element's styles. A design system's text component exists precisely to accept `typography="font__200__regular"`; emitting the resolved font stack instead bypasses the system.

---

### Option 3D: Split the style key in the spec into `typographyToken` and `typography` *(Rejected)*

**Rejected because**: it changes the spec to solve a conventions problem, violating ADR-074's no-spec-change outcome, and it is a MAJOR break of `Styles` — which ADR-005 deliberately consolidated into one composite.

---

## Decision 4 — Are values mapped, or only names?

`typography: {$token: Typography/font__200__regular}` maps to a `typography` prop. Is the emitted value `"font__200__regular"`, or does the design system's prop take `"body-200"`?

### Option 4A: Names only — the value passes through the generator's existing token resolution *(Selected)*

Conventions map style keys to prop names. The **value** is produced exactly as that generator already produces token values today, with the same token-naming and token-resolution behavior it applies everywhere else.

**Pros**:

- One owner for token naming. A second table restating `Typography/font__200__regular → body-200` for every token, per platform, would be large, hand-maintained, and drift from the token source the day a token is renamed
- Keeps the convention a two-column table with no evaluation, satisfying the no-logic driver
- If a design system's prop values *are* its token names — the common case when the tokens and the components ship together — this is already correct with zero configuration
- Constitution III: the smallest surface that solves the stated problem

**Cons / Trade-offs**:

- **A design system whose prop enums genuinely differ from its token names is not served.** This is the real limitation of the selected option, and the most likely reason to revisit it
- The workaround — align the token names, or handle the transform in the generator's token layer — pushes work outside conventions, where it may be less visible

---

### Option 4B: A per-prop `values` map in conventions *(Rejected)*

```yaml
styleProps:
  typography:
    prop: variant
    values:
      Typography/font__200__regular: body-200
```

**Rejected because**: it is an unbounded, hand-maintained table duplicating the token pipeline, multiplied by the number of platforms. It drifts on the first token rename, and the drift is silent — an unmapped token falls through to its raw name and produces a prop value that does not compile. The problem it solves is a token-naming problem and should be solved where token names are owned.

Worth reconsidering if a bounded case appears — a handful of enum-valued props, not a whole token namespace.

---

### Option 4C: A declarative name transform — `stripPrefix`, `case` *(Rejected)*

**Rejected because**: it is 1C in miniature. Every consumer must implement identical transform semantics, and the set of needed transforms grows without limit.

---

## Decision 5 — What happens to unmapped styles

### Option 5A: Fall through to the generator's existing style path *(Selected)*

A style with no `styleProps` entry is emitted exactly as it is today: into `stylePropName` if one is declared, otherwise through whatever class, inline-style, or modifier mechanism the generator already uses. **Nothing is dropped.**

**Pros**:

- Fidelity loss is impossible by construction. The worst outcome of an incomplete mapping is verbose output, never missing design intent
- Makes partial adoption safe: declare `component` alone, get a correctly-named component with everything else behaving as before, then add mappings incrementally
- Layout and sizing styles — `width`, `maxWidth`, `padding`, `layoutSizingHorizontal`, `itemSpacing` — are handled by this rule with no special case, because they are simply unmapped by default (ADR-076 Decision 2 covers declaring them)

**Cons / Trade-offs**:

- Output can be noisy: a component with both props and a large escape-hatch object. Visible and fixable, which is the point
- A style that a component *would* reject as an inline style still gets emitted. That is a real code error, but a loud one

---

### Option 5B: Drop unmapped styles *(Rejected)*

**Rejected because**: silent fidelity loss, and the loss is proportional to how incomplete the mapping is — worst exactly when a team is adopting the feature.

---

### Option 5C: Error on any unmapped style *(Rejected)*

**Rejected because**: no design system component accepts every style as a prop. `rotation`, `opacity`, and `aspectRatio` will never be props on a text component, so this makes a complete mapping impossible and blocks generation on a condition that cannot be satisfied.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added `PrimitiveBinding.styleProps?: Partial<Record<keyof Styles, string \| null>>` | MINOR |
| `Conventions.ts` | Added `PrimitiveBinding.stylePropName?: string` | MINOR |
| `Conventions.ts` | `ResolvedConventions`: within a declared `text` binding, `styleProps.textColor` resolves to `'color'`; within a declared `glyph` binding, `styleProps.fillColor` resolves to `'color'` | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PrimitiveBinding:
  component: ...            # ADR-074, ADR-076
  styleProps?:              # style key → prop name, or null to suppress
    textColor: color
    typography: typography
  stylePropName?: sx        # destination for unmapped and object-form styles
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `styleProps` to `#/definitions/PrimitiveBinding` — an object whose property names are constrained to the `Styles` key set, values `{type: [string, "null"]}` | MINOR |
| `conventions.schema.json` | Added `stylePropName` (`type: string`) to `#/definitions/PrimitiveBinding` | MINOR |

### Notes

`styleProps` keys are constrained to `Styles` members so a typo — `textColour`, `fontColor` — is a validation error rather than a mapping that silently never fires. This is the same reason `PrimitiveKind` is closed (ADR-074).

Values are unconstrained strings: a prop name belongs to the target code library and the schema has no standing to police it. `null` means "no prop for this style" and suppresses a default.

`stylePropName` is a **name only**. What is placed in it — an `sx` object, a `style` dictionary, a modifier chain — is generator logic (Constitution II).

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `PrimitiveBinding.styleProps` ↔ `#/definitions/PrimitiveBinding/properties/styleProps` with `propertyNames.enum` = the `Styles` key set; `stylePropName` ↔ the sibling string property. The `Styles` key enum must be generated from, or validated against, `styles.schema.json` so the two cannot drift

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | None | Recompile |
| `figma-from-specs` | None | Recompile |
| `react-from-specs` | Apply `styleProps` before falling back to its existing style path; route `typography` by form | Implement |
| `webcomponents-from-specs` | Same, with attribute-name semantics | Implement |
| `specs-cli` | Resolve the two color defaults inside a declared binding | Implement resolution |
| `specs-plugin-2` | None | Recompile |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: additive optional fields on a type introduced in the same release; no existing member changes meaning. Constitution III.

---

## Consequences

- The minimum useful binding is one line. `text: {component: DsText}` emits `<DsText color="...">` with every other style behaving exactly as before
- Fidelity loss from an incomplete mapping is impossible; the cost of incompleteness is verbosity, which is visible
- `stylePropName` is the single destination for everything a component cannot take as a prop, which is what makes the no-drop guarantee implementable rather than aspirational
- Token *values* are not remappable in conventions (Decision 4). A design system whose prop enums diverge from its token names must align them or handle it in its generator's token layer. **This is the most likely member of this ADR set to need revisiting**
- The `Styles` key set becomes part of the conventions schema's validation surface, so adding a style key must also extend that enum
