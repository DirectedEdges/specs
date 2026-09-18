# ADR: Package Identity for Emitted Platform Trees

**Branch**: `092-platform-package-identity`
**Created**: 2026-09-18
**Status**: DRAFT
**Summary**: A `platforms` map on `Settings` carries per-target `PackageIdentity`, naming the package an emitted tree constitutes.
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A code-platform target emits a tree of source files — components, styles, stories — rooted at a directory the workspace names. That tree is modelled as data that could be lifted out and installed elsewhere as a component library.

Nothing in the contract lets the tree say what it is. A tree carries its sources and nothing else: no statement of the package it constitutes, no declaration of the runtime it expects, no record of the compilation assumptions its sources were written against. Everything needed to install or compile it must be rediscovered by reading the code.

The gap is observable the moment a source file in such a tree is opened in an editor with no enclosing project. Every diagnostic — an unresolved framework import, an unresolved side-effect stylesheet import, an absent JSX runtime — traces to the same root: the tree declares no package, so no tooling can resolve one. A neighbouring harness directory that happens to carry its own manifest does not help, because project discovery walks upward from a file, never sideways.

Two things are worth separating before any option is weighed.

- **Self-description** is what the contract can supply. A tree that declares its own identity and its own compilation assumptions is liftable: the declaration travels with the sources.
- **Resolution** is what the contract cannot supply. Imports resolve only once a consumer installs dependencies. No declarative field makes that happen.

This ADR addresses the first. The editor diagnostics above are the symptom that exposed the gap, not the thing being fixed — a tree that fully declares itself still reports an unresolved framework import until someone installs it.

### Current state

`Conventions.platforms` is a map of platform key → `PlatformConventions` (`types/Conventions.ts`), loaded per platform from a workspace conventions file. Its members are `naming`, `glyphs`, `codeOnlyProps`, `subcomponents`, `instanceExamples`, `images`, `slotConstraints`, `inferNumberProps`, `stylesProp`, and `defaultFillWidth`.

`Settings` (`types/Settings.ts`) carries `author`, `data`, `spec`, and `assets`. It has no platform dimension at all; `assets` is documented as shared "whatever the platform".

The two types divide on a stated line, and that line decides this ADR:

| | `Conventions` | `Settings` |
|---|---|---|
| Holds | Facts about a library | Choices about a run |
| A wrong value produces | **Incorrect** output | **Different** output, still correct |
| Two teams, same library | Declare the same value | May legitimately differ |

Both types are recorded into every generated spec's metadata — `Metadata.conventions` is a `MetadataConventions`, `Metadata.settings` is a `ResolvedSettings`.

---

## Decision Drivers

- **The fact/choice line governs placement.** A member belongs to whichever type its own test puts it in. Placement by authoring convenience inverts the contract.
- **Contract coherence over consumer convenience.** Per constitution III, no downstream package's internal model may drive this. Which file is pleasant to author is not a driver.
- **Per-platform by nature.** Each emitted tree is a distinct package. React and Web Components trees must be able to declare different identities.
- **Additive only.** All members optional, no existing member changed — MINOR class, no downstream recompilation forced.
- **Type ↔ schema parity.** Every type change lands in `conventions.schema.json` or `settings.schema.json` in the same change.
- **No logic.** Per constitution II, this package declares shape only. What an emitter writes into a scaffolded file, and when, is the emitter's decision.
- **Metadata surface is not free.** Anything added to either type is recorded into every spec. `MetadataConventions` documents its own narrowing on exactly this ground: recording more than the producing platform would "make a drift check fire on unrelated changes."

---

## Options Considered — Decision 1: Which artifact declares package identity

### Option A: `PlatformConventions.package` *(Rejected)*

A nested block on the existing per-platform conventions entry, authored in the same per-platform conventions file as `stylesProp` and `defaultFillWidth`.

```yaml
# conventions/react.yaml
stylesProp: style
package:
  name: "@example/library-react"
  version: 0.1.0
```

**Rejected because** it fails the fact/choice test that separates the two types. Every existing `PlatformConventions` member states a fact about the library that a reader could get *wrong*: a mismatched glyph pattern leaves assets undetected, a mismatched `stylesProp` drops styling. A package name is not discoverable from the library and cannot be wrong in that sense — two teams emitting from the same library may choose different names and both are correct. That is verbatim the `Settings` test.

Two further consequences follow from the placement rather than the field:

- **Version churn enters a correctness-checked surface.** Everything in `PlatformConventions` is recorded into every spec's `Metadata.conventions`. A package version is expected to change on its own cadence, so every routine bump would rewrite the conventions metadata of every spec — the precise class of unrelated-change noise `MetadataConventions` documents itself as having been narrowed to avoid. `Metadata.settings` also varies per run and already carries volatile values such as `author`, so the same churn there is unremarkable.
- **It blurs a coherent category.** `PlatformConventions` currently answers one question: how does this platform express design concepts? Package identity answers a different one: what artifact does the emitted tree constitute?

### Option B: `Settings.platforms.<key>.package` *(Selected)*

A new platform-keyed block on `Settings`, holding package identity per platform target.

```yaml
# settings
platforms:
  react:
    package:
      name: "@example/library-react"
      version: 0.1.0
  web-components:
    package:
      name: "@example/library-wc"
      version: 0.1.0
```

**Pros**:
- Passes the fact/choice test directly — a chosen name produces different, equally correct output.
- Sits with the concern it belongs to. `Settings.spec.directory` already governs where output lands; package identity governs what that output declares itself to be.
- Keeps a correctness-checked metadata surface free of a value that changes on an unrelated cadence.
- Per-platform keying satisfies the React/Web Components requirement without special-casing either.

**Cons / Trade-offs**:
- Introduces a platform dimension `Settings` does not have today. This is the real cost of the option and is accepted: the dimension is genuine, since a workspace can target several platforms at once and each target is its own package.
- Per-platform configuration is now split across two artifacts — design vocabulary in conventions, packaging in settings. The split follows the fact/choice line rather than cutting across it, so it is a consequence of the contract rather than an inconsistency in it.

### Option C: No schema surface — identity supplied outside the contract *(Rejected)*

Package identity is passed at invocation, or read from a manifest already present in the target tree.

**Rejected because** it leaves the first emission with nothing to declare, which is exactly the case this ADR exists to address. It also puts identity outside validation and outside the spec's metadata record, so nothing can state what a given tree was emitted as.

---

## Options Considered — Decision 2: The shape of the platform-keyed settings block

Given Decision 1, the block's shape is a separate question.

### Option A: `platforms?: Record<string, PlatformSettings>` *(Selected)*

A platform-keyed map at the top level of `Settings`, with `package` as its first member.

**Pros**:
- Mirrors `Conventions.platforms` keying exactly, so a platform key means the same thing in both artifacts.
- Leaves room for later per-platform run choices without another structural decision.
- Keeps the top-level `Settings` surface to one new member.

**Cons / Trade-offs**:
- A named `PlatformSettings` type whose sole member is `package` is thin at introduction.

### Option B: `Settings.spec.packages?: Record<string, …>` *(Rejected)*

Nest package identity under the existing `spec` concern.

**Rejected because** `spec` governs the generated spec — where it is written, how it is split, how values are serialized. An emitted platform tree is a different artifact from the spec, and filing its identity under `spec` would make that member mean two things.

### Option C: Flat per-platform members *(Rejected)*

Discrete top-level members such as `reactPackage` and `webComponentsPackage`.

**Rejected because** it enumerates platforms in the contract. Platform keys are free-form implementation ids by design, so each new target would demand a new schema member — a MINOR change every time, against constitution III's minimal, stable API.

---

## Decision

Package identity is declared on `Settings`, under a new platform-keyed `platforms` map. `PlatformConventions` is not changed.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Settings.ts` | Added `PackageIdentity` interface | MINOR |
| `Settings.ts` | Added `PlatformSettings` interface | MINOR |
| `Settings.ts` | Added optional `platforms` to `Settings` | MINOR |
| `Settings.ts` | Added optional `platforms` to `ResolvedSettings` | MINOR |
| `index.ts` | Export `PackageIdentity`, `PlatformSettings` | MINOR |

**Example — new shape** (`types/Settings.ts`):
```yaml
# Before
Settings:
  author?: string
  data?: { … }
  spec?: { … }
  assets?: { … }

# After
Settings:
  author?: string
  data?: { … }
  spec?: { … }
  assets?: { … }
  platforms?: Record<string, PlatformSettings>   # optional — MINOR

PlatformSettings:
  package?: PackageIdentity

PackageIdentity:
  name?: string       # the package the emitted tree constitutes
  version?: string    # the version that tree declares
```

`platforms` stays optional in `ResolvedSettings`, and so does every member within it. There is no default: absence means the workspace declares no package identity for that platform, and no default can invent a package name.

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `settings.schema.json` | Added `PackageIdentity` definition | MINOR |
| `settings.schema.json` | Added `PlatformSettings` definition | MINOR |
| `settings.schema.json` | Added `platforms` property to `Settings` | MINOR |

**Example — new shape** (`schema/settings.schema.json`):
```yaml
# New property under #/definitions/Settings/properties
platforms:
  type: object
  description: "Per-platform run choices, keyed by the same free-form implementation id as Conventions.platforms."
  additionalProperties:
    $ref: "#/definitions/PlatformSettings"
  # not in required[] — optional

# New definition
PackageIdentity:
  type: object
  properties:
    name:
      type: string
      description: "The package the emitted platform tree constitutes."
    version:
      type: string
      description: "The version the emitted platform tree declares."
  additionalProperties: false
```

### Notes

- **Naming.** `package`, `name`, and `version` are the terms npm (`package.json`, the React target's registry) and Swift Package Manager (`Package.swift`, the SwiftUI target's) both use for the same concept. Constitution VI rule 1 applies — two or more code platforms agree.
- **`version` is a string, not a number.** Every package registry in scope treats a version as a dotted string.
- **Both members optional.** A workspace may declare a name and defer versioning, and the contract should not force a version it has no opinion on.
- **What is deliberately absent.** No dependency list, no peer-dependency declaration, no compiler-option members. Which runtime a platform requires is knowledge the emitter for that platform already holds; asking a workspace to restate it would invite a declaration that contradicts the sources being emitted. Constitution II also puts the content of any scaffolded file outside this package.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes, for every definition the schema models.
- **Parity check**:
  - `Settings.platforms` ↔ `#/definitions/Settings/properties/platforms`
  - `PlatformSettings` ↔ `#/definitions/PlatformSettings`
  - `PackageIdentity` ↔ `#/definitions/PackageIdentity`
- **Pre-existing asymmetry, not introduced here**: `settings.schema.json` has no `ResolvedSettings` definition at all. `metadata.schema.json` references `#/definitions/Settings` for the resolved-settings slot, so the resolved form has never been modelled separately in JSON Schema. `ResolvedSettings.platforms` therefore gains a type-side member with no schema counterpart to add, exactly as every other `ResolvedSettings` member already stands. Closing that gap is its own change, not this one.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Resolved settings gain an optional member | Recompile. Surface the new member wherever settings are loaded and resolved. |
| `specs-from-figma` | Code-platform emitters gain a declared package identity to read | Recompile. Consume the new member when scaffolding a platform tree — see Future work. |
| `specs-plugin-2` | None — no platform tree is emitted in that runtime | Recompile only. |

---

## Semver Decision

**Target version**: `0.33.0` — the version of `@directededges/specs-schema` on the active `release/next` branch.

**Change class**: `MINOR` — for CHANGELOG placement, not a version bump.

**Justification**: Every change is a new optional member or a new exported type. No existing member is renamed, removed, or made required, so no consumer is forced to change. Additive types and new optional fields are MINOR per the constitution's versioning rule.

---

## Consequences

- A workspace can declare, per platform target, the package an emitted tree constitutes and the version it states. The declaration is validated by the schema and recorded in each spec's metadata.
- An emitted platform tree becomes able to describe itself. Lifting a tree elsewhere no longer requires rediscovering its identity by reading its sources.
- Package identity is settled as a **run choice**, not a library fact. The `Conventions`/`Settings` boundary is reinforced rather than blurred, and a version that changes on its own cadence stays out of the conventions metadata that a drift check reads.
- `Settings` gains a platform dimension. Later per-platform run choices have a declared home and will not each require a structural decision.
- Package identity is expressed once per platform and consumed identically by every code-platform emitter, so React and Web Components trees cannot diverge in how they declare themselves.
- Per-platform configuration is split across two artifacts — design vocabulary in conventions, packaging in settings. Authoring guidance needs to state the fact/choice line so the split reads as intent.
- A declared identity does **not** make a tree's imports resolve. That still requires a consumer to install dependencies, and the diagnostics described in Context persist until they do. Any documentation of this member must not imply otherwise.

### Future work — out of scope here

- **Emitter scaffolding.** Writing a manifest and a compilation config into a platform tree from this declaration belongs to the code-platform emitters, not to this package. That work carries its own decisions — which files, what they contain, which runtime each platform declares as a peer.
- **Write-once semantics.** The scaffold is to be written only when absent and never overwritten, since the files belong to whoever lifts the tree. This is settled as intent but is an emitter behaviour, and constitution II keeps it out of the schema.
- **Sourcing a version.** Whether the declared version is authored by hand or derived from an existing manifest in the target tree is an emitter decision, deliberately left open.
