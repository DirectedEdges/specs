# ADR 058: Wrapper Collapse Config Flag

**Branch**: `058-wrapper-collapse`
**Created**: 2026-06-16
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A common Figma construction — particularly for text and icon primitives — is a component whose root layer is a plain, style-free container holding a single `text` or `glyph` child. The wrapper adds no semantic styling (no corner radius, strokes, spacing, effects, or background) and carries no slot binding. From a spec consumer's perspective, the root element *is* the leaf; the container is a Figma-side convenience with no design-system meaning.

When the generator encounters such a component today, it faithfully emits the wrapper as `root` and the leaf as a child element. This produces a two-node anatomy and a `container` root type even though the component is semantically a single primitive. Consumers (code generators, documentation tools) must either detect and unwrap this pattern themselves or tolerate a structurally inflated spec.

The gap: no `Config` flag exists to tell the generator to collapse this wrapper, leaving downstream tools to implement their own heuristics or accept unnecessary structural noise.

---

## Decision Drivers

- **Additive change** — must not break existing specs or consumers; absence/`false` must reproduce current behavior exactly.
- **Config parity** — the new flag must follow the established `processing` boolean pattern (`slotConstraints`, `inferNumberProps`): optional in `Config`, required in `ResolvedConfig`, defaulted in `DEFAULT_CONFIG`.
- **Types ↔ schema symmetry** — `types/Config.ts` and `schema/workspace.schema.json` must change together (Constitution I).
- **No logic in this package** — the ADR adds only a type field and schema property; the collapse algorithm lives in `specs-from-figma` (Constitution II).
- **Naming: code-platform first** — the field name should describe what the configuration controls in terms a spec consumer recognizes, independent of Figma's layer vocabulary (Constitution VI).

---

## Options Considered

### Option A: `processing.wrapperCollapse` *(Selected)*

A boolean field on `Config.processing`. When `true`, the generator promotes the single text/glyph child to root and strips the container wrapper. Default: `false`.

**Name rationale**: Names the thing being removed (`wrapper`) and what happens to it (`collapse`). Consistent with other processing booleans (`slotConstraints`, `inferNumberProps`) which name the capability being activated. "Wrapper" is a code-platform-neutral term — React, iOS, and Android all use it to describe decorative containers that carry no semantic substance.

**Pros**:
- Additive optional field → MINOR bump only.
- `false` default leaves all existing specs unchanged.
- Name is self-describing and matches the processing-block pattern.
- Symmetric: one field in type, one property in schema.

**Cons / Trade-offs**:
- Consumers must opt in explicitly; no auto-collapse for legacy files without a config update.

---

### Option B: `processing.leafCollapse` *(Rejected)*

Same boolean, named from the leaf's perspective (the thing being promoted) rather than the wrapper's (the thing being removed).

**Rejected because**: "Collapse" as a verb applied to the leaf is misleading — the leaf isn't collapsed, it's promoted. The wrapper is what collapses. `wrapperCollapse` more accurately describes the observable effect (the container disappears) and avoids the semantic mismatch.

---

### Option C: `processing.promoteLeaf` *(Rejected)*

Active-verb framing — "promote the leaf to root."

**Rejected because**: Inconsistent with the existing processing-boolean naming convention, which favors noun phrases (`slotConstraints`, `inferNumberProps`, `wrapperCollapse`) over imperative verbs. Diverging from the established pattern increases cognitive friction for users reading a config file.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Config.ts` | Add optional `wrapperCollapse?: boolean` to `Config.processing` | MINOR |
| `types/Config.ts` | Add required `wrapperCollapse: boolean` to `ResolvedConfig.processing` | MINOR |
| `types/Config.ts` | Add `wrapperCollapse: false` to `DEFAULT_CONFIG.processing` | MINOR |

**Example — `Config` (partial, `types/Config.ts`)**:
```yaml
# Before
processing:
  slotConstraints?: boolean
  inferNumberProps?: boolean

# After
processing:
  slotConstraints?: boolean
  inferNumberProps?: boolean
  wrapperCollapse?: boolean   # optional — MINOR
```

**Example — `ResolvedConfig` (partial, `types/Config.ts`)**:
```yaml
# Before
processing:
  slotConstraints: boolean
  inferNumberProps: boolean

# After
processing:
  slotConstraints: boolean
  inferNumberProps: boolean
  wrapperCollapse: boolean    # required — mirrors resolved pattern
```

**Example — `DEFAULT_CONFIG` (partial, `types/Config.ts`)**:
```yaml
# Before
processing:
  slotConstraints: false
  inferNumberProps: false

# After
processing:
  slotConstraints: false
  inferNumberProps: false
  wrapperCollapse: false
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/workspace.schema.json` | Add `wrapperCollapse` boolean property under `#/definitions/Config/properties/processing/properties` | MINOR |

**Example — new property (`schema/workspace.schema.json`)**:
```yaml
# Under #/definitions/Config/properties/processing/properties
wrapperCollapse:
  type: boolean
  default: false
  description: >
    When true, a component whose root is a plain container wrapping a single
    text or glyph element (no meaningful container styles, no slot bindings)
    is collapsed: the wrapper is stripped and the leaf becomes the spec root.
    All-or-nothing across variants — if any variant fails the eligibility
    check, no collapse occurs. Defaults to false.
```

### Notes

- `wrapperCollapse` is not added to `required` in the schema — it is optional with a `default` of `false`, matching the pattern for `slotConstraints` and `inferNumberProps`.
- The eligibility criteria (disqualifying container styles, slot-bound root, non-singleton children) are implementation details of `specs-from-figma` and are not expressed in the schema.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — one field added to `Config.processing` in `types/Config.ts`; one property added to `Config.properties.processing.properties` in `schema/workspace.schema.json`. Both carry `false` as default, both are optional in the user-facing contract.
- **Parity check**: `Config.processing.wrapperCollapse?: boolean` ↔ `#/definitions/Config/properties/processing/properties/wrapperCollapse` (`type: boolean`, `default: false`).

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | New config field must be read from `ResolvedConfig` and used to gate the wrapper-collapse pass | Read `config.processing.wrapperCollapse`; run collapse only when `true` |
| `specs-plugin-2` | Recompile against updated types; no behavioral change unless the user enables the flag | Recompile; optionally expose toggle in plugin UI |
| `specs-cli` | Recompile against updated types; config resolution and `DEFAULT_CONFIG` merge continue to work as-is | Recompile; no code changes required |

---

## Semver Decision

**Version bump**: `0.25.0 → 0.26.0` (`MINOR`)

**Justification**: All changes are additive — a new optional field on `Config.processing`, a new required field on `ResolvedConfig.processing` (with a guaranteed default), and a new schema property. No existing fields are removed or renamed. Per the constitution's versioning rule: additive types or new optional fields → `MINOR`.

---

## Consequences

- Consumers can opt in to structurally simpler specs for wrapper-only components by setting `processing.wrapperCollapse: true` in their config.
- Existing specs and consumers are unaffected — `false` default reproduces the current behavior exactly.
- The anatomy `root` entry for a collapsed component will carry the leaf's element type (`text` or `glyph`) rather than `container`, and `$extensions.com.figma.originalName` will record the original Figma layer name.
- `layout` is cleared on collapsed variants (the wrapper's layout properties are not meaningful on a promoted primitive).
- Any tool validating specs against `schema/workspace.schema.json` will accept the new field after upgrading to the version that ships this ADR.
