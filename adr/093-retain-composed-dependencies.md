# ADR: Composed dependency selection is a setting

**Branch**: `093-retain-composed-dependencies`
**Created**: 2026-09-28
**Status**: DRAFT
**Summary**: A `composedDependencies` setting joins the inclusion choices `invalidVariants`, `emptyVariants` and `defaultSlotContent`, closing the generated set under composition.
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Curation decides which components in a library get a spec. A consumer derives an
initial selection from the library's own signals — most commonly a component's dev
status — and then records that selection in a manifest a human can edit.

Deriving selection from dev status alone produces an incomplete set. A component
marked ready composes other components, and those carry no dev status of their own:
a subcomponent has none to read, and a sibling it instances was curated on its own
merits. Selecting only what is marked ready therefore deselects the very things the
selection needs.

Consumers close that gap by selecting, transitively, every component a selected
component composes. This is currently unconditional — `Settings` has no member
describing curation, so there is no way for a workspace to express that it does not
want the gap closed.

Three properties of the current behaviour motivate this ADR:

- **It cannot be turned off.** Retention is applied on every curation pass.
- **It cannot be overridden by hand.** Retention runs *after* a prior manifest's
  checkboxes are merged forward, so a component a human deliberately deselects is
  re-selected on the next pass. The option that exists to preserve manual edits does
  not protect against it.
- **It is sensitive to convention spelling.** Whether a component is recognised as
  another's subcomponent — and so skipped by retention rather than promoted by it —
  depends on `Conventions.subcomponents`. Two workspaces with equivalent-looking
  conventions can retain different sets from the same library.

A workspace observing the third property has no lever other than editing its
conventions, which changes what the spec *means* in order to change what gets
generated. That conflates two decisions the contract keeps separate.

### What is not decided here

The convention-matching asymmetries that make retention's input vary between
consumers are implementation defects in those consumers, not contract questions.
They are out of scope, and fixing them does not remove the need for this member:
even with identical matching everywhere, a workspace may legitimately not want
unmarked components generated.

---

## Decision Drivers

- **Selection is a choice, not a fact** — `Settings` members are defined as choices
  about a run that produce *different* output, never incorrect output. A member
  qualifies only if both values yield a defensible spec.
- **Additive only** — an optional member with a default preserves every existing
  workspace's behaviour on upgrade.
- **Type ↔ schema symmetry** — the member must land in `types/Settings.ts` and
  `schema/settings.schema.json` together (Constitution I).
- **No logic in this package** — the contribution here is a declaration plus one
  entry in `DEFAULT_SETTINGS`, which is the single permitted runtime export for
  settings (Constitution II).
- **Shared concept, not a consumer's internal** — the member must describe curation
  as every consumer experiences it, and must not be named for, or justified by, one
  package's command or function (Constitution III).
- **Naming — code platforms first, no abbreviations** — Constitution VI and the
  unabbreviated-words constraint.

---

## Options Considered

### Decision 1 — Is curation expressible in `Settings` at all?

#### Option A: Add an optional member governing composed-dependency selection *(Selected)*

`Settings` gains a member that states whether the components a selected component
composes are themselves selected. It defaults to the current behaviour.

**Pros**:
- Satisfies *selection is a choice*: with the member on, the generated set is closed
  under composition; with it off, the set is exactly what the library marked. Both
  are defensible readings of "generate this library".
- Additive and defaulted, so no existing workspace changes behaviour.
- Separates curation from convention. A workspace changes what is generated without
  restating what a subcomponent *is*.

**Cons / Trade-offs**:
- Turning it off admits specs that reference components with no spec of their own.
  The consequences of that are real and are recorded below.

---

#### Option B: No member — curate by editing the manifest *(Rejected)*

The manifest already carries a per-component selection a human can edit, so a
workspace that does not want a component generated deselects it.

**Rejected because**: it does not work. Retention is applied after prior selections
are merged forward, so a manual deselection is reversed on the next curation pass.
The surface that looks like the answer is overwritten by the behaviour in question.
Making it work would mean ranking a human edit above derived selection — a larger
change to curation semantics than this ADR proposes, and one that would still leave
a workspace re-deselecting the same components after every library change.

---

#### Option C: No member — express it through `Conventions` *(Rejected)*

A workspace that does not want a component generated declares it excluded in
`Conventions.subcomponents`.

**Rejected because**: conventions describe how a library encodes meaning — what
counts as a subcomponent of what. Selection describes what a run should produce.
Using an exclusion pattern to suppress generation overloads a contract member with a
second, unrelated job, and it is imprecise: the same pattern that suppresses one
component reshapes how every matching component is specced.

---

### Decision 2 — The member's shape, name, and placement

#### Option A: `spec.composedDependencies?: boolean`, default `true` *(Selected)*

```yaml
# Before
spec:
  invalidCombinations: true
  defaultSlotContent: false

# After
spec:
  invalidCombinations: true
  defaultSlotContent: false
  composedDependencies: true    # optional — MINOR
```

**Pros**:
- Placement: `spec` is documented as *what the generated spec contains*, and this
  member decides which components it contains. The alternative groups — `data`
  (source acquisition) and `assets` (shared resources) — describe neither.
- Shape: a two-valued choice is a boolean, matching the nine existing `spec`
  booleans. `invalidCombinations` establishes the precedent for a `true` default.
- Name: a plural noun phrase naming the thing included, consistent with
  `invalidVariants`, `invalidCombinations`, `emptyVariants`, and
  `defaultSlotContent`. Unabbreviated. Constitution VI rule 3 applies — no code
  platform expresses an opinion on library curation, and the term is drawn from the
  schema's own vocabulary (`Composition`, composed content) rather than Figma's.

**Cons / Trade-offs**:
- A boolean cannot later express a third mode (for example, retain siblings but not
  subcomponents) without a breaking change. Accepted: no such mode is known to be
  wanted, and inventing an enum for it now would be speculative.

---

#### Option B: A new top-level `scan` group *(Rejected)*

```yaml
scan:
  retainComposedDependencies: true
```

**Rejected because**: it names the member for one consumer's command and its
internal function. Curation happens wherever a library is turned into specs, not
only in a command called `scan`, and Constitution III forbids a contract member
justified by or named after a single package's implementation.

---

#### Option C: A new top-level `curation` group *(Rejected)*

```yaml
curation:
  composedDependencies: true
```

**Rejected because**: the existing top-level groups each name a concern that owns a
directory and several members. A group introduced for one boolean asserts a
structure the contract has no other members for. If curation later earns several
members, promoting them into a group is a separate, justified decision.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Settings.ts` | Added optional field `spec.composedDependencies` | MINOR |
| `Settings.ts` | Added required field `spec.composedDependencies` to `ResolvedSettings` | MINOR |
| `Settings.ts` | Added `spec.composedDependencies: true` to `DEFAULT_SETTINGS` | MINOR |

**Example — new shape** (`types/Settings.ts`):
```yaml
# Before
Settings:
  spec:
    invalidCombinations?: boolean
    defaultSlotContent?: boolean

# After
Settings:
  spec:
    invalidCombinations?: boolean
    defaultSlotContent?: boolean
    composedDependencies?: boolean   # optional — MINOR; defaults to true
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `settings.schema.json` | Added property `composedDependencies` under `#/properties/spec/properties` | MINOR |

**Example — new shape** (`schema/settings.schema.json`):
```yaml
# New property under #/properties/spec/properties
composedDependencies:
  type: boolean
  default: true
  description: "Select the components a selected component composes, transitively."
  # not in required[] — optional field
```

### Notes

- **Default `true`** preserves current behaviour. A workspace upgrading sees no
  change in what is generated.
- **Optional in `Settings`, required in `ResolvedSettings`**, per the stated rule
  that every property with a default in `DEFAULT_SETTINGS` is required on the
  resolved type.
- **Scope of the member.** It governs whether composition closes the selected set.
  It does not govern what counts as composition — that stays in `Conventions` — nor
  how a consumer merges a human's edits with a derived selection.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Settings['spec']['composedDependencies']` ↔
  `#/properties/spec/properties/composedDependencies`;
  `ResolvedSettings['spec']['composedDependencies']` is the same property with the
  default applied, and carries no separate schema definition, consistent with every
  other resolved member.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Curation gains a configurable branch; default preserves today's output | Read the member when deriving selection; recompile |
| `specs-from-figma` | None to the transform contract | Recompile |
| `specs-plugin-2` | Curation surfaces may expose the choice | Recompile; optionally surface the member |

### Pipeline consequences of the non-default value

When the member is `false`, a generated spec may carry an `instanceOf` naming a
component that has no spec of its own. Every consumer that resolves such a reference
resolves it by lookup and treats a miss as "not composable":

| Consumer | Behaviour on an unresolvable reference |
|----------|----------------------------------------|
| `react-from-specs` | The element is not emitted as an instance; it falls through to the container emitter |
| `webcomponents-from-specs` | Mirrors the React package's resolution |
| `figma-from-specs` | The reference is not counted as a dependency and is not rendered as that component |

The significant finding is that **none of these fail**. There is no dangling import
and no build or Storybook error. The instance is emitted as a plain container, so a
composed element renders as an empty box where a real component belongs. The failure
is silent and visual rather than loud and mechanical, which makes it harder to
attribute than an error would be.

This is a consequence a workspace elects knowingly. It is also an argument for the
default: a workspace that does not think about this member gets the closed set, and
never encounters the degradation.

---

## Semver Decision

**Target version**: `0.35.0` — the version of `@directededges/specs-schema` on the
active `release/next` branch.

**Change class**: `MINOR` — for CHANGELOG placement, not a version bump.

**Justification**: The change adds one optional field to `Settings`, one required
field to `ResolvedSettings` (which is produced by this package's own defaults, never
authored), one `DEFAULT_SETTINGS` entry, and one optional schema property. No field
is removed, renamed, or made required on an authored type. Constitution:
"`MINOR` for additive types or new optional fields."

---

## Consequences

- A workspace can state that generation should cover exactly what its library marked,
  without editing conventions to get there.
- The default is the current behaviour, so acceptance changes no existing output.
- Setting the member to `false` admits specs whose `instanceOf` references do not
  resolve. Consumers degrade silently to a container rather than erroring, so a
  workspace choosing this accepts visual gaps it must notice for itself.
- Curation becomes a documented axis of `Settings` rather than an unstated behaviour,
  which gives future curation questions a place to be decided.
- A boolean commits to a two-valued choice. A third mode would be a MAJOR change to
  this member.
