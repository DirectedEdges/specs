# ADR: `Component.description` — The Authored Figma Description, Plain Text and Opt-In

**Branch**: `082-component-description`
**Created**: 2026-09-01
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A Figma `COMPONENT` and `COMPONENT_SET` each carry an author-entered description. It is the one piece of
component documentation that already exists in the library, is maintained by the people who maintain the
component, and travels with the published asset. Today it is dropped: `Component` has no `description`
property, and `#/definitions/Component` is `additionalProperties: false`, so a consumer cannot add it and
stay conformant.

An external request (`DirectedEdges/specs#374`) asks for the field. A follow-up comment on that issue
establishes empirically that opening the object alone changes nothing: `specs generate` never reads
`component.schema.json`, and flipping `additionalProperties` produced byte-identical output. The schema
governs only whether such a value would be *allowed to survive validation*. That is the right reading —
this ADR therefore declares a property rather than opening the object, and the generator mapping is
downstream work that this contract enables.

### What the field actually holds

The reservation is not about mechanism, it is about content. The description is a free-text box, and
libraries use it for materially different things:

- **Usage guidance** — when to reach for this component and when not to. High value, and the closest thing
  to what a spec consumer wants.
- **Anatomy or prop notes** — prose restating structure the spec already models with precision. Redundant at
  best, and drifts from the spec as the component changes.
- **Process and housekeeping** — status markers, deprecation notes, owning team, ticket links, "do not use,
  see v2", changelog fragments. Meaningful to the library's maintainers, meaningless to a generator.
- **Nothing at all** — a large share of components in most libraries carry an empty description.

Its internal structure is equally uneven. Some libraries write one disciplined sentence; others write a
heading-and-bullets document with links; others paste a changelog. There is enough implicit structure to
tempt a parser and never enough to justify one. This contract therefore treats the value as opaque text: it
is carried, not interpreted, and nothing downstream may key on a convention inside it.

### The readability cost

The Specs output is read and diffed by humans. `title` is one line; a description can be several hundred
words of prose sitting directly above the props of every component in a library. In split-concern output it
lands at the top of `api.yaml`, the file a reader opens first. Multi-line YAML block scalars also make the
noisiest possible diffs — an editorial reword in Figma reads as a change to the component's API file.

That cost is real but it is a *default* problem, not a *contract* problem. The value is genuinely useful to
documentation pipelines and genuinely noisy to code generators, and both are legitimate consumers. So the
property is declared, and whether it is emitted is a setting the run makes — consistent with how
`defaultSlotContent` handles the same tension.

### Runtime parity

The two producing runtimes do not expose the same thing. The Plugin API offers both
[`description`](https://developers.figma.com/docs/plugins/api/properties/nodes-description/) (plain text)
and [`descriptionMarkdown`](https://developers.figma.com/docs/plugins/api/properties/nodes-descriptionmarkdown/)
(rich text) on `ComponentNode` and `ComponentSetNode`. The REST file response exposes only the plain
`description` on `file.components[nodeId]` and `file.componentSets[nodeId]`. Any contract that depends on
the markdown form is satisfiable in the plugin and not in the CLI.

---

## Decision Drivers

- **Runtime parity is non-negotiable**: the CLI and the plugin must produce identical output for the same
  component. A field only one runtime can populate is not a schema field.
- **The closed `Component` stays closed**: `additionalProperties: false` is load-bearing — `Subcomponent`
  composes `Component` via `allOf` under draft-07, which has no `unevaluatedProperties`. Opening it makes a
  drifted key indistinguishable from an intended one.
- **Carry, do not interpret**: the schema may hold unstructured text, but must not imply a grammar inside it.
- **Readability of generated output**: a spec a human will not read is a spec that stops being reviewed.
- **Additive only**: existing documents stay valid and existing consumers may ignore the field (Constitution III).
- **Type ↔ schema symmetry** (Constitution I) and **no logic in this package** (Constitution II).
- **Naming — code platforms first** (Constitution VI, rule 1): `description` is the agreed term across JSON
  Schema, OpenAPI, TSDoc, and DTCG, and is already the name used on `Composition`.

---

## Options Considered — Decision 1: Where the description lives

### Option 1A: A first-class optional `Component.description` *(Selected)*

Declare `description?: string` on `Component`, sibling to `title`.

**Pros**:
- The value is component documentation, and `title` — its nearest neighbour — is already a root field.
- Inherited by `Subcomponent` for free: it is `Omit<Component, 'metadata' | 'subcomponents'>`, so a
  subcomponent's own Figma description has a home with no second declaration.
- Keeps `#/definitions/Component` closed; a declared property is the only way to admit a value without
  surrendering that guarantee.
- Lands in the api concern alongside `title` under `splitConcerns`, with no new concern-routing rule.
- Matches `Composition.description`, which already means "purpose and usage notes for documentation tooling".

**Cons / Trade-offs**:
- Puts unbounded free text at the top of the most-read file. Mitigated by Decision 3, not by placement.
- The api concern is where a root field falls by default, not where this value was argued to belong. A
  documentation concern would be the better home; see *Concern placement* under the Decision.

---

### Option 1B: `metadata.source.description` *(Rejected)*

Treat the description as provenance and hang it off the Figma source record that already identifies the node.

**Rejected because**: `metadata.source` answers *where this spec came from* — `pageId`, `nodeId`, `nodeType`.
A human-authored sentence about when to use the component is not provenance, and burying documentation in a
metadata block makes it invisible to the documentation tools that want it. It would also fail to reach
`Subcomponent`, which drops `metadata` entirely.

---

### Option 1C: `$extensions['com.figma'].description` *(Rejected)*

Carry it as a Figma platform extension, in the DTCG §5.2.3 slot used for extraction provenance elsewhere.

**Rejected because**: `$extensions['com.figma']` is for values that are meaningful *only* in Figma's model
and that no code platform expresses — the preserved original layer name, for instance. A component
description is platform-neutral documentation that every code platform has a place for. Constitution VI
rule 1 puts it in the shared contract, not behind a vendor namespace.

---

### Option 1D: Open `Component` with `additionalProperties: true` *(Rejected)*

Let consumers attach `description` — and anything else — without a declaration.

**Rejected because**: it surrenders the closed contract that `Subcomponent`'s `allOf` composition depends on,
and it validates typos. It also would not produce the field: the generator, not the schema, emits output.

---

## Options Considered — Decision 2: Plain text or markdown

### Option 2A: Plain text, from `description` *(Selected)*

`description` is an opaque string carrying the plain-text annotation. Leading and trailing whitespace is
trimmed; internal line breaks and Unicode are preserved; a whitespace-only source value is omitted rather
than emitted as `""`.

**Pros**:
- Populatable identically from the REST file response and from the Plugin API, so the two runtimes agree.
- Consistent with "carry, do not interpret" — a consumer that wants to render markdown may attempt it, but
  nothing in the contract promises the text is markdown.

**Cons / Trade-offs**:
- Formatting an author applied in Figma is flattened.

---

### Option 2B: `descriptionMarkdown`, or a `{ text, markdown }` pair *(Rejected)*

Carry the rich-text form, or both forms.

**Rejected because**: the REST runtime cannot supply it. The CLI would emit one shape and the plugin another
for the same component, which breaks the parity guarantee the ecosystem's own parity tests exist to enforce.
A pair also doubles the readability cost for a formatting gain, and it invites a grammar into a field this
ADR is deliberately keeping opaque. Revisitable if and when REST exposes the markdown form.

---

## Options Considered — Decision 3: Whether emission is gated

### Option 3A: A `spec.description` setting, default `false` *(Selected)*

Add `description?: boolean` to `Settings.spec` (required on `ResolvedSettings.spec`, `false` in
`DEFAULT_SETTINGS`). When false the property is not emitted, whatever the source carries.

**Pros**:
- Every existing run produces byte-identical output after this change — no diff churn across a library from
  an upgrade alone.
- Lets the two legitimate consumers diverge: documentation pipelines turn it on, code generators leave it off.
- Exactly the precedent set by `defaultSlotContent` (ADR-050) — optional, potentially bulky content, off by
  default, recorded in `metadata.settings` so the output is self-describing.

**Cons / Trade-offs**:
- One more setting on an already broad surface, and the requester must opt in to get the field.

---

### Option 3B: Always emit when present *(Rejected)*

No setting; the property appears whenever the Figma node has a non-empty description.

**Rejected because**: it forces the readability and diff cost on every existing consumer to serve a subset,
and it does so silently on upgrade. The content is exactly the kind of high-variance, often-low-value prose
that a run should have to ask for.

---

### Option 3C: Emit with a length cap or truncation *(Rejected)*

Bound the field — a `maxLength`, or truncation with an ellipsis.

**Rejected because**: it is lossy in the schema itself, it introduces a processing rule into a package that
must contain none (Constitution II), and there is no defensible number. A run either wants the author's
words or it does not.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Component.ts` | Added optional field `description?: string` | MINOR |
| `Settings.ts` | Added optional field `spec.description?: boolean` to `Settings` | MINOR |
| `Settings.ts` | Added required field `spec.description: boolean` to `ResolvedSettings` | MINOR |
| `Settings.ts` | Added `spec.description: false` to `DEFAULT_SETTINGS` | MINOR |

`Subcomponent` requires no change — it is `Omit<Component, 'metadata' | 'subcomponents'>` and inherits the
new field, giving a subcomponent's own Figma description a home.

**Example — new shape** (`types/Component.ts`):
```yaml
# Before
Component:
  title: string
  anatomy: Anatomy
  default: Variant

# After
Component:
  title: string
  description?: string   # optional — opaque plain text — MINOR
  anatomy: Anatomy
  default: Variant
```

**Example — generated `api.yaml` with `spec.description: true`**:
```yaml
title: Radio
description: >-
  Radio Buttons allow users to select a single option from a set of multiple
  choices. Once selected, an option cannot be deselected without choosing
  another.
props:
  selected:
    type: boolean
```

**Example — the same component with `spec.description: false` (the default)**:
```yaml
title: Radio
props:
  selected:
    type: boolean
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Added property `description` under `#/definitions/Component/properties` | MINOR |
| `settings.schema.json` | Added property `description` under the `spec` object | MINOR |

`#/definitions/Component` keeps `additionalProperties: false`, and `description` is not added to `required`.

**Example — new property** (`schema/component.schema.json`):
```yaml
# #/definitions/Component/properties
description:
  type: string
  minLength: 1
  description: >-
    The component description authored in Figma. Opaque plain text — carried,
    not interpreted. Emitted only when spec.description is true; omitted when
    the source value is absent or whitespace-only.
  examples:
    - "Radio Buttons allow users to select a single option from a set of multiple choices."
```

**Example — new setting** (`schema/settings.schema.json`):
```yaml
# spec.properties
description:
  type: boolean
  default: false
  description: >-
    Emit the component description authored in Figma. Optional; defaults to false.
```

### Notes

- `minLength: 1` is the schema's expression of "never emit an empty string". Whitespace trimming and
  omission are producer behaviour, stated here as the contract the producers implement — no logic is added
  to this package.
- The field is opaque. No consumer may parse headings, bullets, links, or any other implicit structure out
  of it, and no future ADR should add such a grammar without superseding this one.
- Under `splitConcerns`, `description` belongs to the api concern with `title`. No concern-routing change is
  needed: it is a `Component` root field, and the api concern file carries the root fields. That placement is
  a consequence of the current concern set, not an argued position — see below.

### Concern placement, and a documentation concern this ADR does not open

`description` lands in the api concern because it is a root field and the api concern carries root fields.
Nothing about the value argues for that file. It is unbounded, editorially churny, and addressed to a
different reader than the rest of the api concern — which is the same observation that motivates the
`spec.description` gate in Decision 3. The gate answers it crudely: emitted or not. A concern file would
answer it precisely: emitted, and somewhere a code generator can ignore.

The mechanism for that already exists. The concern split is not a physical partition of one object — the
variants and examples concerns are separate files that refer back to the api concern's anatomy keys, which
are the canonical names. A documentation concern would work the same way: a fourth file keyed to the same
anatomy, carrying content addressed to documentation tooling. `title` is a fair thing to question in that
light — it is identity rather than API surface — but it stays where it is regardless, because it is one
required line every consumer needs, and moving it would force two file reads to learn what a file describes.

This is also the reason the case cannot be built on `description` alone. Figma's node annotations are the
natural second occupant, and being node-scoped is not an obstacle: they would key to anatomy paths exactly
as the variants and examples concerns already do. But annotations are not modelled yet, and a concern file
designed around a single field is a partition invented for one value.

So the ADR records the question rather than answering it. If a documentation concern is introduced, this
field moves into it — a routing change, not a contract change, needing no supersession of this ADR. The
gate and the concern are complementary, not competing: one decides whether the value is produced, the other
where it lands. Nothing here forecloses either.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `Component.description` ↔ `#/definitions/Component/properties/description`
  - `Settings.spec.description` and `ResolvedSettings.spec.description` ↔ `settings.schema.json` `spec.description`
  - `Subcomponent` inherits `description` in the types via `Omit`, and in the schema via the existing `allOf`
    composition of the closed `Component` definition — no separate declaration in either artifact.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Additive. The value must be read from the selected source node and assigned, in both runtimes: the REST file response's component and component-set records, and the Plugin API's node property. | Map the source description onto the new field, trim, omit when empty, and honour the new setting. |
| `specs-cli` | Additive. Recompile against the new schema version; expose the new setting through settings resolution and document it. | Recompile; surface the setting; cover it in generate documentation. |
| `specs-plugin-2` | Additive. Recompile; the plugin runtime must use the plain-text property, not the markdown one, to stay identical to the CLI. | Recompile; map the plain-text property. |

---

## Semver Decision

**Version**: `0.31.0` — `MINOR`

**Justification**: every change is an additive optional field on a published type plus its schema
counterpart. Existing documents remain valid, existing consumers may ignore the new property, and the
default setting leaves generated output unchanged. This is `MINOR` per the constitution's versioning rule
("`MINOR` for additive types or new optional fields"). The new required member on `ResolvedSettings` is
additive to a type this package itself resolves and always populates from `DEFAULT_SETTINGS`.

---

## Consequences

- A component's authored Figma description can be represented in the spec for the first time, and consumers
  maintaining a companion documentation artifact keyed on `metadata.source.nodeId` can retire it.
- Subcomponents get the same field with no further contract work.
- Nothing changes for any existing run: the setting is off by default, and a library that turns it on has
  opted into the readability and diff cost knowingly.
- `#/definitions/Component` remains closed, so the `Subcomponent` `allOf` composition and its typo-detection
  are preserved.
- The field is fixed as opaque text. Structured component documentation — usage do's and don'ts, status,
  ownership — remains unmodelled, and if it is ever wanted it must be modelled as its own typed structure
  rather than parsed back out of this string.
- The plain-text choice is a parity constraint, not a preference. If the REST API ever exposes the rich-text
  form, a successor ADR may revisit it.
- The field's home in the api concern is provisional. Introducing a documentation concern later moves it
  there as a routing change, without superseding this ADR — and this is the first field whose reader differs
  from the rest of the api concern, so it is the first evidence for that file.
