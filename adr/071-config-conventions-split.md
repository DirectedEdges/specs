# ADR 071: Separate Library Conventions from Tooling Settings

**Branch**: `071-config-conventions-split`
**Created**: 2026-08-18
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`Config` is one flat structure with four groups — `processing`, `format`, `include`, and `transformers` — and every member is treated as a peer. In practice its members answer two unrelated questions:

- **What is true about this Figma library?** `states` classifies which variant prop means `disabled`. `glyphNamePattern` states how the library names icon assets. `subcomponents.match` states its subcomponent naming convention. Get one of these wrong and the output is *incorrect* — a state concept lands on the wrong prop, or a whole class of assets goes undetected.
- **What do I want out of this run?** `format.output`, `format.color`, `include.emptyVariants`, `transformers`. Get one of these "wrong" and the output is merely *different* — YAML instead of JSON, more variants than needed.

The distinction is invisible in the type:

```yaml
# specs.config.yaml — today, everything is a peer
processing:
  glyphNamePattern: "DS Icon Glyph / {i}"   # a fact about the library
  variantDepth: 9999                        # a choice about this run
  states:
    disabled: { prop: disabled }            # a fact about the library
  inferNumberProps: true                    # a choice about this run
format:
  figmaKeys: SENTENCE                       # a fact about the library
  color: HEXA                               # a choice about this run
```

Three consequences follow:

- **Convention members cannot be shared.** Every consumer reading the same library — the CLI, the plugin, a second workspace, a CI job — re-declares the same facts, and drift between copies produces silently different specs from one Figma file.
- **`ResolvedConfig` conflates two kinds of absence.** A missing setting means "use the default." A missing convention means "this library has no such convention," which is a different claim.
- **The distinction is about to get sharper.** ADR 066 (in flight) adds `roleNamePattern` and `propRoles`, both library facts of exactly the same kind as `states`.

---

## Decision Drivers

- **Naming governance (Constitution VI)**: no code-platform consensus exists for this concept, so rule 3 applies — terms are chosen for consumer clarity, not Figma's vocabulary
- **No abbreviations**: full, unabbreviated words in the public contract
- **Minimal, stable, intentional public API (Constitution III)**: the split must express a genuine shared concept, not one consumer's file layout
- **Type ↔ schema symmetry (Constitution I)**: any regrouping applies to both artifacts in the same change
- **No logic (Constitution II)**: the schema may classify members; it may not resolve, merge, or load them
- **Absence must mean one thing per member**: "defaulted" and "this library has no such convention" cannot share a representation
- **Serviceable by every consumer equally**: the CLI, the plugin, and the generator each hold configuration differently; the split must not privilege one arrangement

---

## Options Considered

Five decisions, taken separately: where the line falls, what the two sides are called, how they are structured, what happens to members that straddle the line, and whether the container keeps its name.

---

## Decision 1 — Where the line falls

### Option 1A: A convention describes the source library; a setting describes the run *(Selected)*

The test is a question about substitution: **if a different team pointed this tool at the same Figma file, which values would they have to keep?**

- Values they must keep are **conventions**. Changing one produces *incorrect* output
- Values they may freely change are **settings**. Changing one produces *different* output

**Pros**:

- Mechanical and reproducible — every current member classifies without argument, including the ones that felt ambiguous
- Explains the sharing consequence directly: conventions are the members worth declaring once per library
- Absence acquires one meaning per side: a missing setting is defaulted, a missing convention is declared absent

**Cons / Trade-offs**:

- Three blocks contain members from both sides today (Decision 4)
- A member could in principle be a convention for one library and a preference for another; no current member is

---

### Option 1B: Split by who authors it — designer versus engineer *(Rejected)*

**Rejected because**: it encodes an org chart, not a property of the data. The same person frequently sets both, and `states` is authored by whoever knows the library's semantics — which may be either. It also fails on `transformers`, which an engineer chooses but a library may reasonably standardize.

---

### Option 1C: Split by rate of change — stable versus per-run *(Rejected)*

**Rejected because**: it describes a symptom rather than a cause, and misclassifies members. `variantDepth` and `format.output` are typically set once per workspace and never touched, yet nothing about them describes the library. Frequency is a consequence of the substitution test, not a substitute for it.

---

## Decision 2 — What the two sides are called

### Option 2A: `conventions` and `settings` *(Selected)*

**Pros**:

- "Convention" is the established term for a library-wide agreement about naming and meaning, and is already the word the schema's own documentation uses for `states` and the name patterns
- "Setting" carries no claim of correctness — exactly the distinction Decision 1 draws
- Both are full words, neither is Figma vocabulary, and both name what they contain rather than who supplies it

**Cons / Trade-offs**:

- `settings` is a weak word, and its members are heterogeneous by construction

---

### Option 2B: `library` and `output` *(Rejected)*

**Rejected because**: `output` misdescribes its own contents — `variantDepth` and `slotConstraints` shape processing, not output. `library` is also ambiguous in a schema whose root artifact already describes a component within a library.

---

### Option 2C: `source` and `options` *(Rejected)*

**Rejected because**: `source` is already load-bearing — `metadata.source` names the Figma node a component came from, and `images.sourceProps` names props carrying image sources. Reusing it at the top level invites exactly the confusion this ADR removes.

---

## Decision 3 — How the split is structured

### Option 3A: Two named, exported types under one container *(Selected)*

`Conventions` and `Settings` are each a named, exported type with its own schema definition. The container holds one of each. The existing four groups move under `settings` unchanged in shape and meaning.

```yaml
# After
conventions:
  figmaKeys: SENTENCE
  glyphNamePattern: "DS Icon Glyph / {i}"
  codeOnlyPropsPattern: "Code only props"
  subcomponents:
    match: ["{C} / {S}"]
  instanceExamples:
    match: ["{C}*"]
  states:
    disabled: { prop: disabled }
  images:
    imageComponent: dsImage
    sourceProps: [Image]
settings:
  processing:
    variantDepth: 9999
    inferNumberProps: true
  format:
    output: YAML
    color: HEXA
  include:
    emptyVariants: false
  transformers:
    - name: react
```

**Pros**:

- **Symmetric.** Both sides are nameable, referenceable, and independently validatable. A classification where only one side has a handle is half a classification
- Each side can be held, shared, published, or stored on its own — including as separate artifacts — **without the schema saying how**
- The existing group names keep their meaning; only their parent changes
- Extends cleanly: ADR 066's `roleNamePattern` and `propRoles` land in `Conventions` on arrival

**Cons / Trade-offs**:

- Every current member's path gains a segment, so every consumer breaks at compile time
- One additional level of nesting for settings members

---

### Option 3B: A `conventions` block beside the existing groups *(Rejected)*

Add `conventions` and leave `processing`, `format`, `include`, and `transformers` at the top level, documented as the settings side.

**Rejected because**: it is asymmetric. Conventions become addressable and settings do not, so "the settings" remains a category with no handle — unnameable in a type, unvalidatable on its own, and unable to be stored separately. It also leaves the container's members at two different conceptual levels.

---

### Option 3C: Classify in documentation only — no structural change *(Rejected)*

Mark each member as convention or setting in its JSDoc and schema `description`, leaving all paths intact.

**Rejected because**: a classification a consumer cannot address is a classification it cannot act on. The sharing problem is unsolved, and nothing prevents the next member from landing on the wrong side.

---

## Decision 4 — Members whose block straddles the line

### Option 4A: Split the block; conventions take the naming half *(Selected)*

| Block | To `conventions` | Stays in `settings` |
|---|---|---|
| `subcomponents` | `match`, `exclude` | `scope` |
| `instanceExamples` | `match`, `exclude`, `parentNames` | `scope` |
| `images` | `imageComponent`, `sourceProps` | `backgroundImage` |

`scope` states where to look, not what things are called — a different team could search `PAGE` or `FILE` against the same library and both be correct. `backgroundImage` toggles whether fills are detected at all.

**Pros**:

- Applies Decision 1's test per member, which is the level at which the test is meaningful
- Preserves each block's on-switch semantics: presence of `conventions.subcomponents` still means "this library has subcomponents," which is the stronger reading of the switch

**Cons / Trade-offs**:

- Two features are assembled from both sides
- `scope` and `match` are authored together today and would no longer be adjacent

---

### Option 4B: Move whole blocks by majority *(Rejected)*

**Rejected because**: it puts `scope` and `backgroundImage` on the convention side, where absence would falsely claim the library has no such convention. It trades a correct model for adjacency in a file.

---

### Option 4C: Leave mixed blocks in `settings` entirely *(Rejected)*

**Rejected because**: it exempts exactly the members that motivate the ADR — `images.imageComponent` and `subcomponents.match` are naming conventions by any reading of Decision 1.

---

## Decision 5 — Whether the container keeps the name `Config`

### Option 5A: Rename to `Configuration` *(Selected)*

```yaml
# types/Configuration.ts
Configuration:
  conventions: Conventions
  settings: Settings
```

**Pros**:

- The constitution names `Config` as a **grandfathered** abbreviation and directs new work to prefer `Configuration`. A `MAJOR` is already being taken here, so the exception costs nothing to retire
- The container still earns a name: `metadata` needs one handle for "how this spec was produced," and a spec carrying `conventions` and `settings` as unrelated siblings loses that
- Reads correctly with both halves: a configuration *comprises* conventions and settings

**Cons / Trade-offs**:

- Renames a type every consumer imports, on top of the regrouping
- `metadata.config` becomes `metadata.configuration`, changing generated output

---

### Option 5B: Keep `Config` *(Rejected)*

**Rejected because**: the grandfathering exists to avoid churn, and the churn is happening regardless. Keeping it also keeps the word this ADR is trying to disambiguate — "config" is precisely the vague term that let two kinds of value share one structure.

---

### Option 5C: Dissolve the container — `conventions` and `settings` as siblings *(Rejected)*

**Rejected because**: `metadata` would carry two independent keys with no statement that they were resolved together for one run, and no single type would name the pair. The container is doing real work; only its name was wrong.

---

## Decision

Replace `Config` with `Configuration`, comprising two named, exported types: `Conventions` and `Settings`.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Config.ts` → `Configuration.ts` | Renamed `Config` → `Configuration`; `ResolvedConfig` → `ResolvedConfiguration` | MAJOR |
| `Configuration.ts` | Added exported `Conventions` and `ResolvedConventions` types | MAJOR (as part of the regrouping) |
| `Configuration.ts` | Added exported `Settings` and `ResolvedSettings` types, holding `processing`, `format`, `include`, `transformers` unchanged | MAJOR |
| `Configuration.ts` | Moved `processing.glyphNamePattern`, `processing.codeOnlyPropsPattern`, `processing.states`, `format.figmaKeys` → `conventions` | MAJOR |
| `Configuration.ts` | Split `subcomponents`, `instanceExamples`, `images` per Decision 4 | MAJOR |
| `Configuration.ts` | Renamed `DEFAULT_CONFIG` → `DEFAULT_SETTINGS`, typed `ResolvedSettings` | MAJOR |
| `Component.ts` | `metadata.config` → `metadata.configuration`, typed `ResolvedConfiguration` | MAJOR |
| `index.ts` | Exports `Configuration`, `Conventions`, `Settings` and their resolved forms | MAJOR |

**Example — new shape** (`types/Configuration.ts`):

```yaml
# Before
Config:
  processing:
    glyphNamePattern?: string
    states?: Record<string, VariantStateEntry>
    variantDepth?: 1 | 2 | 3 | 9999
  format:
    figmaKeys?: 'NONE' | 'SENTENCE' | 'TITLE'
    color?: ColorFormat

# After
Configuration:
  conventions:
    glyphNamePattern?: string
    states?: Record<string, VariantStateEntry>
    figmaKeys?: 'NONE' | 'SENTENCE' | 'TITLE'
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
| `component.schema.json` | Added `#/definitions/Conventions` and `#/definitions/Settings`, referenced from `Configuration` | MAJOR |
| `component.schema.json` | Removed moved properties from the former `processing` and `format` groups | MAJOR |
| `component.schema.json` | `metadata.config` → `metadata.configuration` | MAJOR |

**Example — new shape** (`schema/component.schema.json`):

```yaml
# New definition
Conventions:
  type: object
  description: "Facts about the Figma library a spec was generated from. Every consumer reading the same library declares the same values; differing values produce incorrect output, not merely different output."
  properties:
    figmaKeys: { enum: [NONE, SENTENCE, TITLE] }
    glyphNamePattern: { type: string }
    codeOnlyPropsPattern: { type: string }
    states: { type: object }
    subcomponents: { type: object }
    instanceExamples: { type: object }
    images: { type: object }
  # not in required[] at any level — a library may declare no conventions
```

### Notes

- **Both halves are independently validatable.** `Conventions` and `Settings` each have a schema definition, so a consumer may keep them in one artifact or two and validate either. **Where configuration is stored is a consumer concern and is deliberately not decided here** (Constitution III — no consumer's file layout may steer the contract)
- **Resolution differs per side, and the split makes that statable.** Settings are required-with-defaults after resolution; conventions stay optional, because resolution has nothing to supply. `DEFAULT_SETTINGS` covers only the settings half, which is why it is renamed rather than moved
- **`VariantStateEntry` and `TransformEntry` are unchanged**, and are referenced from their new locations
- **Forward compatibility**: ADR 066's `roleNamePattern` and `propRoles` classify as conventions under Decision 1 and should land in `Conventions` directly
- **No migration logic is added to this package** (Constitution II). Reading a pre-split configuration is a consumer concern

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Configuration` ↔ `#/definitions/Configuration`; `Conventions` ↔ `#/definitions/Conventions`; `Settings` ↔ `#/definitions/Settings`; each moved member's schema property moves with its type field; `ResolvedConfiguration` mirrors `Configuration` with settings required-with-defaults and conventions optional; `metadata.configuration` ↔ `#/definitions/Metadata/properties/configuration`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Reads convention and setting members from new paths under a renamed type | Update configuration access and type imports; no behavior change |
| `specs-cli` | Workspace configuration shape changes; `metadata.configuration` output changes | Update configuration access and type imports; provide a read path for pre-split configuration files; decide whether the two halves are stored as one artifact or two |
| `specs-plugin-2` | Holds its own configuration independently of any workspace; the split applies equally | Update configuration access and type imports; the convention set is now nameable as a unit, making parity with a workspace's conventions checkable rather than assumed |

---

## Semver Decision

**Version bump**: MAJOR

**Justification**: Types are renamed, fields move between paths, and a generated `metadata` key is renamed. Per the constitution, any change to a type signature, field name, field presence, or schema structure is `MAJOR`. Every consumer reading the old paths breaks at compile time, which is the desired failure mode for a change of this kind.

---

## Consequences

- The contract states which configuration values describe the library and which describe the run, and a consumer can tell them apart without knowing the ecosystem's history
- Both halves are addressable as units, so either can be shared, compared, validated, or stored separately — including as separate artifacts — without the schema prescribing how
- Absence means one thing per side: a missing setting is defaulted; a missing convention is declared absent
- A convention mismatch between two consumers of one library becomes a diffable difference in `metadata.configuration` rather than an unexplained difference in output
- The plugin's isolated configuration and a workspace's configuration become comparable on the half where agreement actually matters
- New configuration members must be classified on arrival — a small ongoing tax, and the mechanism that keeps the split honest
- Every consumer updates imports and configuration access in the same release; workspaces carrying pre-split configuration files need a read path provided outside this package
- The `Config` abbreviation exception in the constitution is retired for this type and can be removed from the exceptions list
