# ADR: PropConfigurations PropBinding

**Branch**: `045-prop-configurations-binding`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-008 — Introduce PropBinding](008-prop-binding) *(establishes `PropBinding`)*

---

## Context

`PropConfigurations` is used on `Element` to configure a nested component instance's props — for example, setting a nested `Button`'s `variant` to `"primary"`. Its current type accepts only scalar values:

```yaml
PropConfigurations: Record<string, string | number | boolean>
```

A parent component's element layer may need to *pass through* a prop from the parent to a nested instance — for example, a `Card` that exposes a `variant` prop and forwards it to an internal `Button`. Today, this requires a static scalar value; the forwarding cannot be expressed.

`PropBinding` (`{ $binding: string }`) already exists for exactly this purpose: it appears on `Element.content`, `Element.instanceOf`, and `Styles.visible` to bind a field's value to a parent prop at data-emission time. Widening `PropConfigurations` to also accept `PropBinding` completes the binding model uniformly across all element-level fields.

This ADR does **not** affect `InstanceExample.propConfigurations` (ADR-043), which intentionally remains scalar-only — it represents a human-authored documented configuration, not a live data binding.

---

## Decision Drivers

- **Consistent binding model** — `PropBinding` is already the established pattern for pass-through bindings on elements; `PropConfigurations` is the only element-level field that cannot participate
- **Additive-only** — existing scalar values remain valid; the union is widened not replaced → MINOR
- **`InstanceExample.propConfigurations` stays scalar** — that type represents a documented usage configuration; binding belongs in `Element.propConfigurations` only
- **Type ↔ schema symmetry** — every field has a schema counterpart (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)

---

## Options Considered

### Option A: Widen `PropConfigurations` value union to include `PropBinding` *(Selected)*

Add `PropBinding` as a fourth branch alongside `string`, `number`, and `boolean`.

```yaml
# Before — static scalar only
aNestedButton:
  type: instance
  instanceOf: Button
  propConfigurations:
    variant: primary

# After — static scalar or pass-through binding
aNestedButton:
  type: instance
  instanceOf: Button
  propConfigurations:
    variant: primary                             # static scalar — unchanged
    label: { $binding: "#/props/buttonLabel" }  # bound to parent's buttonLabel prop
    disabled: { $binding: "#/props/disabled" }  # bound to parent's disabled prop
```

**Pros**:
- Completes the binding pattern already established on `Element.content`, `Element.instanceOf`, and `Styles.visible`
- Existing scalar values are fully backward-compatible — no migration
- `InstanceExample.propConfigurations` is a separate type and is unaffected

**Cons / Trade-offs**:
- Tooling that processes `PropConfigurations` must now handle both scalar and `PropBinding` values; this is an extension, not a breaking change

---

### Option B: Separate `propBindings` field *(Rejected)*

Add a new `propBindings?: Record<string, PropBinding>` field on `Element` alongside `propConfigurations`.

**Rejected because**: Splitting static values and bindings across two fields is awkward to author and consume. A single `propConfigurations` field that accepts both is simpler and consistent with how `Element.content` handles the same duality (`string | PropBinding`).

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `PropConfigurations.ts` | Widen value union to include `PropBinding` | MINOR |

**Updated type** (`types/PropConfigurations.ts`):

```yaml
# Before
PropConfigurations: Record<string, string | number | boolean>

# After
PropConfigurations: Record<string, string | number | boolean | PropBinding>
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Update `#/definitions/PropConfigurations` `additionalProperties` to add `PropBinding` branch | MINOR |

**Updated definition** (`#/definitions/PropConfigurations`):

```yaml
# Before
PropConfigurations:
  type: object
  additionalProperties:
    oneOf:
      - type: string
      - type: number
      - type: boolean

# After
PropConfigurations:
  type: object
  additionalProperties:
    oneOf:
      - type: string
      - type: number
      - type: boolean
      - $ref: "#/definitions/PropBinding"
```

### Out of scope for this ADR

- **`InstanceExample.propConfigurations`** — remains `Record<string, string | number | boolean>` by design; see ADR-043
- **Slot value binding in `PropConfigurations`** — passing a slot prop through to a nested instance's slot prop via `PropBinding` is related but deferred; this ADR covers scalar prop pass-through only

### Notes

- `PropBinding` in `PropConfigurations` uses the `{ $binding: "..." }` shape established in ADR-008. The `$binding` path follows the same JSON Pointer convention used on `Element.content` and `Styles.visible` (e.g., `"#/props/label"`).
- The distinction between `Element.propConfigurations` (live binding — `PropBinding` permitted) and `InstanceExample.propConfigurations` (documented configuration — scalars only) is intentional and must be maintained in implementations.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `PropConfigurations` value union `string | number | boolean | PropBinding` ↔ `additionalProperties.oneOf` (four branches, fourth is `$ref: "#/definitions/PropBinding"`)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must emit `PropBinding` values in `propConfigurations` where a nested prop is bound to a parent prop | Handle `PropBinding` branch when processing element prop configurations |
| `specs-cli` | Recompile; no output change until `specs-from-figma` emits `PropBinding` values | Recompile |
| `specs-plugin-2` | Recompile | No change |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: `PropConfigurations` value union is widened — existing scalar values remain valid; no value is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `Element.propConfigurations` can express both static scalar prop values and pass-through bindings to parent props in a single field
- The binding pattern established by ADR-008 (`PropBinding`) is now uniformly available across all element-level value fields: `content`, `instanceOf`, `styles.visible`, and `propConfigurations`
- `InstanceExample.propConfigurations` is not affected — it remains scalar-only by design
