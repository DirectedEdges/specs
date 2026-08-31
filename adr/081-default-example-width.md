# ADR: `defaultExampleWidth` — a Presentation Convention, per Platform

**Branch**: `adr/primitive-composition`
**Created**: 2026-08-31
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Every platform in this pipeline eventually has to *show* a component, and showing one means choosing a width before anything can lay out.

- `figma-from-specs` writes a component back onto the canvas. A frame has a width, and the renderer picks one
- `react-from-specs` and the Web Components transformer emit stories. A Storybook canvas has a width, and the story picks one
- A screenshot or visual-diff harness picks one before it can produce a stable image

Nothing in the spec says which, so each of them invents its own. For a library authored at a mobile width, the results diverge from the design in ways that read as bugs:

- A root container with `layoutSizingHorizontal: FILL` stretches to whatever the host chose, so a card designed edge-to-edge at 375 renders 1200 wide
- Text that wraps to two lines in the library renders on one, and the vertical rhythm the component was designed around disappears
- Two tools reading the same spec produce different pictures of the same component, and neither is wrong by any rule the spec states

ADR-073 replaced `conventions.figma` with `conventions.platforms.<id>`, on the argument that Figma is one implementation among several and the pipeline runs in both directions. ADR-078 then gave each platform its own file in `config/conventions/`. That structure is exactly what this fact needs, because **the width is not one number**. Figma renders a frame; Storybook sets a viewport; a SwiftUI preview names a device. A Figma library authored at 375 can sit beside a React implementation whose story canvas standardises on 390 for its device matrix, and neither is wrong.

So the question is not whether the spec should carry a width — it should not; a spec describes a component, not a canvas. The question is which platform entry states it, and what kind of convention it is.

---

## Decision Drivers

- **The substitution rule (ADR-071).** A member is a convention when a different team, pointed at the same libraries, would **have to keep** it — where a wrong value produces incorrect output rather than merely different output
- **Platform dispersion is the test for where a member lives (ADR-077).** If the answer differs per platform, it belongs in that platform's entry
- **A generator reads one entry (ADR-073).** `conventions.platforms[myId]` is a single indexed read; a platform must never need another platform's entry to know its own width
- **Absence means one thing (ADR-071).** No declared width means the platform declares none, and the consumer's existing default stands. There is no separate on-switch
- **`PlatformConventions` is one permissive shape (ADR-073 Option 2A).** A new member must be meaningful for any platform that happens to declare it, not special-cased by key
- **Minimal, stable, intentional public API (Constitution III)**: one member, not a block, unless a block earns itself
- **Type ↔ schema symmetry (Constitution I)** and **no logic in the schema package (Constitution II)**
- **`Conventions` is unreleased.** `PlatformConventions` is introduced by ADR-073 in this same release. Adding a member to it now costs nothing

---

## Options Considered

Four decisions: whether the width is a convention, whose entry holds it, what category of convention it is, and its shape.

---

## Decision 1 — Is a default width a convention or a setting?

### Option 1A: A convention — the libraries state it *(Selected)*

Apply ADR-071's test. A different team generating React from the same Figma file, against the same component library, would have to keep `375` — render the mobile-first library at 1200 and the output is not a stylistic variation, it is a component shown in a layout it was never designed for, with different line counts and different heights.

**Pros**:

- Preserves the incorrect-versus-different discriminant. A wrong width produces a wrong picture; `format.output` produces a different file
- Preserves the sharing consequence, which is why `Conventions` exists: every consumer targeting the platform declares the same width, and drift between copies produces silently different pictures of the same component
- Preserves the meaning of absence. No declared width means the library states none, and the consumer's own default stands — a statement nothing else can supply

**Cons / Trade-offs**:

- A width feels more tunable than a layer-name pattern, and someone will reasonably want to override it for one run. That is a legitimate per-run choice and belongs in `Settings`, not here — the convention is the default the override departs from

---

### Option 1B: A setting — each run chooses its canvas *(Rejected)*

**Rejected because**: it fails the discriminant and reproduces the drift ADR-071 ended. If the width is a per-run choice, every workspace, CI job, and plugin re-declares it, and the first one to forget renders the library wrong. The *override* for a particular render is a setting; the number it departs from is not.

---

### Option 1C: A property of the spec — `Component.defaultWidth` *(Rejected)*

**Rejected because**: a spec describes a component, not a canvas. The width is a fact about the library's presentation conventions, shared by every component in it, and putting it on each component would repeat one value across the whole catalogue and invite per-component drift with no authority to resolve it. It would also freeze into published specs a number that belongs to whoever is rendering.

---

## Decision 2 — Whose entry holds it?

### Option 2A: A member of `PlatformConventions`, declared per platform *(Selected)*

Each platform's file states its own width. `config/conventions/figma.yaml` states the width a rendered Figma frame gets; `config/conventions/react.yaml` states the width a generated story canvas gets.

```yaml
# config/conventions/figma.yaml
naming: SENTENCE
glyphs:
  match: "DS Icon Glyph / {i}"
defaultExampleWidth: 375
```

```yaml
# config/conventions/react.yaml
stylesProp: sx
primitives:
  text:
    component: DsText
defaultExampleWidth: 375
```

**Pros**:

- Passes ADR-077's dispersion test directly. The answer *can* differ per platform, and when it does, each platform can say so
- One indexed read (ADR-073). A React generator asks `platforms.react` for its width and never consults `platforms.figma`
- Meaningful for every platform, so it does not strain the permissive single shape `PlatformConventions` deliberately is. A platform that never renders anything declares nothing, exactly as a code platform declares no `states`
- Ownership lands where ADR-078 put it. The design lead sets the Figma frame width in the file they already own; the React team sets the story canvas width in theirs. Neither appears in the other's diff
- Free. `PlatformConventions` is introduced by ADR-073 in this release

**Cons / Trade-offs**:

- The common case — every platform at the same width — repeats one number per file. Real, and the same trade ADR-073 Decision 3B already took: inheritance on the platform axis costs a merge rule, an override rule, and a depth question, for a saving of one line per platform
- Two platforms can disagree without anything objecting. That is the point when the disagreement is deliberate, and invisible when it is a typo. A consumer-side warning is possible; cross-entry validation is not a schema concern (Constitution II)

---

### Option 2B: A single width at the root of `Conventions`, beside `platforms` *(Rejected)*

```yaml
defaultExampleWidth: 375
platforms:
  figma: {...}
  react: {...}
```

**Rejected because**: it reintroduces the sibling asymmetry ADR-073 Decision 2B was rejected for. It also asserts that every platform renders at the same width, which is not true — a Figma frame, a Storybook viewport, and a device preview are different canvases — and there would be nowhere to say otherwise. And with ADR-078 in force it has no file to live in: `config/conventions/` holds one file per platform and nothing else.

---

### Option 2C: `platforms.figma` only, and other platforms read it *(Rejected)*

Treat the width as a Figma authoring fact that code platforms inherit, since the design is authored in Figma.

**Rejected because**: it makes a generator read another platform's entry, breaking the one-indexed-read property ADR-073 Decision 2A was selected for. It also privileges Figma in exactly the way ADR-073 removed: `figma-from-specs` renders to Figma as a target, so Figma's width is Figma's own presentation choice, not a workspace-wide authority. And a spec generated from Figma is not the only input — reading React to produce a spec never touches a Figma entry at all.

---

## Decision 3 — Encoding, vocabulary, or something else?

ADR-077 stated the boundary that classifies every member of `PlatformConventions`:

> An encoding convention says how a platform expresses something the spec models explicitly. A vocabulary convention says which of a platform's components implements a spec primitive.

`defaultExampleWidth` is neither. It names no component, so it is not vocabulary. And it encodes nothing the spec models — the spec has no width concept for it to be the platform's expression of. A rule that classifies every existing member does not classify this one.

### Option 3A: Name a third category — presentation members *(Selected)*

> **A presentation convention says how a platform shows a component to a viewer.**

It answers neither "how does this platform say what the spec means" nor "which component means this", but "what does this platform put a component *into* when it shows one". `defaultExampleWidth` is the first, and the category is stated so the next one is placed rather than argued about.

**Pros**:

- Honest. The alternative is stretching "encoding" until it means "any platform fact", at which point it stops distinguishing anything and ADR-077's rule stops doing work
- The category has an obvious membership test — does it describe the canvas rather than the content? — and obvious future members: a background, a theme, a padding around the rendered frame
- Costs nothing structurally. All three categories are optional members of one permissive shape; the categories are documentation, not type structure, exactly as ADR-073 Option 2A intended
- Explains why the member is legal on `figma` and on `react` alike. Every platform that shows a component has a canvas; that is what makes it a peer question rather than a Figma one

**Cons / Trade-offs**:

- A third category is a third thing to know, and the boundary between "presentation" and "encoding" will need care the first time something sits near it
- One member is thin evidence for a category. Accepted: naming it now is cheaper than discovering later that three members were filed under "encoding" because there was nowhere else

---

### Option 3B: Widen "encoding" to cover it *(Rejected)*

**Rejected because**: encoding is defined against something the spec models explicitly, and the spec models no canvas. Widening the definition to admit this member would make it "a platform fact that is not a component name", which is not a category — it is the complement of the other one, and it would swallow every future member that is neither.

---

### Option 3C: Leave it unclassified *(Rejected)*

**Rejected because**: ADR-077 set the classification rule two ADRs ago specifically so members are placed by what they say. Adding the first member that the rule does not cover, and saying nothing, guarantees the question is re-litigated on the next one with no record of how it was settled here.

---

## Decision 4 — Shape

### Option 4A: A bare optional number, in pixels *(Selected)*

```yaml
defaultExampleWidth: 375
```

**Pros**:

- One fact, one member. `stylesProp` set the precedent for a platform-level scalar in ADR-076, and this is the same shape
- No unit member. Pixels match every other dimension the schema carries (`Styles` sizing, `PositionOffset`), and a second way to express one number is a second thing for consumers to disagree about
- A block remains available additively if a second presentation member arrives, and nothing decided here forecloses it

**Cons / Trade-offs**:

- A second presentation member would sit beside this one at the platform level rather than grouped with it. Cheap to revisit while `Conventions` is unreleased, and speculative to pre-empt now

---

### Option 4B: A `presentation` block *(Rejected)*

```yaml
presentation:
  defaultWidth: 375
```

**Rejected because**: one member does not make a block. It buys a grouping for a category that currently has a single occupant, at the cost of a level of nesting on every read and a block whose absence would need its own meaning defined.

---

### Option 4C: `defaultExampleSize: { width, height }` *(Rejected)*

**Rejected because**: it over-specifies. In every layout the schema models, height follows from content once width is fixed — a declared height either matches what the content produces, in which case it is redundant, or contradicts it, in which case the renderer must decide which to believe. Width is the only free dimension.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added optional `defaultExampleWidth?: number` to `PlatformConventions` (ADR-073) | MINOR |
| `Conventions.ts` | Same member on the resolved platform shape; optional there too — no default can supply a width the library never declared | MINOR |
| `Conventions.ts` | Doc comments state the encoding / vocabulary / **presentation** rule, extending ADR-077's two categories to three | PATCH |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PlatformConventions:
  # encoding — how this platform expresses what the spec models
  naming?: NONE | SENTENCE | TITLE
  glyphs?: {...}
  states?: {...}
  # vocabulary — which of this platform's components is a spec primitive
  primitives?: {...}
  stylesProp?: string
  images?: {...}
  # presentation — what this platform shows a component in
  defaultExampleWidth?: number   # optional — MINOR
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added property `defaultExampleWidth` under the `PlatformConventions` definition | MINOR |

**Example — new shape** (`schema/conventions.schema.json`):

```yaml
# New property under #/definitions/PlatformConventions/properties
defaultExampleWidth:
  type: number
  exclusiveMinimum: 0
  description: >-
    Width in pixels this platform shows a component at by default — a rendered
    Figma frame, a generated story canvas. Absence means the platform declares
    no width and the consumer uses its own.
  # not in required[] — optional field
```

### Authoring surface (ADR-078)

The member is authored in the platform's own file, with no `platforms:` wrapper, per ADR-078 Decision 3A:

```yaml
# config/conventions/figma.yaml
defaultExampleWidth: 375
```

### Notes

**Optional, with no default.** There is no universal width — 375 is a choice a library makes, not a fact about libraries — so no default is applied at any level, and the member stays optional after resolution. Absence keeps its ADR-071 meaning: the platform declares no width, and the consumer's own default stands.

**Positive number.** `exclusiveMinimum: 0` rules out zero and negatives, which are not widths. No upper bound: the schema does not know what canvas a consumer renders onto.

**A default, not a constraint.** A consumer given an explicit width for a particular render uses that instead. The convention is what the override departs from (Decision 1A).

**Interaction with ADR-079.** `metadata.conventions` records only the platform entry that produced the spec, so a spec generated from Figma carries Figma's width and no other. A React generator does not read that entry for its own canvas — it reads `platforms.react` in its own workspace, per Decision 2C's rejection.

**Naming** (Constitution VI, rule 2). No code-platform consensus term exists: Storybook expresses this as a viewport parameter, CSS has no equivalent, and iOS and Android name a device. With no consensus, the name is drawn from this schema's own vocabulary — `instanceExamples`, `slotContentExamples`, and `propConfigurations` already establish "example" as the word for a rendered instance of a component. `default` marks it as the fallback an explicit width overrides. No abbreviations.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `PlatformConventions['defaultExampleWidth']` in `types/Conventions.ts` maps to `#/definitions/PlatformConventions/properties/defaultExampleWidth` in `schema/conventions.schema.json`. The resolved shape carries the same optional member and, like every other member of the resolved conventions, has no separate schema definition — only the authored shape is validated. No other type or schema definition changes.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Loads `config/conventions/<platform>.yaml` (ADR-078) and generates stories and other shown output | Accept and pass through the member; include it in the per-platform templates; use the invoked platform's value as the default canvas width for generated output |
| `specs-from-figma` | Renders specs onto the Figma canvas | Recompile; use `platforms.figma.defaultExampleWidth` as the default frame width, and keep the current hardcoded value only as the absent-case fallback |
| `specs-plugin-2` | Renders components and examples on the canvas | Recompile; read the same Figma entry and render at the declared width by default |

Consumers MUST read **their own** platform entry, and MUST treat absence as "no declared width" — falling back to their existing default rather than to another platform's value or to a hardcoded number.

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**.

**Justification**: The change adds one optional member to `PlatformConventions`, a type introduced by ADR-073 in this same unreleased version, and one optional property to its schema object. No field is renamed, removed, or changed in presence — additive per the constitution's versioning rule ("`MINOR` for additive types or new optional fields").

---

## Consequences

- Each platform can state the width it shows components at, and every consumer targeting that platform uses the same number. Two tools rendering one spec for one platform produce the same picture
- A mobile-first library is expressible. `defaultExampleWidth: 375` is the difference between a card that renders as designed and one that stretches across a desktop canvas
- Figma and code platforms can legitimately differ — a Figma frame at 375 beside a story canvas at 390 — and the structure says so rather than forcing one to be wrong
- `PlatformConventions` has a third category of member. Presentation facts are placed by the rule stated here rather than filed under "encoding" for want of anywhere else, and the next one — a background, a theme, a frame padding — has a home and a membership test
- Consumers that currently hardcode a render width prefer the declared value when their platform declares one, and keep their hardcoded value only as the absent-case fallback
- Every platform at the same width repeats the number once per file. Accepted under ADR-073 Decision 3B: no inheritance on the platform axis
