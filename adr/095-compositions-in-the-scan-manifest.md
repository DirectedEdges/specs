# ADR: Compositions Are a Recorded Section of the Manifest, Not a Curated One

**Branch**: `feature/compositions-cli`
**Created**: 2026-09-29
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none — amends the manifest format ADR-093 governs the curation half of)*

---

## Context

A composition is a Figma `FRAME` that arranges components into a screen, a page, or a
pattern. The engine already specs one: `FRAME` is an accepted node type, a frame yields
no variant props and an empty prop surface, and its anatomy and styles are captured as
for any component. The plugin has produced composition specs in production since it
shipped. `Metadata.source.nodeType` already admits `'FRAME'`, so the spec a composition
produces is already a legal spec.

The CLI's REST path produces none. Three things stand in the way, and only the third is
this ADR's subject:

| Blocker | Where |
|---|---|
| A frame ID is unfindable through the REST lookup | the engine's REST adapter |
| No frame is ever discovered by a scan | `ComponentDiscovery` |
| The manifest has nowhere to put one, and no rule for which frames belong | `ManifestParserV2`, the manifest writer |

The manifest is the CLI's curation surface: a scan writes it, a human edits it, and a
generate reads it. It has two sections today, and they are shaped by two different
answers to the same question — *who decides what is in this run?*

| Section | Who decides | Shape |
|---|---|---|
| `## Components` | the human, from a default the library's dev-status markings seed (ADR-093) | checkbox per row |
| `## Glyphs` | the naming convention, absolutely | no checkbox; recorded and excluded |

Compositions need a third answer, because neither existing one fits. Curating them is
busywork: unlike a component library, where a library holds far more than a team
consumes, a frame is only a composition *because someone marked it ready for dev*. The
marking is already the curation. And unlike glyphs, a composition is the point of the
run — recording it and then excluding it would record nothing anyone asked for.

---

## Decision Drivers

- **The marking is the decision.** A frame marked ready for dev has been declared
  consumable by the person who marked it. A second, redundant decision in a checkbox
  adds a step that can only ever disagree with the first by accident.
- **Wherever the frame lives.** Compositions sit on pages, in sections, inside other
  containers. No structural position rule may qualify or disqualify one.
- **One frame, one spec.** A composition must not be specced twice, once on its own and
  once as part of something else.
- **Rescan is idempotent and needs no merge.** A section with nothing a human can edit
  has nothing to preserve across a rescan, which removes a whole class of merge rule.
- **The manifest stays human-readable.** A third section must read as obviously as the
  two that precede it, and a reader must be able to tell why a row is there.
- **No format version bump.** A v2 parser that predates this ADR must read a manifest
  containing the new section without failing.

---

## Options Considered

### Option A: A third section, recorded and always generated *(Selected)*

`## Compositions` lists every qualifying frame, with no checkbox, and `specs generate`
processes every row in it. Membership is derived from the library on every scan; the
section is output, never input.

```markdown
## Compositions

_Frames marked `READY_FOR_DEV` in Figma. All are specced — this section is not curated._

| Name | ID | Type |
|------|------|------|
| Checkout / Small | 30141:6435 | FRAME |
| Home / Large | 44240:10115 | FRAME |
```

**Pros**:
- The marking is the only decision, stated once, in Figma, by the person who owns it.
- Merge semantics collapse to nothing: a rescan rewrites the section wholesale, so
  `--keep-checks`, `--reset-checks` and `settings.curation` have no composition
  behaviour to define, and therefore no composition behaviour to get wrong.
- Mirrors the `## Glyphs` precedent for a recorded, uncheckboxed section — the same
  three columns, the same explanatory note under the heading — differing only in what
  happens downstream, which the note says outright.
- A pre-ADR parser reads the section's rows as unparseable and warns; it does not fail,
  because its row regex requires a leading checkbox cell that these rows do not have.

**Cons / Trade-offs**:
- A team wanting one composition out of a marked set cannot express that in the
  manifest; they must unmark the frame in Figma. This is the intended direction of
  authority, not an oversight — but it is a real constraint, and `--compositions <name>`
  on generate is the escape if one is ever needed.
- The Components and Compositions sections now answer the curation question
  differently, so "the manifest is a curation file" becomes "the manifest is a record of
  the run, part of which is curated."

---

### Option B: A third section, checkbox-curated like Components *(Rejected)*

`## Compositions` with a checkbox per row, seeded checked from the marking, merged
across rescans by the ADR-093 rules.

**Rejected because**: it duplicates a decision already made in Figma, and buys nothing
for it. Every ADR-093 rule would need a composition answer — what `defaultSelection:
ALL` means for an unmarked frame, whether `includeDependencies` pulls the components a
composition composes into the *component* selection, what `preserveManualSelections`
protects — and each answer is a new way for a scan to produce a manifest the author did
not intend. Violates *the marking is the decision*.

---

### Option C: Compositions as rows in the existing `## Components` section *(Rejected)*

One section, with `Type` distinguishing `FRAME` rows from `COMPONENT`/`COMPONENT_SET`.

**Rejected because**: the two row kinds would obey different curation rules inside one
table — some rows' checkboxes meaningful, others' ignored — which is unreadable. It also
forces a name collision to be resolvable, since a composition and a component may share
a name, and a single table gives no room to disambiguate.

---

## Decision

### The qualifying rule

A node is listed as a composition when **all** of the following hold:

1. Its type is `FRAME`.
2. Its `devStatus.type` is `READY_FOR_DEV`.
3. No ancestor of it also qualifies under 1 and 2.
4. Its name is not an authoring aid under `conventions.figma.subcomponents.exclude` or
   the `codeOnlyProps` container name — the same exclusion components get.
5. Its name yields a non-empty spec key.

Rule 3 is *one frame, one spec*: a marked frame inside a marked frame is already
captured as part of its ancestor's anatomy, and listing it would spec it twice under two
keys. The outermost marking wins.

Rule 5 is defensive, not hypothetical: a frame named with whitespace alone exists in
real libraries, and a key derived from it is the empty string — which would claim the
composition root directory as its own spec folder. Such a frame is skipped with a named
warning rather than silently dropped.

Nothing about *where* the frame sits qualifies or disqualifies it. A frame that is a
direct child of a page, one nested in a `SECTION`, and one inside a plain container are
all equally eligible.

### The section

| Property | Value |
|---|---|
| Heading | `## Compositions` |
| Position | after `## Components`, before `## Glyphs` |
| Columns | `Name`, `ID`, `Type` — no checkbox column |
| Row order | by name, ascending, for stable diffs |
| Written when | at least one frame qualifies; omitted entirely otherwise |
| Note under heading | states the marker rule and that every row is specced |

`Dev Status` is deliberately **not** a column. It would be `READY_FOR_DEV` on every row,
because being `READY_FOR_DEV` is what put the row there. The rule belongs in the note
under the heading, stated once, rather than restated per row as though it varied.

### Rescan

The section is re-derived in full from the library on every scan. There is no prior-state
merge, so:

- `--keep-checks`, `--reset-checks` and `settings.curation.preserveManualSelections` have
  no effect on it — there is no check to keep or reset.
- `settings.curation.defaultSelection: ALL` and `--include-all` do **not** widen it.
  They widen *curation*; qualification is the marker's job, and an unmarked frame is not
  a composition.
- `settings.curation.includeDependencies` does not apply. A composition is not retained
  by anything and retains nothing: the components it instances are curated on their own
  merits, exactly as they are today.
- A composition that loses its marking, or is deleted, simply stops appearing.

### Scan output

One additional summary line, only when the section was written:

```
✓ Found 10 compositions (frames marked ready for dev)
```

### Parser

`ManifestRowV2.type` widens to `'COMPONENT' | 'COMPONENT_SET' | 'FRAME'`, and the parse
result gains a `compositions: ManifestRowV2[]` member alongside `components`. Composition
rows carry `included: true` and `devStatus: 'READY_FOR_DEV'` as constants, so a consumer
iterating rows from either section reads the same shape.

The scan format version stays **2**. The section is additive and the pre-existing row
regex cannot match its rows, so an older v2 parser degrades to warnings on five lines
rather than to a failure.

---

## Type ↔ Schema Impact

- **Symmetric**: N/A — no `@directededges/specs-schema` type or JSON schema changes. The
  manifest is a CLI artifact with no schema definition, and `Metadata.source.nodeType`
  already admits `'FRAME'`.
- **Parity check**: the spec a composition produces is already a valid `SpecApiDocument`;
  nothing in this ADR alters spec content.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` — scan | Discovers and writes the new section | Implement the qualifying rule in both discovery classes (monolithic and page-sectioned) |
| `specs-cli` — generate | Reads `compositions` from the parse result | Process every row; route output per ADR-096 |
| `specs-from-figma` | A frame ID must resolve through the REST lookup | Open the lookup gate for explicit IDs |
| Older `specs-cli` releases | Five warning lines per manifest | None — degradation is intended and non-fatal |

---

## Semver Decision

**Target version**: `0.32.0` — `@directededges/specs-cli` on the active release branch.

**Change class**: `MINOR` — a new manifest section and a widened parse result, both
additive. No existing manifest becomes unreadable and no existing row changes meaning.

**Justification**: additive output and an additive member on an internal result type;
the scan format version is unchanged because compatibility is preserved in both
directions.

---

## Consequences

- A frame marked ready for dev is specced by the next `specs scan` + `specs generate`
  with no manifest edit, which is the whole of the authoring loop for compositions.
- Unmarking a frame in Figma is the only way to remove a composition from a run. This is
  a deliberate concentration of authority in the library, and it means a stale marking
  produces a spec nobody asked for until someone unmarks it.
- The manifest is no longer uniformly a curation file. Its sections now differ in whether
  they are input or output, and the note under each heading is what tells a reader which.
- `settings.curation` remains entirely about components. Any future desire to curate
  compositions is a new setting, not an extension of an existing one.
