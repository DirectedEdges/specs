# ADR: `slots.default.match` — Naming the Default Slot, and Flattened Instance Nesting

**Branch**: `adr/children-slot-convention`
**Created**: 2026-10-02
**Status**: ACCEPTED
**Summary**: A `slots.default.match` convention and `SlotProp.defaultSlot` marker name a component's one always-composed slot, enabling flattened child nesting.
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
the one "default" slot a layout component composes through.

This ADR adds that fact — `slots.default.match` — **and** decides the
composition-side mechanism that fact enables: when a slot prop matches it, an
authored example may nest the filling instance as a plain child element
rather than through an explicit slot binding at every level. Both the
convention and the flattened-nesting rule are decided here, in this ADR; only
the engine work to produce and consume that shape in `specs-from-figma` and
`figma-from-specs` remains follow-up implementation (see Downstream Impact).

---

## Decision Drivers

- **Constitution I (types ↔ schema parity)**: any new field in
  `types/Conventions.ts` requires a mirrored, symmetric change in
  `schema/conventions.schema.json`.
- **Constitution II (no logic)**: this package states that the convention
  exists, its shape, and the composition rule it enables — not the
  tree-walking algorithm a consumer uses to apply it. That implementation
  belongs to `specs-from-figma` / `figma-from-specs`.
- **Constitution III (minimal, intentional API)**: the new field must
  represent a genuine, shared convention-surface concept, not an
  implementation detail of one downstream package's tree-walking algorithm.
- **ADR-073 (platform-keyed conventions)**: a Figma-specific naming fact is a
  `PlatformConventions` member, loaded from `config/conventions/figma.yaml`,
  not a new top-level `Conventions` key — mirroring `glyphs`, `codeOnlyProps`,
  and `subcomponents`, which are the direct precedent for "a pattern that
  identifies something by name."
- **Shape consistency with existing naming conventions**: a naming
  convention in `PlatformConventions` is an object wrapper (`{ match }`),
  never a bare string — `glyphs`, `codeOnlyProps`, and `subcomponents` all
  take this form. The new field follows the same shape rather than
  introducing a one-off bare-string exception.
- **Field name and grouping**: the convention reads as `slots.default.match`
  — a new `slots` object (consistent with the existing noun-keyed vocabulary
  `glyphs` / `codeOnlyProps` / `subcomponents` / `images`) with a `default`
  sub-key naming *which* slot is the default one. This also leaves room for
  a future non-default slot convention to live under the same `slots` object
  without a new top-level key, though no such convention is designed here.
- **Backward compatibility**: the field must be additive and optional —
  absence must mean exactly what every other `PlatformConventions` block's
  absence means: the library declares no such convention, and the capability
  it enables does not apply. No existing conventions file should need to
  change to remain valid.
- **Self-contained consumption**: a generated spec is the contract consumers
  read — a downstream reader (the flattening rule itself, `figma-from-specs`
  at render time, any other tool) must be able to tell which `SlotProp` is
  the default slot by reading the spec alone. It must not need to fetch
  `Conventions` and re-run `slots.default.match` against prop names just to
  recover a fact the generation step already resolved once.

---

## Options Considered

### Decision 1 — Field shape: bare string vs. object wrapper

#### Option A: `slots.default` as a bare string

`slots?: { default?: string }` — a literal prop name or pattern, with no
further nesting.

**Rejected because**: every existing naming convention in
`PlatformConventions` that identifies something by pattern — `glyphs.match`,
`codeOnlyProps.match`, `subcomponents.match` — is an object wrapper, not a
bare string. `stylesProp` and `PropReference.prop` are the bare-string
precedent, but those name a prop *directly*, with no pattern matching
involved. A default-slot convention is a naming *pattern* exactly like
`codeOnlyProps`, not a direct prop name, so the object-wrapper precedent
governs, not the bare-string one. A bare string here would be the one naming
pattern in `PlatformConventions` with no `{ match }` wrapper, which is an
inconsistency the constitution's shape-consistency principle does not
support without a concrete reason this convention is different in kind.

#### Option B: `slots.default` as an object wrapper (`{ match: ... }`) *(Selected)*

Give the convention the same shape as `glyphs` and `codeOnlyProps` — a
nested object whose `match` member carries the pattern.

**Selected because**: consistency with the established shape of every other
naming-pattern convention in `PlatformConventions` outweighs the minimalism
a bare string would offer. `codeOnlyProps` already shows that an object
wrapper is used even for a convention with exactly one member today — the
wrapper is not conditioned on a second property existing yet, it is the
shape the vocabulary already uses for "a pattern that identifies something."
Introducing a bare string here would not reduce nesting so much as create a
second, inconsistent idiom for the same kind of fact.

---

### Decision 2 — `match` cardinality: single string vs. `string[]`

#### Option A: `match: string` (single pattern), mirroring `codeOnlyProps.match`

One pattern per platform entry, following `codeOnlyProps.match` exactly.

**Rejected because**: a single pattern cannot express a library that names
its default/children slot differently across component families — e.g. one
component's default slot prop is `children`, another's is `items`, within
the *same* library. This is not a hypothetical: real libraries already do
this. `codeOnlyProps.match` is the wrong precedent here precisely because a
code-only-props container name is a single, platform-wide convention with
no observed per-family variation; a default-slot prop name does not share
that property. Restricting to one pattern would leave the convention unable
to state a fact that libraries actually exhibit.

#### Option B: `match: string[]` (array), mirroring `subcomponents.match` *(Selected)*

Allow multiple co-existing naming patterns for the default slot prop, the
same way `subcomponents.match` allows several subcomponent naming schemes to
coexist in one library.

**Selected because**: `subcomponents.match` is the closer precedent, not
`codeOnlyProps.match` — both state a fact about naming *variation across
component families in one library*, not a single platform-wide literal.
Different components may legitimately name their default-filling prop
`children` in one family and `items` in another, within the same platform
and the same library, and the convention must be able to say "either of
these names the default slot" rather than forcing a choice of one. `string[]`
is required to express this, not merely preferred stylistically — a
singular `match` would make the convention unable to recognize a default
slot under its second name.

---

### Decision 3 — Composition mechanism: a new type, or the existing `children: string[]` nesting

#### Option A: Introduce a new type to mark cross-instance nesting explicitly

Add a discriminated member (e.g. on `Element` or `Children`) that explicitly
flags "this plain child is a different component instance nested through its
default slot," distinct from an ordinary same-component anatomy child.

**Rejected because**: verified against `types/Children.ts`,
`types/Element.ts`, and `types/PropConfigurations.ts` — the type system
already permits this today with no ambiguity. `Element.children` as a plain
`string[]` is already just an ordered list of keys into the same `elements`
record (`Elements = Record<string, Element>`); nothing in `Element` ties the
meaning of being listed in `children` to being the *same component's*
anatomy rather than a different component's instance. `Element.instanceOf`
is already orthogonal to how an element is reached from its parent — an
element can carry `instanceOf: "deCard"` and simultaneously be a plain
member of its parent's `children: string[]`, all within one
`anatomy + elements + layout` triplet (a `Composition`, a `SlotContent`, or a
component's own definition). A new type would duplicate a distinction the
existing shape already draws for free, which Constitution III does not
support.

#### Option B: No new type — state the rule as documentation on the existing shape *(Selected)*

Use `Element.children: string[]` as it already exists: a child element whose
`instanceOf` names another component is placed as an ordinary member of its
parent's `children` array, in the same `elements` record, with no
`PropBinding`/`SlotContentRef` indirection for that hop. The only
schema-visible change is the new `slots.default.match` convention fact, plus
documentation on `Children`/`Element` clarifying that nested `children`
across instance boundaries is how a default-slot fill is authored when the
filled prop matches the platform's default-slot convention.

**Selected because**: no type change is required — see Decision, Type
changes. This keeps the fix at the level the fact actually lives at: a
naming convention plus a documented reading of a shape that already permits
it, rather than a new mechanism.

---

### Decision 4 — Where a generated spec records which slot is the default: re-derive from `Conventions`, or a durable marker on `SlotProp`

#### Option A: No spec-side marker — every reader re-runs `slots.default.match` against prop names

Leave `slots.default.match` as purely a `Conventions`-side fact. Any
downstream reader that needs to know which slot is eligible for flattened
nesting — the flattening rule itself, `figma-from-specs` reconstructing
nested structure on render, any other tool — fetches the `Conventions` the
spec was generated under (via `metadata.conventions.*`, ADR-071) and
re-evaluates the pattern against the component's prop names.

**Rejected because**: this turns a one-time, generation-time fact into a
repeated cross-package dependency on conventions that the spec should not
need. It also does not degrade gracefully — a reader with no access to the
originating `Conventions` (or a future reader never designed to need them)
cannot determine the default slot at all, even though the generated spec
itself already encodes which `SlotProp` it is. This violates the
self-contained-consumption driver above.

#### Option B: A durable `defaultSlot` marker on `SlotProp`, set once at generation time *(Selected)*

Add `defaultSlot?: boolean` to `SlotProp` (`types/Props.ts`). `specs-from-figma`
consults `Conventions.platforms.figma.slots.default.match` only at
spec-generation time, to decide which one `SlotProp` on a generated component
gets `defaultSlot: true` in the output `props` block. Every downstream
consumer of the generated spec then reads `props.<key>.defaultSlot === true`
directly off the spec — it needs no access to `Conventions` at all to know
which slot permits plain nested-children authoring instead of an explicit
binding.

**Selected because**: this is the same shape every other provenance-style
fact in this schema already takes — a value resolved once, at generation
time, from a convention, and then recorded durably on the spec so later
readers do not have to re-derive it (`FigmaPropExtension.name`, ADR-066, is
the direct precedent: a convention-driven fact resolved once and carried on
the spec rather than re-computed by every reader). `slots.default.match`
remains exactly as decided above — a generation-time input, authored once
per platform in `config/conventions/<platform>.yaml` — while `defaultSlot`
is the spec-time output of evaluating it. Neither fact is redundant: the
convention is still required to *produce* a correctly marked spec; the
marker is what lets every later stage consume one without the convention in
hand.

---

## Decision

### The convention: `slots.default.match`

`PlatformConventions` gains a `slots` object with one sub-key, `default`,
shaped as an object wrapper (Decision 1) carrying `match: string[]`
(Decision 2) — one or more patterns naming which `SlotProp` on a component
is this platform's designated default slot — the one slot a layout
component composes through, and the one through which an instance may be
nested as a plain child rather than through an explicit binding. The array
form allows a library to name this slot differently across component
families (e.g. `children` in one, `items` in another) within the same
platform.

### The composition mechanism: flattened instance nesting through the default slot

`slots.default.match` is consulted **only at spec-generation time**, by
`specs-from-figma`, against a component's actual Figma prop names, to decide
which one `SlotProp` gets `defaultSlot: true` recorded on it in the
generated spec (see Decision 4 and the discriminant subsection below). From
that point on, every consumer of the generated spec — including the
flattening rule itself — keys off `props.<key>.defaultSlot === true`, not
off re-running `slots.default.match` against prop names. When a slot prop
carries `defaultSlot: true`, an authored example may nest the filling
instance **directly** as an ordinary `Element`, referenced through plain
`children: string[]` in the composing element's own `children` array — an
instance element whose `instanceOf` names the next component in the chain,
placed as a normal child, with no `PropBinding`/`SlotContentRef` hop required
for that nesting:

```yaml
# Before — explicit binding at every layout level
elements:
  dePageRow:
    propConfigurations:
      children: { $binding: "#/props/children" }
    children:
      - deSection   # deSection itself repeats this pattern down to deCard

# After — flattened: deSection nested as a plain child of dePageRow,
# because dePageRow's children slot matches slots.default.match
elements:
  dePageRow:
    children: [deSection]
  deSection:
    instanceOf: deSection
    children: [deBlock]
  deBlock:
    instanceOf: deBlock
    children: [deContainer]
  deContainer:
    instanceOf: deContainer
    children: [deCard1, deCard2, deCard3]
  deCard1:
    instanceOf: deCard
  deCard2:
    instanceOf: deCard
  deCard3:
    instanceOf: deCard
```

This is **verified against the current type system, not a new capability it
grants**: `Elements = Record<string, Element>`, and `Element.children` as a
plain `string[]` is already just an ordered list of sibling keys into that
same record, independent of whether a given child's `instanceOf` names the
same component or a different one. **No `Element`, `Layout`, or `Children`
type change is required.** The only schema-visible change is the new
`slots.default` convention fact (below), plus documentation clarifying the
reading above.

**The existing `SlotContentRef`/`SlotBinding`/`$nested` mechanism remains
required and unchanged for any slot that is *not* the designated default
slot** — true multi-slot composition, where a component exposes more than
one distinct slot prop, continues to require an explicit binding naming
*which* slot a nested instance fills. This ADR narrows *only* the
single-default-slot, always-composed case that `collapsePrimitiveWrapper`
(ADR-083) already recognizes at the anatomy level; it does not change how
any other slot prop is filled.

### The discriminant: `SlotProp.defaultSlot`

`SlotProp` (`types/Props.ts`) gains an optional boolean field,
`defaultSlot?: boolean`, mirrored into the `SlotProp` definition in
`schema/component.schema.json`. This is the durable, spec-side marker
Decision 4 selects — set once by `specs-from-figma` when it generates a
component whose matched slot prop satisfies
`Conventions.platforms.figma.slots.default.match`, and read thereafter by
every consumer with no dependency on `Conventions`:

```yaml
props:
  children:
    type: slot
    defaultSlot: true
```

Absence means exactly what absence means on every other optional `SlotProp`
member: this slot is not the designated default slot (or the platform
declares no default-slot convention at all), and any instance filling it
must use an explicit `SlotContentRef`/`SlotBinding`, not plain nested
`children`.

**Invariant**: at most one `SlotProp` per component may have
`defaultSlot: true`. This is a cross-property constraint over sibling
entries in a component's `props` map, which JSON Schema cannot express
without `additionalProperties: false`-breaking contortions at a level this
schema does not otherwise reach into (validating one named prop's value
against the shape of its siblings). Consistent with how this schema treats
other cross-key invariants it states but does not mechanically validate
(e.g. `ResolvedPlatformConventions`'s resolved-vs-absent distinction, or
`subcomponents.match`/`exclude` precedence), the invariant is **documented
as an authoring/generator contract, not JSON-Schema-enforced**:
`specs-from-figma` is responsible for setting `defaultSlot: true` on at most
one `SlotProp` per generated component, and any hand-authored spec that
violates the invariant is malformed input a consumer may reject, not a
shape the schema itself rules out.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Conventions.ts` | Added `slots?: { default?: { match: string[] } }` to `PlatformConventions` | MINOR |
| `Conventions.ts` | Added `slots?: { default?: { match: string[] } }` to `ResolvedPlatformConventions` | MINOR |
| `Props.ts` | Added `defaultSlot?: boolean` to `SlotProp` | MINOR |
| `Children.ts` | Doc-only: clarified that a plain `children: string[]` entry may name an element that is an instance of a different component, nested through its default slot — no type shape change | PATCH |

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
  slots?:
    default?: { match: string[] }   # new — optional, MINOR
```

Authored in `config/conventions/figma.yaml`:
```yaml
# config/conventions/figma.yaml
slots:
  default:
    match:
      - "children"
      - "items"
```

**Example — new shape** (`types/Props.ts`):
```yaml
# Before (SlotProp, excerpt)
SlotProp:
  type: 'slot'
  default?: string | null
  nullable?: boolean
  minChildren?: number
  maxChildren?: number
  anyOf?: string[]

# After
SlotProp:
  type: 'slot'
  default?: string | null
  nullable?: boolean
  minChildren?: number
  maxChildren?: number
  anyOf?: string[]
  defaultSlot?: boolean   # new — optional, MINOR
```

Emitted on a generated spec:
```yaml
# Generated component, excerpt
props:
  children:
    type: slot
    defaultSlot: true
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `conventions.schema.json` | Added `slots` object property to the `PlatformConventions` definition, with a nested `default` object carrying `match` | MINOR |
| `component.schema.json` | Added `defaultSlot` boolean property to the `SlotProp` definition | MINOR |

**Example — new shape** (`schema/conventions.schema.json`):
```yaml
# New property under #/definitions/PlatformConventions/properties
slots:
  type: object
  properties:
    default:
      type: object
      properties:
        match:
          type: array
          items:
            type: string
          description: >
            Naming patterns identifying a component's designated default
            slot — the SlotProp this platform always composes further
            content through. A library may name this slot differently
            across component families (e.g. `children` in one, `items` in
            another); any pattern in the array matches. When a slot prop
            matches, specs-from-figma records `defaultSlot: true` on that
            SlotProp in the generated spec, and a filling instance may then
            be nested as a plain child element rather than through an
            explicit slot binding. Absence means no default slot is
            designated and every slot binds explicitly.
      required: [match]
      additionalProperties: false
  additionalProperties: false
```

**Example — new shape** (`schema/component.schema.json`, `SlotProp` definition):
```yaml
# New property under #/definitions/SlotProp/properties
defaultSlot:
  type: boolean
  description: >
    Whether this is the component's designated default slot — set by
    specs-from-figma when the slot prop matched the originating platform's
    slots.default.match convention at generation time. When true, an
    authored example may nest a filling instance as a plain child element
    instead of through an explicit SlotContentRef/SlotBinding. Absent means
    false: this is not the default slot, or the platform declared no
    default-slot convention. At most one SlotProp per component may be
    true — an authoring/generator invariant, not schema-enforced.
```

### Notes

- No `exclude` member is added alongside `match`, unlike `subcomponents`.
  `subcomponents.exclude` exists to carve out names that would otherwise
  false-positive-match a broad subcomponent pattern (e.g. a layer that looks
  like a subcomponent but isn't). A default-slot prop name has no analogous
  false-positive risk identified here — `match` is tested against a small,
  already-captured set of `SlotProp` names on one component, not against a
  broad layer-naming surface, so there is no concrete scenario requiring an
  exclusion list. Adding `exclude` now would be speculative; it can be added
  later, additively, if a real case emerges.
- `slots.default.match` is optional, with no default — absence states that
  this platform declares no default-slot convention, matching how `glyphs`
  and `codeOnlyProps` absence is read (Constitution-consistent with
  `ResolvedPlatformConventions`'s existing distinction between members that
  get a resolved default, like `naming`, and blocks whose absence is a fact
  about the library, like `glyphs`).
- The field is a pattern against a `SlotProp`'s `prop` name (the slot's key
  on the component), not against a Figma layer name — it identifies a prop
  on the already-captured spec/component model, consistent with how
  `stylesProp` names a prop rather than a layer.
- No placeholder syntax (`{i}`, `{C}`/`{S}`) is introduced: a default slot
  is identified by the prop name itself, not by a name that embeds a
  component or icon identity, so a literal/pattern string with no
  substitution token is sufficient.
- `slots` is deliberately a wrapper object, not `defaultSlot` as a flat
  `PlatformConventions` member, so a future non-default slot convention
  (not designed here) has a place to land without a new top-level key.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `PlatformConventions.slots.default.match` (type) maps to
  `#/definitions/PlatformConventions/properties/slots/properties/default/properties/match`
  (schema). `ResolvedPlatformConventions.slots` has no separate schema
  definition, consistent with existing practice — `Resolved*` types are a
  TypeScript-only resolution-time shape; schema validates the authored
  (`PlatformConventions`) form, loaded from `config/conventions/<platform>.yaml`.
- **Parity check**: `SlotProp.defaultSlot` (type, `types/Props.ts`) maps to
  `#/definitions/SlotProp/properties/defaultSlot` (schema,
  `schema/component.schema.json`) — both optional boolean, both
  absent-means-false, no further resolution shape needed on either side.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Gains a new convention to read (`conventions.platforms.figma.slots.default.match`), consulted only at generation time, and a schema-decided rule to implement: match a component's slot props against any pattern in the array, record `defaultSlot: true` on the matched `SlotProp` in the generated spec, and where matched, emit a flattened, nested-children tree in generated example data instead of an explicit slot-content-reference binding at every layout level. | Engine implementation work to apply the rule this ADR defines — not a design decision, the rule itself is decided here. |
| `figma-from-specs` | Reads `props.<key>.defaultSlot === true` directly off the spec at render time — no dependency on `metadata.conventions.*` to identify the default slot — and must reconstruct the explicit nested slot-content-reference structure from a flattened children tree when rendering back to Figma. | Engine implementation work to recognize a flattened default-slot tree (keyed off `defaultSlot`, once `specs-from-figma` emits one) and reconstruct the corresponding instance/slot structure on the canvas. |
| `specs-cli` | None. | None — the CLI passes `Conventions` through to `specs-from-figma` unchanged; no CLI-side logic reads either field. |
| `specs-plugin-2` | None at this ADR's scope. | Recompiles against the new optional fields; no behavioral change until the engine (`specs-from-figma`, bundled from source) consumes them. |

---

## Semver Decision

**Target version**: `0.35.0` — the version of `@directededges/specs-schema`
on the active release branch (`release/next`) this ADR merges into.

**Change class**: `MINOR`.

**Justification**: The change is two new optional fields (`slots` on
`PlatformConventions`/`ResolvedPlatformConventions`, and `defaultSlot` on
`SlotProp`) with no removal, rename, or narrowing of any existing field —
additive-only per Constitution Additional Constraints & Standards
("Versioning": MINOR for additive types or new optional fields). The
`Children.ts` doc clarification carries no type shape change and is PATCH.

---

## Consequences

- A library can declare which `SlotProp` on its layout components is the
  designated default slot, via `config/conventions/figma.yaml`
  (`slots.default.match`).
- A generated spec carries that fact durably, on the spec itself:
  `specs-from-figma` sets `defaultSlot: true` on the matched `SlotProp`
  once, at generation time, and no downstream consumer needs `Conventions`
  to rediscover it.
- This ADR **decides** the flattened-nesting rule as the effective behavior
  of the schema it amends: when a slot prop carries `defaultSlot: true`,
  the filling instance may be authored as a plain nested child
  (`children: string[]`, `instanceOf` on the child element) rather than
  through an explicit `PropBinding`/`SlotContentRef` at that level. The rule
  is schema-decided now; only the engine work to produce and consume it is
  follow-up.
- At most one `SlotProp` per component may have `defaultSlot: true` — an
  authoring/generator invariant this ADR states but does not encode in
  `schema/`, consistent with how other cross-property invariants in this
  schema are handled.
- Where a slot is *not* the designated default slot, the existing
  `SlotContentRef`/`SlotBinding`/`$nested` binding mechanism remains
  required and unchanged — genuine multi-slot composition is unaffected.
- **Follow-up implementation work in `specs-from-figma`**: identify, for a
  given component, whether a slot prop matches `slots.default.match`; where
  it does, record `defaultSlot: true` on that `SlotProp`, and where the
  composed content is itself a layout component repeating the pattern, emit
  the flat, nested tree this ADR defines in example data, rather than a
  chain of explicit slot-content-reference bindings.
- **Follow-up implementation work in `figma-from-specs`**: when rendering a
  spec back onto the Figma canvas, read `defaultSlot` off the spec to
  identify a flattened default-slot tree and reconstruct the explicit
  nested structure from it — no dependency on `metadata.conventions.*` for
  this determination.
- Both follow-ups are engine implementation work against a rule this ADR
  has already decided — they are not deferred design decisions and do not
  require a separate ADR unless they surface a schema-visible concept this
  ADR did not anticipate.
