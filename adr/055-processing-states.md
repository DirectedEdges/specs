# ADR 055: Variant State Classification via `processing.states`

**Branch**: `055-processing-states`
**Created**: 2026-06-05
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`specs-schema` defines `Config.processing` as the block of library-structural facts that govern how Figma data is read and processed. It already captures subcomponent scoping, variant depth, glyph naming patterns, and instance example detection.

Figma variant props come in two semantically distinct categories that no current schema field distinguishes:

- **Browser-driven states** — props like `state` (values: `hover`, `pressed`) and `focused` that map directly to CSS pseudo-classes (`:hover`, `:active`, `:focus-within`). The browser controls these; no consumer ever passes `state="hover"` as a component prop.
- **Consumer-controlled states** — props like `disabled`, `readOnly`, and `validation` that the consuming application sets. These map to HTML attributes (`[readonly]`) or ARIA attributes (`[aria-disabled="true"]`, `[aria-invalid="true"]`) that the component implementation must bridge.

Without a schema-level classification, every downstream consumer must independently heuristic-guess which props fall into which category. This produces inconsistent results — the `css` transformer might emit `[data-state="hover"]` while a contract generator includes a `state` prop that no consumer should ever set. The classification is a fact about the library's design language and belongs in `processing` alongside other such structural facts.

ADR 053 established `config.transformers` for per-transformer invocation options. That namespace was considered for `states` but is intentionally scoped to the `specs transform` command and is not consumed by `specs-from-figma` or `specs-plugin-2`. Because the `states` classification is useful to the plugin (UI surfaces, annotation of generated output) and any future emitter, it must live in a config block that all consumers read — `processing`.

---

## Decision Drivers

- **Additive only**: changes must not break existing configs or downstream consumers — MINOR bump, no MAJOR
- **Types and schema in sync**: every new type field must have a schema counterpart and vice versa
- **No runtime logic in this package**: only type declarations and `DEFAULT_CONFIG`
- **Multi-consumer applicability**: the classification must be readable by `specs-cli`, `specs-from-figma`, and `specs-plugin-2` without special-casing
- **Deterministic, not heuristic**: downstream consumers must not guess — the config is the sole authority

---

## Options Considered

### Option A: `config.processing.states` *(Selected)*

Add `states?: VariantStateEntry[]` to `Config.processing`. Each entry names a variant prop, maps its values to CSS selector strings (or `null` for the default/base state), and declares whether the prop should be retained in generated contracts.

**Pros**:
- `processing` is already the home for library-structural facts read by all consumers including the plugin
- Absence of a `states` entry for a prop is a clear, safe default: treat as a `data-*` attribute, retain in contract
- The classification is a fact about the library's design language — not about any specific output format — so it fits `processing` semantically
- Opens the door for `specs generate` to annotate `api.yaml` with semantic role in a future ADR

**Cons / Trade-offs**:
- `processing` currently contains only generate-time configuration; `states` does not influence `specs generate` today (only `specs transform`). This is a mild conceptual stretch, resolved by the forward-looking annotation opportunity above.

---

### Option B: `config.transform.states` *(Rejected)*

Place `states` inside the `transform` block established by ADR 053.

**Rejected because**: `config.transform` is consumed only by `specs-cli`'s `transform` command. It is not read by `specs-from-figma` or `specs-plugin-2`. A classification needed by the plugin cannot live here.

---

### Option C: Top-level `config.states` *(Rejected)*

Add `states` as a new peer of `processing`, `format`, and `include`.

**Rejected because**: introduces a fourth top-level key with no structural precedent in the existing config model. The classification is a structural fact about how the library uses variant props, placing it correctly within `processing`'s existing role.

---

## Decision

### New type

| File | Change | Bump |
|------|--------|------|
| `types/Config.ts` | Add exported interface `VariantStateEntry` | MINOR |
| `types/Config.ts` | Add optional field `states?: VariantStateEntry[]` to `Config.processing` | MINOR |
| `types/Config.ts` | Add optional field `states?: VariantStateEntry[]` to `ResolvedConfig.processing` | MINOR |
| `types/index.ts` | Export `VariantStateEntry` | MINOR |

**New type** (`types/Config.ts`):

```typescript
/**
 * Classifies a Figma variant prop as a semantic state for use by transformers and plugin output.
 *
 * Each entry names one variant prop, maps its values to CSS selector suffixes (or null for the
 * base/default state), and declares whether the prop is consumer-controlled (keep in contracts)
 * or browser-driven (omit from contracts).
 *
 * @since 0.25.0
 */
export interface VariantStateEntry {
  /** Figma variant prop name (e.g. `state`, `disabled`, `focused`). */
  prop: string;
  /**
   * Maps each prop value (as string) to its CSS selector suffix.
   * - `null` — this value is the base/default state; skip variant output entirely.
   * - `string` — CSS selector suffix to append to the root selector (e.g. `":hover"`,
   *   `':disabled, [aria-disabled="true"]'`). Comma-separated values expand into
   *   multiple parallel rules.
   */
  values: Record<string, string | null>;
  /**
   * Contract generation behavior for this prop.
   * - `'omit'` — browser-driven state; exclude this prop from generated Props interfaces.
   * - `'keep'` — consumer-controlled state; retain this prop in generated Props interfaces.
   * Defaults to `'keep'` when absent.
   *
   * @since 0.25.0
   */
  contract?: 'omit' | 'keep';
}
```

**`Config.processing` before / after**:

```typescript
// Before
processing: {
  subcomponents?: { ... };
  glyphNamePattern?: string;
  codeOnlyPropsPattern?: string;
  slotConstraints?: boolean;
  variantDepth?: 1 | 2 | 3 | 9999;
  details?: 'FULL' | 'LAYERED';
  inferNumberProps?: boolean;
  instanceExamples?: { ... };
}

// After
processing: {
  subcomponents?: { ... };
  glyphNamePattern?: string;
  codeOnlyPropsPattern?: string;
  slotConstraints?: boolean;
  variantDepth?: 1 | 2 | 3 | 9999;
  details?: 'FULL' | 'LAYERED';
  inferNumberProps?: boolean;
  instanceExamples?: { ... };
  /** Semantic classification of Figma variant props as browser-driven or consumer-controlled states. Optional; absence means all variant props emit as data-* attribute selectors. @since 0.25.0 */
  states?: VariantStateEntry[];
}
```

`ResolvedConfig.processing` gains the same optional `states?: VariantStateEntry[]` field. It remains optional in `ResolvedConfig` because absence is a meaningful default (no state classification — all props are data attributes).

`DEFAULT_CONFIG` requires no change — absence of `states` in `processing` is the correct default.

**Config example** (`specs.config.yaml`):

```yaml
config:
  processing:
    states:
      - prop: state
        contract: omit       # browser-driven — :hover/:active are not consumer props
        values:
          rest: null
          default: null
          hover: ":hover"
          active: ":active"
          pressed: ":active"
      - prop: disabled
        contract: keep       # consumer sets this; component bridges to :disabled / aria-disabled
        values:
          "true": ':disabled, [aria-disabled="true"]'
      - prop: focused
        contract: omit       # browser-driven — :focus-within fires without a prop
        values:
          "true": ":focus-within"
      - prop: readOnly
        contract: keep       # consumer sets this; component bridges to [readonly] / aria-readonly
        values:
          "true": "[readonly], [aria-readonly=\"true\"]"
      - prop: validation
        contract: keep       # consumer controls validation state
        values:
          invalid: "[aria-invalid=\"true\"]"
      - prop: expanded
        contract: keep       # consumer controls open/closed
        values:
          "true": "[aria-expanded=\"true\"]"
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/component.schema.json` | Add `VariantStateEntry` definition | MINOR |
| `schema/component.schema.json` | Add `states` property to `#/definitions/Config/properties/processing` | MINOR |

**New definition** (`#/definitions/VariantStateEntry`):

```json
"VariantStateEntry": {
  "type": "object",
  "description": "Classifies a Figma variant prop as a semantic state for use by transformers and plugin output.",
  "properties": {
    "prop": {
      "type": "string",
      "description": "Figma variant prop name (e.g. 'state', 'disabled', 'focused')."
    },
    "values": {
      "type": "object",
      "description": "Maps each prop value to a CSS selector suffix (string) or null for the base/default state.",
      "additionalProperties": {
        "oneOf": [
          { "type": "string" },
          { "type": "null" }
        ]
      }
    },
    "contract": {
      "type": "string",
      "enum": ["omit", "keep"],
      "description": "Whether to retain this prop in generated contracts. 'omit' = browser-driven (exclude). 'keep' = consumer-controlled (include). Defaults to 'keep' when absent."
    }
  },
  "required": ["prop", "values"],
  "additionalProperties": false
}
```

**Addition to `#/definitions/Config/properties/processing/properties`**:

```json
"states": {
  "type": "array",
  "items": { "$ref": "#/definitions/VariantStateEntry" },
  "description": "Semantic classification of Figma variant props as browser-driven or consumer-controlled states. Absence means all variant props emit as data-* attribute selectors."
}
```

### Notes

- `states` is optional in both `Config` and `ResolvedConfig`. Absence is a safe, backward-compatible default: all variant configuration props produce `data-*` attribute selectors and all props are retained in contracts. No existing config breaks.
- `contract` defaults to `'keep'` when absent. Consumers must not omit a prop from contract output unless `contract: 'omit'` is explicitly declared — no guessing.
- `values` keys are strings even for boolean Figma props (`"true"`, `"false"`) because all Figma variant prop values are serialized as strings in `variants.yaml`.
- Comma-separated selector strings (e.g. `':disabled, [aria-disabled="true"]'`) expand into multiple parallel CSS rules. This expansion logic lives in the consuming transformer, not this package.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `VariantStateEntry` → `#/definitions/VariantStateEntry` (object, `prop` + `values` required, `contract` optional enum, no additional properties)
  - `Config.processing.states` → `#/definitions/Config/properties/processing/properties/states` (array of `$ref: VariantStateEntry`)
  - `ResolvedConfig.processing.states` — same optional array; no separate schema definition needed (shares `VariantStateEntry`)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Reads `processing.states` in transformer context to determine CSS selector strategy (`css` transformer) and prop omission (`contract` transformer) | Read `config.processing.states` from `TransformerContext`; apply selector and contract logic per entry |
| `specs-from-figma` | None — does not read `processing.states` today | Recompile against updated `Config` / `ResolvedConfig` types |
| `specs-plugin-2` | May read `processing.states` to annotate plugin UI or generated output | Recompile; optionally consume `processing.states` for UI classification |

---

## Semver Decision

**Version bump**: `0.24.0 → 0.25.0` (`MINOR`)

**Justification**: All changes are additive — one new optional field on `Config.processing` and `ResolvedConfig.processing`, one new exported interface. No existing fields removed, renamed, or narrowed. Per constitution III: "MINOR for additive types or new optional fields."

---

## Consequences

- Every downstream consumer can deterministically classify any variant prop as browser-driven or consumer-controlled by reading `processing.states` — no heuristics required
- The `css` transformer reads `processing.states` to choose between CSS pseudo-class/ARIA selectors and `data-*` attribute selectors per prop
- The `contract` transformer reads `processing.states` to decide which props to include or omit from generated Props interfaces
- `specs-plugin-2` gains a typed, config-driven hook for classifying variant props in its UI without coupling to CLI transformer logic
- Absence of `states` in any existing config is safe — behavior is unchanged (all `data-*` selectors, all props retained in contracts)
- A future ADR can use `processing.states` to annotate `api.yaml` during `specs generate`, making the classification part of the spec itself rather than a post-processing concern
