# ADR: `childrenNamePattern` — Naming the Designated Children Slot

**Branch**: `adr/children-slot-convention`
**Created**: 2026-10-02
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A composition nests components inside components. Today, every nested slot —
including a purely structural "layout" component whose entire job is to hold
one stream of children — is represented through the same mechanism as a
genuine multi-slot composition: an explicit slot-content-reference binding at
that level, pointing at the next composed instance.

A typical composition hierarchy:

```yaml
dePage:
  dePageRow:
    deSection:
      deBlock:
        deContainer:
          - deCard
          - deCard
          - deCard
```

Every node above `deCard` exposes a single `SlotProp` that is always composed
and typically contains nothing else — a pattern `specs-from-figma` already
recognizes well enough to collapse the Figma slot primitive and its root into
one anatomy element (ADR-083, ADR-090). But in example/composition data, that
recognition stops at anatomy: each layout level still carries its own
explicit binding to the next, producing a verbose, one-level-deep binding
chain that is hard to author and hard to scan for the multi-slot composition
it is not.

`Conventions` already states this class of fact for other naming-driven
behaviors: `PlatformConventions.glyphs.match` names which assets are glyphs,
`PlatformConventions.codeOnlyProps.match` names the code-only props
container, and `PlatformConventions.subcomponents.match` names subcomponent
layers — all by pattern, all loaded from a platform's
`config/conventions/<platform>.yaml`, all under ADR-073's platform-keyed
`Conventions.platforms` map (`packages/schema/types/Conventions.ts`). No
member of that shape currently identifies which slot prop on a component is
the one "children" slot a layout component composes through.

This ADR adds that one fact: `childrenNamePattern`, a `PlatformConventions`
member naming the slot prop pattern that designates a component's children
slot. It is scoped to the schema/convention surface only — the declaration of
the fact, its type, and its JSON Schema counterpart. Consuming it to flatten
composition trees in generated example data is `specs-from-figma` engine
work and is out of scope here (see Consequences).

---

## Decision Drivers

- **Constitution I (types ↔ schema parity)**: any new field in
  `types/Conventions.ts` requires a mirrored, symmetric change in
  `schema/conventions.schema.json`.
- **Constitution II (no logic)**: this package may only declare that the
  convention exists and what shape it has — not how a consumer uses it to
  flatten a tree. That behavior belongs to `specs-from-figma`.
- **Constitution III (minimal, intentional API)**: the new field must
  represent a genuine, shared convention-surface concept, not an
  implementation detail of one downstream package's tree-walking algorithm.
- **ADR-073 (platform-keyed conventions)**: a Figma-specific naming fact is a
  `PlatformConventions` member, loaded from `config/conventions/figma.yaml`,
  not a new top-level `Conventions` key — mirroring `glyphs`, `codeOnlyProps`,
  and `subcomponents`, which are the direct precedent for "a pattern that
  identifies something by name."
- **Backward compatibility**: the field must be additive and optional —
  absence must mean exactly what every other `PlatformConventions` block's
  absence means: the library declares no such convention, and the capability
  it enables does not apply. No existing conventions file should need to
  change to remain valid.

---

## Options Considered

### Option A: `childrenNamePattern` as a new optional `PlatformConventions` string member *(Selected)*

Add `childrenNamePattern?: string` alongside `naming`, `glyphs.match`, and
`codeOnlyProps.match` in `PlatformConventions` (and its resolved counterpart,
`ResolvedPlatformConventions`). It is a literal prop name or a naming pattern
matched against a component's `SlotProp` names (its `prop` key) to identify
the one slot that is this component's designated children slot.

**Pros**:
- Follows the exact, already-established shape of `glyphs.match` and
  `codeOnlyProps.match` — a single pattern string naming something by
  convention. No new sub-shape to design or justify.
- Lands under `conventions.platforms.figma`, loaded from
  `config/conventions/figma.yaml`, consistent with ADR-073/ADR-078 — no new
  top-level `Conventions` key, no new file.
- Purely additive and optional: existing conventions files remain valid with
  no migration.

**Cons / Trade-offs**:
- A single pattern string applies uniformly across all of a platform's
  components; a design system where different components name their
  children slot differently needs one pattern that matches all of them (the
  same trade-off `glyphs.match`'s `{i}` placeholder and
  `subcomponents.match`'s `{C}`/`{S}` placeholders already accept for their
  respective concerns).

---

### Option B: A structured object (`{ match: string }`), mirroring `glyphs`/`codeOnlyProps` exactly

Give the convention its own nested object — `childrenSlot?: { match: string }`
— rather than a bare string, for shape-consistency with `glyphs` and
`codeOnlyProps`.

**Rejected because**: those blocks are objects because they carry (or are
documented as likely to carry) more than one property — `codeOnlyProps`
already has only `match`, but the object wrapper there predates a time when
exclusion or scope might be added. A children-slot pattern is a single fact
with no foreseeable second property — `PropReference` and `stylesProp`
already establish the precedent that a single-string convention is declared
as a bare string (`stylesProp?: string`) when there is no second member to
justify an object. Introducing an object wrapper here adds a needless level
of nesting the constitution's minimal-API principle (III) does not support
without a concrete second field.

---

### Option C: A per-component table (`Record<string, string>`) under `primitives`-style component keying

Model the children slot as a component-keyed map, analogous to
`Conventions.primitives`, so each design-system component names its own
children slot prop explicitly rather than relying on a library-wide pattern.

**Rejected because**: `primitives` is component-keyed because promotion rules
are genuinely per-component (ADR-074/075) — different components promote
through different style-to-prop mappings that cannot be expressed as one
pattern. A children slot, by contrast, is exactly the kind of fact
`glyphs.match`/`subcomponents.match` already model well: one naming
convention a library follows consistently for a whole class of components
(here, layout components). A component-keyed table would require authoring
one row per layout component for no benefit over a single pattern, and would
be inconsistent with the precedent those two existing conventions set for
"a fact that holds library-wide, expressed as a pattern."

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added `childrenNamePattern?: string` to `PlatformConventions` | MINOR |
| `Conventions.ts` | Added `childrenNamePattern?: string` to `ResolvedPlatformConventions` | MINOR |

**Example — new shape** (`types/Conventions.ts`):
```yaml
# Before (PlatformConventions, excerpt)
PlatformConventions:
  naming?: 'NONE' | 'SENTENCE' | 'TITLE'
  glyphs?: { match: string }
  codeOnlyProps?: { match: string }

# After
PlatformConventions:
  naming?: 'NONE' | 'SENTENCE' | 'TITLE'
  glyphs?: { match: string }
  codeOnlyProps?: { match: string }
  childrenNamePattern?: string   # new — optional, MINOR
```

Authored in `config/conventions/figma.yaml`:
```yaml
# config/conventions/figma.yaml
childrenNamePattern: "children"
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `childrenNamePattern` string property to the `PlatformConventions` definition | MINOR |

**Example — new shape** (`schema/conventions.schema.json`):
```yaml
# New property under #/definitions/PlatformConventions/properties
childrenNamePattern:
  type: string
  description: >
    Naming pattern identifying a component's designated children slot — the
    SlotProp this platform always composes further content through. Absence
    means no children slot is designated and every slot binds explicitly.
```

### Notes

- `childrenNamePattern` is optional, with no default — absence states that
  this platform declares no children-slot convention, matching how `glyphs`
  and `codeOnlyProps` absence is read (Constitution-consistent with
  `ResolvedPlatformConventions`'s existing distinction between members that
  get a resolved default, like `naming`, and blocks whose absence is a fact
  about the library, like `glyphs`).
- The field is a pattern against a `SlotProp`'s `prop` name (the slot's key
  on the component), not against a Figma layer name — it identifies a prop
  on the already-captured spec/component model, consistent with how
  `stylesProp` names a prop rather than a layer.
- No placeholder syntax (`{i}`, `{C}`/`{S}`) is introduced: a children slot
  is identified by the prop name itself, not by a name that embeds a
  component or icon identity, so a literal/pattern string with no
  substitution token is sufficient.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `PlatformConventions.childrenNamePattern` (type) maps to
  `#/definitions/PlatformConventions/properties/childrenNamePattern`
  (schema). `ResolvedPlatformConventions.childrenNamePattern` has no separate
  schema definition, consistent with existing practice — `Resolved*` types
  are a TypeScript-only resolution-time shape; schema validates the
  authored (`PlatformConventions`) form, loaded from
  `config/conventions/<platform>.yaml`.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Gains a new convention to read (`conventions.platforms.figma.childrenNamePattern`) but does not yet act on it. | Follow-up work (separate ADR/implementation) to match a component's slot props against the pattern and flatten composition trees nested through the designated children slot in generated example data, rather than emitting an explicit binding at every layout level. |
| `figma-from-specs` | Reads `metadata.conventions.*` at render time to recover the conventions a spec was generated under. | Follow-up work to recognize a flattened children-slot tree (once `specs-from-figma` emits one) and reconstruct the corresponding nested slot-content-reference structure when rendering back to Figma. |
| `specs-cli` | None. | None — the CLI passes `Conventions` through to `specs-from-figma` unchanged; no CLI-side logic reads this field. |
| `specs-plugin-2` | None at this ADR's scope. | Recompiles against the new optional field; no behavioral change until the engine (`specs-from-figma`, bundled from source) consumes it. |

---

## Semver Decision

**Target version**: `0.35.0` — the version of `@directededges/specs-schema`
on the active release branch (`release/next`) this ADR merges into.

**Change class**: `MINOR`.

**Justification**: Both changes are new optional fields (`childrenNamePattern`
on `PlatformConventions` and `ResolvedPlatformConventions`) with no removal,
rename, or narrowing of any existing field — additive-only per Constitution
Additional Constraints & Standards ("Versioning": MINOR for additive types or
new optional fields).

---

## Consequences

- A library can declare which `SlotProp` on its layout components is the
  designated children slot, via `config/conventions/figma.yaml`.
- This ADR does **not** change how any spec is generated or rendered today —
  `childrenNamePattern` is inert until a consumer reads it.
- **Follow-up required in `specs-from-figma`**: identify, for a given
  component, whether a slot prop matches `childrenNamePattern`; where it
  does, and the composed content is itself a layout component repeating the
  pattern, emit a flat, nested layout tree in example data rather than a
  chain of explicit slot-content-reference bindings. Where a slot is *not*
  the designated children slot, the existing binding mechanism remains
  required and correct — genuine multi-slot composition is unaffected.
- **Follow-up required in `figma-from-specs`**: when rendering a spec back
  onto the Figma canvas, reconstruct the explicit nested structure from a
  flattened children-slot tree, consistent with its existing responsibility
  to recover conventions from `metadata.conventions.*` at render time.
- Both follow-ups are out of scope for this ADR and are expected to be
  tracked as separate implementation work (and, if they introduce new
  schema-visible concepts beyond consuming this field, a separate ADR).
