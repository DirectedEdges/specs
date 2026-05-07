# ADR: Duplicate Layer Name Disambiguation

**Branch**: `adr/044-duplicate-layer-disambiguation`
**Created**: 2026-05-07
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

Three core types in `@directededges/specs-schema` use layer names as dictionary keys:

- `Anatomy = Record<string, AnatomyElement>`
- `Elements = Record<string, Element>`
- `Layout` serializes to `{ [nodeName]: LayoutNode[] }`

The schema contract implicitly assumes **unique layer names within a component**. When a Figma component contains duplicate layer names — which is common and valid in Figma — the processing engine has no schema-level affordance to represent them distinctly. This causes silent data loss: duplicate names overwrite each other in every `Record`-keyed structure, and variant differencing produces incorrect results because elements can't be matched across variants.

### Common duplicate-name scenarios

- **Repeating items**: Five layers named `Checkbox` within a container (e.g., a rating control, a multi-select group)
- **Same name, different purpose**: An `Icon` at the root level (decorative) and another `Icon` nested inside a button (functional) — distinct roles, identical names
- **Floating elements across variants**: A layer named `Label` that appears at different hierarchy positions in different variants — is it the same element relocated, or a different element with the same name?

### Current failure modes

1. **Anatomy**: `Anatomy.add()` stores elements by name. The second `Checkbox` silently overwrites the first. `addNewElementsFromVariant()` skips names already present, so only the first variant's version is recorded.
2. **Elements**: `Elements.detect()` and `Elements.set()` use name as the dictionary key. Last-write-wins for siblings; first-write-wins across variants.
3. **Layout**: `Layout.serialize()` converts the tree to `{ [name]: children[] }` objects. Sibling nodes with the same name collapse into one key.
4. **Variant differencing**: `Elements.compare()` looks up baseline elements by name. When duplicates were lost during detection, the diff is computed against an incomplete baseline, producing incorrect or missing diffs. `Differencer.establishBaselineParity()` operates on the already-deduplicated `Elements` map, so it never sees the lost duplicates.

### Prior art

The original EGDS Specs generator solved this with a composite key: **layer name + layer type + hierarchy position (including child index within parent)**. This was deterministic and lossless but opinionated — hierarchy position made keys brittle when designers reordered layers.

---

## Decision Drivers

- **Lossless representation**: The spec output must represent every element in the Figma source. Silent data loss is unacceptable.
- **Deterministic disambiguation**: The same Figma input must always produce the same disambiguated keys. No randomness, no side effects.
- **Stable variant matching**: Disambiguated keys must be consistent across variants so that differencing produces correct diffs. An element that exists in multiple variants must receive the same key in each.
- **Additive change**: Prefer a MINOR (additive) schema change over a MAJOR (breaking) one. Existing specs with unique names should be unaffected.
- **Human-readable keys**: Disambiguated keys should remain meaningful to consumers (designers, developers reading spec output).
- **Type ↔ schema symmetry**: Any new type must have a corresponding schema definition.
- **No logic in schema package**: The disambiguation algorithm belongs in `specs-from-figma`, not in `@directededges/specs-schema`. The schema defines the contract; downstream packages implement it.

---

## Options Considered

### Option A: Numeric suffix disambiguation + `originalName` metadata *(Selected)*

Disambiguate duplicate names by appending a numeric suffix (`icon`, `icon2`, `icon3`) at traversal time, before any dictionary keying. Add an optional `originalName` field to `AnatomyElement` so consumers can recover the original Figma layer name when disambiguation occurred.

The suffix algorithm:
- First occurrence keeps the bare name: `icon`
- Subsequent occurrences get ascending suffixes: `icon2`, `icon3`, ...
- Suffixes are assigned by **traversal order within a single variant** (depth-first, matching Figma's layer panel order)
- Cross-variant stability: the disambiguation is performed per-variant, then the anatomy merges use the disambiguated keys for matching

**Pros**:
- Human-readable keys (`icon`, `icon2` is immediately understandable)
- `originalName` preserves the Figma source name for consumers that need it (documentation tools, design token mapping)
- Additive schema change (MINOR) — `originalName` is optional, existing specs are unaffected
- Simple algorithm — no dependency on node types or hierarchy depth

**Cons / Trade-offs**:
- Positional sensitivity: if a designer reorders two identically-named layers, their suffixes swap, which changes the keys. This is inherent to any ordering-based scheme.
- Cross-variant matching relies on traversal-order consistency. If variant A has `[icon, label, icon]` and variant B has `[label, icon]`, the single `icon` in B matches `icon` (the first) in A by name. The second `icon2` in A has no match in B — it appears as a diff. This is correct behavior.

---

### Option B: Type-aware compound key (`name-type`) *(Rejected)*

Disambiguate by combining layer name + element type: `icon-glyph`, `icon-container`.

**Rejected because**:
- Two elements can have the same name AND the same type (e.g., two `Frame` layers both named `Content`). This doesn't fully solve the uniqueness problem.
- Changes the key format for ALL elements, not just duplicates — every key becomes `name-type`, which is a MAJOR breaking change.
- Violates human-readability: `labelContainer-frame` is worse than `labelContainer`.

---

### Option C: Hierarchy-path key (`parent/child:index`) *(Rejected)*

Use the full hierarchy path as the key: `root/content/icon:0`, `root/header/icon:0`.

**Rejected because**:
- MAJOR breaking change — completely new key format for all elements.
- Keys become long and fragile — any hierarchy restructuring changes all descendant keys.
- Violates human-readability for simple, unique-name components (the common case).
- Over-engineered for the problem: most components have unique names and need no disambiguation.

---

### Option D: Processing-only fix, no schema change *(Rejected)*

Disambiguate names in `specs-from-figma` using suffixes but add no schema metadata.

**Rejected because**:
- Consumers see `icon2` but can't determine whether it was originally named `icon2` in Figma or disambiguated from `icon`. The `originalName` field makes this distinction explicit and supports round-trip fidelity.
- Small schema cost (one optional field) for significant traceability gain.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Anatomy.ts` | Add optional `originalName?: string` to `AnatomyElement` | MINOR |

**Example — new shape** (`types/Anatomy.ts`):
```yaml
# Before
AnatomyElement:
  type: ElementType | ElementTypeRef
  detectedIn?: string
  instanceOf?: string | SubcomponentRef

# After
AnatomyElement:
  type: ElementType | ElementTypeRef
  detectedIn?: string
  instanceOf?: string | SubcomponentRef
  originalName?: string   # Present only when key differs from Figma layer name
```

**Example — spec output with disambiguation**:
```yaml
# Anatomy section of a component with duplicate "Checkbox" layers
anatomy:
  root:
    type: container
  checkbox:
    type: instance
    instanceOf: Checkbox
  checkbox2:
    type: instance
    instanceOf: Checkbox
    originalName: checkbox      # Was "Checkbox" in Figma, same as checkbox above
  checkbox3:
    type: instance
    instanceOf: Checkbox
    originalName: checkbox      # Was "Checkbox" in Figma
  label:
    type: text

# Elements section — uses the same disambiguated keys
elements:
  checkbox:
    styles: { ... }
  checkbox2:
    styles: { ... }
  checkbox3:
    styles: { ... }

# Layout section — uses disambiguated keys in tree
layout:
  - root:
    - checkbox
    - checkbox2
    - checkbox3
    - label
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add optional `originalName` property to `AnatomyElement` definition | MINOR |

**Example — new property** (under `#/definitions/AnatomyElement/properties`):
```yaml
originalName:
  type: string
  description: >
    The original Figma layer name before disambiguation. Present only when
    the element key was modified to resolve a duplicate name conflict.
    When absent, the key IS the original layer name.
  # not in required[] — optional field
```

### Notes

- **`originalName` is omitted when not needed**: If the key matches the original Figma layer name (the common case), the field is absent. This keeps output compact for components with unique names.
- **`originalName` stores the formatted key version** of the original name (after `formatKey` is applied), not the raw Figma name with original casing. This ensures consumers can compare `originalName` against other keys using the same format.
- **`Elements` and `Layout` do not need `originalName`**: They use the same disambiguated keys as `Anatomy`. The anatomy is the canonical registry of element identity — consumers look up `originalName` there.
- **The suffix format** (`name`, `name2`, `name3`) is a processing convention, not a schema constraint. The schema only guarantees unique keys and the `originalName` field for traceability. The suffix numbering strategy is an implementation detail of `specs-from-figma`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — one optional field added to both `AnatomyElement` type and schema definition.
- **Parity check**: `AnatomyElement.originalName` (type) ↔ `#/definitions/AnatomyElement/properties/originalName` (schema).

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | **High** — Must implement disambiguation in traversal, element detection, layout serialization, and variant differencing | See architectural notes below |
| `specs-cli` | **Low** — Recompile against new types. No behavioral change needed unless CLI renders element names (may want to show `originalName` in diagnostics) | Recompile |
| `specs-plugin-2` | **Low** — Recompile against new types. Plugin UI may want to surface disambiguation warnings | Recompile |

### Architectural notes for `specs-from-figma`

The following changes are needed in the processing engine. These are described at the architectural level — specific implementation is at the discretion of the package maintainers.

**1. Traversal-time disambiguation**

Disambiguation must happen at the earliest point: during `Anatomy.traverse()`, before nodes enter any `Record`-keyed structure. The algorithm:

- Track seen names per parent scope during depth-first traversal
- First occurrence of a name → use as-is
- Subsequent occurrences → append ascending numeric suffix (`name2`, `name3`, ...)
- Attach the disambiguated name to the node for all downstream consumers (anatomy, elements, layout)

**2. Cross-variant key stability**

The critical challenge: ensuring the same logical element receives the same disambiguated key across all variants. Two strategies to evaluate:

- **Per-variant disambiguation + anatomy merge**: Each variant is disambiguated independently. The anatomy accumulates elements from all variants using `addNewElementsFromVariant()`. When a disambiguated key from variant B doesn't match any key in the anatomy (built from variant A), it's added as a new element. This works correctly when traversal order is consistent across variants.
- **Global name registry**: Build a disambiguation registry from all variants before processing any single variant. Analyze all variants to determine the maximum count of each name, then assign stable suffixes. This is more robust but requires a two-pass approach.

**3. Variant differencing accuracy**

Once elements have stable disambiguated keys:
- `Elements.compare()` matches by disambiguated key — no change to comparison logic needed
- `Differencer.establishBaselineParity()` sees the full element set (no silent losses) — parity is established correctly
- Layout diffing compares trees with disambiguated keys — structural differences are detected accurately

**4. Floating elements across variants**

An element that appears at different hierarchy positions in different variants (e.g., `label` as a child of `header` in variant A, child of `content` in variant B) is treated as **the same element** if its disambiguated key matches. The layout diff captures the structural change; the element diff captures style changes. This is existing behavior — disambiguation doesn't change it, but it does ensure the element isn't silently dropped if another element shares its name.

---

## Semver Decision

**Version bump**: `0.21.0` → `0.22.0` (`MINOR`)

**Justification**: The only schema change is an additive optional field (`originalName` on `AnatomyElement`). No existing fields are modified, removed, or renamed. Per constitution III: "additive types or new optional fields → MINOR."

---

## Consequences

- Spec output represents every element in the Figma source — no silent data loss from duplicate layer names
- Components with unique layer names (the majority) produce identical output — `originalName` is absent, keys unchanged
- Consumers can distinguish between an element named `icon2` by the designer and one disambiguated from `icon` by checking for `originalName`
- Variant differencing operates on complete element sets, producing accurate diffs
- The disambiguation suffix format (`name2`, `name3`) becomes a de facto convention in spec output, though it is not enforced by the schema
- `specs-from-figma` requires significant architectural changes in traversal, element detection, and variant differencing — this is the primary implementation cost
- Future consideration: if numeric suffixes prove insufficient (e.g., designers already use `icon2` as a name), a more sophisticated disambiguation strategy may be needed. The `originalName` field supports any future suffix scheme without schema changes
