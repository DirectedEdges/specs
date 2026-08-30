# ADR: Direction-Keyed Container Bindings and a Shared Style Mapping

**Branch**: `076-container-primitives-and-shared-styles`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Text and glyph each resolve to one component. Containers do not, because design systems split the layout primitive two ways:

- **One component, a direction prop** — `<DsLayout direction="horizontal">`, `<Stack direction="row">`
- **A pair (or trio) of components** — `<DsRow>` / `<DsColumn>`, `HStack` / `VStack`, `Row()` / `Column()`

The second is at least as common as the first, and SwiftUI and Compose both ship it as the idiom. A binding that only accepts a single component name cannot serve them, and one that only accepts a pair cannot serve `DsLayout`.

The spec carries the discriminator already. `Styles.layoutMode` is `LayoutMode | null`, tracking Figma's auto-layout: horizontal, vertical, or none. The third case is real and distinct — a container with no auto-layout is a positioning box, not a degenerate row.

The second problem in this ADR is that ADR-075's `styleProps` is **per primitive**, and a large block of style keys applies identically to all three:

```yaml
width, height, minWidth, minHeight, maxWidth, maxHeight
layoutSizingHorizontal, layoutSizingVertical
padding, itemSpacing
position, top, bottom, start, end
```

A text layer inside a slot carries `maxWidth` and `layoutSizingHorizontal` just as a container does. Declaring the same twelve mappings under `text`, `glyph`, and `container` triplicates the block and guarantees the three copies drift.

---

## Decision Drivers

- **Both container idioms are real.** Neither may be forced into the other's shape — the same argument ADR-063 made for the two image patterns
- **The discriminator must already be in the spec.** Selecting a component from a fact the spec does not carry means inference, and ADR-074 rules that out
- **`layoutMode: NONE` is a case, not a gap.** A non-auto-layout container must resolve to something, or the binding is incomplete for a shape Figma produces constantly
- **The primitive vocabulary stays a subset of `ElementType` (ADR-074).** No conventions-only kind may be invented
- **Declare a shared mapping once.** Repetition across primitives is the drift risk ADR-071 exists to eliminate
- **Merge order must be unsurprising.** Two layers of mapping need one rule, stated once
- **Additive-only** and **no spec-shape change** (ADR-074)

---

## Options Considered

Three decisions: the shape of a container binding, where shared style mappings live, and how the layers merge.

---

## Decision 1 — Single component versus a pair

### Option 1A: `component` is either a name or a `layoutMode`-keyed map *(Selected)*

```yaml
# pair form — DS ships Row and Column
container:
  component:
    HORIZONTAL: DsRow
    VERTICAL: DsColumn
    NONE: DsBox

# single form — DS ships one layout component
container:
  component: DsLayout
  styleProps:
    layoutMode: direction

# SwiftUI
container:
  component:
    HORIZONTAL: HStack
    VERTICAL: VStack
    NONE: ZStack
```

The map's keys are exactly the `LayoutMode` values. A generator reads the element's `layoutMode` and indexes; the single form is a name and needs no index.

**Pros**:

- Expresses both idioms in their own terms, neither one deformed into the other. The single form stays one line
- The discriminator is `Styles.layoutMode`, already in every spec. No inference, no new spec member
- `NONE` gets an explicit slot, so the non-auto-layout container has a declared answer rather than falling through
- The keyed form is the union, not a replacement: the single form composed with `styleProps: {layoutMode: direction}` remains fully expressible, and a library with a direction prop uses it
- Extends to other primitives additively if a keyed binding is ever wanted elsewhere — the union is on `component`, not on `container`

**Cons / Trade-offs**:

- `component` is a union of string and object, so consumers branch on its form. One `typeof` check, and the alternative (two members, `component` and `components`) makes "exactly one must be present" a validation rule instead of a type
- A partial map — `HORIZONTAL` and `VERTICAL` declared, `NONE` omitted — is legal. Omission means no binding for that mode, and the element falls back to the generator's host element. That is the ADR-071 absence rule applied consistently, but it is a way to be quietly incomplete

---

### Option 1B: Single component only, with `layoutMode` mapped to a direction prop *(Rejected)*

**Rejected because**: it cannot express `DsRow` / `DsColumn` at all. There is no direction prop to map to, and no single component to name — the choice of *component* is the choice of direction. Forcing SwiftUI to describe `HStack`/`VStack` as one component with a prop misrepresents the library.

---

### Option 1C: Separate primitive kinds — `row`, `column`, `box` *(Rejected)*

**Rejected because**: it breaks ADR-074's rule that `PrimitiveKind` is a subset of `ElementType`. The spec has no `row` element; it has a `container` with a `layoutMode`. Inventing conventions-only kinds means the vocabulary no longer corresponds to anything a spec can contain, and the single-component library would then have to declare `DsLayout` three times.

---

### Option 1D: A list of conditional rules — match on any style, select a component *(Rejected)*

**Rejected because**: it is a rules engine in a configuration file. Ordering, specificity, and conflict resolution all become semantics every consumer must implement identically — the no-logic driver, violated more thoroughly than by any other rejected option in this set.

---

## Decision 2 — Where shared style mappings live

### Option 2A: `styleProps` at the platform level, merged into every primitive *(Selected)*

```yaml
platforms:
  react:
    styleProps:                 # applies to every primitive
      maxWidth: maxWidth
      padding: padding
      layoutSizingHorizontal: widthMode
    stylePropName: sx           # platform-wide escape hatch
    primitives:
      text:
        component: DsText
        styleProps:
          typography: typography
      container:
        component: {HORIZONTAL: DsRow, VERTICAL: DsColumn, NONE: DsBox}
        styleProps:
          itemSpacing: gap
```

`PlatformConventions` gains the same two members ADR-075 put on `PrimitiveBinding`: `styleProps` and `stylePropName`. The platform-level pair is the baseline; each primitive's pair refines it.

**Pros**:

- The layout and sizing block is declared once per platform, which is the correct scope — a design system's sizing prop names do not vary by primitive
- `stylePropName` is almost always one name for the whole platform (`sx`, `style`, `modifier`), so hoisting it removes the most-repeated line in the file
- Option 2C's shape (Decision 1 of ADR-073) made this impossible; this is the concrete payoff of choosing platform-first
- Additive to ADR-075 — no member changes shape, the same two members appear at a second level

**Cons / Trade-offs**:

- Two levels means a reader must merge mentally to know a primitive's effective mapping. Decision 3 keeps the rule to one sentence
- A platform-level mapping wrong for one primitive must be overridden there, including to `null`

---

### Option 2B: Repeat the shared keys under each primitive *(Rejected)*

**Rejected because**: three copies of a twelve-entry block, and the failure mode of divergence is silent — a `maxWidth` that becomes a prop on containers and an inline style on text, with nothing flagging it.

---

### Option 2C: A hardcoded universal layout mapping in the schema *(Rejected)*

**Rejected because**: it fails the same test the color defaults passed and `maxLines` failed (ADR-075 Decision 2). There is no shared term — CSS `max-width`, SwiftUI `.frame(maxWidth:)`, Compose `Modifier.widthIn(max=)` — and `layoutSizingHorizontal`'s `HUG`/`FILL` vocabulary is Figma's, with no code-platform equivalent at all.

---

### Option 2D: A named, referenceable mapping set — `styleProfiles`, referenced by primitives *(Rejected)*

**Rejected because**: indirection bought for a two-level problem. It adds a namespace, a reference syntax, and a resolution order to save repetition that Option 2A already saves, and Constitution III rules against surface that earns nothing.

---

## Decision 3 — The merge rule

### Option 3A: Shallow per-key merge, primitive wins *(Selected)*

> A primitive's effective `styleProps` is the platform-level map overlaid by the primitive's own, key by key. A key present in both takes the primitive's value, including `null`. `stylePropName` is a single value: the primitive's if declared, otherwise the platform's.

**Pros**:

- One sentence, one direction, no depth. The same override semantics every configuration reader already expects
- `null` at the primitive level suppresses a platform-level mapping — the precise escape needed when one primitive lacks a prop the others have
- Resolution produces a fully merged map per primitive, so a generator reads one table and never merges at emit time

**Cons / Trade-offs**:

- No way to add to a platform-level mapping without restating the key. Correct — a style key has exactly one destination (ADR-075 Decision 1)

---

### Option 3B: Primitive replaces platform wholesale when present *(Rejected)*

**Rejected because**: declaring one primitive-specific mapping would silently discard the entire shared block, which is the opposite of what an author writing `typography: typography` under `text` intends.

---

### Option 3C: Platform wins *(Rejected)*

**Rejected because**: it makes the specific unable to override the general, so `DsText`'s `typography` prop could never be declared alongside a platform default. Backwards.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | `PrimitiveBinding.component` widened to `string \| Partial<Record<LayoutMode, string>>` | MINOR |
| `Conventions.ts` | Added `PlatformConventions.styleProps?` and `PlatformConventions.stylePropName?`, same shapes as on `PrimitiveBinding` | MINOR |
| `Conventions.ts` | `ResolvedConventions`: each primitive's `styleProps` is the merged map; `stylePropName` is resolved to a single value | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PlatformConventions:
  styleProps?: {...}       # baseline for all primitives
  stylePropName?: string   # baseline escape hatch
  primitives?:
    container:
      component:           # string, or LayoutMode-keyed map
        HORIZONTAL: DsRow
        VERTICAL: DsColumn
        NONE: DsBox
      styleProps?: {...}   # overlays the baseline, key by key
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | `PrimitiveBinding.component` becomes `oneOf: [string, object]`, the object's `propertyNames` constrained to the `LayoutMode` enum | MINOR |
| `conventions.schema.json` | Added `styleProps` and `stylePropName` to `#/definitions/PlatformConventions` | MINOR |

### Notes

The keyed `component` map reuses `LayoutMode` rather than defining a parallel enum, so the two cannot drift and a new layout mode extends the binding automatically.

`ResolvedConventions` carries the **merged** map, not the two layers. The merge is resolution's job (whoever loads conventions), consistent with ADR-071's rule that resolution applies defaults inside a declared block so consumers need no branching within it.

The keyed form is legal for `text` and `glyph` too. Nothing needs it today, and forbidding it would mean two `component` types for one member.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `component`'s union ↔ `oneOf`; the keyed form's `propertyNames.enum` ↔ `LayoutMode` in `styles.schema.json`; `PlatformConventions.styleProps` ↔ the same `propertyNames` constraint ADR-075 defines for the primitive-level member

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | None | Recompile |
| `figma-from-specs` | None | Recompile |
| `react-from-specs` | Branch on `component`'s form; read the merged `styleProps` | Implement |
| `webcomponents-from-specs` | Same | Implement |
| `specs-cli` | Perform the merge during conventions resolution | Implement resolution |
| `specs-plugin-2` | None | Recompile |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: `component` widens to a union that still accepts every value it accepted before, and the rest is additive optional fields on types introduced in this release. Constitution III.

---

## Consequences

- Both container idioms are expressible in their own terms, and `layoutMode: NONE` has a declared answer instead of falling through
- Layout and sizing mappings are declared once per platform. A design system's sizing prop names live in one place
- The effective mapping for a primitive is a merge of two layers with one rule; `ResolvedConventions` hands consumers the merged result so no consumer implements the rule twice
- A partial `component` map is legal and quietly incomplete for the omitted mode. A resolution-time warning is the mitigation, and it is a consumer concern
- `LayoutMode` is now load-bearing in two schemas. Changing it touches conventions as well as styles
