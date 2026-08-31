# ADR: `defaultInstanceWidth` — Each Platform's Width for a Top-Level Render

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

ADR-073 replaced `conventions.figma` with `conventions.platforms.<id>`, on the argument that Figma is one implementation among several and the pipeline runs in both directions. ADR-078 then gave each platform its own file in `config/conventions/`. That structure is what this fact needs, because **the width is not necessarily one number**. Figma renders a frame; Storybook sets a viewport; a device preview names a device. A Figma library authored at 375 can sit beside a React implementation whose story canvas standardises on 390, and neither is wrong.

So the question is not whether the spec should carry a width — it should not; a spec describes a component, not a canvas. The questions are which platform entry states it, what it applies to, and what happens when nothing states it at all.

---

## Decision Drivers

- **The substitution rule (ADR-071).** A member is a convention when a different team, pointed at the same libraries, would **have to keep** it — where a wrong value produces incorrect output rather than merely different output
- **Platform dispersion is the test for where a member lives (ADR-077).** If the answer differs per platform, it belongs in that platform's entry
- **A generator reads one entry (ADR-073).** `conventions.platforms[myId]` is a single indexed read; a platform must never need another platform's entry to know its own width
- **Absence means one thing (ADR-071).** No declared width means the platform declares none. There is no separate on-switch
- **`PlatformConventions` is one permissive shape (ADR-073 Option 2A).** A new member must be meaningful for any platform that happens to declare it, not special-cased by key
- **No logic in the schema package (Constitution II).** What a tool does in the absence of a declaration is the tool's behaviour, not the schema's
- **Minimal, stable, intentional public API (Constitution III)**: one member, not a block, unless a block earns itself
- **Type ↔ schema symmetry (Constitution I)**
- **`Conventions` is unreleased.** `PlatformConventions` is introduced by ADR-073 in this same release. Adding a member to it now costs nothing

---

## Options Considered

Five decisions: whether the width is a convention, whose entry holds it, what it applies to, what happens without one, and its shape.

---

## Decision 1 — Is a default width a convention or a setting?

### Option 1A: A convention — the libraries state it *(Selected)*

Apply ADR-071's test. A different team generating React from the same Figma file, against the same component library, would have to keep `375` — render the mobile-first library at 1200 and the output is not a stylistic variation, it is a component shown in a layout it was never designed for, with different line counts and different heights.

**Pros**:

- Preserves the incorrect-versus-different discriminant. A wrong width produces a wrong picture; `format.output` produces a different file
- Preserves the sharing consequence, which is why `Conventions` exists: every consumer targeting the platform declares the same width, and drift between copies produces silently different pictures of the same component
- Preserves the meaning of absence. No declared width means the library states none — a statement nothing else can supply

**Cons / Trade-offs**:

- A width feels more tunable than a layer-name pattern, and someone will reasonably want to override it for one run. That is a legitimate per-run choice and belongs in `Settings`, not here — the convention is the default the override departs from. No such setting is defined today; see Consequences

---

### Option 1B: A setting — each run chooses its canvas *(Rejected)*

**Rejected because**: it fails the discriminant and reproduces the drift ADR-071 ended. If the width is a per-run choice, every workspace, CI job, and plugin re-declares it, and the first one to forget renders the library wrong. The *override* for a particular render is a setting; the number it departs from is not.

---

### Option 1C: A property of the spec — `Component.defaultWidth` *(Rejected)*

**Rejected because**: a spec describes a component, not a canvas. The width is a fact about how a library is shown, shared by every component in it, and putting it on each component would repeat one value across the whole catalogue and invite per-component drift with no authority to resolve it. It would also freeze into published specs a number that belongs to whoever is rendering.

---

## Decision 2 — Whose entry holds it?

### Option 2A: A member of `PlatformConventions`, declared per platform *(Selected)*

Each platform's file states its own width. `config/conventions/figma.yaml` states the width a rendered Figma frame gets; `config/conventions/react.yaml` states the width a generated story canvas gets.

```yaml
# config/conventions/figma.yaml
naming: SENTENCE
glyphs:
  match: "DS Icon Glyph / {i}"
defaultInstanceWidth: 375
```

```yaml
# config/conventions/react.yaml
stylesProp: sx
primitives:
  text:
    component: DsText
defaultInstanceWidth: 375
```

**Pros**:

- Passes ADR-077's dispersion test directly. The answer *can* differ per platform, and when it does, each platform can say so
- One indexed read (ADR-073). A React generator asks `platforms.react` for its width and never consults `platforms.figma`
- Meaningful for every platform, so it does not strain the permissive single shape `PlatformConventions` deliberately is. A platform that never shows anything declares nothing, exactly as a code platform declares no `states`
- Ownership lands where ADR-078 put it. The design lead sets the Figma frame width in the file they already own; the React team sets the story canvas width in theirs. Neither appears in the other's diff
- Free. `PlatformConventions` is introduced by ADR-073 in this release

**Cons / Trade-offs**:

- The common case — every platform at the same width — repeats one number per file. Real, and the same trade ADR-073 Decision 3B already took: inheritance on the platform axis costs a merge rule, an override rule, and a depth question, for a saving of one line per platform
- Two platforms can disagree without anything objecting. That is the point when the disagreement is deliberate, and invisible when it is a typo. A consumer-side warning is possible; cross-entry validation is not a schema concern (Constitution II)

---

### Option 2B: A single width at the root of `Conventions`, beside `platforms` *(Rejected)*

```yaml
defaultInstanceWidth: 375
platforms:
  figma: {...}
  react: {...}
```

**Rejected because**: it reintroduces the sibling asymmetry ADR-073 Decision 2B was rejected for. It also asserts that every platform shows components at the same width, which need not hold — a Figma frame, a Storybook viewport, and a device preview are different canvases — and there would be nowhere to say otherwise. With ADR-078 in force it also has no file to live in: `config/conventions/` holds one file per platform and nothing else.

---

### Option 2C: `platforms.figma` only, and other platforms read it *(Rejected)*

Treat the width as a Figma authoring fact that code platforms inherit, since the design is authored in Figma.

**Rejected because**: it makes a generator read another platform's entry, breaking the one-indexed-read property ADR-073 Decision 2A was selected for. It also privileges Figma in exactly the way ADR-073 removed: `figma-from-specs` renders to Figma as a target, so Figma's width is Figma's own presentation choice, not a workspace-wide authority. And a spec generated from Figma is not the only input — reading React to produce a spec never touches a Figma entry at all.

---

## Decision 3 — What does the width apply to, and what is it called?

A component is shown in more than one form: the component itself, an `instanceExample`, a `slotContentExample`, a generated story. And within any of those, most elements are not free to take a width at all — a child inside an auto-layout parent is sized by that parent.

### Option 3A: Whatever is rendered at the top level — `defaultInstanceWidth` *(Selected)*

The width applies to the **root of a render** — the node that has no parent to size it. Everything below the root takes its width from its parent's layout, as it already does.

That rule covers every form uniformly, because each of them is a top-level render of something:

```yaml
# all of these get the width, because each is a root
a component rendered on its own
an instanceExample
a slotContentExample
a generated story

# none of these do — a parent sizes them
a child inside an auto-layout frame
a nested subcomponent instance
```

`instance` names what is being sized: a placed, shown occurrence of a component. The schema already uses the word this way in `instanceExamples` and `InstanceExample`.

**Pros**:

- One rule, stated positively, that a consumer can apply without knowing which form it is rendering. "Is this the root?" is a question every renderer can already answer
- No interaction with layout. The width is the initial condition for a layout pass, not an override inside one, so it cannot contradict `layoutSizingHorizontal` on a child
- The name matches the scope. `example` would have been narrower than the behaviour — a plain component render is not an example — and `defaultExampleWidth` would have under-described a member that governs it
- Consistent with the schema's own vocabulary (Constitution VI, rule 2 — no code-platform consensus exists, so the term is drawn from this schema, where `instanceExamples` already establishes it)

**Cons / Trade-offs**:

- "Instance" is also a Figma term of art for a placed component instance. The overlap is close enough to be helpful rather than misleading, but a Figma reader may briefly hear `InstanceNode`
- A renderer that shows several components side by side in one frame has to decide whether each is a root. That is its own composition question and the same one it already answers to lay them out

---

### Option 3B: Examples only — `defaultExampleWidth` *(Rejected)*

Apply the width to `instanceExamples`, `slotContentExamples`, and stories, but not to a plain component render.

**Rejected because**: it draws a line where no consumer wants one. A component rendered on its own has exactly the same problem — it needs a width before it can lay out — and excluding it leaves the original gap open for the most common case. The distinction would also have to be maintained by every renderer for no benefit.

---

### Option 3C: Every element, as a default width *(Rejected)*

**Rejected because**: it contradicts layout. Elements below the root are sized by their parent, and a default width applied to them would either be ignored — making the member a lie for most of the tree — or would override the design's own sizing.

---

## Decision 4 — What happens when no width is declared?

### Option 4A: The schema declares no default; each tool falls back to 375 *(Selected)*

The member is optional and absent by default. It does not appear in any defaults constant, and it stays optional after resolution. When a platform declares nothing, the tool doing the rendering uses **375** — a number each tool holds, not one the schema resolves.

**Pros**:

- **It reaches the case a resolved default cannot.** ADR-073 removed the top-level defaults constant, and ADR-078 makes a platform's conventions a file that may not exist. A platform with no file has no entry for a default to be applied *into* — yet it still renders, and still needs a width. A tool-side fallback covers both cases with one number; a schema default covers only one and would need the tool-side number anyway
- Keeps absence meaning exactly what ADR-071 says it means. Nothing is fabricated into the resolved object that the library never declared, and `metadata.conventions` records only what was actually stated
- No logic in the schema package (Constitution II). What to do without a declaration is a rendering decision, and it belongs with the renderer
- One number, in the tools, applying to every platform. `figma-from-specs` already works this way

**Cons / Trade-offs**:

- The number lives in each tool rather than in one place, so tools can drift. Mitigated by the ADR naming 375 as the value and by the member existing precisely so a library that cares declares it rather than relying on the fallback
- A consumer reading the resolved conventions still needs one null check. Cheap, and the honest shape

---

### Option 4B: `default: 375` in the schema, required on the resolved shape *(Rejected)*

**Rejected because**: it only reaches platforms that have an entry to resolve. Under ADR-078 a platform's conventions are a file, and a workspace with no `config/conventions/react.yaml` has no `platforms.react` for a default to land in — so every tool would still need its own 375 for that case, and the number would exist in two places with no mechanism keeping them equal. It also puts a value into the resolved object that the library never stated, which is precisely what ADR-071 reserved absence to prevent.

---

### Option 4C: No fallback — a tool without a declared width errors *(Rejected)*

**Rejected because**: it makes an optional convention effectively required, and turns a workspace that has never thought about width into a broken one. The whole point of a default is that not declaring it is a valid, common state.

---

## Decision 5 — Shape

### Option 5A: A bare optional number, in pixels *(Selected)*

```yaml
defaultInstanceWidth: 375
```

**Pros**:

- One fact, one member. `stylesProp` set the precedent for a platform-level scalar in ADR-076, and this is the same shape
- No unit member. Pixels match every other dimension the schema carries (`Styles` sizing, `PositionOffset`), and a second way to express one number is a second thing for consumers to disagree about
- A block remains available additively if a second member of this kind arrives, and nothing decided here forecloses it

**Cons / Trade-offs**:

- A second render-time member would sit beside this one at the platform level rather than grouped with it. Cheap to revisit while `Conventions` is unreleased, and speculative to pre-empt now

---

### Option 5B: `defaultInstanceSize: { width, height }` *(Rejected)*

**Rejected because**: it over-specifies. In every layout the schema models, height follows from content once width is fixed — a declared height either matches what the content produces, in which case it is redundant, or contradicts it, in which case the renderer must decide which to believe. Width is the only free dimension.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added optional `defaultInstanceWidth?: number` to `PlatformConventions` (ADR-073) | MINOR |
| `Conventions.ts` | Same member on the resolved platform shape, optional there too — no default is applied at any level | MINOR |

**Example — new shape** (`types/Conventions.ts`):

```yaml
PlatformConventions:
  naming?: NONE | SENTENCE | TITLE
  glyphs?: {...}
  states?: {...}
  primitives?: {...}
  stylesProp?: string
  images?: {...}
  defaultInstanceWidth?: number   # optional — MINOR
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added property `defaultInstanceWidth` under the `PlatformConventions` definition | MINOR |

**Example — new shape** (`schema/conventions.schema.json`):

```yaml
# New property under #/definitions/PlatformConventions/properties
defaultInstanceWidth:
  type: number
  exclusiveMinimum: 0
  description: >-
    Width in pixels this platform gives the root of a render — a rendered Figma
    frame, a generated story canvas. Absence means the platform declares no
    width and the rendering tool uses its own fallback.
  # not in required[], and no "default" — the fallback is the tool's, not the schema's
```

### Authoring surface (ADR-078)

The member is authored in the platform's own file, with no `platforms:` wrapper, per ADR-078 Decision 3A:

```yaml
# config/conventions/figma.yaml
defaultInstanceWidth: 375
```

### Notes

**Optional, with no default anywhere in the package.** There is no universal width — 375 is a choice, not a fact about libraries — so no default is applied at any level and the member stays optional after resolution. Absence keeps its ADR-071 meaning: the platform declares no width.

**375 is the tools' fallback, for every platform.** Each rendering tool uses 375 when its platform declares nothing. The number reflects how the libraries this ecosystem serves are currently authored rather than a principle, so changing it later is a tool change, not a schema change.

**Positive number.** `exclusiveMinimum: 0` rules out zero and negatives, which are not widths. No upper bound: the schema does not know what canvas a consumer renders onto.

**A default, not a constraint.** A consumer given an explicit width for a particular render uses that instead. The convention is what the override departs from (Decision 1A).

**Interaction with ADR-079.** `metadata.conventions` records only the platform entry that produced the spec, so a spec generated from Figma carries Figma's width and no other, and carries nothing when Figma declared nothing. A React generator does not read that entry for its own canvas — it reads `platforms.react` in its own workspace, per Decision 2C's rejection.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `PlatformConventions['defaultInstanceWidth']` in `types/Conventions.ts` maps to `#/definitions/PlatformConventions/properties/defaultInstanceWidth` in `schema/conventions.schema.json`. The resolved shape carries the same optional member and, like every other member of the resolved conventions, has no separate schema definition — only the authored shape is validated. No other type or schema definition changes.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Loads `config/conventions/<platform>.yaml` (ADR-078) and generates stories and other shown output | Accept and pass through the member; include it in the per-platform templates; size a generated story's canvas from the invoked platform's value, falling back to 375 |
| `specs-from-figma` | Renders specs onto the Figma canvas | Recompile; use `platforms.figma.defaultInstanceWidth` for the root frame width, keeping the existing hardcoded 375 as the absent-case fallback |
| `specs-plugin-2` | Renders components and examples on the canvas | Recompile; read the same Figma entry, same 375 fallback |

Consumers MUST read **their own** platform entry, MUST apply the width only to the root of a render, and MUST fall back to 375 rather than to another platform's value when their entry declares none.

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**.

**Justification**: The change adds one optional member to `PlatformConventions`, a type introduced by ADR-073 in this same unreleased version, and one optional property to its schema object. No field is renamed, removed, or changed in presence — additive per the constitution's versioning rule ("`MINOR` for additive types or new optional fields").

---

## Consequences

- Each platform can state the width it gives the root of a render, and every consumer targeting that platform uses the same number. Two tools rendering one spec for one platform produce the same picture
- A mobile-first library is expressible. `defaultInstanceWidth: 375` is the difference between a card that renders as designed and one that stretches across a desktop canvas
- Figma and code platforms can legitimately differ — a Figma frame at 375 beside a story canvas at 390 — and the structure says so rather than forcing one to be wrong
- The rule is uniform across forms. A component render, an `instanceExample`, a `slotContentExample`, and a story are all top-level renders and all take the width; nothing below a root is affected
- 375 stays in the tools. A workspace that has never considered width keeps working, and the number is changeable without a schema release
- Every platform at the same width repeats the number once per file. Accepted under ADR-073 Decision 3B: no inheritance on the platform axis
- **A per-run width override is not defined.** Decision 1A places it in `Settings`, but no such member exists, so today a run that wants a different width edits the convention. Worth a follow-up ADR if the need is real; nothing here forecloses it
