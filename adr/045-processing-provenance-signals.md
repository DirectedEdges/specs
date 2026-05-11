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

ADR-044 adds an **open-shape** `$extensions` passthrough to `AnatomyElement` (typed as `Record<string, unknown>`, `additionalProperties: true` in schema). It also introduces a **five-level heuristic chain** for resolving element identity (name → type → ancestry → anchor → index). The schema does not type the inner contents — `specs-from-figma` writes `$extensions["com.figma"].originalName` purely as a package convention. This ADR evaluates whether `specs-from-figma` should also emit a **method signal** recording which heuristic level resolved each element.

Because ADR-044 settled the schema policy as open-passthrough, this ADR is **not** a schema change. The signal lands inside the same already-open `$extensions` slot — no new types, no new schema properties, no schema version bump.

### Existing `$extensions["com.figma"]` conventions

The `com.figma` reverse-domain key is in use across processing-package conventions:

- **`TokenReference.$extensions["com.figma"]`** — carries `id`, `name`, `collectionName`, `rawValue` for Figma extraction provenance on token references (typed in `specs-schema`, predates the open-passthrough policy)
- **`PropExtensions["com.figma"]`** — carries `FigmaPropExtension` (source kind: `variant`, `codeOnlyProp`, etc.) on prop definitions (typed in `specs-schema`, predates the open-passthrough policy)
- **`AnatomyElement.$extensions["com.figma"]`** (ADR-044) — open-shape; `specs-from-figma` writes `originalName` by convention for disambiguation traceability

Each of these records **what Figma provided**. This ADR proposes also recording **how the engine interpreted it** — under the new policy, as a producer convention rather than a typed schema field.

---

## Decision Drivers

- **Self-documenting output**: Spec data should carry enough context for any consumer to assess reliability without re-running the algorithm or accessing the source file
- **No schema change**: Per ADR-044's open-passthrough policy, new provenance signals MUST be producer conventions inside `$extensions`, not typed schema fields
- **Consistent extension pattern**: New conventions land under `$extensions["com.figma"]` following DTCG §5.2.3 reverse-domain usage
- **Minimal initial scope**: Start with the disambiguation use case (ADR-044), define the producer-convention precedent that future processing steps can follow
- **LLM-friendly**: Signal names should be human-readable strings that a language model can interpret without external documentation
- **Aligned with heuristic chain**: Values must map directly to ADR-044's ordered check levels so consumers know exactly which heuristic resolved the element

---

## Options Considered

### Option A: `matchMethod` emitted under open `$extensions` as a producer convention *(Selected)*

`specs-from-figma` writes a `matchMethod` string under `AnatomyElement.$extensions["com.figma"]` whenever it resolves an element's cross-variant identity. The value comes from a fixed vocabulary that maps 1:1 to ADR-044's heuristic chain. This vocabulary is documented in `specs-from-figma` (and surfaced in `specs-cli` / `specs-plugin-2` consumer docs), **not** declared in the `specs-schema` types or JSON schema.

This is **scoped to disambiguation only** — it addresses the immediate need without introducing a generic provenance framework. Future processing steps that want provenance signals would add their own named keys under the same open-passthrough slot, following this precedent.

**Pros**:
- Solves the immediate need: consumers know which element keys are high-confidence vs. heuristic fallback
- Zero schema impact — no new types, no schema bump, no `specs-schema` release coordination
- Follows ADR-044's open-passthrough policy: `$extensions` exists to escape the schema
- LLM-readable: `"ancestry"` and `"sibling-index"` are self-explanatory strings
- Values map 1:1 to ADR-044's heuristic chain — no interpretation gap
- `specs-from-figma` can extend or refine the vocabulary independently as the chain evolves

**Cons / Trade-offs**:
- No schema-level validation: a consumer reading `matchMethod` relies on the producer's documented contract; typos in the producer would silently propagate
- Each new provenance signal still requires producer-side documentation — no reusable framework
- Discoverability lives in `specs-from-figma` docs and this ADR, not in the schema itself

---

### Option B: Typed enum + schema field on `AnatomyElement.$extensions["com.figma"].matchMethod` *(Rejected)*

Define `MatchMethod` as a string literal union in `types/Anatomy.ts`, type `FigmaAnatomyElementExtension.matchMethod?: MatchMethod`, and add a constrained `enum` to `component.schema.json`. This was the originally selected option in this ADR.

**Rejected because**:
- Directly contradicts ADR-044's revised open-passthrough policy — `$extensions` is a DTCG §5.2.3 escape hatch, not an extension point for schema-enforced fields
- Couples `specs-schema` to `specs-from-figma`'s evolving provenance vocabulary — every refinement of the heuristic chain would require a coordinated schema release
- Creates a false guarantee: typed fields suggest schema validation while the surrounding `$extensions` slot accepts arbitrary keys the schema has never seen
- Two of the five values (`anchor-adjacent`, `sibling-index`) are themselves implementation details of `specs-from-figma`'s algorithm — codifying them in the schema package elevates internals to public contract

---

### Option C: Generic `provenance` object with `method` + `confidence` *(Rejected)*

Standardise a generic `$extensions["com.figma"].provenance` object with `method: string`, `confidence: 'high' | 'medium' | 'low'`, `details?: string` that any processing step could populate.

**Rejected because**:
- Over-engineered for the current need — only disambiguation has a concrete use case today
- The `confidence` enum is misleading: "high" vs. "medium" means different things for element matching vs. prop inference vs. subcomponent detection. A generic scale hides domain-specific nuance.
- ADR-044's heuristic chain already provides an **ordered confidence scale** through the check level itself — `unique` is highest, `sibling-index` is lowest. A separate confidence field would duplicate this information.

---

### Option D: Processing-only signals, no spec output *(Rejected)*

Emit provenance signals only in diagnostic/debug output (CLI `--verbose`, plugin console), not in the spec data itself.

**Rejected because**:
- LLM consumers and downstream tools consuming the JSON/YAML output never see diagnostics — the signal is lost at the point where it's most valuable
- Diagnostic output is ephemeral; spec output is the durable artifact that gets stored, versioned, and consumed across workflows
- The open `$extensions` slot exists precisely for this kind of producer-attached metadata — zero schema cost for significant consumer value

---

## Decision

### Type changes (`types/`)

**None.** Per ADR-044's open-passthrough policy, `AnatomyElement.$extensions` is typed as `Record<string, unknown>` and the schema declares only `additionalProperties: true`. The `matchMethod` signal is a producer convention written inside the existing open slot — no `specs-schema` change is required.

### Schema changes (`schema/`)

**None.** Same rationale as above.

### `specs-from-figma` producer convention

When `specs-from-figma` runs ADR-044's disambiguation, it writes — at the point where the heuristic chain resolves each element's identity — a `matchMethod` key under `$extensions["com.figma"]`. The value vocabulary is:

```yaml
matchMethod values (ordered by confidence, highest first):
  'unique'            # Check 1 — name was already unique, no disambiguation needed
  'layer-type'        # Check 2 — name + Figma node type narrowed to unique identity
  'ancestry'          # Check 3 — ancestor path distinguished this element from others
  'anchor-adjacent'   # Check 4 — proximity to a unique-named sibling resolved identity
  'sibling-index'     # Check 5 — positional index among same-name+type siblings (lowest confidence)
```

This vocabulary is owned by `specs-from-figma`. Consumer packages (`specs-cli`, `specs-plugin-2`, LLM consumers reading the output) read it against `specs-from-figma`'s documented contract, not against `specs-schema`.

**Illustrative output shape** (note: schema does not enforce this inner structure):
```yaml
$extensions:
  com.figma:
    originalName?: <string>      # ADR-044 convention
    matchMethod?: <one of the five strings above>
```

### Presence rules (producer-side)

`matchMethod` is emitted on **every** anatomy element when the component contains at least one duplicate name group. When a component has no duplicates, `$extensions` is omitted entirely (no noise for the common case).

When present, the value distribution conveys the component's matching quality at a glance:
- All `'unique'` → no disambiguation was needed (duplicates existed elsewhere in the component, but not for this element)
- `'layer-type'` or `'ancestry'` → high confidence, structural signals resolved identity
- `'anchor-adjacent'` → medium confidence, sibling context was used
- `'sibling-index'` → low confidence, positional fallback was the only option

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

- **`matchMethod` extends, not replaces, `originalName`**: The two keys serve different purposes. `originalName` enables round-trip traceability (what was the Figma name?). `matchMethod` enables confidence assessment (which heuristic resolved cross-variant identity?). Both live under `com.figma` because both are Figma-processing provenance — both are producer conventions, not schema fields.
- **Values map 1:1 to ADR-044's heuristic chain**: `unique` = Check 1, `layer-type` = Check 2, `ancestry` = Check 3, `anchor-adjacent` = Check 4, `sibling-index` = Check 5. The ordering is implicit in the vocabulary — earlier values are higher confidence.
- **Values are lowercase kebab-case**, consistent with the `FigmaPropExtension` source kind values (`variant`, `codeOnlyProp`). They are intentionally not `SCREAMING_CASE` — the constitution's screaming-case rule applies to "string literal union types used as enum values in `Styles` and its child types," and in any case does not bind producer-convention values that live outside the schema.
- **The producer-convention pattern is the precedent**: Processing steps that want to surface method signals write them as documented keys under the relevant `$extensions["com.figma"]` slot — no schema work required. Future candidates include `com.figma.inferenceSource` for prop type derivation, `com.figma.detectionMethod` for element type classification, etc.
- **Consumer guidance for LLMs**: An LLM consuming spec output can use `matchMethod` directly in its reasoning chain. Suggested prompt pattern: "Elements with `matchMethod: 'sibling-index'` have the weakest cross-variant identity — their diffs may reflect positional instability rather than true design changes. Prefer trusting `'unique'`, `'layer-type'`, and `'ancestry'` elements when generating variant-conditional code."

---

## Type ↔ Schema Impact

- **None.** No type or schema changes in `specs-schema`. The signal lives entirely inside the open `$extensions` slot defined by ADR-044.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-schema` | **None** — no type or schema change | None |
| `specs-from-figma` | **Medium** — Must emit `matchMethod` under `$extensions["com.figma"]` during Phase 2 of ADR-044's disambiguation. The check level is already known at resolution time — this is surfacing existing information, not computing new information. Vocabulary documented in `specs-from-figma` README / docs | Record which check resolved each element during the heuristic chain and emit the corresponding string |
| `specs-cli` | **Low** — May optionally surface `matchMethod` in diagnostic output. No recompile required (open-shape `$extensions` already in `0.22.0`) | Optional |
| `specs-plugin-2` | **Low** — May optionally highlight low-confidence elements in the UI | Optional |

### Implementation sequencing

This ADR is **purely a producer-side commitment**. It can ship independently of any `specs-schema` release once ADR-044's open `$extensions` slot is available (`specs-schema@0.22.0`).

Recommended approach:
1. **`specs-schema`**: Already complete via ADR-044 (open-shape `$extensions` shipped in `0.22.0`).
2. **`specs-from-figma`**: During ADR-044's Phase 2 (heuristic chain), record the resolving check level and write it as `$extensions["com.figma"].matchMethod`. Document the vocabulary in package README / API docs.
3. **Testing**: Extend `specs-from-figma`'s test cases to assert `matchMethod` values alongside disambiguated keys.

---

## Semver Decision

**`specs-schema` version bump**: None — no schema change.

**`specs-from-figma` version bump**: MINOR (new producer-emitted metadata key in spec output). Owned by the `specs-from-figma` release process; not governed by `specs-schema`'s constitution.

---

## Consequences

- Spec output becomes **self-documenting** for disambiguation confidence — consumers can assess element key reliability without re-running the algorithm or inspecting the source Figma file
- LLM consumers gain a structured signal for reasoning about variant diff trustworthiness
- Diagnostic tools (plugin UI, CLI) can surface warnings specifically for `'sibling-index'` elements, directing designer review to the cases most likely to mismatch
- The `$extensions["com.figma"]` slot on `AnatomyElement` now carries both traceability (`originalName`) and confidence (`matchMethod`) — a complete provenance record for disambiguation
- **The five-value vocabulary is inherently ordered**: consumers can treat it as a confidence scale without external documentation — earlier values in the chain = higher confidence
- **Producer-convention precedent established**: Processing steps that resolve ambiguity embed their method signal in the output by writing documented keys under `$extensions["com.figma"]`. No schema work required for future provenance signals.
- **Trade-off accepted**: No schema-level validation. A consumer reading `matchMethod` trusts the `specs-from-figma` contract. Mitigation: the vocabulary is small, stable, and documented in producer docs and this ADR
- When a component has no duplicate names, zero overhead — no `$extensions`, no `matchMethod`, identical output to pre-ADR behavior
