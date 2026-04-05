# ADR: Add nullable support to SlotProp

**Branch**: `022-nullable-slot-props`
**Created**: 2026-03-12
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none — extends ADR 019 to cover `SlotProp`)*

---

## Context

ADR 019 widened `StringProp.default` to `string | null` and established the pattern of `nullable?: boolean` for props that can hold a null value. That ADR explicitly scoped out `SlotProp`, noting "BooleanProp, EnumProp, and SlotProp are unaffected."

However, the JSON schema in `component.schema.json` already defines `SlotProp` with:
- `"default": { "type": ["null", "string"] }`
- `"nullable": { "type": "boolean" }`

The TypeScript type in `types/Props.ts` does not match — it still declares:
```yaml
SlotProp:
  type: 'slot'
  default: string     # no null
                      # no nullable field
```

This is a **type–schema drift violation** (Constitution I). The schema permits `null` defaults and a `nullable` flag on `SlotProp`, but the TypeScript type does not. Consumers compiling against the types cannot express a nullable slot prop even though the schema validates one.

---

## Decision Drivers

- **Type–schema symmetry**: Types and schema must describe the same structure at all times — drift is a bug (Constitution I)
- **Additive-only when possible**: Widening `default` and adding an optional field avoids a MAJOR bump (Constitution III, Versioning)
- **Consistency across prop types**: `StringProp` and `EnumProp` already support `nullable` — `SlotProp` should follow the same pattern
- **No runtime logic**: The change is purely declarative (Constitution II)

---

## Options Considered

### Option A: Align TypeScript type to match existing schema *(Selected)*

Add `nullable?: boolean` to `SlotProp` and widen `default` from `string` to `string | null` in `types/Props.ts`. No schema changes needed — the schema already has these definitions.

**Pros**:
- Fixes the existing type–schema drift immediately
- No schema changes required — only the TypeScript side needs updating
- Follows the exact same pattern established by ADR 019 for `StringProp` and already present on `EnumProp`
- Additive change — existing `string` default values remain valid

**Cons / Trade-offs**:
- Downstream consumers reading `SlotProp.default` must now handle a possible `null` value

---

### Option B: Remove nullable support from the schema instead *(Rejected)*

Roll back the schema to match the current restrictive TypeScript type — remove `"null"` from `SlotProp.default` type and remove the `nullable` property.

**Rejected because**: The schema was intentionally updated to support nullable slots. Removing it narrows capability and would be a breaking schema change (MAJOR bump). It also contradicts the design direction established by ADR 019 to support nullable defaults across prop types.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Props.ts` | Add `nullable?: boolean` to `SlotProp` | MINOR |
| `Props.ts` | Widen `SlotProp.default` from `string` to `string \| null` | MINOR |

**Example — new shape** (`types/Props.ts`):
```yaml
# Before
SlotProp:
  type: 'slot'
  default: string

# After
SlotProp:
  type: 'slot'
  default: string | null
  nullable?: boolean
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | *(No change — schema already defines `nullable` and `default: ["null", "string"]` on `SlotProp`)* | — |

### Notes

- This ADR is unusual in that only the TypeScript type needs updating. The schema already reflects the desired state — this change resolves drift by bringing the type into alignment.
- The `default` field remains required on `SlotProp` (it is in `required: ["type", "default"]` in the schema). The change only widens the set of valid values to include `null`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — after this change, `SlotProp` in `types/Props.ts` matches `SlotProp` in `schema/component.schema.json`
- **Parity check**:
  - `SlotProp.default: string | null` ↔ `SlotProp/properties/default/type: ["null", "string"]`
  - `SlotProp.nullable?: boolean` ↔ `SlotProp/properties/nullable/type: "boolean"`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `anova-kit` | Recompile — `SlotProp.default` may now be `null` and `nullable` field is available | Handle `null` when reading `SlotProp.default` |

---

## Semver Decision

**Version bump**: MINOR

**Justification**: All changes are additive — widening `default` to include `null` and adding an optional `nullable` field do not remove or rename any existing field. Existing valid values remain valid. Per Constitution III and Versioning: "MINOR for additive types or new optional fields."

---

## Consequences

- Resolves the type–schema drift on `SlotProp` that existed since the schema was updated
- All four prop types (`BooleanProp`, `StringProp`, `EnumProp`, `SlotProp`) now consistently support `nullable` where applicable (`BooleanProp` excluded — booleans are inherently non-nullable)
- Consumers compiling against the types can now express `SlotProp.default = null` for nullable slot props
- Schema validation behavior is unchanged — the schema already accepted these values
