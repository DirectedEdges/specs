# ADR: Object-Typed Props

**Branch**: `111-object-props`
**Created**: 2026-10-22
**Status**: DRAFT
**Summary**: An `ObjectProp` with named scalar `members` joins the prop union, folded from separator-named Figma properties via `objectProps`.
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

The `AnyProp` union in `types/Props.ts` admits six prop shapes — `BooleanProp`, `StringProp`, `EnumProp`, `NumberProp`, `SlotProp`, `ImageProp` — all of which carry a single scalar or slot value. There is no way to declare a prop whose value is an object with well-defined members.

The motivating case is a responsive prop: a `margin` prop whose value differs by breakpoint, with members `compact` and `expanded`, each drawing from the same enumerated set (`none`, `small`, `large`):

```yaml
# Desired API shape — not expressible today
margin:
  type: object
  members:
    compact:
      type: string
      enum: [none, small, large]
      default: none
    expanded:
      type: string
      enum: [none, small, large]
      default: none
```

Today a library must author this as two unrelated flat props (`marginCompact`, `marginExpanded`), losing the fact that they are members of one concept. Code platforms express this concept directly — React props accept object literals, SwiftUI accepts structs — so the flat encoding forces every code consumer to reassemble the grouping by naming heuristic.

Figma cannot author an object property natively. Component properties are flat, so an authoring convention is required: dot-separated property names (`margin.compact`, `margin.expanded`) that an opt-in convention folds into one object prop.

An object prop's value must also travel everywhere a prop value travels today:

- `Props` in the API concern — the prop definition itself.
- `PropConfigurations` in the variance concern — a variant setting `margin` must carry a member-keyed value.
- Nested instance configurations (`NestedPropConfiguration`) reuse `PropConfigurationValue`, so one widening covers variant configurations, instance settings in the variance file, and slot fills.
- `InstanceExample.propConfigurations` carries its own narrower union (no `PropBinding`), so the examples file takes the same member-keyed value as a parallel widening of that union.

---

## Decision Drivers

- **Constitution I — type ↔ schema parity**: every type change pairs with a change in `component.schema.json` (and `conventions.schema.json` for convention fields).
- **Constitution III — minimal, stable API**: new shapes must represent a genuine shared concept, not a workaround for one authoring surface; changes should be additive (MINOR-class) where possible.
- **Constitution VI — code platforms first (rule 1)**: React and SwiftUI both model grouped prop values as objects/structs; the schema should present the code-platform shape, leaving Figma's flat encoding to the transformer boundary.
- **Authoring surface is Figma-constrained**: Figma component properties are flat strings; whatever grouping exists must be encoded in names and declared, not inferred.
- **Opt-in, not inferred**: a dot in a Figma property name is legal and common; folding must never trigger without an explicit convention.
- **One value vocabulary**: `PropConfigurationValue` is the single currency for variant configurations, nested instance settings, instance examples, and slot-fill configurations. Object values must flow through it, not around it.
- **Determinism**: the same flat Figma input must fold to the same object shape on every run.

---

## Options Considered

### Decision 1 — Should the schema have an object prop type?

#### Option A: Add `ObjectProp` to the `AnyProp` union *(Selected)*

A new prop shape, `type: 'object'`, with a `members` map whose entries are themselves prop definitions.

**Pros**:
- Presents the code-platform shape directly (driver: Constitution VI rule 1 — React object props, SwiftUI structs agree).
- The grouping is a contract fact, not a naming heuristic — consumers read declared structure (driver: minimal stable API; genuine shared concept).
- Additive to the union — MINOR-class.

**Cons / Trade-offs**:
- Every consumer that switches exhaustively over `AnyProp.type` must handle the new case before it can process specs that use it.
- Figma cannot represent it natively, so a fold/unfold convention becomes part of the contract's conventions surface.

#### Option B: Keep flat props; rely on naming (`marginCompact`, `marginExpanded`) *(Rejected)*

**Rejected because**: the grouping exists only as a heuristic in consumers' heads, violating the schema's role as the shared language — and "never infer from names" is an established principle of this contract. Each consumer reinvents (and disagrees on) the fold.

#### Option C: Flat props plus a grouping annotation (e.g. a `group` field or `$extensions` marker) *(Rejected)*

**Rejected because**: it splits one concept across two places — the props stay flat while a side annotation asserts structure — so parity between the annotation and the member props is unverifiable by the schema. It also leaks the Figma encoding into the API surface rather than translating at the transformer boundary (Constitution VI rationale).

---

### Decision 2 — What shape may members take?

#### Option A: One level deep; members are scalar prop definitions *(Selected)*

`members` is a map from member name to a **scalar** prop definition — `BooleanProp`, `StringProp`, `EnumProp`, or `NumberProp`. No `SlotProp`, `ImageProp`, or nested `ObjectProp` members.

**Pros**:
- Covers the motivating case (enumerated members per breakpoint) and every near-term variant of it with the smallest new surface (driver: minimal API).
- Reuses the existing prop definitions verbatim — member typing, `default`, `enum`, `nullable`, and `examples` semantics come for free, and the schema reuses the existing `#/definitions` entries.
- The non-recursive shape keeps the schema definition, the configuration value union, and validation flat — no self-referencing definitions.

**Cons / Trade-offs**:
- Deeper hierarchies (`margin.horizontal.compact`) are out of scope; a future ADR must lift the restriction if a genuine case appears. Deepening later is additive (MINOR); contracting depth would be breaking — which is the argument for starting shallow.

#### Option B: Recursive — members may themselves be `ObjectProp` *(Rejected)*

**Rejected because**: no motivating case requires it. Folding by separator is deterministic at any depth (`a.b.c` always folds to `a: { b: { c } }` — each segment is one level), so the cost is not ambiguity but surface: a recursive schema definition, a recursive configuration-value union in every surface that carries prop values, and arbitrary-depth traversal in every consumer, all for speculative benefit. Expanding later is additive; contracting is breaking.

#### Option C: Members as free-form JSON Schema fragments *(Rejected)*

**Rejected because**: it abandons the closed prop vocabulary — consumers could no longer rely on the `AnyProp` member shapes, and type ↔ schema parity for arbitrary fragments is unverifiable (Constitution I, V).

---

### Decision 3 — How does Figma author an object prop?

#### Option A: Opt-in fold convention declared in the Figma platform conventions *(Selected)*

A new optional field on the Figma platform conventions in `types/Conventions.ts` (alongside `inferNumberProps`, `slotConstraints`) declaring that separator-delimited property names fold into object props:

```yaml
platforms:
  figma:
    objectProps:
      separator: "."   # optional; defaults to "."
```

Absent means no folding — a property named `margin.compact` stays a flat prop, exactly as today.

**Pros**:
- Opt-in by declaration, matching how every other Figma encoding fact is handled (`codeOnlyProps`, `inferNumberProps`) — a wrong value produces incorrect output, so it belongs in `Conventions`, not `Settings`.
- Deterministic: same names + same declared separator → same fold.
- Zero impact on libraries that do not opt in — MINOR-class.

**Cons / Trade-offs**:
- Libraries must adopt a naming discipline in Figma; a stray separator in an unrelated property name folds unintentionally once opted in.

#### Option B: Always-on inference from dots in property names *(Rejected)*

**Rejected because**: dots occur legitimately in existing Figma property names; silent folding changes the output of every library that happens to use them — a non-opt-in behavioral change, and an inference from names rather than a declaration.

#### Option C: Author object props in the code-only props container *(Rejected)*

**Rejected because**: object members like responsive margins are variant-visible design properties, not non-visual code-only metadata; routing them through the code-only container misuses that convention and hides the members from Figma's own property UI.

---

### Decision 4 — How do object values convey through configurations and examples?

#### Option A: Widen `PropConfigurationValue` with a member-keyed object value *(Selected)*

`PropConfigurationValue` in `types/PropConfigurations.ts` gains one additional arm: a one-level object mapping member names to scalar values (or `null` for an unset member):

```yaml
# Variance file — a variant configuring the object prop
configuration:
  margin:
    compact: none
    expanded: large

# Nested instance configuration — same value vocabulary
$nested:
  - path: [header]
    margin:
      compact: small
```

Because `Variant.configuration`, `NestedPropConfiguration`, and `Element.propConfigurations` all share `PropConfigurationValue`, one widening carries object values into the variance file, nested instance settings, and slot fills; `InstanceExample.propConfigurations` keeps its own narrower union (no `PropBinding`) and takes the same `ObjectPropValue` arm as a parallel widening. Partial objects follow the existing layering rule: an absent member key inherits; a `null` member value unsets (ADR-080 semantics, per member).

**Pros**:
- One change point; every configuration surface stays consistent by construction (driver: one value vocabulary).
- The configured shape mirrors the declared shape — readers of a spec see the object, not an encoding.

**Cons / Trade-offs**:
- The object arm is structurally distinguishable from `PropBinding`/`SlotContentRef` only by the absence of their `$`-prefixed discriminator keys; member names therefore must not begin with `$` (schema-enforced via `propertyNames`).

#### Option B: Dotted keys inside configurations (`margin.compact: none`) *(Rejected)*

**Rejected because**: it reproduces the Figma authoring encoding inside the spec, so the API declares an object while every configuration addresses it flat — the translation every consumer was supposed to be spared (Constitution VI rationale), and a parity hazard between the declared members and the dotted keys.

#### Option C: Both forms accepted *(Rejected)*

**Rejected because**: two spellings of one value breaks deterministic output and forces every consumer to normalize.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Props.ts` | Add `ObjectProp` interface (`type: 'object'`, required `members`); add scalar-member union (named, e.g. `ObjectPropMember` = `BooleanProp \| StringProp \| EnumProp \| NumberProp`); add `ObjectProp` to `AnyProp` | MINOR |
| `PropConfigurations.ts` | Widen `PropConfigurationValue` with a member-keyed object arm (named `ObjectPropValue`: member name → `string \| number \| boolean \| null`) | MINOR |
| `InstanceExample.ts` | Widen `propConfigurations` values with the same `ObjectPropValue` arm (its union is narrower than `PropConfigurationValue` — no `PropBinding`) | MINOR |
| `Conventions.ts` | Add optional `objectProps` field (with optional `separator`, default `"."`) to the Figma platform conventions and its required-form counterpart | MINOR |
| `index.ts` | Export the new named types | MINOR |

**Example — new prop shape** (`types/Props.ts`):

```yaml
ObjectProp:
  type: 'object'
  members:            # required; at least one member
    <memberName>: BooleanProp | StringProp | EnumProp | NumberProp
  $extensions?: PropExtensions
```

Member names must not begin with `$` and must not contain the declared separator. `SlotProp`, `ImageProp`, and nested `ObjectProp` are not valid members.

The folded Figma property names are provenance: each member's `$extensions['com.figma'].name` records the flat source name (`margin.compact`) under the existing ADR-066 field, so unfolding is reversal, not re-derivation.

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `ObjectProp` definition under `#/definitions` (members reference the existing scalar prop definitions; `propertyNames` excludes `$`-prefixed member names); add it to the `AnyProp` union; widen the prop-configuration value union with the member-keyed object form | MINOR |
| `conventions.schema.json` | Add optional `objectProps` object (optional `separator` string, default `"."`) to the Figma platform conventions | MINOR |

**Example — new definition** (`schema/component.schema.json`):

```yaml
# Under #/definitions
ObjectProp:
  type: object
  required: [type, members]
  properties:
    type: { const: object }
    members:
      type: object
      minProperties: 1
      propertyNames: { pattern: "^[^$]" }
      additionalProperties:
        anyOf:
          - $ref: "#/definitions/BooleanProp"
          - $ref: "#/definitions/StringProp"
          - $ref: "#/definitions/EnumProp"
          - $ref: "#/definitions/NumberProp"
```

### Notes

- Naming: `members` over `properties` — avoids collision with Figma's "component properties" vocabulary and with JSON Schema's own `properties` keyword; `object` follows the code-platform term (Constitution VI rule 1: React/TypeScript object types, SwiftUI structs).
- `ObjectProp` carries no top-level `default` or `nullable`: defaults live per member, and an object prop's value always exists as the composition of its members' states.
- The fold convention is Conventions, not Settings: whether a library names props this way is a fact about the library — a wrong declaration produces incorrect output (ADR-071 split).
- Member-level layering reuses existing semantics: absent member key inherits, `null` unsets (ADR-080), evaluated per member rather than per prop.
- Member names are opaque to the schema. Breakpoint vocabularies differ by platform (`compact`/`expanded` echoes iOS size classes and Android window size classes; web thinks in media queries) — the contract declares the members a library chose and attaches no semantics to them.
- Code-platform fit (Constitution VI rule 1): React object literals, SwiftUI structs, and Compose data classes all model one-level member maps directly. Web Components are the known friction — HTML attributes are strings, so an object value is either a JS-set property or unfolded to flat attributes by the emitter. That is an emitter representation decision outside this contract; the schema presents the object.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `ObjectProp` ↔ `component.schema.json#/definitions/ObjectProp`; the `AnyProp` union ↔ the schema's prop-value `anyOf`; the widened `PropConfigurationValue` ↔ the widened configuration-value union in `component.schema.json`; `Conventions` `objectProps` ↔ `conventions.schema.json` Figma platform properties.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | New fold behavior when `objectProps` is declared | Fold separator-named Figma properties into `ObjectProp` definitions and member-keyed configuration values; record source names in `$extensions` |
| `figma-from-specs` | Object values must reach a flat surface | Unfold `ObjectProp` members and member-keyed configuration values to separator-named Figma properties using the recorded source names |
| `react-from-specs` | New prop shape in emitted contracts | Emit object-typed props (member-typed object literals) in generated interfaces, stories, and configured instances |
| `webcomponents-from-specs` | Same as React emitter | Same, in the Lit idiom |
| `from-specs` (shared core) | New `AnyProp` member flows through shared prop handling | Recompile; extend any exhaustive handling of `AnyProp` |
| `specs-cli` | Validation and emit pass through the new shapes | Recompile against the published types/schema |
| `specs-plugin-2` | Same contract via the plugin runtime | Recompile; folding applies identically to plugin-sourced data |

Specs containing no `ObjectProp` are byte-identical before and after — the change is inert until a library opts in.

---

## Semver Decision

**Target version**: `0.39.0` — the version of `@directededges/specs-schema` on `release/next`.

**Change class**: `MINOR` — all changes are additive: a new member of the `AnyProp` union, a new arm of the `PropConfigurationValue` union, a new optional `Conventions` field, and new schema definitions. No existing type, field, or schema property is removed, renamed, or narrowed (Constitution: "MINOR for additive types or new optional fields").

---

## Consequences

- A spec can declare a prop whose value is an object of named, individually typed scalar members — responsive props like per-breakpoint margins become first-class.
- Libraries opting in via `platforms.figma.objectProps` author members as separator-named Figma properties; libraries that do not opt in see no change.
- Variant configurations, nested instance settings, slot-fill configurations, and instance examples all carry object values in one member-keyed form, by shared use of `PropConfigurationValue`.
- Consumers that switch exhaustively over `AnyProp.type` must handle `'object'` before processing specs from opted-in libraries.
- Member names beginning with `$`, or containing the declared separator, are invalid — the former schema-enforced, the latter a generator invariant.
- Nesting deeper than one level remains unsupported; lifting that restriction requires a future ADR.
