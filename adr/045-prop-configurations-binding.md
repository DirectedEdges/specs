# ADR: PropConfigurations PropBinding

**Branch**: `045-prop-configurations-binding`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-008 — Introduce PropBinding](008-prop-binding) *(establishes `PropBinding`)*

---

## Context

`PropConfigurations` lives on `Element` and sets a nested instance's props — e.g. fixing a nested `Button`'s `variant` to `"primary"`. Its current type accepts scalars only:

```ts
// types/PropConfigurations.ts (today)
type PropConfigurations = Record<string, string | number | boolean>;
```

### Where `PropBinding` is already accepted

`PropBinding` (`{ $binding: "#/props/<name>" }`, from ADR-008) lets a field's value be forwarded from a parent prop at emission time. It is already permitted on three element-level fields:

```ts
// types/Element.ts (today — unchanged by this ADR)
type Element = {
  content?:    string | PropBinding;                     // ✅ binding accepted
  instanceOf?: string | PropBinding | SubcomponentRef;   // ✅ binding accepted
  styles?:     Styles;                                   //   (Styles.visible: boolean | PropBinding) ✅
  propConfigurations?: PropConfigurations;               // ❌ scalar only — the gap
  // ...
};
```

### The gap

A `Card` that exposes a `label` prop and forwards it to a nested `Button` can already express the *content* case, but not the *propConfigurations* case:

```yaml
# Parent component declares its props
props:
  label: { type: string }

elements:
  # ✅ Already works — Element.content accepts PropBinding
  cardTitle:
    type: text
    content: { $binding: "#/props/label" }

  # ❌ Cannot express today — propConfigurations values must be scalar
  nestedButton:
    type: instance
    instanceOf: Button
    propConfigurations:
      label: { $binding: "#/props/label" }   # rejected by the current type
```

Widening `PropConfigurations` to also accept `PropBinding` closes this gap and makes the binding model uniform across every element-level value field.

This ADR does **not** affect `InstanceExample.propConfigurations` (ADR-043), which stays scalar-only — it represents a human-authored documented configuration, not a live binding.

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

```ts
// Before
type PropConfigurations = Record<string, string | number | boolean>;

// After
type PropConfigurations = Record<string, string | number | boolean | PropBinding>;
```

In practice, a single `propConfigurations` block can mix static scalars and bindings:

```yaml
# Parent component
props:
  disabled: { type: boolean }

elements:
  nestedButton:
    type: instance
    instanceOf: Button
    propConfigurations:
      variant: primary                              # static scalar — already supported
      disabled: { $binding: "#/props/disabled" }    # NEW — forwarded from parent prop
```

**Pros**:
- Completes the binding pattern already established on `Element.content`, `Element.instanceOf`, and `Styles.visible`
- Existing scalar values are fully backward-compatible — no migration
- `InstanceExample.propConfigurations` is a separate type and is unaffected

**Cons / Trade-offs**:
- Tooling that processes `PropConfigurations` must now handle both scalar and `PropBinding` values; this is an extension, not a breaking change

---

### Option B: Separate `propBindings` field *(Rejected)*

Add a sibling field on `Element` that only carries bindings; leave `propConfigurations` scalar-only.

```ts
// types/Element.ts
type Element = {
  propConfigurations?: PropConfigurations;            // scalar-only, unchanged
  propBindings?: Record<string, PropBinding>;         // NEW — bindings live here
  // ...
};
```

```yaml
nestedButton:
  type: instance
  instanceOf: Button
  propConfigurations:
    variant: primary
  propBindings:
    disabled: { $binding: "#/props/disabled" }
```

**Rejected because**:
- Two fields keyed by the same prop name invites collisions (`propConfigurations.disabled` *and* `propBindings.disabled`) with no obvious precedence rule — a class of bug Option A cannot have.
- Inconsistent with the precedent already set on `Element.content`, `Element.instanceOf`, and `Styles.visible`, which each carry the `scalar | PropBinding` union inline. Splitting here would be the only element-level field that treats bindings as a separate channel.
- Consumers must read and merge two fields to know "what is this prop set to?"; Option A keeps the answer in one place.

---

### Option C: String sentinel syntax *(Rejected)*

Encode the binding as a magic string instead of an object, keeping the value union flat.

```ts
type PropConfigurations = Record<string, string | number | boolean>;
```

```yaml
nestedButton:
  propConfigurations:
    variant: primary
    disabled: "$binding:#/props/disabled"   # sentinel string
```

**Rejected because**:
- Ambiguous with legitimate string values — a `label` prop whose static value happens to start with `$binding:` is now indistinguishable from a binding. The object form (`{ $binding: ... }`) is unambiguous by construction.
- Diverges from ADR-008. Every other binding site in the schema uses the `{ $binding: string }` object shape; introducing a second encoding only for `propConfigurations` fractures the model.
- JSON Schema cannot validate the pointer payload of a sentinel string without a custom format; the object form gets `$ref: "#/definitions/PropBinding"` validation for free.

---

### Option D: Invert direction — declare forwarding on the parent prop *(Rejected)*

Express the relationship from the *parent prop's* side, not the consuming element's side.

```ts
// types/Props.ts
interface StringProp {
  type: 'string';
  forwardsTo?: string[];   // e.g., ["#/elements/nestedButton/propConfigurations/disabled"]
  // ...
}
```

**Rejected because**:
- Inverts the natural locality. A reader looking at `nestedButton` to understand "what is `disabled` set to?" would have to scan every parent prop's `forwardsTo` list. Element-local declarations keep cause and effect adjacent.
- Doesn't compose with the existing `PropBinding` model on `content`, `instanceOf`, and `styles.visible` — those are declared at the consumption site. A `forwardsTo` model on `Props` would have to either duplicate or replace them.
- A single parent prop forwarded to multiple targets becomes a list of pointers, which is harder to author and validate than per-site bindings.

---

### Option E: Defer — treat prop forwarding as a consumer concern *(Rejected)*

Do nothing in the schema. Document that consumers (`specs-from-figma`, code generators) should infer pass-through by matching prop names between parent and nested instance, or via codebase conventions.

**Rejected because**:
- Name-matching is a heuristic, not a contract. Two props can share a name without being a forwarding relationship, and a forwarding relationship can exist between differently-named props (`Card.label` → `Button.text`).
- The spec already commits to modeling bindings explicitly for `content`, `instanceOf`, and `styles.visible` (ADR-008). Leaving `propConfigurations` as the lone exception forces consumers to support two reasoning modes — explicit bindings everywhere except here.
- Figma's component-property bindings on instance swaps and text overrides are extracted directly; refusing to express the equivalent for nested-instance props discards information the source already provides.

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
