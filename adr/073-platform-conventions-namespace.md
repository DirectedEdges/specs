# ADR: A Platform-Scoped Sibling to `conventions.figma`

**Branch**: `073-platform-conventions-namespace`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-071 split configuration by the substitution rule: values a different team pointing this tool at the same Figma file would **have to keep** are `Conventions`; values they may freely change are `Settings`. Every member that landed in `Conventions` described Figma authoring, so the block was namespaced `conventions.figma`, and ADR-071 Decision 3 recorded the reason explicitly:

> Nothing prevents code-side conventions from arriving later — how generated names are cased, what a platform calls its props.

That later has arrived. A spec emitted from a slot's default content looks like this (`removablePill/examples.yaml`):

```yaml
slotContentExamples:
  removablePill__children__true:
    anatomy:
      label:
        type: text
    elements:
      label:
        styles:
          textColor:
            $token: Color/On surface
            $type: color
          typography:
            $token: Typography/font__200__regular
            $type: typography
          maxLines: 1
        content: Label
```

`label` is a bare Figma text layer, faithfully captured. Every generator consuming it emits a host text node — a `<span>`, a `Text`, a `TextView` — carrying inline styles or classes. The design system's actual answer is a designated primitive:

```jsx
<DsText color="on-surface" typography="font__200__regular" maxLines={1}>Label</DsText>
```

Nothing in the spec, and nothing in `Conventions`, says that a text primitive is `DsText`. The same gap exists for glyph layers (a designated icon component) and container layers (a designated layout component, or a row/column pair). Compositions — slot default content, `slotContentExamples`, `instanceExamples`, and ordinary anatomy — are built almost entirely out of these three primitives, so the gap is not marginal: it is most of what a composition *is*.

Images are the one primitive that does not have this gap, and the reason is instructive. ADR-063 gave `conventions.figma.images` a `match` naming the designated image component and `sourceProps` naming the forwarding prop, and the transformer routes an image through that component at generation time. It works because there is one image component. It does not generalize, because **the answer differs per target platform**: a text primitive is `DsText` on React, `<ds-text>` in Web Components, `Text` in SwiftUI, and `Text` in Compose — with different prop names and different styling escape hatches in each. One Figma library feeds many code libraries.

That is the shape of the decision. The mapping being asked for is not "what is true about this Figma file." It is **"what does this primitive become on this platform"** — a spec→code convention, not a Figma→spec one.

This ADR decides only *where such conventions live and how they are keyed*. What they contain is ADR-074 through ADR-077.

---

## Decision Drivers

- **The substitution rule still governs (ADR-071).** A binding must be classified as a convention or a setting by the same test, and the test must give the same answer for every member of the new block
- **Absence means one thing (ADR-071).** A missing block means the library declares no such convention; there is no separate on-switch
- **One spec, many platforms.** The spec must not be committed to a platform. Whatever is added must let a single spec resolve differently per target — this is the whole reason the mapping is not a Figma fact
- **`conventions.figma` must stay honest.** Its documented meaning is "facts about the Figma library." A code-library fact placed inside it makes the namespace a lie and destroys the classification ADR-071 established
- **Minimal, stable, intentional public API (Constitution III)**: one new namespace, not four
- **Type ↔ schema symmetry (Constitution I)** and **no logic in the schema package (Constitution II)**: the package declares the shape; consumers resolve it
- **Additive-only.** `conventions.figma` is untouched, so no consumer breaks

---

## Options Considered

Three decisions, taken separately: whether these values are conventions at all, the namespace shape, and what the keys of that namespace name.

---

## Decision 1 — Are spec→code bindings `Conventions` or `Settings`?

ADR-071's test: *if a different team pointed this tool at the same Figma file, which values would they have to keep?*

### Option 1A: They are conventions, and the substitution rule widens to "the same libraries" *(Selected)*

The rule's subject becomes the pair of libraries a run sits between — the Figma library it reads and the code library it writes for. A different team generating React from the same Figma file, against the same component library, would have to keep `text → DsText`. Get it wrong and the output is **incorrect**: a `<span>` where the design system requires `DsText` is not a stylistic difference, it is an unimplemented component.

**Pros**:

- Preserves the incorrect-versus-different discriminant exactly. A wrong binding produces wrong code; a wrong `format.output` produces different code
- Preserves the sharing consequence, which is the reason `Conventions` exists: every consumer targeting the same code library declares the same bindings, and drift between copies produces silently different output
- Preserves the meaning of absence: no binding declared means the library has no designated primitive, and the generator's existing host-element behavior stands. Nothing else can supply that statement

**Cons / Trade-offs**:

- `Conventions` is no longer about one library. Its doc comment, which today reads "facts about the Figma library a spec was generated from," must widen to cover both ends of the pipeline
- The two ends have different lifetimes: a Figma convention changes when the file is reorganized, a platform binding when the code library is versioned

---

### Option 1B: They are settings — a run chooses its target *(Rejected)*

**Rejected because**: it fails the discriminant. A setting cannot be wrong, only different; `text → DsButton` is wrong. It also fails the sharing consequence — `Settings` is explicitly the per-run, per-consumer side, so every workspace, CI job, and plugin would re-declare the bindings, which is the exact drift ADR-071 was written to end.

Which platform a *given run* targets is genuinely a setting. That is `Pipeline`/`Settings` selecting a key; it is not the binding table itself.

---

### Option 1C: A third top-level artifact — `bindings.yaml`, outside `Conventions` *(Rejected)*

**Rejected because**: it adds a fourth root concept to a contract ADR-071 just reduced to three, and it would need its own resolution, its own absence semantics, and its own workspace-layout rules — all of them identical to the ones `Conventions` already has. Constitution III: the split must express a genuine distinction, and "reads Figma" versus "writes code" is a *namespace* distinction, not a root-artifact one.

---

## Decision 2 — The namespace shape

### Option 2A: `conventions.platforms.<id>` — a platform-keyed sibling to `figma` *(Selected)*

```yaml
# conventions.yaml
figma:
  naming: SENTENCE
  glyphs:
    match: "DS Icon Glyph / {i}"
  # ... unchanged

platforms:
  web:
    primitives:
      text:
        component: DsText
      glyph:
        component: DsIcon
      container:
        component: DsBox
  ios:
    primitives:
      text:
        component: Text
      glyph:
        component: Image
  android:
    primitives:
      text:
        component: Text
      glyph:
        component: Icon
```

Two sibling namespaces under one root, each answering one question. `figma` answers *what is this node*; `platforms` answers *what does it become*.

**Pros**:

- Reads as the pipeline reads: source on the left, targets on the right, one file
- Keeps `conventions.figma` untouched and its documented meaning intact — a purely additive change
- The platform key is the natural fan-out point. Adding iOS is adding a key, not restructuring
- A generator's lookup is one indexed read: `conventions.platforms[myId]`. It never needs to see, or understand, another platform's entry
- Absence composes at two levels with one meaning at each: no `platforms` block = no code-side conventions at all; no `platforms.ios` = this library declares nothing for iOS

**Cons / Trade-offs**:

- `figma` is a singular scope and `platforms` is a map — the two siblings have different shapes. Defensible (there is exactly one source and many targets) but not symmetric
- Invites the question of whether Figma is itself a platform (see Option 2D)

---

### Option 2B: `conventions.code` — singular, one target per conventions file *(Rejected)*

```yaml
code:
  primitives:
    text:
      component: DsText
```

A workspace targeting three platforms keeps three conventions files.

**Rejected because**: the platform axis is the one thing this ADR exists to express, and this option deletes it from the contract and pushes it into file layout. Three files triplicate the entire `figma` block — the shared, must-not-drift half — to vary the small half. That inverts ADR-071's sharing argument.

---

### Option 2C: Primitive-first, platform-second — `conventions.primitives.text.<platform>` *(Rejected)*

```yaml
primitives:
  text:
    web: {component: DsText}
    ios: {component: Text}
```

**Rejected because**: it optimizes for the wrong reader. The comparison a human wants — "how is text handled everywhere?" — is made once, when authoring. The comparison a generator makes, on every element of every component, is "what is my platform's whole vocabulary?" — and this shape scatters one platform's answers across every primitive key, so a generator cannot read its own configuration as a unit or validate it as one. It also has no place to hang platform-wide members that are not per-primitive (ADR-076 Decision 2 needs one).

---

### Option 2D: Make Figma a platform — `conventions.platforms.figma` alongside `web` *(Rejected)*

**Rejected because**: it flattens a real asymmetry into a false symmetry. The `figma` block classifies and detects — it says which layer names mean "glyph," which variant prop means "hover." A platform block binds and emits. They share no member and no shape, and the only thing unifying them would be the word "platform." It is also a MAJOR break of a contract published four weeks ago, bought with nothing.

---

## Decision 3 — What the platform keys name

Both web generators in this ecosystem — the React transformer and the Web Components transformer — target "web," and they need **different** component identifiers: `DsText` and `<ds-text>`. So the key cannot always be a platform in the Web/iOS/Android sense.

### Option 3A: `platforms`, keyed by a free-form identifier a generator declares it reads *(Selected)*

The key is an opaque string. `web`, `ios`, `android` are the conventional coarse ids and the ones documentation uses; a workspace needing to distinguish two targets on one platform uses finer ids (`react`, `web-components`) and each generator declares which id it reads. The schema does not enumerate the set.

**Pros**:

- Does not force a taxonomy the schema cannot police. A closed enum would be wrong the first time someone adds React Native, Flutter, or a second in-house web library
- Matches how this ecosystem already talks about targets (Web / iOS / Android) for the common case, while not blocking the finer one
- Which id a run reads is a `Settings`/`Pipeline` question — correctly kept out of `Conventions`

**Cons / Trade-offs**:

- The block's name over-promises. If a key can be `react`, "platforms" describes the common case rather than the type. **This is the weakest selection in this ADR** and `targets` is a live alternative (Option 3B)
- A typo'd key is silently a platform with no conventions. Mitigation is a consumer-side warning when a run's declared id matches no key — a consumer concern, not a schema one (Constitution II)

---

### Option 3B: `targets`, keyed the same way *(Rejected, narrowly)*

**Rejected because**: `platforms` is the term this ecosystem's documentation and conventions already use for exactly this axis, and the coarse case is the overwhelmingly common one. `targets` is more literally accurate for the fine-grained case and remains the better name if the fine-grained case turns out to be the norm rather than the exception — worth revisiting before this ADR is accepted rather than after.

---

### Option 3C: A closed enum — `WEB | IOS | ANDROID` *(Rejected)*

**Rejected because**: it cannot express two web targets, which already exist here. A closed set of platform names is a taxonomy claim the schema has no standing to make, and every addition to it is a schema release.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added optional `platforms?: Record<string, PlatformConventions>` to `Conventions` and `ResolvedConventions` | MINOR |
| `Conventions.ts` | Added `PlatformConventions` interface (contents defined by ADR-074 – ADR-076) | MINOR |
| `Conventions.ts` | Widened the `Conventions` doc comment from "facts about the Figma library" to facts about both the source library and the target code libraries | PATCH |

**Example — new shape** (`types/Conventions.ts`):

```yaml
# Before
Conventions:
  figma: {...}

# After
Conventions:
  figma: {...}
  platforms?:            # optional — MINOR
    <platformId>:
      primitives?: {...} # ADR-074 – ADR-076
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added optional `platforms` property — an object with `additionalProperties` referencing a new `PlatformConventions` definition | MINOR |

### Notes

`platforms` is optional and has **no default**, exactly as `glyphs`, `images`, and `states` have none. Absence means the library declares no code-side conventions, and every generator's existing host-element behavior stands unchanged. `DEFAULT_CONVENTIONS` gains no member.

`ResolvedConventions.platforms` carries the same optionality; defaults apply only *inside* a declared platform entry, per the ADR-071 resolution rule. Which defaults, and inside which member, is ADR-075.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Conventions.platforms` ↔ `conventions.schema.json#/definitions/Conventions/properties/platforms`; `PlatformConventions` ↔ `#/definitions/PlatformConventions`. The free-form key is expressed as `additionalProperties`, matching how `Conventions.figma.states` already expresses its concept-keyed map

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | None to generate; conventions loading must carry the new block through | Recompile; pass `platforms` into transformers unchanged |
| `specs-from-figma` | None — it reads `conventions.figma` only, and nothing there changed | Recompile |
| `react-from-specs` | Gains the block it needs; behavior change is ADR-074 | Declare which platform id it reads |
| `webcomponents-from-specs` | Same | Declare which platform id it reads |
| `figma-from-specs` | None — renders from the spec, which is unchanged | Recompile |
| `specs-plugin-2` | Persists conventions; new optional block passes through | Recompile |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: every change is a new optional field or a new definition; no existing type, property, or default changes meaning. Constitution III.

---

## Consequences

- `Conventions` describes both ends of the pipeline. Its members are still classified by the substitution rule, but the subject of that rule is now the source library *and* the target code library
- `conventions.figma` keeps a single, defensible meaning: what a Figma node **is**. Everything about what a primitive **becomes** has a home outside it, and the boundary rule is stated once (ADR-077)
- Adding a platform is adding a key. Nothing in the spec, the transformer, or the Figma side changes
- A generator reads exactly one platform entry and can validate it as a unit
- The `platforms` name is provisional against `targets` (Decision 3). Changing it after acceptance is a MAJOR break, so it should be settled before implementation
