# ADR: A Default Example Width on `conventions.figma`

**Branch**: `081-default-example-width`
**Created**: 2026-08-31
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Anything that *renders* a spec has to choose a width. A Figma frame written from a spec
needs a frame width before its children can lay out. A generated Storybook story needs a
canvas width before a `100%` root fills anything. A screenshot or visual-diff harness
needs one before it can produce a stable image.

The spec does not say what that width should be, so each consumer invents one. Storybook
falls back to its own default viewport, a renderer picks a frame width, a harness picks
whatever the last person hardcoded. For a library authored at a mobile width, the results
diverge sharply from the design:

- A root container with `layoutSizingHorizontal: FILL` stretches to whatever the host
  chose, so a card designed edge-to-edge at 375 renders 1200 wide.
- Text that wraps to two lines in the library renders on one, and the vertical rhythm the
  component was designed around disappears.
- Two consumers reading the *same* library produce different output from the same spec,
  and neither is wrong by any rule the spec states.

The width is not a per-run preference. It is a fact about how the library was authored —
the same value for every consumer that reads it, and a *different* value produces output
that misrepresents the design rather than merely styling it differently. That is the exact
test ADR-071 used to separate `Conventions` from `Settings`:

> Every consumer reading the same library declares the same values. Differing values
> produce **incorrect** output rather than merely different output.

`Conventions.figma` already collects facts of this kind — `naming`, `glyphs.match`,
`instanceExamples.scope`. It has no member for the width the library's components and
examples are drawn at.

---

## Decision Drivers

- **Library fact, not run choice**: the value must live where every consumer of a library
  reads the same number. A per-run setting lets two consumers disagree about the same
  library, which is the failure mode `Conventions` exists to prevent (ADR-071).
- **Additive only**: no rename, no removal, no change of presence — the release must stay
  MINOR for downstream consumers.
- **Absence is meaningful**: a library that declares no width must remain expressible, and
  must not be forced to adopt an invented default.
- **Type ↔ schema symmetry** (Constitution I): every type change carries its schema
  counterpart.
- **No logic in this package** (Constitution II): the schema types the value; it does not
  compute or resolve a width.
- **Naming without abbreviation, code platforms first** (Constitution VI): the name must
  read the same to a renderer author and a story generator.

---

## Options Considered

### Option A: `conventions.figma.defaultExampleWidth` *(Selected)*

An optional `number` on the existing `figma` block, in Figma pixel units.

```yaml
# config/conventions.yaml
figma:
  naming: SENTENCE
  defaultExampleWidth: 375
```

**Pros**:
- Sits with the other authoring facts about the library, where a consumer already looks
  when it needs to know how the library is drawn.
- Additive and optional — MINOR, and absence keeps its meaning: the library declares no
  width, so the consumer uses its own.
- One number, one meaning. Every consumer that renders the library renders it the same
  width without coordinating out of band.

**Cons / Trade-offs**:
- The value is consumed well outside Figma — a Storybook viewport, a screenshot harness —
  while living under a `figma` namespace. The namespace records *where the fact came
  from*, not who is allowed to read it, which is already true of `naming` and
  `instanceExamples`.

---

### Option B: `settings.render.width` *(Rejected)*

Put the width with the run choices, alongside the other things a caller tunes per
invocation.

**Rejected because**: it violates the first driver, and re-opens the split ADR-071 closed.
A setting is a choice a run is free to make differently; this is not. Two consumers of one
library choosing different widths do not produce two valid renderings — one of them
produces a component that does not look like the design. The width belongs where the
library states it once.

---

### Option C: A top-level `conventions.defaultExampleWidth` *(Rejected)*

Hoist the width out of `figma` to the root of `Conventions`, on the grounds that it is
consumed by non-Figma tooling.

**Rejected because**: `Conventions` is namespaced by the source the facts were observed in,
and `figma` is currently its only member. A bare member at the root creates a second,
unnamed category whose membership rule is "read by more than one platform" — a rule that
would eventually reclassify `naming` and `instanceExamples` too. The width *is* an
observation about the Figma library; that other tools consume it is true of nearly every
member of the block.

---

### Option D: A structural `defaultExampleSize { width, height }` *(Rejected)*

Carry both dimensions so a renderer can size a frame outright.

**Rejected because**: it over-specifies. In every layout the schema models, height follows
from content once width is fixed — a declared height either matches what the content
produces, in which case it is redundant, or contradicts it, in which case a renderer has
to decide which to believe. Width is the only free dimension.

---

## Decision

Add one optional member to the `figma` block of `Conventions`, and its counterpart in
`ResolvedConventions` and `conventions.schema.json`.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added optional field `figma.defaultExampleWidth?: number` to `Conventions` | MINOR |
| `Conventions.ts` | Added optional field `figma.defaultExampleWidth?: number` to `ResolvedConventions` | MINOR |

**Example — new shape** (`types/Conventions.ts`):
```yaml
# Before
Conventions:
  figma:
    naming?: 'NONE' | 'SENTENCE' | 'TITLE'
    glyphs?: { match: string }
    # …
    inferNumberProps?: boolean
    states?: Record<string, VariantStateEntry>

# After
Conventions:
  figma:
    naming?: 'NONE' | 'SENTENCE' | 'TITLE'
    glyphs?: { match: string }
    # …
    inferNumberProps?: boolean
    states?: Record<string, VariantStateEntry>
    defaultExampleWidth?: number   # optional — MINOR
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added property `defaultExampleWidth` under `#/definitions/Conventions/properties/figma/properties` | MINOR |

**Example — new shape** (`schema/conventions.schema.json`):
```yaml
# New property under #/definitions/Conventions/properties/figma/properties
defaultExampleWidth:
  type: number
  exclusiveMinimum: 0
  description: >-
    Width in pixels the library's components and examples are authored at, and the
    width a consumer renders them at by default. Absence means the library declares
    no width and the consumer uses its own.
  # not in required[] — optional field
```

### Notes

**Optional, with no default.** `defaultExampleWidth` is absent from
`DEFAULT_CONVENTIONS` and stays optional in `ResolvedConventions`. This follows the rule
`Conventions` already states: only members with a *meaningful* default appear in the
defaults constant. There is no universal width — 375 is a choice a library makes, not a
fact about libraries — so inventing one in the schema would hand every consumer a number
no library declared. Absence keeps its established meaning: the library declares no such
convention, and the capability it enables (rendering at the library's own width) does not
apply.

**Positive number.** `exclusiveMinimum: 0` rules out zero and negatives, which are not
widths. No upper bound is imposed; the schema does not know what canvas a consumer renders
onto.

**Pixels.** The unit is the Figma pixel, matching every other dimension the schema carries
(`Styles` sizing, `PositionOffset`). No unit member is added — a second way to express the
same number is a second thing for consumers to disagree about.

**Naming** (Constitution VI, rule 2). No code-platform consensus term exists: Storybook
expresses this as a viewport parameter, CSS has no equivalent, and iOS and Android express
it as a device size. With no consensus, the name is drawn from this schema's own
vocabulary — `instanceExamples`, `slotContentExamples`, and `propConfigurations` already
establish "example" as the word for a rendered instance of a component. `default` marks it
as the fallback a consumer may override for a given render. No abbreviations.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `Conventions['figma']['defaultExampleWidth']` in
  `types/Conventions.ts` maps to
  `#/definitions/Conventions/properties/figma/properties/defaultExampleWidth` in
  `schema/conventions.schema.json`. `ResolvedConventions['figma']['defaultExampleWidth']`
  has no separate schema definition, matching every other member of
  `ResolvedConventions` — the resolved shape is a compile-time contract for consumers,
  and only the authored shape is validated. No other type or schema definition changes.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Reads `config/conventions.yaml` and passes conventions to the engine; generates stories and other rendered artifacts | Accept and pass through the new key; add it to the `conventions.yaml` template; apply it as the default width for generated rendered output |
| `specs-from-figma` | Consumes conventions when producing specs, and renders specs onto the Figma canvas | Recompile; use the declared width as the default frame width when rendering, and as the fallback when no width is given for the render |
| `specs-plugin-2` | Reads conventions and renders components and examples on the canvas | Recompile; render at the declared width by default |

Consumers MUST treat absence as "no declared width" and fall back to their own default —
not to a hardcoded 375. A declared width is a default, not a constraint: a consumer given
an explicit width for a particular render uses that instead.

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**.

**Justification**: The change adds one optional field to an existing interface and one
optional property to an existing schema object. Every document valid before remains valid,
and no field is renamed, removed, or changed in presence — additive per the constitution's
versioning rule ("`MINOR` for additive types or new optional fields").

---

## Consequences

- A library can state the width its components and examples are authored at, once, and
  every consumer that renders them uses the same number.
- Rendered output stops depending on which tool produced it. A spec rendered to a Figma
  frame and the same spec rendered into a Storybook story lay out at the same width.
- A mobile-first library is expressible. `defaultExampleWidth: 375` is the difference
  between a card that renders as designed and one that stretches across a desktop canvas.
- Consumers that currently hardcode a render width must prefer the declared value when one
  is present, and keep their hardcoded value only as the absent-case fallback.
- `Conventions.figma` now carries a member that is not about *detecting* something in the
  Figma file, but about *reproducing* it. Future render-time facts have a precedent to
  follow, and a name to sit beside.
