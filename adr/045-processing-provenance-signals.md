# ADR: Processing Provenance Signals

**Branch**: `adr/044-duplicate-layer-disambiguation`
**Created**: 2026-05-07
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: ADR-044 (Duplicate Layer Name Disambiguation)

---

## Context

The Specs schema currently carries **what** the processing engine produced but not **how confident** the engine was in each decision. When `specs-from-figma` resolves ambiguity — matching duplicate-named elements across variants, inferring prop types, detecting subcomponent boundaries — the algorithm knows its own confidence level at every step. Today that signal is discarded: consumers see final keys and values with no indication of which were straightforward and which required heuristic fallbacks.

This gap matters most for two consumer classes:

1. **LLM consumers** — language models consuming spec output to generate code, documentation, or design reviews. An LLM has no access to the source Figma file or the processing algorithm. Without provenance signals, it must treat all data as equally reliable. With them, it can adjust its reasoning: "This element was matched by sibling index — its identity across variants is less certain."

2. **Diagnostic tools** — the plugin UI, CLI output, and future review workflows. Surfacing "this element used a low-confidence heuristic" lets designers verify the cases most likely to be wrong, rather than reviewing the entire spec.

ADR-044 introduces `$extensions["com.figma"]` on `AnatomyElement` with `originalName` for disambiguation traceability. It also introduces a **five-level heuristic chain** for resolving element identity (name → type → ancestry → anchor → index). This ADR evaluates whether to extend the same namespace with a **method signal** recording which heuristic level resolved each element — and whether to establish provenance signaling as a general pattern.

### Existing `$extensions["com.figma"]` usage

The `com.figma` namespace is already established across the schema:

- **`TokenReference.$extensions["com.figma"]`** — carries `id`, `name`, `collectionName`, `rawValue` for Figma extraction provenance on token references
- **`PropExtensions["com.figma"]`** — carries `FigmaPropExtension` (source kind: `variant`, `codeOnlyProp`, etc.) on prop definitions
- **`AnatomyElement.$extensions["com.figma"]`** (ADR-044) — carries `originalName` for disambiguation traceability

Each of these records **what Figma provided**. This ADR proposes also recording **how the engine interpreted it**.

---

## Decision Drivers

- **Self-documenting output**: Spec data should carry enough context for any consumer to assess reliability without re-running the algorithm or accessing the source file
- **Additive change**: Must be MINOR — optional fields only, no breaking changes
- **Consistent extension pattern**: New fields belong in `$extensions["com.figma"]` following the established DTCG §5.2.3 convention
- **Minimal initial scope**: Start with the disambiguation use case (ADR-044), define a pattern that future processing steps can follow
- **No logic in schema**: The schema defines the field shape; processing packages decide when and how to populate it
- **LLM-friendly**: Signal names should be human-readable strings that a language model can interpret without external documentation
- **Aligned with heuristic chain**: Values must map directly to ADR-044's ordered check levels so consumers know exactly which heuristic resolved the element

---

## Options Considered

### Option A: `matchMethod` on `AnatomyElement` — scoped provenance field *(Selected)*

Add a `matchMethod` field to `AnatomyElement.$extensions["com.figma"]` that records which heuristic check resolved each element's cross-variant identity. Define a string literal union (`MatchMethod`) for the five levels in ADR-044's chain.

This is **scoped to disambiguation only** — it addresses the immediate need without introducing a generic provenance framework. Future processing steps that want provenance signals would add their own named fields to the relevant `$extensions["com.figma"]` objects, following this precedent.

**Pros**:
- Solves the immediate need: consumers know which element keys are high-confidence vs. heuristic fallback
- Small, focused change — one field, one type, one schema property
- Follows the established `$extensions["com.figma"]` pattern exactly
- LLM-readable: `"ancestry"` and `"sibling-index"` are self-explanatory strings
- Values map 1:1 to ADR-044's heuristic chain — no interpretation gap

**Cons / Trade-offs**:
- Each new provenance signal requires its own ADR and field addition — no reusable structure
- Field naming is ad-hoc — `matchMethod` for disambiguation, `inferenceMethod` for props, etc. No enforced convention beyond the namespace

---

### Option B: Generic `provenance` object with `method` + `confidence` *(Rejected)*

Add a generic `$extensions["com.figma"].provenance` object with standardized fields (`method: string`, `confidence: 'high' | 'medium' | 'low'`, `details?: string`) that any processing step could populate.

**Rejected because**:
- Over-engineered for the current need — only disambiguation has a concrete use case today
- The `confidence` enum is misleading: "high" vs. "medium" means different things for element matching vs. prop inference vs. subcomponent detection. A generic scale hides domain-specific nuance.
- ADR-044's heuristic chain already provides an **ordered confidence scale** through the check level itself — `unique` is highest, `sibling-index` is lowest. A separate confidence field would duplicate this information.
- Harder to validate: a generic `method: string` can't be schema-constrained the way a five-value enum can

---

### Option C: Processing-only signals, no schema change *(Rejected)*

Emit provenance signals only in diagnostic/debug output (CLI `--verbose`, plugin console), not in the spec data itself.

**Rejected because**:
- LLM consumers and downstream tools consuming the JSON/YAML output never see diagnostics — the signal is lost at the point where it's most valuable
- Diagnostic output is ephemeral; spec output is the durable artifact that gets stored, versioned, and consumed across workflows
- Small schema cost (one optional string field within an established extension) for significant consumer value

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Anatomy.ts` | Add optional `matchMethod` to `AnatomyElement.$extensions["com.figma"]` | MINOR |

**`MatchMethod`** — a string literal union recording which heuristic check (ADR-044 §3) resolved the element's cross-variant identity:

```yaml
MatchMethod:
  | 'unique'            # Check 1 — name was already unique, no disambiguation needed
  | 'layer-type'        # Check 2 — name + Figma node type narrowed to unique identity
  | 'ancestry'          # Check 3 — ancestor path distinguished this element from others
  | 'anchor-adjacent'   # Check 4 — proximity to a unique-named sibling resolved identity
  | 'sibling-index'     # Check 5 — positional index among same-name+type siblings (lowest confidence)
```

**Example — new shape** (`types/Anatomy.ts`):
```yaml
# Before (after ADR-044)
AnatomyElement:
  type: ElementType | ElementTypeRef
  detectedIn?: string
  instanceOf?: string | SubcomponentRef
  $extensions?:
    com.figma?:
      originalName?: string

# After
AnatomyElement:
  type: ElementType | ElementTypeRef
  detectedIn?: string
  instanceOf?: string | SubcomponentRef
  $extensions?:
    com.figma?:
      originalName?: string
      matchMethod?: MatchMethod
```

### Presence rules

`matchMethod` is present on **every** anatomy element when the component contains at least one duplicate name group. When a component has no duplicates, `$extensions` is omitted entirely (no noise for the common case).

When present, the value distribution conveys the component's matching quality at a glance:
- All `'unique'` → no disambiguation was needed (duplicates existed elsewhere in the component, but not for this element)
- `'layer-type'` or `'ancestry'` → high confidence, structural signals resolved identity
- `'anchor-adjacent'` → medium confidence, sibling context was used
- `'sibling-index'` → low confidence, positional fallback was the only option

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add optional `matchMethod` to `AnatomyElement.$extensions["com.figma"]` | MINOR |

**Example — new property** (under `#/definitions/AnatomyElement/properties/$extensions/properties/com.figma/properties`):
```yaml
matchMethod:
  type: string
  enum: [unique, layer-type, ancestry, anchor-adjacent, sibling-index]
  description: >
    Which heuristic check (ADR-044) resolved this element's cross-variant
    identity. Values are ordered by confidence: "unique" (highest) through
    "sibling-index" (lowest). "unique" = no disambiguation needed.
    "layer-type" = name + node type was sufficient. "ancestry" = ancestor
    path distinguished the element. "anchor-adjacent" = proximity to a
    unique sibling. "sibling-index" = positional fallback.
```

### Example output

Building on ADR-044's collision-safe example:

```yaml
anatomy:
  root:
    type: container
    $extensions:
      com.figma:
        matchMethod: unique
  checkbox:
    type: instance
    instanceOf: Checkbox
    $extensions:
      com.figma:
        matchMethod: sibling-index      # No anchors among the checkboxes
  checkbox2:
    type: instance
    instanceOf: Checkbox
    $extensions:
      com.figma:
        originalName: checkbox
        matchMethod: sibling-index
  checkbox3:
    type: instance
    instanceOf: Checkbox
    $extensions:
      com.figma:
        originalName: checkbox
        matchMethod: sibling-index
  icon2:
    type: glyph
    $extensions:
      com.figma:
        matchMethod: unique              # "icon2" IS the original name
  icon:
    type: glyph
    $extensions:
      com.figma:
        matchMethod: anchor-adjacent     # Adjacent to "icon2" anchor
  icon3:
    type: glyph
    $extensions:
      com.figma:
        originalName: icon
        matchMethod: anchor-adjacent
```

A component with ancestry-resolved duplicates:

```yaml
# Header > [Icon], Footer > [Icon]
anatomy:
  header:
    type: container
    $extensions:
      com.figma:
        matchMethod: unique
  footer:
    type: container
    $extensions:
      com.figma:
        matchMethod: unique
  icon:
    type: glyph
    $extensions:
      com.figma:
        matchMethod: ancestry            # Distinguished by Header vs Footer parent
  icon2:
    type: glyph
    $extensions:
      com.figma:
        originalName: icon
        matchMethod: ancestry
```

### Notes

- **`matchMethod` extends, not replaces, `originalName`**: The two fields serve different purposes. `originalName` enables round-trip traceability (what was the Figma name?). `matchMethod` enables confidence assessment (which heuristic resolved cross-variant identity?). Both live under `com.figma` because both are Figma-processing provenance.
- **Enum values map 1:1 to ADR-044's heuristic chain**: `unique` = Check 1, `layer-type` = Check 2, `ancestry` = Check 3, `anchor-adjacent` = Check 4, `sibling-index` = Check 5. The ordering is implicit in the enum — earlier values are higher confidence.
- **Enum values are lowercase kebab-case**, consistent with the `FigmaPropExtension` source kind values (`variant`, `codeOnlyProp`). They are intentionally not `SCREAMING_CASE` — the constitution's screaming-case rule applies to "string literal union types used as enum values in `Styles` and its child types," not to extension metadata values.
- **The pattern, not the field, is the precedent**: This ADR establishes that processing steps should embed their method signal in the output. Future candidates include:
  - `props.$extensions["com.figma"].inferenceSource` — how a prop type was determined (`explicit`, `heuristic`, `code-only`)
  - `anatomy.element.$extensions["com.figma"].detectionMethod` — how an element type was classified (`name-pattern`, `node-type`, `instance-analysis`)
  - Each would be its own field with its own enum, evaluated independently — no generic framework required.
- **Consumer guidance for LLMs**: An LLM consuming spec output can use `matchMethod` directly in its reasoning chain. Suggested prompt pattern: "Elements with `matchMethod: 'sibling-index'` have the weakest cross-variant identity — their diffs may reflect positional instability rather than true design changes. Prefer trusting `'unique'`, `'layer-type'`, and `'ancestry'` elements when generating variant-conditional code."

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — one optional string field added to both the `AnatomyElement` type and schema definition, within the existing `$extensions["com.figma"]` object.
- **Parity check**:
  - `AnatomyElement.$extensions["com.figma"].matchMethod` (type) ↔ `#/definitions/AnatomyElement/properties/$extensions/properties/com.figma/properties/matchMethod` (schema)
  - `MatchMethod` string literal union (type) ↔ `enum: [unique, layer-type, ancestry, anchor-adjacent, sibling-index]` (schema)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | **Medium** — Must emit `matchMethod` during Phase 2 of ADR-044's disambiguation. The check level is already known at resolution time — this is surfacing existing information, not computing new information | Record which check resolved each element during the heuristic chain |
| `specs-cli` | **Low** — Recompile against new types. May optionally surface `matchMethod` in diagnostic output | Recompile |
| `specs-plugin-2` | **Low** — Recompile. May optionally highlight low-confidence elements in the UI | Recompile |

### Implementation sequencing

This ADR is designed to be implemented **concurrently with ADR-044** — in the same schema release and the same `specs-from-figma` implementation phase. The schema change is additive (one more field on the same `$extensions` object). The processing change is trivial: at the point where ADR-044's heuristic chain resolves an element, it already knows which check succeeded — it simply records that check level.

Recommended approach:
1. **Schema**: Include `matchMethod` in the same `AnatomyElement.$extensions` addition as ADR-044's `originalName`. Ship both in a single MINOR release.
2. **Processing**: Record the resolving check level during ADR-044's Phase 2 (heuristic chain). No separate phase needed.
3. **Testing**: Extend ADR-044's test cases to assert `matchMethod` values alongside disambiguated keys.

---

## Semver Decision

**Version bump**: Included in ADR-044's `0.22.0` release (`MINOR`)

**Justification**: One additional optional field within an already-new optional `$extensions` object. No existing fields modified. Per constitution III: "additive types or new optional fields → MINOR."

---

## Consequences

- Spec output becomes **self-documenting** for disambiguation confidence — consumers can assess element key reliability without re-running the algorithm or inspecting the source Figma file
- LLM consumers gain a structured signal for reasoning about variant diff trustworthiness
- Diagnostic tools (plugin UI, CLI) can surface warnings specifically for `'sibling-index'` elements, directing designer review to the cases most likely to mismatch
- The `$extensions["com.figma"]` namespace on `AnatomyElement` now carries both traceability (`originalName`) and confidence (`matchMethod`) — a complete provenance record for disambiguation
- **The five-value enum is inherently ordered**: consumers can treat it as a confidence scale without external documentation — earlier values in the chain = higher confidence
- **Pattern established**: Processing steps that resolve ambiguity should embed their method signal in the output. Future provenance fields follow the same approach — scoped field, named enum, within `$extensions["com.figma"]` on the relevant type — without requiring a generic framework
- When a component has no duplicate names, zero overhead — no `$extensions`, no `matchMethod`, identical output to pre-ADR behavior
