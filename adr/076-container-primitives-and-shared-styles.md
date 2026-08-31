# ADR: Direction-Keyed Container Bindings, and a Platform-Level `stylesProp`

**Branch**: `076-container-primitives-and-shared-styles`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: `ContainerBinding.component` accepts a `LayoutMode`-keyed map, and a platform-level `stylesProp` sets the baseline each primitive may override.
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Text and glyph each resolve to one component. Containers do not, because design systems split the layout primitive two ways:

- **One component, a direction prop** — `<DsLayout direction="horizontal">`, `<Stack direction="row">`
- **A pair (or trio) of components** — `<DsRow>` / `<DsColumn>`, `HStack` / `VStack`, `Row()` / `Column()`

The second is at least as common as the first, and SwiftUI and Compose both ship it as the idiom. A binding that only accepts a single component name cannot serve them; one that only accepts a pair cannot serve `DsLayout`.

The spec carries the discriminator already. `Styles.layoutMode` is `LayoutMode | null`, tracking Figma's auto-layout: horizontal, vertical, or none. The third case is real and distinct — a container with no auto-layout is a positioning box, not a degenerate row.

The second question here is whether anything in a primitive binding wants hoisting to the platform level. ADR-075 answers most of it: `props` is closed per primitive and concept-keyed — `color`/`typography`, `color`/`content`, `direction`. The only concept shared across kinds is `color`, whose prop name is already defaulted, so there is nothing worth hoisting. One member remains, and it is the same on every primitive a platform declares: the prop that receives passed styling.

---

## Decision Drivers

- **Both container idioms are real.** Neither may be forced into the other's shape — the argument ADR-063 made for the two image patterns
- **The discriminator must already be in the spec.** Selecting a component from a fact the spec does not carry is inference, which ADR-074 rules out
- **`layoutMode: NONE` is a case, not a gap.** A non-auto-layout container must resolve to something
- **Declare a repeated fact once.** Repetition across primitives is the drift risk ADR-071 exists to eliminate
- **Do not build a merge machine for one member.** Any hoisting must stay small enough to state in a sentence
- **Additive-only** and **no spec-shape change** (ADR-074)

---

## Options Considered

Three decisions: the shape of a container binding, what hoists to the platform level, and how the two levels resolve.

---

## Decision 1 — Single component versus a pair

### Option 1A: `component` is either a name or a `layoutMode`-keyed map *(Selected)*

```yaml
# pair form — the design system ships Row and Column
container:
  component:
    HORIZONTAL: DsRow
    VERTICAL: DsColumn
    NONE: DsBox

# single form — the design system ships one layout component
container:
  component: DsLayout
  props:
    direction: direction

# SwiftUI
container:
  component:
    HORIZONTAL: HStack
    VERTICAL: VStack
    NONE: ZStack
```

The map's keys are exactly the `LayoutMode` values. A generator reads the element's `layoutMode` and indexes; the single form is a name and needs no index.

**Pros**:

- Expresses both idioms in their own terms, neither deformed into the other. The single form stays one line
- The discriminator is `Styles.layoutMode`, already in every spec. No inference, no new spec member
- `NONE` gets an explicit slot, so a non-auto-layout container has a declared answer rather than falling through
- The keyed form is the union, not a replacement: the single form composed with `props: {direction: direction}` remains fully expressible
- `direction` is the container's only mappable concept (ADR-075 Decision 4), and this is why — it is a prop in one idiom and a component selector in the other

**Cons / Trade-offs**:

- `component` is a union of string and object, so consumers branch on its form. One `typeof` check; the alternative (two members with "exactly one must be present") is worse
- A partial map — `HORIZONTAL` and `VERTICAL` declared, `NONE` omitted — is legal. Omission means no binding for that mode and the element falls back to the generator's host element. Consistent with ADR-071's absence rule, but a way to be quietly incomplete

---

### Option 1B: Single component only, with `layoutMode` mapped to a direction prop *(Rejected)*

**Rejected because**: it cannot express `DsRow`/`DsColumn`. There is no direction prop to map to and no single component to name — the choice of *component* is the choice of direction.

---

### Option 1C: Separate primitive kinds — `row`, `column`, `box` *(Rejected)*

**Rejected because**: the spec has no `row` element; it has a `container` with a `layoutMode`. Inventing conventions-only kinds means the vocabulary stops corresponding to anything a spec contains, and the single-component library would declare `DsLayout` three times.

---

### Option 1D: A list of conditional rules — match on any style, select a component *(Rejected)*

**Rejected because**: it is a rules engine in a configuration file. Ordering, specificity, and conflict resolution become semantics every consumer must implement identically.

---

## Decision 2 — What hoists to the platform level

### Option 2A: `stylesProp` only *(Selected)*

`PlatformConventions` gains `stylesProp`. `props` does not hoist.

```yaml
platforms:
  react:
    stylesProp: sx            # one passed-styling prop for the platform
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

- `stylesProp` is genuinely a platform fact. A React design system passes styling through `sx` on every component; SwiftUI through a modifier chain. Repeating it under each primitive is the most-repeated line in the file and the one most likely to drift
- `props` has nothing worth hoisting. ADR-075's closed sets overlap only on `color`, whose prop name is already defaulted to `color` inside any declared binding — so a shared map would carry at most one entry that a default already supplies
- Keeps the hoisting to a single scalar, so Decision 3 is one sentence rather than a merge algorithm

**Cons / Trade-offs**:

- Two levels for one member. Justified by that member being the same across primitives and different across platforms — the exact profile for hoisting

---

### Option 2B: Hoist `props` as well, as a shared baseline overlaid per primitive *(Rejected)*

The first draft's selection, motivated by sizing and layout keys (`maxWidth`, `padding`, `layoutSizingHorizontal`) appearing on every primitive.

**Rejected because**: ADR-075 Decision 4 removed the motivation. Those keys are not mappable on *any* primitive — sizing, spacing, and layout are passed styling everywhere, not props — so the shared map would hold nothing but `color`, which a default already supplies. A baseline `props` map is dead structure that would still cost a per-key merge rule and an override-with-`null` convention.

---

### Option 2C: Hoist nothing *(Rejected)*

**Rejected because**: `stylesProp` would then be restated on every declared primitive, identically, for no reason.

---

### Option 2D: A named, referenceable mapping set, referenced by primitives *(Rejected)*

**Rejected because**: indirection bought for a one-member problem.

---

## Decision 3 — How the two levels resolve

### Option 3A: The primitive's `stylesProp` if declared, otherwise the platform's *(Selected)*

> `stylesProp` is a single value: the primitive's if declared, otherwise the platform's. `props` exists only on the primitive and is never merged.

**Pros**:

- One sentence, one member, no depth. The override semantics every configuration reader expects
- Resolution produces a complete binding per primitive, so a generator reads one object and never merges at emit time
- Nothing to specify about `props`, because nothing merges

**Cons / Trade-offs**:

- A primitive that should pass *no* styling cannot say so, since there is no `null` form for a scalar here. If that case appears, `stylesProp: null` is an additive widening

---

### Option 3B: Concatenate or merge both levels *(Rejected)*

**Rejected because**: two destinations for one element's passed styling is not a thing any platform can emit.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | `ContainerBinding.component` is `string \| Partial<Record<LayoutMode, string>>` | MINOR |
| `Conventions.ts` | Added `PlatformConventions.stylesProp?: string` | MINOR |
| `Conventions.ts` | `ResolvedConventions`: each declared primitive carries a resolved `stylesProp` | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PlatformConventions:
  stylesProp?: string        # baseline for every primitive
  primitives?:
    container:
      component:             # string, or LayoutMode-keyed map
        HORIZONTAL: DsRow
        VERTICAL: DsColumn
        NONE: DsBox
      props?:
        direction?: string | null
      stylesProp?: string    # overrides the baseline
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | `ContainerBinding.component` becomes `oneOf: [string, object]`, the object's `propertyNames` constrained to the `LayoutMode` enum | MINOR |
| `conventions.schema.json` | Added `stylesProp` to `#/definitions/PlatformConventions` | MINOR |

### Notes

The keyed `component` map reuses `LayoutMode` rather than defining a parallel enum, so the two cannot drift and a new layout mode extends the binding automatically.

`ResolvedConventions` carries the resolved `stylesProp` on each primitive, not the two levels. Resolution is the loader's job, consistent with ADR-071.

The keyed `component` form is legal only on `ContainerBinding`. `TextBinding` and `GlyphBinding` take a plain string, because `direction` is not among their mappable concepts and nothing would select from the map.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `ContainerBinding.component`'s union ↔ `oneOf`; the keyed form's `propertyNames.enum` ↔ `LayoutMode` in `styles.schema.json`; `PlatformConventions.stylesProp` ↔ the sibling string property

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | None beyond ADR-073's read-path change | Update the read path |
| `figma-from-specs` | None | Recompile |
| `react-from-specs` | Branch on `component`'s form; read the resolved `stylesProp` | Implement |
| `webcomponents-from-specs` | Same | Implement |
| `specs-cli` | Resolve `stylesProp` per primitive during conventions resolution | Implement resolution |
| `specs-plugin-2` | None beyond ADR-073 | Update the read path |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: `component`'s union still accepts every value it accepted before, and the rest is additive optional fields on types introduced in this release. Constitution III.

---

## Consequences

- Both container idioms are expressible in their own terms, and `layoutMode: NONE` has a declared answer instead of falling through
- `stylesProp` is declared once per platform, which is the scope at which it is actually a fact
- Nothing else hoists, because ADR-075's closed sets share only `color`, which is defaulted. The two-level structure stays a single scalar with a one-sentence rule
- A partial `component` map is legal and quietly incomplete for the omitted mode. A resolution-time warning is the mitigation, and it is a consumer concern
- `LayoutMode` is load-bearing in two schemas. Changing it touches conventions as well as styles
