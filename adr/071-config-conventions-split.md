# ADR 071: Separate Library Conventions from Tooling Settings

**Branch**: `071-config-conventions-split`
**Created**: 2026-08-18
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`Config` is one flat structure with four groups — `processing`, `format`, `include`, and `transformers` — and every member is a peer. In practice its members answer two unrelated questions.

**What is true about this Figma library?** Get one of these wrong and the output is *incorrect*:

```yaml
processing:
  glyphNamePattern: "DS Icon Glyph / {i}"    # icon assets go undetected if wrong
  codeOnlyPropsPattern: "Code only props"    # code-only props go unextracted if wrong
  subcomponents:
    match:
      - "{C} / {S}"                          # subcomponents go undiscovered if wrong
  states:
    hover:
      prop: state                            # unclassified, this prop emits as a data-* attribute
      value: hover
    active:
      prop: state                            # two concepts share one prop
      value: pressed                         # the concept name is not the Figma value
    disabled:
      prop: disabled                         # boolean prop — no value to match
    readonly:
      prop: readOnly                         # concept casing is not prop casing
    invalid:
      prop: validation                       # neither name resembles the other
      value: invalid
format:
  figmaKeys: SENTENCE                        # name reversal is undefined if wrong
```

**What do I want out of this run?** Get one of these "wrong" and the output is merely *different*:

```yaml
processing:
  variantDepth: 9999
  inferNumberProps: true
format:
  output: YAML
  color: HEXA
include:
  emptyVariants: false
```

The two are indistinguishable in the type, and three consequences follow:

- **The first kind cannot be shared.** Every consumer reading the same library — the CLI, the plugin, a second workspace, a CI job — re-declares the same facts. Drift between copies produces silently different specs from one Figma file
- **`ResolvedConfig` conflates two kinds of absence.** A missing member of the second kind means "use the default." A missing member of the first kind means "this library has no such convention" — a different claim with different consequences
- **A third kind exists in one consumer and has nowhere to live.** The plugin persists preferences that never reach a spec at all (see Decision 1)

---

## Decision Drivers

- **Naming governance (Constitution VI)**: no code-platform consensus exists for this concept, so rule 3 applies — terms are chosen for consumer clarity
- **No abbreviations**: full, unabbreviated words in the public contract
- **Minimal, stable, intentional public API (Constitution III)**: the split must express a genuine shared concept, not one consumer's arrangement
- **Type ↔ schema symmetry (Constitution I)**: regrouping applies to both artifacts in the same change
- **No logic (Constitution II)**: the schema may classify members; it may not resolve, merge, or load them
- **Absence must mean one thing per member**
- **Serviceable by every consumer equally**: the CLI, the plugin, and the generator each hold configuration differently

---

## Options Considered

Eight decisions, taken separately: the classification rule, the name of each side (independently), whether the library side is scoped to Figma, the structural shape, the blocks that straddle the line, the shape of name-based conventions, the container's name, and the workspace artifact layout.

---

## Decision 1 — The classification rule

### Option 1A: Substitution — what a different team would have to keep *(Selected)*

**If a different team pointed this tool at the same Figma file, which values would they have to keep?**

- Values they **must keep** describe the library. Changing one produces *incorrect* output
- Values they **may freely change** describe the run. Changing one produces *different* output
- Values that **do not reach the spec at all** are neither, and belong to the consumer that holds them

That third category is not hypothetical. The plugin persists these alongside the shared members:

```ts
// specs-plugin-2 — persisted settings that never affect a spec
OUTPUT_COLUMNS: 1 | 2 | 3 | 4          // canvas layout of rendered output
OUTPUT_DATA: boolean                    // which sections to draw on canvas
OUTPUT_STYLING: boolean
OUTPUT_ANATOMY: boolean
OUTPUT_LAYOUT: boolean
OUTPUT_PROPS: boolean
OUTPUT_MODES: boolean
OUTPUT_REPLACE: boolean                 // overwrite prior canvas output
ANATOMY_CONTENT: 'CANVAS' | 'DEV_MODE'  // which surface anatomy is read from
```

Two identical specs can be produced with every one of these set differently. They are **application preferences** and stay out of the shared contract entirely.

**Pros**:

- Mechanical and reproducible — every current member classifies without argument
- Explains the sharing consequence directly: library values are the ones worth declaring once
- Gives absence one meaning per side
- Separates the consumer-local third category cleanly, rather than leaving the plugin to mix three kinds in one map

**Cons / Trade-offs**:

- Three blocks contain members from both shared sides (Decision 5)
- A member could in principle be a library fact for one team and a preference for another; no current member is

---

### Option 1B: Split by who authors it — designer versus engineer *(Rejected)*

**Rejected because**: it encodes an org chart, not a property of the data. The same person often sets both, and the semantic classification of variant props is authored by whoever knows the library — which may be either.

---

### Option 1C: Split by rate of change — stable versus per-run *(Rejected)*

**Rejected because**: it describes a symptom rather than a cause. `variantDepth` and `format.output` are typically set once and never touched, yet nothing about them describes the library.

---

## Decision 2 — What to call the library side

| Candidate | For | Against |
|---|---|---|
| **`conventions`** *(Selected)* | Established term for a library-wide agreement about naming and meaning; already the word this package's own documentation uses for state classification and name patterns | Slightly formal; says nothing about *whose* conventions (see Decision 3) |
| `authoring` | Accurate — these describe how the library was authored | Names an activity, not a thing; reads oddly as a noun holding patterns |
| `library` | Short, familiar | Ambiguous in a schema whose root artifact already describes a component within a library |
| `source` | Accurate in the data-flow sense | Already load-bearing: `metadata.source` names a Figma node, `images.sourceProps` names props carrying image sources |
| `vocabulary` | Fits the state classification | Wrong for `match`/`exclude` patterns, which are not terms |
| `declarations` | Emphasizes that these are asserted, not derived | Verbose, and every configuration value is a declaration |
| `facts` | Precisely what they are | Unidiomatic in configuration; invites "whose facts?" |

**Selected: `conventions`.** It is the only candidate that covers both halves of the contents — the naming patterns and the semantic classifications — without colliding with an existing term in the schema.

`states` is the clearest member of the category. In a real catalog's declaration, five of ten entries could not be recovered by any rule: two concepts share one prop (`hover` and `active` both read `state`), a concept name differs from the Figma value that activates it (`active` ← `pressed`), a concept's casing differs from its prop's (`readonly` ← `readOnly`), and one pair resembles nothing (`invalid` ← `validation`). Every one of them is an agreement, and a different team reading the same file would have to keep all five.

---

## Decision 3 — Whether the library side is scoped to Figma

Every member classified as a convention today describes **Figma authoring**: layer-name patterns, component naming, variant props, the file's own naming convention. Nothing prevents code-side conventions from arriving later — how generated names are cased, what a platform calls its props.

### Option 3A: `conventions.figma` — namespaced by source *(Selected)*

```yaml
conventions:
  figma:
    keys: SENTENCE
    glyphs:
      match: "DS Icon Glyph / {i}"
```

**Pros**:

- Honest about what these describe today, without claiming the general case
- Extends without a rename: a future `conventions.react` or `conventions.swift` is additive, and a `MINOR`
- Keeps one handle — `conventions` — for "everything declared about how things are named and meant"

**Cons / Trade-offs**:

- One more level of nesting
- `figmaKeys` becomes `conventions.figma.figmaKeys`, which stutters and should be renamed to `keys` in that position

---

### Option 3B: `figmaConventions` — a flat, scoped name *(Rejected)*

**Rejected because**: it forces a second top-level key for every future source (`codeConventions`, `swiftConventions`), each unrelated to the others in the type. The namespacing is the same idea expressed worse.

---

### Option 3C: `conventions`, unscoped *(Rejected)*

**Rejected because**: it claims generality the contents do not have, and the day a code-side convention arrives there is no non-breaking place to put it. Renaming later costs a `MAJOR` that this decision avoids for free.

---

## Decision 4 — What to call the run side

| Candidate | For | Against |
|---|---|---|
| **`settings`** *(Selected)* | Neutral, universally understood, carries no claim of correctness — exactly the distinction Decision 1 draws | Weak word; its members are heterogeneous by construction |
| `options` | Signals that every member is optional and defaulted | Collides with `TransformEntry`'s inline transformer options |
| `preferences` | Accurate for taste-driven members | Better reserved for the consumer-local third category, where taste is *all* it is. Using it here would leave that category unnamed |
| `output` | Names the visible effect of most members | Misdescribes `variantDepth`, `slotConstraints`, and `collapsePrimitiveWrapper`, which shape processing |
| `generation` | Describes the run that produces a spec | Overlaps `specs generate` as a command name; implies members that belong to one command |
| `processing` | Already exists as a group name | Would have to swallow `format` and `include`, which it does not describe |

**Selected: `settings`**, with **`preferences`** reserved as the term for consumer-local values that never reach a spec. Three words, three categories, no overlap: **conventions** describe the library, **settings** shape the run, **preferences** belong to the tool.

---

## Decision 5 — Structural shape

### Option 5A: Two named, exported types under one container *(Selected)*

`Conventions` and `Settings` are each a named, exported type with its own schema definition. The existing four groups move under `settings` unchanged.

```yaml
conventions:
  figma:
    keys: SENTENCE
    glyphs:
      match: "DS Icon Glyph / {i}"
    codeOnlyProps:
      match: "Code only props"
    images:
      match: "DS Image"
      sourceProps:
        - Image
    subcomponents:
      match:
        - "{C} / {S}"
      exclude:
        - "{C} / Examples / {S}"
    instanceExamples:
      match:
        - "{C}*"
      parentNames:
        - Examples
    states:
      hover:
        prop: state
        value: hover
      active:
        prop: state
        value: pressed
      focus-within:
        prop: focused
      disabled:
        prop: disabled
      readonly:
        prop: readOnly
      invalid:
        prop: validation
        value: invalid
      selected:
        prop: selected
      indeterminate:
        prop: selected
        value: indeterminate
```

```yaml
settings:
  processing:
    subcomponents:
      scope: PAGE
    instanceExamples:
      scope: PAGE
    images:
      backgroundImage: true
    variantDepth: 9999
    details: LAYERED
    slotConstraints: true
    collapsePrimitiveWrapper: true
    inferNumberProps: true
  format:
    output: YAML
    keys: CAMEL
    layout: LAYOUT
    tokens: TOKEN
    color: HEXA
  include:
    invalidVariants: false
    invalidCombinations: true
    emptyVariants: false
    defaultSlotContent: true
  transformers:
    - name: react
```

**Pros**:

- **Symmetric.** Both sides are nameable, referenceable, and independently validatable. A classification where only one side has a handle is half a classification
- Either side can be held, shared, published, or stored on its own
- The existing group names keep their meaning; only their parent changes

**Cons / Trade-offs**:

- Every member's path gains a segment; every consumer breaks at compile time
- One more level of nesting for settings members

---

### Option 5B: A `conventions` block beside the existing groups *(Rejected)*

**Rejected because**: it is asymmetric. Conventions become addressable and settings do not, leaving "the settings" a category with no handle — unnameable, unvalidatable alone, and unable to be stored separately.

---

### Option 5C: Classify in documentation only *(Rejected)*

**Rejected because**: a classification a consumer cannot address is one it cannot act on. The sharing problem is unsolved, and nothing prevents the next member from landing on the wrong side.

---

## Decision 6 — Blocks that straddle the line

### Option 6A: Split the block; conventions take the naming half *(Selected)*

| Block | To `conventions.figma` | Stays in `settings.processing` |
|---|---|---|
| `subcomponents` | `match`, `exclude` | `scope` |
| `instanceExamples` | `match`, `exclude`, `parentNames` | `scope` |
| `images` | `match` *(from `imageComponent`)*, `sourceProps` | `backgroundImage` |

`scope` states where to look, not what things are called — a different team could search `PAGE` or `FILE` against the same library and both be correct. `backgroundImage` toggles whether fills are detected at all.

**Pros**:

- Applies Decision 1's test per member, which is the level at which it is meaningful
- Preserves on-switch semantics: presence of `conventions.figma.subcomponents` means "this library has subcomponents"
- `imageComponent` → `images.match` adopts the uniform key of Decision 7; it still names one component

**Cons / Trade-offs**:

- Two features are assembled from both sides
- `scope` and `match` are authored together today and would no longer be adjacent

---

### Option 6B: Move whole blocks by majority *(Rejected)*

**Rejected because**: it puts `scope` and `backgroundImage` on the convention side, where absence would falsely claim the library has no such convention.

---

### Option 6C: Leave mixed blocks in `settings` *(Rejected)*

**Rejected because**: it exempts exactly the members that motivate the ADR — `images.imageComponent` and `subcomponents.match` are naming conventions by any reading of Decision 1.

---

## Decision 7 — The shape of name-based conventions

Five conventions answer the same question — *which assets in the file are these?* — under three different key shapes:

| Member | Key today | Value today | Placeholders |
|---|---|---|---|
| `glyphNamePattern` | scalar, suffixed | one pattern | `{i}` |
| `codeOnlyPropsPattern` | scalar, suffixed | one pattern | none — a literal layer name |
| `imageComponent` | scalar, prefixed | one component name | none |
| `subcomponents` | block | `match` list, `exclude` list | `{C}`, `{S}` |
| `instanceExamples` | block | `match`, `exclude`, `parentNames` lists | `{C}` |

The suffix restates what the block already says, and the same idea is spelled three ways depending on when each member was added.

### Option 7A: One block per named thing, keyed `match` — cardinality unchanged *(Selected)*

Every name-based convention becomes a block named for the thing it finds, with its pattern under `match`. **What each member accepts does not change**: members that take one pattern still take one, members that take lists still take lists, and `exclude` appears only where it exists today.

```yaml
conventions:
  figma:
    glyphs:
      match: "DS Icon Glyph / {i}"
    codeOnlyProps:
      match: "Code only props"
    images:
      match: "DS Image"
      sourceProps:
        - Image
    subcomponents:
      match:
        - "{C} / {S}"
      exclude:
        - "{C} / Examples / {S}"
    instanceExamples:
      match:
        - "{C}*"
      parentNames:
        - Examples
```

**Pros**:

- **The suffix disappears.** Inside `conventions.figma` everything is a name pattern, so `glyphNamePattern` becomes `glyphs.match` — shorter, and it says more
- **One vocabulary.** `match` means the same thing in every member; a reader who knows `subcomponents` can read `glyphs` without checking
- **No implementation is demanded.** Nothing gains a capability, nothing needs new matching logic, and no member starts accepting input it did not accept before. The change is naming and nesting only
- **A later widening stays possible and stays a decision.** If a catalog ever needs two icon patterns, `glyphs.match` can widen — but that is a separate ADR with its own justification, not a consequence of this one

**Cons / Trade-offs**:

- `match` has two cardinalities across members, so the uniformity is in the key, not the type
- Five members change path on top of the regrouping
- Placeholder grammars still differ per member (`{i}`, `{C}`, `{S}`); a shared key name may imply a shared grammar, and documentation has to carry the distinction

---

### Option 7B: Uniform *and* capability-complete — lists and `exclude` everywhere *(Rejected)*

Give every member `match: string[]` and `exclude?: string[]`, so the five are interchangeable in shape and capability.

**Rejected because**: it invents features to satisfy a symmetry. Nothing in the validation library needs a second glyph pattern, an excluded code-only-props frame, or a second image component, and each addition is matching logic to implement, test, and document. A schema that declares capability the transformers do not honor is worse than an asymmetric one that tells the truth.

---

### Option 7C: Keep the scalars as they are *(Rejected)*

**Rejected because**: it keeps a redundant suffix inside a block whose name already supplies it, and keeps one question spelled three ways. The rename costs nothing beyond the `MAJOR` already being taken, and this is the only moment it is free.

---

### Option 7D: Group name-based members under a `names` sub-block *(Rejected)*

**Rejected because**: it separates name-based conventions from semantic ones at the cost of a fifth nesting level, and the block-with-`match` shape already signals which kind a member is.

---

## Decision 8 — The container's name

### Option 8A: `Configuration` *(Selected)*

**Pros**:

- The constitution lists `Config` as a **grandfathered** abbreviation and directs new work to prefer `Configuration`. A `MAJOR` is already being taken, so the exception costs nothing to retire
- The container earns its name: `metadata` needs one handle for "how this spec was produced," and two unrelated sibling keys lose the statement that they were resolved together for one run
- Reads correctly with both halves: a configuration *comprises* conventions and settings

**Cons / Trade-offs**:

- Renames a type every consumer imports, atop the regrouping
- `metadata.config` becomes `metadata.configuration`, changing generated output

---

### Option 8B: Keep `Config` *(Rejected)*

**Rejected because**: the grandfathering exists to avoid churn, and the churn is happening regardless. It also keeps the vague word that let two kinds of value share one structure.

---

### Option 8C: Dissolve the container *(Rejected)*

**Rejected because**: `metadata` would carry two independent keys with no statement that they were resolved together, and no type would name the pair.

---

## Decision 9 — Workspace artifact layout

`workspace.schema.json` (ADR 054) describes `specs.config.yaml`, so the artifact's shape is governed by this package and is in scope here.

### Option 9A: A `config/` directory with one artifact per category *(Selected)*

```
config/
  conventions.yaml     # Conventions — shareable, publishable, comparable
  settings.yaml        # Settings, plus workspace sources and output paths
.env                   # unchanged, at the workspace root
```

**Pros**:

- The artifact boundary matches the contract boundary — the split is visible in the filesystem, not only in the type
- A library can publish `conventions.yaml` for every consuming workspace to adopt verbatim, which is the sharing problem from Context solved at the level where it actually bites
- Each artifact validates against its own schema definition independently
- `.env` stays at the root, where dotenv-style discovery expects it. Moving it buys tidiness and costs explicit path configuration in every consumer

**Cons / Trade-offs**:

- Two files to open instead of one, and a directory where a single file used to be
- Existing workspaces need a read path for the old single-file arrangement

---

### Option 9B: One artifact with two top-level blocks *(Rejected)*

**Rejected because**: it leaves the conventions half un-shareable without extracting a fragment from a file that also carries settings and workspace paths. The type would say the halves are separable while the artifact denies it.

---

### Option 9C: Two artifacts at the workspace root *(Rejected)*

**Rejected because**: it spends two root-level filenames on one concern, and the root is already the busiest namespace in a workspace.

---

## Decision

Replace `Config` with `Configuration`, comprising two named, exported types — `Conventions` (namespaced by source) and `Settings` — and split the workspace artifact accordingly.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Config.ts` → `Configuration.ts` | Renamed `Config` → `Configuration`; `ResolvedConfig` → `ResolvedConfiguration` | MAJOR |
| `Configuration.ts` | Added exported `Conventions` / `ResolvedConventions`, with a `figma` namespace | MAJOR |
| `Configuration.ts` | Added exported `Settings` / `ResolvedSettings` holding `processing`, `format`, `include`, `transformers` | MAJOR |
| `Configuration.ts` | Moved `states` → `conventions.figma.states`; `format.figmaKeys` → `conventions.figma.keys` | MAJOR |
| `Configuration.ts` | Rekeyed name-based conventions to `<thing>.match`: `glyphNamePattern` → `glyphs.match`, `codeOnlyPropsPattern` → `codeOnlyProps.match`, `imageComponent` → `images.match`. Value types unchanged | MAJOR |
| `Configuration.ts` | Split `subcomponents`, `instanceExamples`, `images` per Decision 6 | MAJOR |
| `Configuration.ts` | Renamed `DEFAULT_CONFIG` → `DEFAULT_SETTINGS`, typed `ResolvedSettings` | MAJOR |
| `Component.ts` | `metadata.config` → `metadata.configuration`, typed `ResolvedConfiguration` | MAJOR |
| `index.ts` | Exports `Configuration`, `Conventions`, `Settings` and their resolved forms | MAJOR |

**Example — new shape** (`types/Configuration.ts`):

```yaml
# Before
Config:
  processing:
    glyphNamePattern?: string
    variantDepth?: 1 | 2 | 3 | 9999
  format:
    figmaKeys?: 'NONE' | 'SENTENCE' | 'TITLE'
    color?: ColorFormat

# After
Configuration:
  conventions:
    figma:
      keys?: 'NONE' | 'SENTENCE' | 'TITLE'
      glyphs?:
        match: string                # one pattern, exactly as today
  settings:
    processing:
      variantDepth?: 1 | 2 | 3 | 9999
    format:
      color?: ColorFormat
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Renamed `#/definitions/Config` → `#/definitions/Configuration` | MAJOR |
| `component.schema.json` | Added `#/definitions/Conventions` and `#/definitions/Settings` | MAJOR |
| `component.schema.json` | `metadata.config` → `metadata.configuration` | MAJOR |
| `workspace.schema.json` | Split into the two artifacts of Decision 8, each validating one definition | MAJOR |

**Example — new shape** (`schema/component.schema.json`):

```yaml
Conventions:
  type: object
  description: "Facts about the library a spec was generated from, namespaced by source. Every consumer reading the same library declares the same values; differing values produce incorrect output, not merely different output."
  properties:
    figma:
      type: object
      properties:
        keys:
          enum:
            - NONE
            - SENTENCE
            - TITLE
        glyphs:
          type: object
          properties:
            match:
              type: string
        subcomponents:
          type: object
          properties:
            match:
              type: array
            exclude:
              type: array
        states:
          type: object
  # not in required[] at any level — a library may declare no conventions
```

### Notes

- **Resolution differs per side, and the split makes that statable.** Settings are required-with-defaults after resolution; conventions stay optional, because resolution has nothing to supply. `DEFAULT_SETTINGS` covers only the settings half, which is why it is renamed rather than moved
- **Application preferences are deliberately absent from the contract.** Values that never reach a spec — canvas column count, which sections a consumer renders, whether prior output is replaced — belong to the consumer that holds them. Naming the category is the contribution; owning it is not
- **`VariantStateEntry` and `TransformEntry` are unchanged**, referenced from their new locations
- **No migration logic is added to this package** (Constitution II). Reading a pre-split artifact is a consumer concern

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Configuration` ↔ `#/definitions/Configuration`; `Conventions` ↔ `#/definitions/Conventions`; `Settings` ↔ `#/definitions/Settings`; each moved member's schema property moves with its type field; `ResolvedConfiguration` mirrors `Configuration` with settings required-with-defaults and conventions optional; `metadata.configuration` ↔ `#/definitions/Metadata/properties/configuration`; `workspace.schema.json`'s two artifacts reference the same two definitions

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Reads convention and setting members from new paths under renamed types | Update configuration access and type imports; no behavior change |
| `specs-cli` | Workspace artifact splits into `config/conventions.yaml` and `config/settings.yaml`; `metadata.configuration` output changes | Update configuration access and imports; provide a read path for the pre-split artifact; surface which half a validation error came from |
| `specs-plugin-2` | Holds configuration independently of any workspace, in one flat persisted map that mixes all three categories | Update configuration access and imports; separate persisted preferences from the shared halves; the convention set becomes comparable against a workspace's, making parity checkable rather than assumed |

**On the plugin's flat map.** Its persisted settings currently interleave the three categories, and two representational differences are worth naming because they are the plugin's, not the contract's:

- **Feature on-switches are booleans** (`SUBCOMPONENTS`, `GLYPHS`, `IMAGES`, `CODE_ONLY_PROPS`, `INSTANCE_EXAMPLES`) where the contract uses block presence. That is a flattening artifact of a UI with toggles, not a fourth category
- **Pattern members are single strings** (`SUBCOMPONENT_MATCH`) where the contract uses arrays

Neither is changed by this ADR. Both become easier to reconcile once the halves are addressable, because the plugin can map its map onto two named types rather than onto one undifferentiated one.

---

## Semver Decision

**Version bump**: MAJOR

**Justification**: Types are renamed, fields move between paths, a generated `metadata` key is renamed, and the workspace artifact splits. Per the constitution, any change to a type signature, field name, field presence, or schema structure is `MAJOR`. Every consumer reading the old paths breaks at compile time, which is the desired failure mode.

---

## Consequences

- The contract states which configuration values describe the library and which describe the run, and a consumer can tell them apart without knowing the ecosystem's history
- Conventions can be published once per library and adopted verbatim by every workspace and consumer that reads it
- Absence means one thing per side: a missing setting is defaulted; a missing convention is declared absent
- A convention mismatch between two consumers of one library becomes a diffable difference in `metadata.configuration` rather than an unexplained difference in output
- The plugin's isolated configuration and a workspace's become comparable on the half where agreement actually matters
- `conventions.figma` leaves room for conventions of other sources without a further breaking change
- Every name-based convention is keyed the same way, so `match` means one thing across the block — without any member gaining a capability it does not have today
- Widening a single-pattern member to a list remains available as its own decision, with its own justification
- A third category — application preferences — is named and deliberately excluded, so the next consumer-local value has an obvious home outside the contract
- New configuration members must be classified on arrival: a small ongoing tax, and the mechanism that keeps the split honest
- Every consumer updates imports and configuration access in the same release, and pre-split workspaces need a read path provided outside this package
- The `Config` abbreviation exception can be removed from the constitution's exceptions list
