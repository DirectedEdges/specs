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

### Option A: Collision-safe numeric suffix + `$extensions` metadata *(Selected)*

Disambiguate duplicate names by appending a numeric suffix at traversal time, before any dictionary keying. Store the original Figma layer name under `$extensions["com.figma"].originalName` on `AnatomyElement`, following the existing DTCG extension convention used by `TokenReference` and `PropExtensions`.

The suffix algorithm must be **collision-safe** — it cannot assign a suffix that conflicts with an existing element name:

```yaml
# Input layers in traversal order:
#   icon, icon, icon2

# Naive (WRONG) — second "icon" steals "icon2" from the third element:
#   icon, icon2, icon2  ← COLLISION

# Collision-safe (CORRECT) — skip occupied names:
#   icon, icon3, icon2
```

Algorithm:
1. Collect all original element names in the current scope into a **reserved set**
2. First occurrence of a name → use as-is
3. Subsequent occurrences → find the lowest available suffix (`name2`, `name3`, ...) that is **not in the reserved set** and **not already assigned**
4. Add each assigned disambiguated name to the reserved set to prevent future collisions
5. Suffixes are assigned by **traversal order within a single variant** (depth-first, matching Figma's layer panel order)

**Pros**:
- Human-readable keys (`icon`, `icon3` is immediately understandable)
- `$extensions["com.figma"].originalName` follows the established Figma provenance convention — consistent with `TokenReference.$extensions` and `PropExtensions["com.figma"]`
- Collision-safe — never steals a name that belongs to an existing element
- Additive schema change (MINOR) — `$extensions` is optional, existing specs are unaffected
- Simple algorithm — no dependency on node types or hierarchy depth

**Cons / Trade-offs**:
- Positional sensitivity: if a designer reorders two identically-named layers, their suffixes swap, which changes the keys. This is inherent to any ordering-based scheme.
- Cross-variant matching relies on traversal-order consistency. If variant A has `[icon, label, icon]` and variant B has `[label, icon]`, the single `icon` in B matches `icon` (the first) in A by name. The second `icon3` in A has no match in B — it appears as a diff. This is correct behavior.
- Suffix numbers may not be contiguous (e.g., `icon`, `icon3` when `icon2` is reserved by an original layer name). This is intentional — contiguity is sacrificed for collision safety.

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
- Consumers see `icon3` but can't determine whether it was originally named `icon3` in Figma or disambiguated from `icon`. The `$extensions["com.figma"].originalName` field makes this distinction explicit and supports round-trip fidelity.
- Small schema cost (one optional field within an established extension pattern) for significant traceability gain.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Anatomy.ts` | Add optional `$extensions` to `AnatomyElement` with `com.figma` namespace containing `originalName` | MINOR |

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
  $extensions?:
    com.figma?:
      originalName?: string   # Present only when key differs from Figma layer name
```

**Example — spec output with disambiguation** (collision-safe):
```yaml
# Input: Figma layers in order: Checkbox, Checkbox, Checkbox, icon2, icon, icon
# After formatKey (camelCase): checkbox, checkbox, checkbox, icon2, icon, icon

# Collision-safe disambiguation:
#   "checkbox" → reserved set: {checkbox, icon2, icon}
#   1st checkbox → "checkbox" (first occurrence, keep as-is)
#   2nd checkbox → "checkbox2" not reserved → assign "checkbox2"
#   3rd checkbox → "checkbox3" not reserved → assign "checkbox3"
#   "icon2" → already in reserved set, first occurrence → "icon2" (keep as-is)
#   1st icon → "icon" (first occurrence, keep as-is)
#   2nd icon → "icon2" IS reserved → skip; "icon3" not reserved → assign "icon3"

anatomy:
  root:
    type: container
  checkbox:
    type: instance
    instanceOf: Checkbox
  checkbox2:
    type: instance
    instanceOf: Checkbox
    $extensions:
      com.figma:
        originalName: checkbox
  checkbox3:
    type: instance
    instanceOf: Checkbox
    $extensions:
      com.figma:
        originalName: checkbox
  icon2:
    type: glyph                    # No $extensions — "icon2" IS the original name
  icon:
    type: glyph
  icon3:
    type: glyph
    $extensions:
      com.figma:
        originalName: icon         # Was "icon", but "icon2" was taken

# Elements section — uses the same disambiguated keys
elements:
  checkbox:
    styles: { ... }
  checkbox2:
    styles: { ... }
  checkbox3:
    styles: { ... }
  icon2:
    styles: { ... }
  icon:
    styles: { ... }
  icon3:
    styles: { ... }

# Layout section — uses disambiguated keys in tree
layout:
  - root:
    - checkbox
    - checkbox2
    - checkbox3
    - icon2
    - icon
    - icon3
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add optional `$extensions` property to `AnatomyElement` definition with `com.figma` sub-object | MINOR |

**Example — new property** (under `#/definitions/AnatomyElement/properties`):
```yaml
$extensions:
  type: object
  description: "DTCG §5.2.3 platform-specific extensions."
  properties:
    com.figma:
      type: object
      properties:
        originalName:
          type: string
          description: >
            The original Figma layer name (after formatKey) before
            disambiguation. Present only when the element key was modified
            to resolve a duplicate name conflict. When absent, the key IS
            the original layer name.
      additionalProperties: false
  additionalProperties: true
  # not in required[] — optional field
```

### Notes

- **`$extensions` follows the established provenance pattern**: `TokenReference`, `BooleanProp`, `StringProp`, `EnumProp`, and `SlotProp` all use `$extensions["com.figma"]` for Figma extraction metadata. Placing `originalName` here is consistent with the ecosystem convention.
- **`$extensions` is omitted when not needed**: If the key matches the original Figma layer name (the common case), neither `$extensions` nor `originalName` are present. This keeps output compact for components with unique names.
- **`originalName` stores the formatted key version** of the original name (after `formatKey` is applied), not the raw Figma name with original casing. This ensures consumers can compare `originalName` against other keys using the same format.
- **`Elements` and `Layout` do not need `$extensions.originalName`**: They use the same disambiguated keys as `Anatomy`. The anatomy is the canonical registry of element identity — consumers look up `originalName` there.
- **The suffix format** (`name`, `name2`, `name3` with collision skipping) is a processing convention, not a schema constraint. The schema only guarantees unique keys and the `$extensions` field for traceability. The suffix numbering strategy is an implementation detail of `specs-from-figma`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — one optional `$extensions` object added to both `AnatomyElement` type and schema definition.
- **Parity check**: `AnatomyElement.$extensions["com.figma"].originalName` (type) ↔ `#/definitions/AnatomyElement/properties/$extensions/properties/com.figma/properties/originalName` (schema).

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

The critical challenge: ensuring the same logical element receives the same disambiguated key across all variants so that differencing produces correct diffs. Two strategies are viable:

#### Strategy A: Per-variant disambiguation + anatomy merge

Each variant is disambiguated independently using the collision-safe algorithm. The anatomy accumulates elements from all variants using `addNewElementsFromVariant()`. When a disambiguated key from variant B doesn't match any key in the anatomy (built from variant A), it's added as a new element.

```yaml
# Variant A layers: [icon, label, icon]
# After disambiguation: icon, label, icon3 (icon2 might be reserved)
# Anatomy after variant A: {icon, label, icon3}

# Variant B layers: [icon, label]
# After disambiguation: icon, label (no duplicates)
# Anatomy merge: icon ✓ exists, label ✓ exists → no new elements

# Variant C layers: [icon, icon, icon, label]
# After disambiguation: icon, icon3, icon4, label
# Anatomy merge: icon ✓, icon3 ✓, label ✓, icon4 is NEW → added
# Final anatomy: {icon, label, icon3, icon4}
```

**Pros**:
- Simple — single pass, fits existing processing pipeline
- Each variant is self-contained; no coordination required

**Cons**:
- Suffix assignment depends on which variant is processed first (the baseline). If variant A has `[icon, icon]` → `icon, icon2` and variant B has `[icon, icon, icon]` → `icon, icon2, icon3`, the keys align. But if variant A has `[icon, label, icon]` and variant C has `[icon, icon, label]`, the second `icon` gets different suffixes in each (`icon3` vs `icon2` depending on the reserved set), and differencing may see them as different elements.
- Variant processing order affects the anatomy's key set, which can produce inconsistent diffs.

#### Strategy B: Global name registry (two-pass)

Before processing any variant, scan all variants to build a **global disambiguation registry**:

1. **Pass 1 — Survey**: For each unique name across all variants, record the maximum occurrence count and the set of names that exist as originals (for collision avoidance).
2. **Pass 2 — Assign**: Using the global reserved set, assign suffixes using the collision-safe algorithm. Because the reserved set is the same for all variants, the same name at the same traversal position always gets the same suffix.

```yaml
# Survey pass:
#   "icon" appears: 2× in variant A, 1× in variant B, 3× in variant C → max 3
#   "icon2" appears: 1× in variant A (as an original name) → reserved
#   "label" appears: 1× everywhere → max 1

# Global reserved set: {icon, icon2, label}
# Disambiguation slots for "icon": icon (1st), icon3 (2nd, skip icon2), icon4 (3rd)

# All variants now use the same slot assignments:
#   Variant A: [icon, icon] → icon, icon3
#   Variant B: [icon] → icon
#   Variant C: [icon, icon, icon] → icon, icon3, icon4

# Differencing: "icon3" in A and "icon3" in C are the SAME element (2nd icon)
```

**Pros**:
- Deterministic regardless of variant processing order
- Same traversal position always maps to the same key across all variants
- Differencing is accurate — no false positives from inconsistent suffixes

**Cons**:
- Requires two passes over all variants (survey + assign), adding complexity to the processing pipeline
- The "same traversal position" heuristic assumes designers maintain consistent layer ordering across variants. If variant A has `[icon-decorative, icon-functional]` and variant B has `[icon-functional, icon-decorative]` (swapped order, both named `icon`), they'll get swapped keys. This is an inherent limitation of positional matching without semantic analysis.

#### Recommendation

Strategy B (global registry) is preferred for correctness. The two-pass cost is low — the survey pass only collects name counts, not full element processing. The payoff is deterministic key stability across all variants, which directly impacts the quality of variant diffs.

Strategy A is acceptable as a first implementation if the two-pass approach proves too disruptive to the existing pipeline, with the understanding that edge cases around variant-order-dependent suffixes may produce suboptimal diffs.

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
- Components with unique layer names (the majority) produce identical output — no `$extensions` present, keys unchanged
- Consumers can distinguish between an element named `icon2` by the designer and one disambiguated from `icon` by checking for `$extensions["com.figma"].originalName`
- The collision-safe algorithm guarantees no name theft — an original `icon2` layer is never displaced by a disambiguated `icon` duplicate
- Variant differencing operates on complete element sets, producing accurate diffs
- The disambiguation suffix format (`name`, `name3`, `name4` with collision skipping) becomes a de facto convention in spec output, though it is not enforced by the schema — suffix numbers may be non-contiguous
- `specs-from-figma` requires significant architectural changes in traversal, element detection, and variant differencing — this is the primary implementation cost
- The `$extensions` pattern on `AnatomyElement` opens the door for future Figma provenance metadata on anatomy (e.g., node IDs, layer visibility) without additional schema changes
