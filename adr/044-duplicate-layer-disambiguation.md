# ADR: Duplicate Layer Name Disambiguation

**Branch**: `adr/044-duplicate-layer-disambiguation`
**Created**: 2026-05-07
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

> **Scope**: This ADR addresses a **two-part problem** spanning both the schema contract (`@directededges/specs-schema`) and the processing architecture (`specs-from-figma`). Part 1 (Decision) defines the schema change — a small additive type. Part 2 (Downstream Impact → Architectural notes) defines the disambiguation algorithm. **Reviewers should evaluate both parts** — the schema change alone is trivial; the processing architecture is where the complexity lives.

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

Disambiguate duplicate names by appending a numeric suffix, determined by an ordered heuristic chain during a disambiguation phase that is separate from initial evaluation. Store the original Figma layer name under `$extensions["com.figma"].originalName` on `AnatomyElement`, following the existing DTCG extension convention used by `TokenReference` and `PropExtensions`.

The suffix algorithm must be **collision-safe** — it cannot assign a suffix that conflicts with an existing element name:

```yaml
# Input layers in traversal order:
#   icon, icon, icon2

# Naive (WRONG) — second "icon" steals "icon2" from the third element:
#   icon, icon2, icon2  ← COLLISION

# Collision-safe (CORRECT) — skip occupied names:
#   icon, icon3, icon2
```

**Pros**:
- Human-readable keys (`icon`, `icon3` is immediately understandable)
- `$extensions["com.figma"].originalName` follows the established Figma provenance convention — consistent with `TokenReference.$extensions` and `PropExtensions["com.figma"]`
- Collision-safe — never steals a name that belongs to an existing element
- Additive schema change (MINOR) — `$extensions` is optional, existing specs are unaffected

**Cons / Trade-offs**:
- Key stability depends on the heuristic chain producing consistent identities across variants. When the chain reaches the weakest check (sibling index), reordering layers changes suffixes.
- Suffix numbers may not be contiguous (e.g., `icon`, `icon3` when `icon2` is reserved by an original layer name). Intentional — contiguity is sacrificed for collision safety.

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

> **Future ADR**: A subsequent ADR (045) evaluates whether to add a **provenance signal** (e.g., `matchMethod`) to `$extensions["com.figma"]` indicating which heuristic resolved each element's cross-variant identity. This is a separable decision — disambiguation and collision-safe suffixing do not depend on it.

**Example — spec output with disambiguation** (collision-safe):
```yaml
# Input: Figma layers in order: Checkbox, Checkbox, Checkbox, icon2, icon, icon
# After formatKey (camelCase): checkbox, checkbox, checkbox, icon2, icon, icon

# Collision-safe disambiguation:
#   "checkbox" → reserved set: {checkbox, icon2, icon}
#   1st checkbox → "checkbox" (base name — most prevalent or first)
#   2nd checkbox → "checkbox2" not reserved → assign "checkbox2"
#   3rd checkbox → "checkbox3" not reserved → assign "checkbox3"
#   "icon2" → already in reserved set, original name → "icon2" (keep as-is)
#   1st icon → "icon" (base name)
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
| `specs-from-figma` | **High** — Must implement two-phase disambiguation in traversal, element detection, layout serialization, and variant differencing | See architectural notes below |
| `specs-cli` | **Low** — Recompile against new types. No behavioral change needed unless CLI renders element names (may want to show `originalName` in diagnostics) | Recompile |
| `specs-plugin-2` | **Low** — Recompile against new types. Plugin UI may want to surface disambiguation warnings | Recompile |

### Architectural notes for `specs-from-figma`

The following changes are needed in the processing engine. These are described at the architectural level — specific implementation is at the discretion of the package maintainers.

#### 1. Two-phase architecture: Evaluation → Disambiguation

Disambiguation separates **signal collection** from **identity resolution**:

- **Evaluation** (Phase 1) records raw facts about each element during traversal — no matching logic, no key assignment
- **Disambiguation** (Phase 2) consumes those facts through an ordered heuristic chain to assign unique keys

This separation means the evaluation phase stays simple (observe and record), the heuristic chain is explicit and independently testable, and signals are reusable for diagnostics and provenance (ADR-045).

#### 2. Phase 1 — Signal collection during traversal

During anatomy traversal, each element in each variant logs:

| Signal | Description | Example |
|--------|-------------|---------|
| `layerName` | Figma layer name (after formatKey) | `icon` |
| `layerType` | Figma node type | `INSTANCE` |
| `ancestors` | Full ancestry chain, root to parent (name + type per level) | `[{name: "card", type: "FRAME"}, {name: "header", type: "FRAME"}]` |
| `siblingIndex` | Position among same-name+type siblings within parent | `2` (2nd `INSTANCE` named `icon` in this parent) |
| `nearestAnchor` | Closest unique-named sibling, if any | `{name: "label", direction: "right", distance: 1}` |

Signals are stored per element per variant. No disambiguation decisions are made during this phase — the log is a pure record of what was observed.

The cost is lightweight: a few extra properties per node, all derived from data already available during traversal. Signals are discarded after Phase 2 completes (unless surfaced via ADR-045 provenance).

#### 3. Phase 2 — Ordered heuristic chain

For elements sharing a name within a variant, apply checks in order. Each check runs **only on elements still ambiguous** after the previous check:

| # | Check | Resolves when... | Confidence |
|---|-------|-------------------|------------|
| 1 | **Layer name** | Name is unique across the variant | Highest |
| 2 | **+ layer type** | Adding node type narrows to unique identity | High |
| 3 | **+ ancestry chain** | Elements have different ancestor paths (walk up one level at a time) | High |
| 4 | **+ nearest anchor neighbor** | A unique-named sibling nearby stabilizes identity | Medium |
| 5 | **+ sibling index** | Position among same-name+type siblings within parent | Lowest |

```yaml
# Which check resolves each case?

# [Icon(INSTANCE), Label, Icon(FRAME)]
#   → Check 2: name+type distinguishes INSTANCE from FRAME

# Header > [Icon, Icon], Footer > [Icon]
#   → Check 3: ancestry distinguishes Header vs Footer icons
#   → Header's two Icons continue to checks 4–5

# [Icon, Label, Icon]  (same type, same parent)
#   → Check 4: one Icon is left-of-Label, one is right-of-Label

# [Star, Star, Star, Star, Star]  (homogeneous, no anchors)
#   → Check 5: positional index is the only signal
```

**Check 4 vs Check 5 — why ordered, not competing**: They solve different failure modes. Anchor neighbors are resilient to insertion/deletion (the anchor stays put even when new siblings appear). Sibling index is fragile to insertion/deletion (indices shift) but always available. Anchor first, index as fallback.

```yaml
# Insertion resilience:
#   V1: [icon, icon, button]
#   V2: [icon, checkbox, icon, button]
#
# Check 5 (sibling index): V1 icon(2) and V2 icon(2) match by index.
#   But did checkbox get inserted between them or before both? Index can't tell.
#
# Check 4 (anchor neighbor): V1's 2nd icon is adjacent to "button" (unique).
#   V2's 2nd icon is also adjacent to "button". Anchored match — insertion-proof.
```

#### 4. Ancestry — top-down resolution

When two elements share a name and exist in different subtrees, the ancestry chain (Check 3) distinguishes them without sibling-level heuristics. Resolution proceeds **top-down** — disambiguate each depth level before descending to its children:

```yaml
# Same-named parents:
#   Section > [icon, label, icon],  Section > [icon, label, icon]
#
# Step 1 — disambiguate depth 1:
#   section, section2
#
# Step 2 — each disambiguated parent scopes its children:
#   section  > [icon, label, icon]  → icon, label, icon2
#   section2 > [icon, label, icon]  → icon, label, icon2
#
# Four distinct icons — ancestry separates section/section2,
# then checks 4–5 separate icon/icon2 within each.
```

Top-down resolution is a natural fit for depth-first traversal: parents are visited before children, so by the time the algorithm reaches a child scope, its parent's disambiguated key is already assigned.

**Container matching across variants**: Containers are matched by their **disambiguated key**, not by path. If `header` has a unique name, it's the same container whether it sits under `card` or `sidebar`. Children scoped within `header` in V1 match children within `header` in V2. The layout diff captures the structural change; the element diff captures style changes.

#### 5. Cross-variant key stability

The heuristic chain resolves within-variant disambiguation. **Cross-variant matching uses the flat anatomy key only** — an element keyed as `icon` in V1 matches `icon` in V2, regardless of which parent it's under. This is consistent with how `Anatomy = Record<string, AnatomyElement>` works today.

The risk is **suffix instability**: the same logical element receiving different keys in different variants. The fix is **prevalence-based naming** — the identity appearing in the most variants gets the base name:

```yaml
# V1:     [Icon₁, Label, Icon₂]   (2 icons)
# V2-V96: [Label, Icon₂]          (1 icon — the after-label one)
#
# Traversal-order assignment would give Icon₁ the base name in V1,
# but Icon₂ gets it in V2-V96. Result: 95 wrong comparisons.
#
# Prevalence-based:
#   Icon₂ (after-label) → 96 variants → "icon" (base name)
#   Icon₁ (before-label) → 1 variant  → "icon2"
#
# V1:     icon2, label, icon
# V2-V96: label, icon
# Cross-variant: V2's "icon" matches V1's "icon" — correct.
```

**Suffix assignment algorithm**:
1. Collect all original names into a **reserved set**
2. Identify distinct identities via the heuristic chain across all variants
3. Rank by **cross-variant prevalence** — most variants gets base name
4. Ties → break by first traversal appearance
5. Assign collision-safe suffixes (skip reserved names)
6. Add each assigned name to the reserved set

#### 6. Worked example — anchor-adjacent matching (Check 4)

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
#   VB before-label, adjacent to label (pos 1):  icon  ─┘ SAME identity
#   VB before-label, far from label (pos 0):     icon  → NEW identity

# Anchor-adjacent matching (after-label = left-to-right from anchor):
#   VA after-label, adjacent to label (pos 0):   icon  ─┐
#   VB after-label, adjacent to label (pos 0):   icon  ─┘ SAME identity

# Three distinct identities, suffixes by prevalence:
#   Identity 1 (before-label, adjacent) → VA + VB → "icon"
#   Identity 2 (after-label, adjacent)  → VA + VB → "icon2" (tie, first traversal)
#   Identity 3 (before-label, far)      → VB only → "icon3"
#
# Variant A: icon, label, icon2
# Variant B: icon3, icon, label, icon2
```

With multiple anchors, segments get finer-grained:

```yaml
# Variant A: [icon, label, description, icon]
# Variant B: [icon, icon, label, icon, description, icon]
#
# Anchors: "label" and "description" (both unique in all variants)
# Segments: BEFORE-label, BETWEEN-label-description, AFTER-description
#
# VA segments: [icon], [], [icon]
# VB segments: [icon, icon], [icon], [icon]
#
# Matching per segment (from nearest anchor inward):
#   before-label:          VA 1 icon,  VB 2 icons → adjacent match + 1 new
#   between-label-desc:    VA 0 icons, VB 1 icon  → VB only, new
#   after-description:     VA 1 icon,  VB 1 icon  → match
#
# Result:
#   Variant A: icon, label, description, icon2
#   Variant B: icon4, icon, label, icon3, description, icon2
```

#### 7. Adversarial cases

##### High confidence — algorithm matches designer intent

| Pattern | Structure | Why it works |
|---------|-----------|-------------|
| **Alert/Banner** (`[Icon, Content, Icon]`) | Two `Icon` siblings flanking unique `Content` | Check 4: leading icon = before-Content, trailing icon = after-Content. Correct even when `has-close=false` removes the trailing icon. |
| **Breadcrumb** (`[Link, Sep, Link, Sep, Link]`) | Interleaved `Link` + `Separator` pairs | Check 4: each `Separator` is an anchor. The current-page `Link` (always last) stays matched to its adjacent separator. |
| **Card icons** (`Header > [Icon], Footer > [Icon]`) | Duplicates in different subtrees | Check 3: ancestry distinguishes `Header > Icon` from `Footer > Icon`. |

##### Medium confidence — correct for typical usage

| Pattern | Structure | Risk |
|---------|-----------|------|
| **Form fields** (`[Field, ..., Submit]`) | Repeated `Field` with unique `Submit` anchor | Check 4 matches right-to-left from Submit. Correct when fields append at top. Breaks when inserted just before Submit (shifts the "nearest" identity). |
| **Star rating** (`[Star × 5]`) | Homogeneous duplicates, no anchors | Check 5 (positional fallback). Correct when count variants remove from the right. Breaks on layer reordering. |

##### Low confidence — may mismatch

| Pattern | Scenario | What goes wrong |
|---------|----------|----------------|
| **Semantic swap** | VA: `[icon-A, icon-B]`, VB: `[icon-B, icon-A]` — both named `Icon`, swapped | No check can detect semantic identity swaps without external metadata. |
| **Column reorder** | All named `Cell`, only last is anchored | Reordering before the anchor swaps suffixes. Acceptable: output is still lossless, only diff granularity degrades. |

#### 8. Error tolerance

Mismatched keys produce **larger variant diffs** (element appears as "removed in VA, added in VB" instead of "changed between VA and VB") but never produce **data loss**. Every element is always represented. The only cost of a mismatch is suboptimal diff granularity.

#### 9. Edge cases

- **No anchors**: All siblings share the same name → Check 5 (positional). Weakest but always available.
- **Anchor absent in some variants**: Only names present in every variant that contains them qualify as anchors. If an anchor is optional, its segments merge in variants where it's absent.
- **formatKey collisions**: `My Icon` and `myIcon` both → `myIcon` in camelCase. Treated as a duplicate. `originalName` records the formatted key of the dominant name.
- **Anchor ordering inconsistency**: If anchors appear in different orders across variants, segment boundaries diverge. Falls back to positional for affected segments.

#### 10. Implementation sequencing

1. **`specs-schema`**: Add `$extensions` to `AnatomyElement` type and schema. Publish as `0.22.0` (MINOR).
2. **`specs-from-figma`**:
   - **Phase A — Signal collection**: Implement evaluation logging during traversal. No output changes — observability only.
   - **Phase B — Heuristic chain + suffix assignment**: Apply the ordered checks, assign collision-safe suffixes. All `Record`-keyed structures receive disambiguated keys. Add `$extensions["com.figma"].originalName`.
   - **Phase C — Parity testing**: Validate against ground-truth fixtures. Components with unique names must produce identical output.
3. **`specs-plugin-2`** / **`specs-cli`**: Recompile against new schema types.

#### 11. Testing strategy

Unit tests in `specs-from-figma`:
- **Collision-safe suffix**: Input `[icon, icon, icon2]` → output `[icon, icon3, icon2]`
- **Heuristic chain levels**: Test cases that resolve at each check level (name, type, ancestry, anchor, index)
- **Cross-variant prevalence**: 96-variant scenario — persistent element gets base name
- **Passthrough**: Components with unique names produce identical output, zero `$extensions`

Parity tests in `specs-testing`:
- Figma fixtures with deliberate duplicate names (repeating instances, different-subtree, floating elements)
- Plugin and CLI produce identical output for disambiguation fixtures
- Existing fixtures with unique names produce byte-identical output

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
- **Evaluation/disambiguation separation** makes the algorithm testable at two levels: "did we collect the right signals?" and "did we resolve correctly given these signals?"
- The ordered heuristic chain (name → type → ancestry → anchor → index) provides explicit, auditable disambiguation with graceful degradation
- The `$extensions` pattern on `AnatomyElement` opens the door for future Figma provenance metadata (ADR-045 evaluates a `matchMethod` signal indicating which heuristic resolved each element)
