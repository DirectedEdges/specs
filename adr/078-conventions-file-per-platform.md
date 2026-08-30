# ADR: One Conventions File per Platform, in `config/conventions/`

**Branch**: `078-conventions-file-per-platform`
**Created**: 2026-08-30
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

ADR-071 Decision 10 established the workspace layout — one artifact per question:

```
config/
  conventions.yaml     # what the library is
  settings.yaml        # how output behaves, and where it goes
  pipeline.yaml        # what to run
```

ADR-073 then made `Conventions` a platform-keyed map with `figma` as one key among `react`, `web-components`, `swiftui`, and `compose`. A four-implementation workspace produces roughly this:

```yaml
platforms:
  figma:            # ~30 lines: naming, glyphs, subcomponents, states, images
  react:            # ~14 lines
  web-components:   # ~14 lines
  swiftui:          # ~16 lines
  compose:          # ~16 lines
```

Nothing about that is large. The problem is that it is **one file with several owners**:

- The `figma` entry is authored by whoever knows the Figma library — its naming, its state props, how it organizes subcomponents. That person has no opinion about `foregroundStyle`
- Each code entry is authored by whoever knows that code library. That person has no opinion about `"{C} / Examples / {S}"`
- The entries change on unrelated cadences. A Figma reorganization touches one; a Compose Material bump touches another

The consequences are ordinary but real: no single reviewer can validate the file, every change puts unrelated teams in the same diff, and the design lead opening `conventions.yaml` to check a layer-name pattern scrolls past four blocks of prop names that mean nothing to them.

ADR-071 Decision 1B already rejected splitting *the type* by author, on the grounds that it encodes an org chart rather than a property of the data. That rejection stands and is not reopened here. This ADR asks a different question: given one contract, may it be **composed from several files**?

---

## Decision Drivers

- **One contract, whatever the file count.** `Conventions` stays a single platform-keyed map (ADR-073). Nothing here may reintroduce a namespace split or a second root artifact
- **Ownership should map to something reviewable.** A change to the React vocabulary should be diffable, reviewable, and ownable without touching what the design lead reads
- **No logic in the schema package (Constitution II).** Composition is a loader concern; the package describes the artifact
- **Layout is convention, not configuration (ADR-071 Decision 10).** The existing files are discovered by name in `config/`, not declared. A composition mechanism that requires declaring file paths is a step backwards
- **Do not name anything after a direction or a command.** This pipeline reads code to produce specs and writes specs to produce Figma; ADR-077 removed a read/write framing for exactly this reason, and the same error is available in a folder name
- **Absence keeps its meaning (ADR-071).** A platform with no file declares no conventions — the same statement a missing key made
- **Additive-only.** The single-file form must keep working

---

## Options Considered

Four decisions: whether composition happens at all, where the files live, how a file names its platform, and what becomes of the single-file form.

---

## Decision 1 — Is `Conventions` composed from several files?

### Option 1A: Yes — several files compose into one `Conventions` *(Selected)*

The loader gathers platform entries from several files and produces one `Conventions`. The type, the schema, and everything downstream see exactly what they see today.

**Pros**:

- Separates ownership without separating the contract. The type stays one map; only the authoring surface splits
- The split is along the platform axis, which is a property of the data, not an org chart — ADR-071 Decision 1B's objection does not apply. That teams happen to align with platforms is a consequence, not the rule
- Purely a loader concern, so nothing in `Conventions` changes and no consumer of the resolved object is affected
- Scales with platforms rather than with team count

**Cons / Trade-offs**:

- The effective conventions for a run are no longer visible in one file. Mitigated by the resolved object being what every consumer sees, and by `metadata.conventions` in emitted specs recording what was actually used
- One more layout rule to know

---

### Option 1B: No — keep one file *(Rejected)*

**Rejected because**: it leaves every owner in one diff and makes the design lead's file the union of five audiences' concerns. The cost compounds with each platform added, and the fix costs no type change.

---

### Option 1C: Split the type instead — `conventions` and `codeConventions` *(Rejected)*

**Rejected because**: this is ADR-073 Option 2B, rejected there for asserting that Figma is not a platform, and ADR-071 Decision 1B, rejected for encoding an org chart. It also fails on its own terms now: the split would have to be "Figma versus the rest," which stops describing anything the moment two code teams own two platforms.

---

## Decision 2 — Where the files live

### Option 2A: `config/conventions/`, one file per platform *(Selected)*

```
config/
  conventions/
    figma.yaml
    react.yaml
    web-components.yaml
    swiftui.yaml
    compose.yaml
  settings.yaml
  pipeline.yaml
```

The artifact keeps its name; it becomes a directory rather than a file. `settings.yaml` and `pipeline.yaml` are untouched.

**Pros**:

- Preserves ADR-071 Decision 10's rule exactly — one artifact per question, named for the question. `conventions/` is still *the conventions artifact*; only its granularity changed
- The directory name says what the contents are, not who reads them or when. Nothing in it implies a direction or a command
- Ownership maps to a file path, so `CODEOWNERS` works on it without further ceremony
- Discovery stays convention-based: read every file in `config/conventions/`. No paths declared anywhere, consistent with the existing layout
- Scales to N platforms with no rule change, and the two-file case is the common instance rather than a special one

**Cons / Trade-offs**:

- `config/` now holds a directory beside two files. Mild asymmetry, and the alternative is a rule that stops scaling
- Reading the whole conventions means opening a directory

---

### Option 2B: `config/transform/`, holding the code-platform files *(Rejected)*

```
config/
  conventions.yaml       # figma
  transform/
    react.yaml
```

**Rejected because**: it names the folder after a command, and the command is the wrong axis twice over.

First, it is not even accurate today. `platforms.figma` is consumed by `generate`, not `transform`, so this layout sorts conventions by which command reads them — the "grouped by kind of knob" arrangement ADR-071 Decision 10 explicitly retired in favour of grouping by concern. It would need a `config/generate/` sibling to be consistent, and then a third folder for whatever reads conventions next.

Second, and more seriously, **the same conventions are used by more than one command and in more than one direction**. Reading code to produce a spec needs the React vocabulary as much as transforming a spec into React does — knowing that `DsText` is the text primitive is required either way. Filing those conventions under `transform/` bakes in a one-direction assumption, which is the precise error ADR-077 removed when it dropped the read-side / write-side framing. A folder name should not re-encode a distinction the ADRs just rejected.

---

### Option 2C: Flat, dotted — `config/conventions.react.yaml` *(Rejected)*

**Rejected because**: it puts five files in `config/` beside `settings.yaml` and `pipeline.yaml`, so the directory no longer reads as three artifacts. It also makes the artifact's identity a filename prefix, which tooling and `CODEOWNERS` handle worse than a path.

---

### Option 2D: A directory per platform — `config/platforms/react/conventions.yaml` *(Rejected)*

**Rejected because**: a level of nesting holding one file each. The platform axis is already the filename in Option 2A; a directory adds depth and nothing else until a platform needs a second artifact, which nothing suggests it will.

---

## Decision 3 — How a file names its platform

### Option 3A: The filename is the platform id; the file holds the entry body *(Selected)*

```yaml
# config/conventions/react.yaml
stylesProp: sx
images:
  component: DsImage
primitives:
  text:
    component: DsText
    props:
      typography: typography
```

No `platforms:` wrapper, no key repetition. `config/conventions/react.yaml` contributes `platforms.react`.

**Pros**:

- A file owns exactly one platform, so two files cannot declare the same key and there is **no merge rule to specify** — the collision the alternative would need to resolve cannot occur
- The file's identity is its path, which is what `CODEOWNERS`, review routing, and `git log` operate on
- No repetition. The key appears once, as the filename
- Adding a platform is adding a file; removing one is deleting a file, and absence keeps its ADR-071 meaning

**Cons / Trade-offs**:

- Renaming a platform renames a file. Correct — they are the same fact
- A file's contents start at `stylesProp:` with no in-file statement of which platform they describe. Conventional for directory-keyed configuration (`.github/workflows/`, `hosts.d/`), and the path is visible in every editor and diff
- A shared fragment across two platforms cannot be expressed. ADR-073 Decision 3B already rejected inheritance on the platform axis; this is consistent with it

---

### Option 3B: Each file carries a full `platforms:` map, deep-merged *(Rejected)*

**Rejected because**: it permits two files to declare the same platform, which forces a merge rule — file ordering, key precedence, deep versus shallow — for a capability nobody asked for. It also repeats each key in two places, where they can disagree.

---

### Option 3C: The file declares its own id in a `platform:` member *(Rejected)*

**Rejected because**: it allows filename and declared id to differ, so the path stops being trustworthy and every tool must open a file to learn what it configures.

---

## Decision 4 — What becomes of the single-file form

### Option 4A: Both forms are valid; declaring both is an error *(Selected)*

A workspace has **either** `config/conventions.yaml` (a `platforms:` map, exactly as ADR-073 defines it) **or** `config/conventions/` (one file per platform). Both present is a load error, not a merge.

**Pros**:

- Every existing workspace keeps working untouched, and a single-platform workspace never needs a directory holding one file
- Refusing to merge the two forms keeps precedence from becoming a question. There is one place conventions come from, and which place it is, is obvious from the filesystem
- The migration is mechanical and optional

**Cons / Trade-offs**:

- Two supported layouts to document and to implement discovery for
- A workspace could sit in the directory form with one file, which is harmless but slightly ceremonious

---

### Option 4B: The directory form only; migrate every workspace *(Rejected)*

**Rejected because**: it breaks every existing workspace to no benefit for the single-platform case, which is the majority.

---

### Option 4C: Merge both, directory overriding file *(Rejected)*

**Rejected because**: it invents a precedence rule to support a layout nobody wants — half the conventions in a file and half in a directory beside it.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| *(none)* | `Conventions`, `ResolvedConventions`, and `Settings` are unchanged. Composition is a loader concern | — |

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `workspace.schema.json` | Documents `config/conventions/` as an alternative to `config/conventions.yaml`, with one file per platform id and the entry body as its root | MINOR |
| `conventions.schema.json` | Added a definition validating a single platform entry standalone — the per-file root — alongside the existing whole-artifact definition | MINOR |

**Example — the two valid layouts**:

```yaml
# Form 1 — config/conventions.yaml (unchanged, ADR-073)
platforms:
  figma:
    naming: SENTENCE
  react:
    primitives:
      text: {component: DsText}
```

```yaml
# Form 2 — config/conventions/figma.yaml
naming: SENTENCE

# config/conventions/react.yaml
primitives:
  text: {component: DsText}
```

Both produce the identical `Conventions` object.

### Notes

`conventions.schema.json` needs a standalone definition for one platform entry so a single file can be validated on its own, in an editor, without the rest of the directory. The whole-artifact definition references the same definition, so the two cannot drift.

Discovery is by convention: every `*.yaml` directly inside `config/conventions/`, with the basename as the platform id. No recursion, and no paths declared in `Settings` — consistent with ADR-071 Decision 10, where layout is convention rather than configuration.

A file whose basename matches no platform any generator reads is inert, exactly as an unread key in the single-file form is. A consumer-side warning is the mitigation and a consumer concern (Constitution II).

---

## Type ↔ Schema Impact

- **Symmetric**: Yes, trivially — no type changes, and the schema addition is a re-entry point into an existing definition rather than a new shape
- **Parity check**: the standalone per-platform definition ↔ `PlatformConventions`, the same definition the whole-artifact form references

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Implements discovery for both layouts and the both-present error | Implement |
| `specs-plugin-2` | Persists conventions; unaffected by workspace file layout | None |
| `specs-from-figma` | Receives a resolved `Conventions`; unaffected | None |
| `react-from-specs` | Same | None |
| `webcomponents-from-specs` | Same | None |
| `figma-from-specs` | Same | None |
| Existing workspaces | None — the single-file form stays valid | Optional migration |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: an additive alternative layout in `workspace.schema.json` and an additive definition in `conventions.schema.json`; no type changes and no existing layout invalidated. Constitution III.

---

## Consequences

- Ownership maps to a file path. The React vocabulary is reviewable and ownable without touching what a design lead reads, and `CODEOWNERS` needs no special handling
- `config/conventions/figma.yaml` holds only Figma facts, which is the file the design lead opens
- There is no merge rule, because a platform is declared in exactly one file. The collision case cannot arise
- The contract is unchanged. Every consumer receives one `Conventions` object and cannot tell which layout produced it
- Two layouts are supported. That is a permanent cost in the CLI's discovery, accepted so that no existing workspace breaks and a single-platform workspace needs no directory
- **Out of scope, and now more visible**: `metadata.conventions` in an emitted spec records the resolved conventions, which in a five-platform workspace means four platforms' vocabulary riding along in every spec generated from Figma. Whether metadata should carry only the platforms a run used is a separate question this ADR deliberately does not answer
