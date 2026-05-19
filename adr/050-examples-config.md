# ADR: Examples Configuration

**Branch**: `042-composition-type`
**Created**: 2026-05-19
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-047 — Component Slot Examples](047-component-slot-examples), [ADR-048 — Component Instance Examples](048-component-instance-examples)

---

## Context

ADR-047 and ADR-048 establish `Component.slotContentExamples` and `Component.instanceExamples` as the two example registries on a component. Neither ADR specifies how the transformer discovers or gates these fields — that is a `Config` concern.

Two configuration needs arise:

1. **Output gating** — Both example types are new, opt-in capabilities. A `Config.include` flag for each type gates whether the detected data is emitted. Defaulting to `false` avoids breaking existing output for components that have not yet been annotated.

2. **Instance example detection** — `instanceExamples` are named frames in the Figma file that demonstrate a pre-configured whole-component usage. The transformer needs naming patterns to identify which frames are instance examples and where to search for them. This mirrors the model established by `processing.subcomponents` (ADR-031).

   Slot content examples require no separate detection config: `slotContentExamples` entries are derived structurally from slot layers that have content placed inside them in the Figma design file. The transformer can detect them without author-supplied naming patterns.

---

## Decision Drivers

- **Additive-only** — all new fields are optional; no existing field changes → MINOR semver
- **Type ↔ schema symmetry** — Constitution §I
- **No runtime logic** — type declarations and schema only; transformer logic belongs in `specs-from-figma` (Constitution §II)
- **Include flags default to false** — new capabilities should not alter existing output without opt-in
- **`processing.instanceExamples` adapts `processing.subcomponents`** — same match/exclude vocabulary; `scope` is retained but with different values (`PAGE` | `FILE`) because instance example frames are never nested inside a component frame
- **`scope: NESTED` is inapplicable** — component instances used as examples cannot live inside the component frame itself; the only meaningful search boundaries are the current page or the full file
- **`scope: FILE` supports multi-page files** — some teams place example frames on a dedicated page (e.g., "Examples") separate from the component library page; `FILE` enables cross-page discovery
- **`parent?: string[]` narrows the search space** — example frames are often grouped inside a named parent section or frame (e.g., a frame named `"Examples"`) to distinguish them from test cases, component playground instances, or deeply nested usages; `parent` filters candidates by immediate ancestor name
- **No `processing.slotContentExamples`** — slot content is detected structurally; pattern-based config adds no value and no author burden should exist for a purely structural signal

---

## Options Considered

### Option A: Separate `include` flags + `processing.instanceExamples` with scope, match, exclude, parent *(Selected)*

Add `include.slotContentExamples?: boolean` and `include.instanceExamples?: boolean`, each defaulting to `false`. Add `processing.instanceExamples?` with `{ scope?, match, exclude?, parent? }`.

```yaml
# Config — examples on a dedicated page, inside an "Examples" parent frame
processing:
  instanceExamples:
    scope: FILE
    parent:
      - Examples
    match:
      - "{C} / *"
    exclude:
      - "* / Deprecated / *"

include:
  slotContentExamples: true
  instanceExamples: true
```

```yaml
# Config — examples on the same page as the component, no parent filter
processing:
  instanceExamples:
    scope: PAGE
    match:
      - "{C} – *"
      - "{C} Example *"
```

`scope` values:
- `PAGE` — search the current Figma page only (default; typical when examples live alongside components)
- `FILE` — search all pages in the Figma file (for teams that place examples on a separate page)

`parent` (optional) — one or more ancestor frame or section names that a candidate must be contained within. Matching is against immediate ancestors in the layer hierarchy; absence means no parent filtering. Useful for distinguishing example instances from test cases, playground frames, or component-library usages of the same component.

**Pros**:
- Each example type is independently toggleable — a team can include slot fill examples without exposing instance examples
- `scope: PAGE | FILE` covers all real Figma file organisations; `NESTED` is explicitly excluded because component instance examples cannot live inside the component frame
- `parent` solves the false-positive problem without requiring artificially unique name patterns; a frame named `"Examples"` is a natural Figma authoring convention
- Absence of `processing.instanceExamples` means no instance example detection — same opt-in model as `processing.subcomponents`
- No `processing.slotContentExamples` block keeps the config surface minimal where structural detection suffices

**Cons / Trade-offs**:
- Two separate `include` flags must both be set for teams that want all example types — intentional (independent control) but adds a line to the config
- `parent` matches ancestor names, not full paths; teams with multiple frames named `"Examples"` at different hierarchy levels would need `match`/`exclude` patterns to disambiguate further

---

### Option B: Single `include.examples` flag *(Rejected)*

Replace both flags with a single `include.examples?: boolean` that gates all example output.

**Rejected because**: The two example types serve different audiences. `slotContentExamples` is consumed by Figma tooling and slot-rendering contexts; `instanceExamples` is consumed by documentation renderers and cataloguing tooling. Teams that are ready to publish slot fill examples may not have annotated instance example frames yet. A single flag forces all-or-nothing and cannot model partial readiness.

---

### Option C: `processing.instanceExamples` as a boolean *(Rejected)*

Gate instance example detection with a `processing.instanceExamples?: boolean` instead of the match/exclude block.

**Rejected because**: A boolean provides no way to specify which Figma frames are instance examples. Instance frames are identified by name; without naming patterns the transformer must either guess (fragile) or detect all frames on the page (noisy). The match/exclude block gives authors control over exactly which frames are harvested, consistent with `processing.subcomponents`.

---

### Option D: Add `processing.slotContentExamples` alongside `processing.instanceExamples` *(Rejected)*

Mirror the full subcomponents shape for both example types.

**Rejected because**: Slot content examples are derived from structural Figma data — content placed inside a slot layer. There is no naming convention to configure; detection is entirely structural. Adding a `processing.slotContentExamples` block would be an empty config object with no fields to set, adding author surface area for nothing.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Config.ts` | Add `include.slotContentExamples?: boolean`, `include.instanceExamples?: boolean` | MINOR |
| `Config.ts` | Add `processing.instanceExamples?: { scope?, match, exclude?, parent? }` | MINOR |
| `Config.ts` | Add `include.slotContentExamples: boolean`, `include.instanceExamples: boolean` to `ResolvedConfig` | MINOR |
| `Config.ts` | Add `processing.instanceExamples?: { scope, match, exclude?, parent? }` (scope required in resolved) to `ResolvedConfig` | MINOR |
| `Config.ts` | Add `slotContentExamples: false`, `instanceExamples: false` to `DEFAULT_CONFIG.include` | MINOR |

**`Config` additions** (`types/Config.ts`):

```ts
// processing block — new optional field
instanceExamples?: {
  /** Search boundary. PAGE = current page only (default); FILE = all pages in the file. */
  scope?: 'PAGE' | 'FILE';
  /** Name patterns identifying instance example frames. Uses {C} (component name) placeholder. */
  match: string[];
  /** Name patterns for frames to exclude. Same {C} syntax as match. */
  exclude?: string[];
  /** Ancestor frame or section names a candidate must be contained within. Absence = no parent filtering. */
  parent?: string[];
};

// include block — two new optional flags
/** Include slot content examples in output. Optional; defaults to false. @since 0.21.0 */
slotContentExamples?: boolean;
/** Include instance examples in output. Optional; defaults to false. @since 0.21.0 */
instanceExamples?: boolean;
```

**`ResolvedConfig` additions** (`types/Config.ts`):

```ts
// processing block — scope is required (defaults to PAGE)
instanceExamples?: {
  scope: 'PAGE' | 'FILE';
  match: string[];
  exclude?: string[];
  parent?: string[];
};

// include block — both flags required (resolved from defaults)
slotContentExamples: boolean;
instanceExamples: boolean;
```

**`DEFAULT_CONFIG` additions** (`types/Config.ts`):

```ts
include: {
  // existing fields unchanged
  invalidVariants: false,
  invalidCombinations: true,
  emptyVariants: false,
  // new
  slotContentExamples: false,
  instanceExamples: false,
},
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `slotContentExamples`, `instanceExamples` to `#/definitions/IncludeConfig` | MINOR |
| `component.schema.json` | Add `instanceExamples` to `#/definitions/ProcessingConfig` | MINOR |

**`IncludeConfig` additions**:

```yaml
slotContentExamples:
  type: boolean
  description: "Include slot content examples in output. Defaults to false."
instanceExamples:
  type: boolean
  description: "Include instance examples in output. Defaults to false."
```

**`ProcessingConfig` addition**:

```yaml
instanceExamples:
  type: object
  description: "Instance example detection settings. Absence means no instance example detection."
  required: [match]
  properties:
    scope:
      type: string
      enum: [PAGE, FILE]
      description: "Search boundary. PAGE = current Figma page only (default); FILE = all pages in the file."
    match:
      type: array
      items: { type: string }
      description: "Name patterns identifying instance example frames. Uses {C} placeholder."
    exclude:
      type: array
      items: { type: string }
      description: "Name patterns for frames to exclude. Same {C} syntax as match."
    parent:
      type: array
      items: { type: string }
      description: "Ancestor frame or section names a candidate must be contained within. Absence = no parent filtering."
  additionalProperties: false
```

### Out of scope for this ADR

- **Transformer detection logic** for instance examples — belongs in `specs-from-figma`; this ADR defines the config shape only
- **`processing.slotContentExamples`** — structural detection requires no config; if naming-pattern detection is added in a future ADR, a `processing.slotContentExamples` block would follow the same model

### Notes

- **`processing.instanceExamples` absence = no detection.** When the block is omitted from `Config`, the transformer performs no instance example detection and `instanceExamples` is never emitted regardless of `include.instanceExamples`. This matches the `processing.subcomponents` model.
- **`include.*` flags are independent.** A team may set `include.slotContentExamples: true` while leaving `include.instanceExamples: false` — slot fills appear in output, instance examples do not.
- **`scope` defaults to `PAGE` in `ResolvedConfig`.** Most teams place example frames on the same page as the component library. `FILE` is opt-in for teams with a dedicated examples page. `NESTED` is intentionally absent — component instances used as examples cannot live inside the component frame itself.
- **`parent` is an ancestor filter, not a full path.** The transformer checks whether any ancestor frame or section in the layer hierarchy matches one of the listed names. This is sufficient for the common convention of grouping examples inside a frame named `"Examples"` and avoids requiring authors to express full paths.
- **`DEFAULT_CONFIG` carries both new `include` flags.** Any consumer that merges a partial `Config` against `DEFAULT_CONFIG` to produce a `ResolvedConfig` will correctly resolve both flags to `false` without special-casing.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `Config.include.slotContentExamples?: boolean` ↔ `#/definitions/IncludeConfig/properties/slotContentExamples`
  - `Config.include.instanceExamples?: boolean` ↔ `#/definitions/IncludeConfig/properties/instanceExamples`
  - `Config.processing.instanceExamples?: { scope?, match, exclude?, parent? }` ↔ `#/definitions/ProcessingConfig/properties/instanceExamples`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must read `processing.instanceExamples` to detect example frames; must gate `slotContentExamples` and `instanceExamples` output on their respective `include` flags | Implement detection and gating |
| `specs-cli` | Recompile; config surface expands | Recompile; update any config docs or help text |
| `specs-plugin-2` | Recompile; users can enable example output via plugin config | Recompile; expose new flags in plugin UI when ready |

---

## Semver Decision

**Version bump**: `0.20.0 → 0.21.0` (`MINOR`)

**Justification**: Adds optional fields to `Config`, `ResolvedConfig`, and `DEFAULT_CONFIG`; adds schema entries in `IncludeConfig` and `ProcessingConfig`. Purely additive — no existing field is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `include.slotContentExamples` and `include.instanceExamples` give teams independent control over which example types appear in output; both default to `false` to preserve existing output for unannotated components
- `processing.instanceExamples` adapts the `processing.subcomponents` model — same match/exclude vocabulary and opt-in absence semantics; `scope` uses `PAGE | FILE` (not `NESTED`, which is inapplicable to instances); `parent` is added to narrow the search space by ancestor frame or section name
- Slot content examples require no processing config; their detection is structural and their output is gated solely by `include.slotContentExamples`
- `DEFAULT_CONFIG` is the single source of truth for both new defaults; `ResolvedConfig` guarantees both flags are present after merging
