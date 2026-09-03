# ADR: `promotePrimitives` — the Switch for Capture-Time Promotion

**Branch**: `adr/spec-time-promotion`
**Created**: 2026-09-02
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-074 changes the shape of composed example content: a primitive layer becomes an instance
of a design system component. That is not a change a run can partly have. Either a spec's
composed content is expressed in primitives, or it is expressed in instances.

`Settings.spec` already governs choices of exactly this kind — what a run does to the material
it captures, as distinct from facts about the library (`Conventions`) or the work to be done
(`Pipeline`). `collapsePrimitiveWrapper` is the closest neighbour: it is also a normalization
applied during capture, also changes anatomy, and is also something a consumer may want to
turn off to see what the file actually contained.

Two consequences make a switch load-bearing rather than a convenience.

**Comparing two runs requires them to agree.** A spec captured with promotion and one captured
without differ throughout their composed content. Any comparison between them — a parity
check between two producers, a diff against a stored baseline, a review of what a change did —
reports the whole difference as a finding unless both sides were produced the same way.

**Adoption is not instantaneous.** A workspace with an existing corpus needs to re-capture
everything, or run mixed, and mixed is only safe if the mode is declared rather than inferred.

The alternative to a setting is to let the presence of a `conventions.primitives` table decide.
That works as a switch but conflates two facts: whether a design system *has* described its
components, and whether this run should *use* that description. A workspace cannot then
capture a comparison baseline without deleting its conventions.

---

## Decision Drivers

- **A run's choices belong in `Settings`, not `Conventions` (ADR-071).** Whether to promote is
  a choice about this run; what a component accepts is a fact about the library
- **Two runs must be comparable on demand**, which requires the mode to be selectable and
  recorded
- **Absence means one thing (ADR-071)** — an absent member takes the documented default
- **Additive only** — no existing member changes
- **No logic in this package** (Constitution II)

---

## Options Considered

### Option A: `settings.spec.promotePrimitives`, defaulting to `true` *(Selected)*

```yaml
settings:
  spec:
    collapsePrimitiveWrapper: true
    promotePrimitives: true
```

**Pros**:

- Sits with the setting it most resembles, and is governed by the same resolution rules, so
  there is nothing new to learn about how it is read or recorded
- Separates "the library is described" from "this run uses the description", so a baseline can
  be captured without dismantling the conventions file
- Recorded in `metadata.settings` like every other spec setting, so a spec says how it was
  produced and two specs can be compared knowingly
- Defaulting on makes the behaviour ADR-074 argues for the behaviour a workspace gets. A
  workspace with no `conventions.primitives` is unaffected either way, since nothing matches

**Cons / Trade-offs**:

- A default-on setting changes output for any workspace that has a conventions table and
  upgrades. That is the intent of ADR-074, and the setting is how such a workspace opts back
  out

---

### Option B: The same member, defaulting to `false` *(Rejected)*

**Rejected because**: it ships the feature dormant. `collapsePrimitiveWrapper` defaults off as
an opt-in refinement to a shape that is already correct without it; promotion is the shape
ADR-074 concludes composed content should have. A default that contradicts the ADR that
introduces it leaves the contract saying two things.

---

### Option C: No setting — a `conventions.primitives` entry is the switch *(Rejected)*

**Rejected because**: it makes describing a design system and transforming this run's output
the same act. A workspace cannot capture an unpromoted baseline for comparison without
removing its conventions, and a spec cannot record that promotion was deliberately skipped —
absent promotion and absent conventions look identical.

---

### Option D: A `Pipeline` entry rather than a `Settings` member *(Rejected)*

**Rejected because**: `Pipeline` declares what work to do; `Settings` declares how that work
treats what it captures. Promotion is not a step to run or skip, it is a property of how
composed content is expressed — the same category as collapsing a wrapper.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Settings.ts` | Added `SpecSettings.promotePrimitives?: boolean` — optional, defaults to `true` | MINOR |
| `Settings.ts` | Added `ResolvedSpecSettings.promotePrimitives: boolean` — required in resolved form | MINOR |
| `Settings.ts` | `DEFAULT_SETTINGS.spec.promotePrimitives = true` | MINOR |

**Example — new shape** (`types/Settings.ts`):

```yaml
# Before
SpecSettings:
  collapsePrimitiveWrapper?: boolean   # defaults to false
  invalidVariants?: boolean

# After
SpecSettings:
  collapsePrimitiveWrapper?: boolean   # defaults to false
  promotePrimitives?: boolean          # defaults to true — optional, MINOR
  invalidVariants?: boolean
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `settings.schema.json` | Added `promotePrimitives` under the spec settings properties | MINOR |

```yaml
promotePrimitives:
  type: boolean
  default: true
  description: "Primitive layers in composed example content are promoted to design system component instances."
  # not in required[] — optional field
```

### Notes

The default differs from `collapsePrimitiveWrapper`'s, deliberately. Collapse is an optional
refinement; promotion is the shape ADR-074 concludes composed content should have, so the
default states that conclusion.

Turning promotion off does not merely skip a step — it produces a materially different spec,
which is the point. The value is recorded in `metadata.settings` with every other spec
setting, so a consumer comparing two specs can see whether they were produced the same way
before attributing a difference to anything else.

The setting governs whether the ADR-075 table is applied. It does not govern whether the table
is loaded or validated: a malformed conventions file is an error whether or not this run would
have used it.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `SpecSettings.promotePrimitives` ↔ the `promotePrimitives` property on the
  spec settings object, with `default: true` matching `DEFAULT_SETTINGS`; the resolved form is
  the same property with the member required

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Resolves the new setting and gates promotion on it | Read the setting; expose it where spec settings are configured |
| `specs-from-figma` | Applies or skips promotion accordingly | Gate the promotion path |
| `specs-plugin-2` | Surfaces the setting in the panel's settings translation | Add the control; recompile |
| `figma-from-specs` | None — it reads what a spec contains, not how it was produced | Recompile |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: one additive optional member on an existing type, plus its resolved
counterpart and a default. No existing member changes name, type, or presence.

---

## Consequences

- Promotion can be turned off, so an unpromoted baseline can be captured without dismantling a
  workspace's conventions
- A spec records whether it was promoted, so two specs can be compared knowingly rather than
  by assuming they were produced alike
- Parity checking and baseline diffing stay usable across the transition, provided both sides
  declare the same value
- Describing a design system and transforming a run's output are separate acts
- A workspace with a conventions table sees its composed output change on upgrade. Setting
  `promotePrimitives: false` restores the previous shape
- The setting surface grows by one member, and the plugin gains a control
