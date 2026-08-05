# ADR: Explicit `nullable` Emission for Code-Only Text Props

**Branch**: `065-code-only-text-prop-nullable`
**Created**: 2026-08-05
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Props sourced from a Figma code-only container layer (`$extensions['com.figma'].source.kind: 'codeOnlyProp'`) with a Figma-native `TEXT` type land in the spec as either:

- `StringProp` (`type: string`), or
- `NumberProp` (`type: number`) — when the authored value is cast to a numeric type.

`nullable` today is an optional, tri-state-by-omission field on `StringProp`, `EnumProp`, and `SlotProp`:

```yaml
# types/Props.ts — current
StringProp:
  type: 'string'
  default?: string | null
  nullable?: boolean
  examples?: string[]
```

Two problems follow from this shape:

- **`NumberProp` cannot express nullability at all.** It has no `nullable` field, so a `TEXT` code-only prop cast to `type: number` loses the nullability signal that the same prop would carry as a `StringProp`. Identical Figma authoring produces contract-inconsistent output based only on the inferred value type.
- **Omission is ambiguous.** Because `nullable` is optional and no emission rule is recorded in the contract, a consumer reading a prop with no `nullable` key cannot distinguish "this prop was evaluated and accepts no null" from "nullability was never determined". Code generators must guess whether to emit `string | null` or `string`.

The intended emission rule — an empty authored default means nullability is undetermined and `nullable` is omitted; a non-empty authored default means the prop is known not to accept null and `nullable: false` is emitted explicitly — is only expressible if every prop type that a code-only `TEXT` prop can become carries the field.

---

## Decision Drivers

- **Type ↔ schema symmetry** (Constitution I): every type change has a schema counterpart, and vice versa.
- **Consistent contract across value types**: a `TEXT` code-only prop must express the same nullability vocabulary whether it materializes as `type: string` or `type: number`.
- **Additive-only where possible**: avoid a `MAJOR` bump on every downstream consumer for what is a gap-filling field.
- **Unambiguous signal over inference**: consumers must not infer nullability from the presence or emptiness of `default`.
- **No logic in this package** (Constitution II): the emission rule is a contract-level definition here; the evaluation itself belongs to the transformer.
- **Naming governance** (Constitution VI): `nullable` is already the established field name across `StringProp`, `EnumProp`, `SlotProp`, and `ImageProp` — consistency within the contract governs.

---

## Options Considered

### Option A: Add optional `nullable?: boolean` to `NumberProp` and document the emission rule *(Selected)*

Bring `NumberProp` in line with the other prop types by adding the same optional `nullable` field, and record in the field documentation that omission means "undetermined" while `false` means "explicitly known not nullable".

**Pros**:
- Additive optional field on one type → `MINOR`, no consumer recompilation break.
- Restores symmetry across all value-carrying prop types; the same authored Figma prop yields the same vocabulary regardless of inferred type.
- The tri-state (`true` / `false` / absent) is expressible without a new type or sentinel value.

**Cons / Trade-offs**:
- Preserves an optional field whose absence remains meaningful — consumers must handle three states, not two.

---

### Option B: Make `nullable` required on all prop types *(Rejected)*

Promote `nullable` to a required `boolean` on `StringProp`, `EnumProp`, `SlotProp`, and `NumberProp`.

**Rejected because**: It is a breaking change to field presence on four types → `MAJOR` per the constitution's versioning rule, and it destroys the "undetermined" state that an empty authored default legitimately produces. Every prop would be forced to assert a nullability it may not know.

---

### Option C: Leave `NumberProp` as-is and have consumers infer nullability from `default` *(Rejected)*

No contract change; consumers treat a missing or empty `default` as nullable.

**Rejected because**: It pushes an inference rule into every consumer independently (Constitution III — the contract must be self-describing for all consumers equally), and it conflates "no default authored" with "accepts null", which are distinct facts.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Props.ts` | Added optional field `nullable?: boolean` to `NumberProp` | MINOR |
| `Props.ts` | Documentation-only: clarify `nullable` semantics on `StringProp`, `EnumProp`, `SlotProp`, `NumberProp` | PATCH |

**Example — new shape** (`types/Props.ts`):

```yaml
# Before
NumberProp:
  type: 'number'
  default?: number
  examples?: number[]

# After
NumberProp:
  type: 'number'
  default?: number
  nullable?: boolean   # optional — MINOR
  examples?: number[]
```

**Semantics recorded for `nullable` on all prop types that carry it**:

```yaml
# Undetermined — no authored default to evaluate; nullable is omitted
label:
  type: string
  $extensions:
    com.figma:
      type: TEXT
      source:
        kind: codeOnlyProp
        layer: label

# Explicitly not nullable — a non-empty authored default exists
headingLevel:
  type: number
  default: 2
  nullable: false
  $extensions:
    com.figma:
      type: TEXT
      source:
        kind: codeOnlyProp
        layer: headingLevel
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Added property `nullable` to `#/definitions/NumberProp/properties` | MINOR |
| `component.schema.json` | Added/aligned `description` on `nullable` under `#/definitions/StringProp`, `#/definitions/EnumProp`, `#/definitions/SlotProp`, `#/definitions/NumberProp` | PATCH |

**Example — new shape** (`schema/component.schema.json`):

```yaml
# New property under #/definitions/NumberProp/properties
nullable:
  type: boolean
  description: "Whether this prop accepts a null value. Omitted when nullability is undetermined; false asserts the prop does not accept null."
  # not in required[] — optional field
```

### Notes

- `nullable` stays optional on every prop type. Absence is a meaningful third state and MUST NOT be read as `false`.
- `NumberProp` has no `$extensions` property today; this ADR does not change that.
- `ImageProp.nullable` is out of scope — image props are not produced from code-only `TEXT` layers.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `NumberProp.nullable` in `types/Props.ts` ↔ `#/definitions/NumberProp/properties/nullable` in `schema/component.schema.json`. Both optional (not listed in `required`). Existing `nullable` fields on `StringProp`, `EnumProp`, and `SlotProp` already have schema counterparts and receive description text only.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Emission rule becomes expressible for numeric code-only props | Emit `nullable: false` when a code-only `TEXT` prop has a non-empty authored default; omit `nullable` when the default is empty — for both the `string` and `number` output types |
| `specs-cli` | Widened prop shape in validated and generated output | Recompile against the new schema version; surface `nullable` for numeric props wherever it is already surfaced for string props |
| `specs-plugin-2` | Same widened prop shape | Recompile; no behavioral change required |

---

## Semver Decision

**Version bump**: `0.29.0 → 0.30.0` (`MINOR`)

**Justification**: The only structural change is one additive optional field (`NumberProp.nullable`) plus documentation text on existing fields. Per the constitution's versioning rule — "`MINOR` for additive types or new optional fields" — no existing field is removed, renamed, or made required, so no consumer breaks.

---

## Consequences

- A code-only Figma `TEXT` prop expresses nullability identically whether it materializes as `type: string` or `type: number`.
- Consumers can distinguish three states: `nullable: true` (accepts null), `nullable: false` (asserted not null), absent (undetermined).
- Code generators can emit a non-optional numeric type with confidence when `nullable: false` is present, instead of defensively widening to `number | null`.
- Specs produced before this version will not carry `nullable: false` on props that would now receive it; consumers comparing specs across versions will see added keys, not changed values.
- Any tool validating against `schema/component.schema.json` must upgrade to the new version to accept `nullable` on `NumberProp` — `additionalProperties: false` on that definition rejects it today.
