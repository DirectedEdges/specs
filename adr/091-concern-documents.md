# ADR: Concern documents are a typed root document

**Branch**: `091-concern-documents`
**Created**: 2026-09-18
**Status**: ACCEPTED
**Summary**: A `SpecConcernDocument` root type and `Metadata.concern` type the per-concern files a `splitConcerns` run writes.
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none — extends ADR-089)*

---

## Context

`Settings.spec.splitConcerns` writes one file per concern rather than a single component file. It defaults to `true`, so concern-split output is the ordinary shape of a generated workspace, not an opt-in edge case. `types/Image.ts` already reasons about "concern-split output" when resolving an image pointer.

The contract has never described the resulting document. `schema/root.schema.json` offers exactly three branches:

```yaml
oneOf:
  - component.schema.json    # requires title, anatomy, default
  - components.schema.json
  - metadata.schema.json
```

A concern document matches none of them. It is a slice of a component, and each slice is missing something `Component` declares required:

| Document | Carries | Required by `Component`, absent |
|---|---|---|
| `api.yaml` | `title`, `anatomy`, `props` | `default` |
| `variants.yaml` | `default`, `variants`, `invalidVariantCombinations` | `title`, `anatomy` |
| `styling.yaml` | `default` | `title`, `anatomy` |

A validator picks the nearest `oneOf` branch and reports its failures, so an editor tells the author of a `variants.yaml` that their file needs a title. The file is correct; the contract has no way to say so.

Separately, every concern document carries two keys under `metadata` that appear in neither `types/Metadata.ts` nor `component.schema.json`:

```yaml
metadata:
  # …author, generator, schema, conventions, settings…
  generatedAt: 2026-09-17T23:55:28.273Z
  concern: api
```

`Metadata` sets `additionalProperties: false`, so both are reported as disallowed on every concern document in every workspace. These are real facts the generator writes deliberately — `concern` states which slice the file is, which is exactly the discriminator the missing root type needs.

The result is that a correctly generated workspace cannot be validated against its own published schema. Authors editing specs in an editor see errors on every file and learn to ignore the validator, which then cannot catch the mistakes it exists to catch.

**Out of scope**: whether `splitConcerns` should remain the default, and the set of concerns themselves (`api`, `styling`, `variants`). This ADR types the documents that setting already produces.

---

## Decision Drivers

- **Types and schema describe the same structure** (constitution I): a new document shape needs both a type and a schema definition, added together.
- **No runtime logic** (constitution II): the discrimination between concern documents must be expressible in JSON Schema and TypeScript alone — no helper that inspects a document and tells a consumer what it is.
- **Mechanically verifiable** (constitution IV): `root.schema.json` must stay internally consistent with `component.schema.json`, and a valid generated file must validate.
- **A single-file component stays exactly as it is**: `splitConcerns: false` output is the `Component` shape today and must not change, so this cannot be paid for by loosening `Component`.
- **Naming follows code platforms** (constitution VI): the vocabulary for "when was this produced" should not invent a second term for a fact the contract already names.
- **Additive where possible**: downstream packages compile against these types; a change that forces every consumer to re-handle `Component` is disproportionate to the gap being closed.

---

## Options Considered

### Decision 1 — How a concern document is validated

#### Option A: A `SpecConcernDocument` root type discriminated by `metadata.concern` *(Selected)*

Add a fourth branch to `root.schema.json`. A concern document is its own document type: every component-level property optional, `metadata.concern` required and constrained to the concern enum.

```yaml
# schema/concern.schema.json — new
SpecConcernDocument:
  type: object
  required: [metadata]
  properties:
    metadata:            # requires `concern`
    title:               # all component properties, all optional
    anatomy:
    props:
    default:
    variants:
    # …
```

**Pros**:
- `Component` is untouched, so single-file output keeps the exact contract it has today — the fourth driver is satisfied without qualification.
- `metadata.concern` is already written by the generator, so the discriminator is a fact the document states about itself rather than a shape a validator has to guess at.
- Purely additive: a new schema file and a new exported type. Existing consumers compile unchanged.
- A consumer can narrow on `concern` in TypeScript and get the slice it expects, which is the same information the validator uses.

**Cons / Trade-offs**:
- Two document types describe overlapping property sets, so a property added to `Component` must be added in both places or the concern document silently cannot carry it.
- A concern document with every property optional cannot, on its own, catch a `variants.yaml` that forgot its variants. Validation of the *union* of a component's concern files is not expressible here and remains out of reach.

---

#### Option B: Relax `Component.required` to `title` only *(Rejected)*

Drop `anatomy` and `default` from the required list so that every concern document validates as a `Component`.

**Rejected because**: it violates the fourth driver directly. A single-file component genuinely does require an anatomy and a default block, and removing that requirement means the contract no longer states the one thing it most needs to state about a component. It also does not work — `variants.yaml` has no `title` either, so the requirement would have to fall to zero, at which point `Component` validates any object at all.

---

#### Option C: Conditional `if`/`then` on `metadata.concern` inside `Component` *(Rejected)*

Keep one type and make its required list depend on the value of `metadata.concern` — absent means all three are required, `api` means `title` and `anatomy`, `variants` means `default`.

**Rejected because**: it encodes generation behaviour in the shape of the contract. The required list of a component would become a function of which file it happens to be sitting in, which is a fact about the run, not about the component. It also reads poorly as a published type: `Component` in TypeScript cannot express the conditional at all, so the type and the schema would describe different structures — a direct violation of constitution I.

---

### Decision 2 — How a document states when it was produced

#### Option A: `concern` on `Metadata`, and reuse `lastUpdated` for the timestamp *(Selected)*

Add `concern` to `Metadata` as an optional discriminator. Do **not** add `generatedAt` — `RunMetadata.lastUpdated` already names this fact, and the generator should write that key.

```yaml
# After
metadata:
  lastUpdated: 2026-09-17T23:55:28.273Z   # existing key, already declared
  concern: api                             # new, optional
```

**Pros**:
- Satisfies the naming driver: the contract names each fact once. `generatedAt` and `lastUpdated` are two spellings of one thing, and publishing both makes every consumer decide which is authoritative.
- `concern` earns its place because it does work no existing key does — it is the discriminator Decision 1 relies on.
- Optional on `Metadata`, so a single-file component omits it and is unaffected.

**Cons / Trade-offs**:
- The generator currently writes `generatedAt` and must change to write `lastUpdated`. Until it does, concern documents still fail validation — the fix is not complete in this package alone.
- `lastUpdated` is a slightly awkward name for a file that was just created. The alternative is worse: two timestamp keys with no stated relationship.

---

#### Option B: Add both `generatedAt` and `concern` to `Metadata` *(Rejected)*

Declare the two keys exactly as the generator writes them today.

**Rejected because**: it publishes two names for one fact. A consumer reading a spec would have to know that `lastUpdated` on a run metadata document and `generatedAt` on a concern document mean the same thing, and nothing in the contract would say so. Constitution VI's naming governance exists to prevent exactly this, and the cheaper fix is a one-key change in the generator rather than a permanent redundancy in the published type.

---

#### Option C: A separate `document` block beside `metadata` *(Rejected)*

Put per-file facts in their own block: `document: { concern: api }`.

**Rejected because**: it adds a second top-level metadata concept without a principle separating it from the first. `metadata.source` is already a per-document fact living under `metadata`, so the block does not cleanly divide run facts from document facts — it just moves one key and leaves the boundary less clear than before.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Metadata.ts` | Added optional field `concern` to `Metadata` | MINOR |
| `Metadata.ts` | Added exported type `Concern` | MINOR |
| `Component.ts` | Added exported type `SpecConcernDocument` | MINOR |
| `index.ts` | Export `Concern` and `SpecConcernDocument` | MINOR |

**Example — new shape** (`types/Metadata.ts`):
```yaml
# Before
Metadata:
  source: { pageId, nodeId, nodeType }
  # …optional RunMetadata fields

# After
Metadata:
  source: { pageId, nodeId, nodeType }
  concern?: Concern    # optional — which slice of a component this document is
  # …optional RunMetadata fields

Concern: 'api' | 'styling' | 'variants'
```

**Example — new shape** (`types/Component.ts`):
```yaml
# New type — one slice of a component, as written by splitConcerns
SpecConcernDocument:
  metadata: Metadata          # required; its `concern` states which slice
  title?: string              # every component property, optional
  anatomy?: Anatomy
  props?: Props
  default?: Variant
  variants?: Variant[]
  invalidVariantCombinations?: …
  subcomponents?: …
  instanceExamples?: …
  slotContentExamples?: …
  images?: …
  source?: …
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `concern.schema.json` | Added — new file defining `SpecConcernDocument` | MINOR |
| `component.schema.json` | Added optional property `concern` to `#/definitions/Metadata` | MINOR |
| `root.schema.json` | Added `concern.schema.json` to `oneOf` | MINOR |

**Example — new shape** (`schema/component.schema.json`):
```yaml
# New property under #/definitions/Metadata/properties
concern:
  type: string
  enum: [api, styling, variants]
  description: "Which slice of a component this document carries, when a run wrote one file per concern. Absent on a single-file component."
  # not in required[] — optional field
```

**Example — new shape** (`schema/root.schema.json`):
```yaml
oneOf:
  - $ref: component.schema.json
  - $ref: components.schema.json
  - $ref: metadata.schema.json
  - $ref: concern.schema.json    # new
```

### Notes

`concern` is optional on `Metadata` rather than required on it, because `Metadata` is shared with single-file components, which have no concern. It is required on `SpecConcernDocument`, which is what makes the `oneOf` branch discriminate rather than overlap: a document with no `concern` is a `Component` and is held to `Component`'s required list.

`generatedAt` is deliberately **not** added. The generator writes it today and must be changed to write `lastUpdated` instead — see Downstream Impact.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `Concern` ↔ the `enum` on `#/definitions/Metadata/properties/concern`
  - `Metadata.concern` ↔ `#/definitions/Metadata/properties/concern`, absent from `required`
  - `SpecConcernDocument` ↔ `concern.schema.json#/definitions/SpecConcernDocument`, whose property set mirrors `#/definitions/Component` with an empty `required` list apart from `metadata`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Writes `metadata.generatedAt` on every concern document, which the contract does not declare | Write `lastUpdated` instead, and set `metadata.concern` on each document it splits |
| `specs-from-figma` | Produces the metadata block the CLI writes | Same key change, at the point the block is built |
| `specs-plugin-2` | Emits concern-split output when the setting is on | Recompile; same key change if it builds the block independently |

Until the generator change lands, concern documents continue to fail validation on `generatedAt`. This ADR closes the contract gap; it does not by itself make existing workspaces valid.

---

## Semver Decision

**Target version**: `0.33.0` — the version of `@directededges/specs-schema` on the active `release/next` branch.

**Change class**: `MINOR` — for CHANGELOG placement, not a version bump.

**Justification**: Every change is additive — one optional field on an existing type, two new exported types, one new schema file, one new `oneOf` branch. No existing type or schema property is removed, renamed, or made stricter, so no consumer's current code or output stops validating (constitution III).

---

## Consequences

- A generated workspace using the default `splitConcerns: true` can be validated against the published schema, so editor diagnostics on spec files become trustworthy rather than noise to be ignored.
- A consumer reading a spec file can narrow on `metadata.concern` to know which slice it holds, using the same fact the validator discriminates on.
- Two document types now describe overlapping property sets. A property added to `Component` must be added to `SpecConcernDocument` in the same change, or concern-split output silently cannot carry it. This is a new parity obligation on every future component-shape ADR.
- Validating a component *across* its concern files — catching an `api.yaml` with no matching `variants.yaml`, or a set that collectively lacks an anatomy — remains outside the contract. Each file validates alone.
- The published contract states one name for the generation timestamp. Generators writing `generatedAt` are wrong against the schema until they change, which is a deliberate short-term break in favour of not publishing a redundant key.
