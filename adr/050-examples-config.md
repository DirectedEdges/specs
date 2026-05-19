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
- **`processing.instanceExamples` mirrors `processing.subcomponents`** — same discovery model (scope, match, exclude); same author vocabulary; consistent across transformer configuration
- **No `processing.slotContentExamples`** — slot content is detected structurally; pattern-based config adds no value and no author burden should exist for a purely structural signal

---

## Options Considered

### Option A: Separate `include` flags + `processing.instanceExamples` mirroring subcomponents *(Selected)*

Add `include.slotContentExamples?: boolean` and `include.instanceExamples?: boolean`, each defaulting to `false`. Add `processing.instanceExamples?` with the same `{ scope?, match, exclude? }` shape as `processing.subcomponents`.

```yaml
# Config — examples configuration
processing:
  instanceExamples:
    scope: PAGE
    match:
      - "{C} / Examples / *"
      - "{C} Example *"
    exclude:
      - "* / Deprecated / *"

include:
  slotContentExamples: true
  instanceExamples: true
```

`scope` values parallel subcomponents:
- `NESTED` — search within the component frame only (e.g., embedded example layers inside the component definition)
- `PAGE` — search the Figma page for frames matching the pattern (default; typical placement for example frames)

**Pros**:
- Each example type is independently toggleable — a team can include slot fill examples without exposing instance examples
- `processing.instanceExamples` is learnable by analogy with `processing.subcomponents`; authors already familiar with match/exclude patterns need no new vocabulary
- Absence of `processing.instanceExamples` means no instance example detection — same opt-in model as subcomponents
- No `processing.slotContentExamples` block keeps the config surface minimal where structural detection suffices

**Cons / Trade-offs**:
- Two separate `include` flags must both be set for teams that want all example types; there is no single "include all examples" shortcut — this is intentional (independent control) but adds a line to the config

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
| `Config.ts` | Add `processing.instanceExamples?: { scope?, match, exclude? }` | MINOR |
| `Config.ts` | Add `include.slotContentExamples: boolean`, `include.instanceExamples: boolean` to `ResolvedConfig` | MINOR |
| `Config.ts` | Add `processing.instanceExamples?: { scope, match, exclude? }` (scope required in resolved) to `ResolvedConfig` | MINOR |
| `Config.ts` | Add `slotContentExamples: false`, `instanceExamples: false` to `DEFAULT_CONFIG.include` | MINOR |

**`Config` additions** (`types/Config.ts`):

```ts
// processing block — new optional field
instanceExamples?: {
  /** Where to search for instance example frames. NESTED = within the component frame; PAGE = search the Figma page (default). */
  scope?: 'NESTED' | 'PAGE';
  /** Name patterns identifying instance example frames. Uses {C} (component name) placeholder. */
  match: string[];
  /** Name patterns for frames to exclude. Same {C} syntax as match. */
  exclude?: string[];
};

// include block — two new optional flags
/** Include slot content examples in output. Optional; defaults to false. @since 0.25.0 */
slotContentExamples?: boolean;
/** Include instance examples in output. Optional; defaults to false. @since 0.25.0 */
instanceExamples?: boolean;
```

**`ResolvedConfig` additions** (`types/Config.ts`):

```ts
// processing block — scope is required (defaults to PAGE)
instanceExamples?: {
  scope: 'NESTED' | 'PAGE';
  match: string[];
  exclude?: string[];
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
  description: "Instance example detection settings: scope, match patterns, exclusion patterns. Absence means no instance example detection."
  required: [match]
  properties:
    scope:
      type: string
      enum: [NESTED, PAGE]
      description: "Where to search for instance example frames. NESTED = within the component frame; PAGE = search the Figma page."
    match:
      type: array
      items: { type: string }
      description: "Name patterns identifying instance example frames. Uses {C} placeholder."
    exclude:
      type: array
      items: { type: string }
      description: "Name patterns for frames to exclude. Same {C} syntax as match."
  additionalProperties: false
```

### Out of scope for this ADR

- **Transformer detection logic** for instance examples — belongs in `specs-from-figma`; this ADR defines the config shape only
- **`processing.slotContentExamples`** — structural detection requires no config; if naming-pattern detection is added in a future ADR, a `processing.slotContentExamples` block would follow the same model

### Notes

- **`processing.instanceExamples` absence = no detection.** When the block is omitted from `Config`, the transformer performs no instance example detection and `instanceExamples` is never emitted regardless of `include.instanceExamples`. This matches the `processing.subcomponents` model.
- **`include.*` flags are independent.** A team may set `include.slotContentExamples: true` while leaving `include.instanceExamples: false` — slot fills appear in output, instance examples do not.
- **`scope` defaults to `PAGE` in `ResolvedConfig`.** Instance example frames are typically placed on the Figma page adjacent to the component definition, not nested inside the component frame. `PAGE` is the expected common case; `NESTED` supports embedded example frames for teams that structure their files that way.
- **`DEFAULT_CONFIG` carries both new `include` flags.** Any consumer that merges a partial `Config` against `DEFAULT_CONFIG` to produce a `ResolvedConfig` will correctly resolve both flags to `false` without special-casing.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `Config.include.slotContentExamples?: boolean` ↔ `#/definitions/IncludeConfig/properties/slotContentExamples`
  - `Config.include.instanceExamples?: boolean` ↔ `#/definitions/IncludeConfig/properties/instanceExamples`
  - `Config.processing.instanceExamples?: { scope?, match, exclude? }` ↔ `#/definitions/ProcessingConfig/properties/instanceExamples`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must read `processing.instanceExamples` to detect example frames; must gate `slotContentExamples` and `instanceExamples` output on their respective `include` flags | Implement detection and gating |
| `specs-cli` | Recompile; config surface expands | Recompile; update any config docs or help text |
| `specs-plugin-2` | Recompile; users can enable example output via plugin config | Recompile; expose new flags in plugin UI when ready |

---

## Semver Decision

**Version bump**: `0.24.0 → 0.25.0` (`MINOR`)

**Justification**: Adds optional fields to `Config`, `ResolvedConfig`, and `DEFAULT_CONFIG`; adds schema entries in `IncludeConfig` and `ProcessingConfig`. Purely additive — no existing field is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `include.slotContentExamples` and `include.instanceExamples` give teams independent control over which example types appear in output; both default to `false` to preserve existing output for unannotated components
- `processing.instanceExamples` follows the `processing.subcomponents` model exactly — same scope/match/exclude shape, same opt-in absence semantics, same authoring vocabulary
- Slot content examples require no processing config; their detection is structural and their output is gated solely by `include.slotContentExamples`
- `DEFAULT_CONFIG` is the single source of truth for both new defaults; `ResolvedConfig` guarantees both flags are present after merging
