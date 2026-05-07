# ADR: Duplicate Layer Name Disambiguation

**Branch**: `adr/044-duplicate-layer-disambiguation`
**Created**: 2026-05-07
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

> **Scope**: This ADR addresses a **two-part problem** spanning both the schema contract (`@directededges/specs-schema`) and the processing architecture (`specs-from-figma`). Part 1 (Decision) defines the schema change — a small additive type. Part 2 (Downstream Impact → Architectural notes) defines the disambiguation algorithm, cross-variant matching heuristics, and adversarial analysis that make the schema change useful. **Reviewers should evaluate both parts** — the schema change alone is trivial; the processing architecture is where the complexity lives.

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
      originalName?: string         # Present only when key differs from Figma layer name
```

`$extensions` is present only when the component contains at least one duplicate name group. When a component has no duplicates, `$extensions` is omitted entirely (no noise for the common case).

> **Future ADR**: A subsequent ADR will evaluate whether to add a **provenance signal** (e.g., `matchMethod`) to `$extensions["com.figma"]` indicating the heuristic used for cross-variant matching. This is a separable decision — disambiguation and collision-safe suffixing do not depend on it.

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
    type: glyph                         # "icon2" IS the original Figma name
  icon:
    type: glyph
  icon3:
    type: glyph
    $extensions:
      com.figma:
        originalName: icon

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
| `component.schema.json` | Add optional `$extensions` property to `AnatomyElement` definition with `com.figma` sub-object containing `originalName` | MINOR |

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
- **`$extensions` presence is conditional on disambiguation**: `$extensions["com.figma"].originalName` is present **only** on elements whose key differs from their Figma layer name. When a component has no duplicate names, no `$extensions` appear anywhere — zero overhead for the common case.
- **`originalName` stores the formatted key version** of the original name (after `formatKey` is applied), not the raw Figma name with original casing. This ensures consumers can compare `originalName` against other keys using the same format.
- **`Elements` and `Layout` do not need `$extensions`**: They use the same disambiguated keys as `Anatomy`. The anatomy is the canonical registry of element identity — consumers look up `originalName` there.
- **The suffix format** (`name`, `name2`, `name3` with collision skipping) is a processing convention, not a schema constraint. The schema only guarantees unique keys and the `$extensions` field for traceability. The suffix numbering strategy is an implementation detail of `specs-from-figma`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — one optional `$extensions` object with one property added to both `AnatomyElement` type and schema definition.
- **Parity check**:
  - `AnatomyElement.$extensions["com.figma"].originalName` (type) ↔ `#/definitions/AnatomyElement/properties/$extensions/properties/com.figma/properties/originalName` (schema)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | **High** — Must implement disambiguation in traversal, element detection, layout serialization, and variant differencing | See architectural notes below |
| `specs-cli` | **Low** — Recompile against new types. No behavioral change needed unless CLI renders element names (may want to show `originalName` in diagnostics) | Recompile |
| `specs-plugin-2` | **Low** — Recompile against new types. Plugin UI may want to surface disambiguation warnings | Recompile |

### Architectural notes for `specs-from-figma`

The following changes are needed in the processing engine. These are described at the architectural level — specific implementation is at the discretion of the package maintainers.

**1. Disambiguation insertion point**

Disambiguation must happen at the earliest point in the pipeline: during or immediately after `Anatomy.traverse()`, before nodes enter any `Record`-keyed structure. The disambiguated name replaces the raw Figma layer name for all downstream consumers — anatomy registration, element detection, layout serialization, and variant differencing all operate on the disambiguated key.

The disambiguation itself is not a simple per-node decision. It requires cross-variant coordination (see §2 below) because the same logical element must receive the same key in every variant. This means the traversal must either:
- Run a lightweight survey pass across all variants **before** the main traversal, or
- Defer name assignment until all variants have been traversed and then apply names retroactively

The survey-first approach is preferred because it avoids retroactive renaming of already-registered elements.

**2. Cross-variant key stability — global registry with anchor-adjacent matching**

The critical challenge: ensuring the same logical element receives the same disambiguated key across all variants so that differencing produces correct diffs. Pure positional matching (1st icon → `icon`, 2nd icon → `icon2`) fails when variants have different element counts or ordering, because the "2nd icon" in one variant may not be the same element as the "2nd icon" in another.

The solution is a **two-pass global registry** enhanced with **anchor-relative positioning** — using unique-named siblings as stable reference points to match duplicate elements across variants.

#### Pass 1 — Survey and anchor identification

Scan all variants within each parent scope to build:
1. A **global reserved set**: all original element names across all variants (for collision-safe suffix assignment)
2. An **anchor set**: element names that appear **exactly once** within a given parent in **every variant that contains them**. These are stable reference points — they don't move relative to their duplicated neighbors.
3. For each duplicate name, a **maximum occurrence count** across all variants

```yaml
# Variant A siblings: [icon, label, icon]
# Variant B siblings: [icon, icon, label, icon]

# Anchors within this parent:
#   "label" — appears exactly 1× in VA, 1× in VB → ✓ anchor
#   "icon" — appears 2× in VA, 3× in VB → ✗ not an anchor

# Global reserved set: {icon, label}
# Max "icon" count: 3 (from variant B)
```

#### Pass 2 — Anchor-adjacent identity assignment

For each group of duplicates sharing a name within a parent, split occurrences into **segments** bounded by anchors. Within each segment, match duplicates **from the anchor boundary inward** — elements closest to the anchor have the strongest identity signal and are matched first:

- **Before-anchor** segments: match right-to-left (from anchor side inward)
- **After-anchor** segments: match left-to-right (from anchor side inward)
- **Between two anchors**: match inward from both sides (nearest anchor wins)

##### Why anchor-adjacent over left-to-right positional?

Two matching directions are plausible:

- **Left-to-right positional**: 1st duplicate → `icon`, 2nd → `icon2`, 3rd → `icon3`. Simple, but assigns identity based on absolute position with no awareness of surrounding context.
- **Anchor-adjacent**: match from the nearest unique landmark inward. Assigns identity based on structural relationship to stable reference points.

Anchor-adjacent is preferred for three reasons:

**1. Terminal elements have distinct semantic roles in real UI patterns.** A breadcrumb trail's last `Link` is always the current page. A table row's last `Cell` is typically the actions column. A form's bottom element is the submit button. Left-to-right positional matching assigns the base name to the first element and pushes new suffixes rightward — but when a variant adds items, the *last* element (often semantically distinct) drifts to a different suffix. Anchor-adjacent matching anchors terminal elements to their adjacent landmark and keeps their suffix stable.

```yaml
# Breadcrumb: last Link = current page
# VA: [Link, Separator, Link, Separator, Link]
# VB: [Link, Separator, Link, Separator, Link, Separator, Link]
#
# Left-to-right: VA Link₃ = "link3", VB Link₃ = "link3" ← same suffix, but
#   VA link3 is "current page", VB link3 is a middle link. Mismatch.
#
# Anchor-adjacent (Separator as anchor, last Link as right-edge identity):
#   VA's last Link and VB's last Link both get the same suffix. Correct match.
```

**2. Right-edge growth is the dominant pattern.** Across star ratings, steppers, form fields, navigation tabs, accordion sections, and breadcrumbs, new repeated elements are added at the trailing edge. Anchor-adjacent matching keeps existing elements (near anchors) stable and assigns fresh suffixes to newly appended elements at the far edge of each segment.

**3. Anchor-adjacent degrades gracefully to positional.** When no anchors exist (e.g., five `Star` layers with no unique siblings), anchor-adjacent falls back to left-to-right positional — the only option. When anchors do exist, anchor-adjacent strictly improves on positional by using contextual information. There is no case where positional produces better matches than anchor-adjacent given the same anchor set.

##### Worked example

```yaml
# Segments divided by anchor "label":
#
# Variant A: [icon, label, icon]
#   segment BEFORE label: [icon]       → 1 icon
#   segment AFTER label:  [icon]       → 1 icon
#
# Variant B: [icon, icon, label, icon]
#   segment BEFORE label: [icon, icon] → 2 icons
#   segment AFTER label:  [icon]       → 1 icon

# Anchor-adjacent matching (before-label = right-to-left from anchor):
#   VA before-label, adjacent to label (pos 0):  icon  ─┐
#   VB before-label, adjacent to label (pos 1):  icon  ─┘ SAME element
#   VB before-label, far from label (pos 0):     icon  → NEW element
#
# Anchor-adjacent matching (after-label = left-to-right from anchor):
#   VA after-label, adjacent to label (pos 0):   icon  ─┐
#   VB after-label, adjacent to label (pos 0):   icon  ─┘ SAME element

# Three distinct identities, suffixes assigned by first traversal appearance:
#   Identity 1 (before-label, adjacent) → first seen VA pos 0 → "icon"
#   Identity 2 (after-label, adjacent)  → first seen VA pos 2 → "icon2"
#   Identity 3 (before-label, far)      → first seen VB pos 0 → "icon3"

# Final disambiguation:
#   Variant A: icon, label, icon2
#   Variant B: icon3, icon, label, icon2
#
# "icon" (adjacent to label, left side) is the SAME element in both variants.
# "icon2" (adjacent to label, right side) is the SAME element in both variants.
# "icon3" appears only in VB — new element, correctly surfaced as a variant diff.
```

##### Multi-anchor example

When multiple anchors exist, they create finer-grained segments. Matching radiates inward from the nearest anchor:

```yaml
# Variant A: [icon, label, description, icon]
# Variant B: [icon, icon, label, icon, description, icon]

# Anchors: "label" and "description" (both unique in all variants)
# Segments: BEFORE-label, BETWEEN-label-description, AFTER-description

# VA segments: [icon], [], [icon]
# VB segments: [icon, icon], [icon], [icon]

# Anchor-adjacent matching:
#   before-label (right-to-left from label):
#     VA [icon←]     →  VB [icon, icon←]  → adjacent icons match
#     VB pos 0 icon  →  NEW (far from label)
#
#   between-label-description (match from nearest anchor):
#     VA []          →  VB [icon]  → VB only → NEW
#
#   after-description (left-to-right from description):
#     VA [→icon]     →  VB [→icon]  → match

# Identities and suffix assignment:
#   Identity 1 (before-label, adjacent)         → first seen VA pos 0 → "icon"
#   Identity 2 (after-description, adjacent)    → first seen VA pos 3 → "icon2"
#   Identity 3 (between-label-desc, adjacent)   → first seen VB pos 3 → "icon3"
#   Identity 4 (before-label, far)              → first seen VB pos 0 → "icon4"

# Variant A: icon, label, description, icon2
# Variant B: icon4, icon, label, icon3, description, icon2
```

#### Adversarial cases from real UI patterns

The following cases stress-test the algorithm against common component structures. Each is categorized by **confidence level** — how reliably the algorithm produces correct matches.

##### High confidence — algorithm matches designer intent

| Pattern | Structure | Why it works |
|---------|-----------|-------------|
| **Alert/Banner** (`[Icon, Content, Icon]`) | Two `Icon` siblings flanking a unique `Content` anchor | `Content` is the anchor. Leading icon = before-content, trailing icon = after-content. Correct even when `has-close=false` removes the trailing icon. |
| **Breadcrumb** (`[Link, Sep, Link, Sep, Link]`) | Interleaved `Link` + `Separator` pairs | Each `Separator` is an anchor (unique per occurrence since the Links are the duplicates). The current-page `Link` (always last) stays matched to its adjacent separator. |
| **Card icons** (`Header > [Icon], Footer > [Icon]`) | Duplicates in **different subtrees** | **Parent containment** is the strongest disambiguation signal — each `Icon` is scoped to its parent (`Header` vs `Footer`) and receives a distinct key by ancestry alone. No sibling-level heuristic needed. See *Disambiguation hierarchy* below. |

##### Medium confidence — correct for typical usage, fragile under reordering

| Pattern | Structure | Risk |
|---------|-----------|------|
| **Form fields** (`[Field, Field, Field, Submit]`) | Repeated `Field` with a unique `Submit` anchor at the bottom | Anchor-adjacent matches right-to-left from `Submit`, keeping the field *nearest* Submit stable. But new optional fields are typically inserted *just before* Submit (e.g., VA: `[Name, Email, Submit]`, VB: `[Name, Email, Phone, Submit]`). This shifts the "nearest to Submit" identity to the new field, mismatching the original fields. **Left-to-right positional would be more accurate here**, but the algorithm can't know growth direction. Correct when fields are appended at the top; **breaks** when inserted before Submit. |
| **Star rating** (`[Star, Star, Star, Star, Star]`) | Homogeneous duplicates, no anchors | Falls back to left-to-right positional. Correct when `count` variants remove from the right (the dominant pattern). **Breaks** if a designer reverses layer order for RTL layout. |
| **Navigation tabs** (`[Tab, Tab, Tab]`) | Homogeneous duplicates, no anchors | Same as stars — positional fallback. Correct for `count` variants. **Breaks** if `selected` is implemented by moving the active tab to position 0. |
| **Stepper** (`[Step, Step, Step]`) | Homogeneous duplicates if no unique connector/label between steps | Falls back to positional. Correct when steps grow from the right. **Breaks** if a designer inserts steps in the middle of an existing sequence. |

##### Low confidence — algorithm produces a result but may mismatch

| Pattern | Scenario | What goes wrong |
|---------|----------|----------------|
| **Semantic reordering** | VA: `[icon-A, icon-B]`, VB: `[icon-B, icon-A]` — both named `Icon`, swapped | Positional matching assigns `icon` and `icon2` based on position. A becomes icon in VA but icon2 in VB. **No positional scheme can detect semantic identity swaps** without external metadata. |
| **Accordion nested** | `[Header, Chevron, Content, Header, Chevron, Content]` at multiple nesting depths | After flattening, `Header` appears 2× as siblings even though they belong to different `Section` parents. **Mitigation**: per-parent scoping already handles this — each `Section`'s children are disambiguated independently. |
| **Table column reordering** | VA: `[Cell-checkbox, Cell-name, Cell-actions]`, VB: `[Cell-name, Cell-checkbox, Cell-actions]` — all named `Cell` | If only `Cell-actions` (last) is an anchor, the other two cells are in the before-anchor segment and matched right-to-left. Reordering swaps their suffixes. **Acceptable**: column reordering is uncommon in variant sets; when it occurs, the resulting diff is larger but not lossy. |

#### Disambiguation hierarchy

The algorithm applies three disambiguation signals in order of strength:

1. **Parent containment** (strongest) — Elements with the same name in different subtrees are already distinct. An `Icon` inside `Header` and an `Icon` inside `Footer` are separate scopes — their keys are disambiguated by ancestry, not by suffix. This is the first and most reliable signal because it reflects the designer's structural intent: grouping elements under named parents is an explicit organizational choice.

2. **Anchor-adjacent matching** (strong) — Within a single parent, unique-named siblings serve as stable landmarks. Duplicates are matched by proximity to these anchors. Effective when the parent contains a mix of unique and repeated names.

3. **Positional fallback** (weakest) — When no anchors exist within a parent (all siblings share the same name), fall back to left-to-right order. Correct only when growth happens at the trailing edge.

Most real components benefit from levels 1 and 2. Homogeneous sibling groups (level 3 only) are the minority case — and even there, the output is lossless; only diff granularity degrades.

#### Error risk scale

The algorithm's matching quality depends on the **anchor density** — the ratio of unique-named siblings to total siblings within a parent:

| Anchor density | Matching quality | Example |
|----------------|-----------------|---------|
| **High** (>50% unique) | Excellent — most duplicates are sandwiched between anchors | `[Icon, Label, Input, Icon, HelperText]` — 3 anchors, 2 duplicate Icons |
| **Medium** (1+ anchor, <50%) | Good — terminal elements match well; interior may be positional | `[Cell, Cell, Cell, Actions]` — 1 anchor, 3 duplicate Cells |
| **Zero** (no anchors) | Positional fallback — correct for right-edge growth only | `[Star, Star, Star, Star, Star]` — 0 anchors |

**Error tolerance**: Mismatched keys produce **larger variant diffs** (element appears as "removed in VA, added in VB" instead of "changed between VA and VB") but never produce **data loss**. The output is always lossless — every element is represented. The only cost of a mismatch is suboptimal diff granularity: a style change on a mismatched element shows as a full element diff rather than a targeted property diff. This is an acceptable degradation for low-confidence cases.

#### Performance considerations

The two-pass approach adds one lightweight traversal over all variants:

- **Pass 1 (survey)**: Iterate each variant's children within each parent, collecting name counts and identifying anchors. This is a name-counting pass only — no element processing, no style detection, no property extraction. Cost: O(V × N) where V = variant count, N = average children per parent.
- **Pass 2 (assign)**: Segment children by anchors, match across variants within each segment. Cost: O(V × N × A) where A = anchor count per parent. In practice, A is small (typically 1–5).
- **Total overhead**: Negligible relative to the existing processing pipeline, which performs Figma API calls, style extraction, and variant differencing. The survey pass touches only node names — no I/O, no async operations.
- **Worst case**: A component with hundreds of variants and deep nesting. Even here, the survey pass is bounded by the total node count across all variants, which is already traversed during the existing `Anatomy.traverse()` call. The added cost is a second traversal of the same nodes collecting only names.

#### Edge cases and fallbacks

**No anchors available**: If all siblings within a parent are duplicates (e.g., `[Star, Star, Star, Star, Star]` with no unique names), fall back to **left-to-right absolute position within parent** — 1st → `star`, 2nd → `star2`, 3rd → `star3`. This is the weakest heuristic but the only option when no context is available. Positional matching here means a designer reordering layers changes suffix assignment — an accepted trade-off when no anchors exist to provide stability.

**Anchor itself is absent in some variants**: If `label` appears in variant A but not variant B, it cannot serve as an anchor. Only names present in **every variant that contains them** qualify. In practice, this means: if an anchor is optional (absent in some variants), its segments are merged with adjacent segments in variants where it's missing.

**Nested duplicates**: Disambiguation is scoped to each parent independently (see *Disambiguation hierarchy*, level 1). A parent named `header` with children `[icon, icon]` and a sibling parent `footer` with children `[icon, icon]` are separate scopes. The `icon` in `header` and the `icon` in `footer` are already distinct by ancestry — they have different keys in the flattened anatomy because the traversal encounters them in different subtrees. Parent containment is the primary defense against the "same name, different purpose" scenario (Context §2) — the designer's grouping structure, not suffix matching, is what distinguishes them.

**Anchor ordering inconsistency**: If anchors themselves appear in different orders across variants (e.g., VA has `[label, description]` but VB has `[description, label]`), the segment boundaries diverge and anchor-relative matching degrades. This is treated as a design inconsistency — the algorithm falls back to absolute position for affected segments and emits a diagnostic warning.

**formatKey collisions**: Two distinct Figma names could format to the same key (e.g., `My Icon` and `myIcon` both → `myIcon` in camelCase). This is treated as a duplicate even though the original names differ. The `$extensions["com.figma"].originalName` field records the formatted key of the dominant name; the collision is surfaced in the same way as a true duplicate.

**3. Variant differencing accuracy**

Once elements have stable, anchor-relative disambiguated keys:
- `Elements.compare()` matches by disambiguated key — no change to comparison logic needed. Because anchor-relative matching ensures the same logical element gets the same key across variants, diffs correctly identify which elements changed vs. which are new/removed.
- `Differencer.establishBaselineParity()` sees the full element set (no silent losses) — parity is established correctly
- Layout diffing compares trees with disambiguated keys — structural differences are detected accurately
- Elements that exist in some variants but not others (e.g., `icon3` appears only in variant B) surface as expected variant diffs, not as mismatched keys

**4. Floating elements across variants**

An element that appears at different hierarchy positions in different variants (e.g., `label` as a child of `header` in variant A, child of `content` in variant B) is treated as **the same element** if its disambiguated key matches. The layout diff captures the structural change; the element diff captures style changes. This is existing behavior — disambiguation doesn't change it, but it does ensure the element isn't silently dropped if another element shares its name.

**5. Implementation sequencing**

The work spans two repos and should proceed in this order:

1. **`specs-schema`**: Add `$extensions` to `AnatomyElement` type and schema. Publish as `0.22.0` (MINOR). This is a trivial, low-risk change.
2. **`specs-from-figma`**: Implement the global registry, anchor-adjacent matching, and collision-safe suffix assignment. This is the bulk of the work. Split into sub-milestones:
   - **Phase A — Survey infrastructure**: Implement the two-pass survey (name counting, anchor identification) without changing output. Add logging/diagnostics that report which components have duplicate names and what anchors were identified. This is observability-only — no output changes.
   - **Phase B — Disambiguation**: Apply suffix assignment. All `Record`-keyed structures (`Anatomy._items`, `Elements._items`, `Layout.serialize()`) receive disambiguated keys. Add `$extensions["com.figma"].originalName` to anatomy elements whose key differs from their Figma layer name. This changes output for components with duplicate names.
   - **Phase C — Parity testing**: Run the parity test suite (`specs-testing`) against ground-truth fixtures to validate that disambiguated output is correct and that components with unique names produce identical output.
3. **`specs-plugin-2`**: Recompile against new schema types. Optionally surface disambiguation warnings in the plugin UI.
4. **`specs-cli`**: Recompile. No behavioral changes required.

**6. Testing strategy**

Validation requires both **unit tests** (in `specs-from-figma`) and **parity tests** (in `specs-testing`).

Unit tests in `specs-from-figma`:
- **Collision-safe suffix**: Input `[icon, icon, icon2]` → output `[icon, icon3, icon2]`. Verify `icon2` is not stolen.
- **Anchor identification**: Given variants with known layer structures, verify the correct anchor set is computed.
- **Anchor-adjacent matching**: Given two variants with different duplicate counts, verify segment assignment and identity matching produce expected keys.
- **No-anchor fallback**: Homogeneous duplicates `[star, star, star]` → positional `[star, star2, star3]`.
- **Cross-variant stability**: Process the same component multiple times with different variant ordering — output must be identical regardless of processing order.
- **Passthrough for unique names**: Components with no duplicate names produce identical output to the current (pre-disambiguation) engine. Zero `$extensions` fields in output.

Parity tests in `specs-testing`:
- Add Figma test fixtures containing deliberate duplicate names (repeating instances, same-name-different-subtree, floating elements).
- Verify plugin (`specs-plugin-2`) and CLI (`specs-cli`) produce identical output for these fixtures.
- Regression: existing fixtures with unique names must produce byte-identical output.

**7. Rollout impact**

- **Components with unique names** (the vast majority): **No output change.** Disambiguation produces no suffixes, no `$extensions` fields. Output is identical to pre-ADR behavior.
- **Components with duplicate names**: Output changes — previously lost elements now appear in anatomy, elements, and layout. This is a correctness improvement, not a regression, but consumers parsing spec output may see new keys they didn't expect.
- **No feature flag needed**: The disambiguation algorithm is deterministic and always-on. There is no "old mode" worth preserving — the old behavior was silent data loss.
- **Breaking change for downstream parsers?**: No. The schema change is additive (new optional `$extensions`). The key format change (new suffixed keys) only affects components that previously had data loss — those consumers were already receiving incorrect output.

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
- The `$extensions` pattern on `AnatomyElement` opens the door for future Figma provenance metadata on anatomy (e.g., match method confidence signals, node IDs, layer visibility) without additional schema changes — a subsequent ADR will evaluate this
