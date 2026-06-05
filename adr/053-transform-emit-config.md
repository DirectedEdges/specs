# ADR 053: Transform Emit Configuration

**Branch**: `053-transform-emit-config`
**Created**: 2026-06-05
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*
**RFC**: [RFC 001: Component Dictionary](../rfc/001-component-dictionary/README.md)

---

## Context

`specs-cli` currently produces a single artifact per component: a validated YAML contract (`{component}.yaml`). RFC 001 proposes a deterministic emitter registry that projects each contract into ~16 purpose-built files — the Component Dictionary. This requires a new `specs transform` command and a corresponding configuration block so teams can control which emitters run and how.

The existing `Config` type (`types/Config.ts`) covers processing, format, and include settings — all of which describe how a component was ingested. The emitter selection and emitter-specific options are a distinct concern: they describe what to produce from an already-validated contract, not how to ingest it.

This ADR adds:
- A new `EmitPreset` string literal union (built-in selection presets)
- A new `EmitGroup` string literal union (named emitter groups from RFC 001)
- A new `EmitConfig` interface (preset, include, exclude, per-emitter options)
- An optional `emit` field on `Config` and a required `emit` field on `ResolvedConfig`

The `emit` block lives on `Config` (not as a separate top-level type) so that per-component overrides use the same type as workspace-level configuration — consistent with how `processing`, `format`, and `include` already work.

---

## Decision Drivers

- **Additive only**: changes must not break existing consumers of `Config` or `ResolvedConfig`; `emit` must be optional on `Config`
- **Type ↔ schema symmetry**: every new type has a corresponding JSON schema definition (Constitution I)
- **No logic**: types and schema only — no emitter discovery, resolution, or registration logic (Constitution II)
- **Minimal surface**: only the shared vocabulary (preset names, group names, config shape) belongs here; emitter-specific option shapes are caller-opaque for v1 (Constitution III)
- **Naming — no abbreviations**: `EmitConfig`, `EmitPreset`, `EmitGroup` use full terms; `emit` as a field name is the established verb in this domain (Constitution, naming rule)
- **Extensibility**: `include` and `exclude` accept `string[]` so custom emitter names (not yet in any group enum) work without a schema bump

---

## Options Considered

### Option A: Add `emit` to the existing `Config` interface *(Selected)*

Add `emit?: EmitConfig` as an optional block on `Config` alongside `processing`, `format`, and `include`. `EmitConfig`, `EmitPreset`, and `EmitGroup` are new exported types.

**Pros**:
- Single config type; workspace and per-component emit overrides use the same shape
- Consistent with existing `Config` block structure — consumers already know how to merge/resolve `Config`
- `emit` on a component's contract YAML is valid and meaningful (per-component emitter override)
- Additive only → MINOR bump

**Cons / Trade-offs**:
- `Config` grows a fourth top-level block; callers that don't use `transform` carry a slightly larger type
- Per-emitter `options` are typed as `Record<string, Record<string, unknown>>` in v1 — individual emitter option shapes are not yet validated by the schema

---

### Option B: New standalone `EmitConfig` type, not on `Config` *(Rejected)*

Export `EmitConfig` as a first-class type unrelated to `Config`. Workspace config tools read it from a separate key.

**Rejected because**: splits what is logically one workspace config object into two separate roots, duplicating the resolution-order problem (`Config` vs. `EmitConfig` merge precedence) and requiring downstream consumers to track two independent config hierarchies. The RFC shows `config.emit` as a sub-key of the workspace config block — that structure is only natural if `emit` is a field on `Config`.

---

### Option C: New `WorkspaceConfig` type wrapping both `Config` and `EmitConfig` *(Rejected)*

Add a `WorkspaceConfig` interface that contains `config: Config` and `emit: EmitConfig` as a typed representation of the full `specs.config.yaml` surface.

**Rejected because**: `WorkspaceConfig` is CLI-specific infrastructure, not shared schema vocabulary. Per Constitution III, types exported from this package must represent genuine shared concepts across all consumers — the plugin and `specs-from-figma` have no use for a workspace config wrapper. This belongs in `specs-cli`'s own types, not the schema package.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Config.ts` | Add exported type `EmitPreset` | MINOR |
| `Config.ts` | Add exported type `EmitGroup` | MINOR |
| `Config.ts` | Add exported interface `EmitConfig` | MINOR |
| `Config.ts` | Add optional field `emit?: EmitConfig` to `Config` | MINOR |
| `Config.ts` | Add required field `emit: ResolvedEmitConfig` to `ResolvedConfig` | MINOR |
| `Config.ts` | Add exported interface `ResolvedEmitConfig` | MINOR |
| `Config.ts` | Add `emit` entry to `DEFAULT_CONFIG` | MINOR |
| `types/index.ts` | Export `EmitPreset`, `EmitGroup`, `EmitConfig`, `ResolvedEmitConfig` | MINOR |

**New types** (`types/Config.ts`):

```typescript
// Built-in selection presets for --emit flag and Config.emit.preset
export type EmitPreset = 'defaults' | 'all' | 'none';

// Named emitter groups from RFC 001 emitter registry
export type EmitGroup =
  | 'defaults'
  | 'contracts'
  | 'styling'
  | 'platform'
  | 'integrations'
  | 'examples'
  | 'testing'
  | 'workspace';

// Emit configuration block — controls which emitters run and how
export interface EmitConfig {
  /** Starting selection: a preset name, emitter group name, or built-in preset. Optional; defaults to 'defaults'. */
  preset?: EmitPreset | EmitGroup;
  /** Emitter names or group names to add to the preset selection. */
  include?: string[];
  /** Emitter names to remove from the selection. */
  exclude?: string[];
  /** Per-emitter option overrides, keyed by emitter name. Shape is emitter-defined. */
  options?: Record<string, Record<string, unknown>>;
}

// Fully-resolved emit config — all fields present after merge with DEFAULT_CONFIG
export interface ResolvedEmitConfig {
  preset: EmitPreset | EmitGroup;
  include: string[];
  exclude: string[];
  options: Record<string, Record<string, unknown>>;
}
```

**`Config` before / after**:

```typescript
// Before
export interface Config {
  processing: { ... };
  format: { ... };
  include: { ... };
}

// After
export interface Config {
  processing: { ... };
  format: { ... };
  include: { ... };
  /** Emitter selection and options for specs transform. Optional; absence means CLI defaults apply. @since 0.24.0 */
  emit?: EmitConfig;
}
```

**`DEFAULT_CONFIG` addition**:

```typescript
export const DEFAULT_CONFIG: ResolvedConfig = {
  processing: { ... },
  format: { ... },
  include: { ... },
  emit: {
    preset: 'defaults',
    include: [],
    exclude: [],
    options: {},
  },
};
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `EmitPreset` definition | MINOR |
| `component.schema.json` | Add `EmitGroup` definition | MINOR |
| `component.schema.json` | Add `EmitConfig` definition | MINOR |
| `component.schema.json` | Add `emit` property to `#/definitions/Config` | MINOR |

**New schema definitions** (`component.schema.json`):

```json
"EmitPreset": {
  "type": "string",
  "enum": ["defaults", "all", "none"],
  "description": "Built-in emitter selection preset."
},
"EmitGroup": {
  "type": "string",
  "enum": ["defaults", "contracts", "styling", "platform", "integrations", "examples", "testing", "workspace"],
  "description": "Named emitter group from the RFC 001 registry."
},
"EmitConfig": {
  "type": "object",
  "description": "Emitter selection and options for specs transform.",
  "properties": {
    "preset": {
      "oneOf": [
        { "$ref": "#/definitions/EmitPreset" },
        { "$ref": "#/definitions/EmitGroup" }
      ],
      "description": "Starting selection preset. Defaults to 'defaults'."
    },
    "include": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Emitter names or group names to add to the preset selection."
    },
    "exclude": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Emitter names to remove from the selection."
    },
    "options": {
      "type": "object",
      "description": "Per-emitter option overrides keyed by emitter name.",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": false
}
```

**Addition to `#/definitions/Config/properties`**:

```json
"emit": {
  "$ref": "#/definitions/EmitConfig",
  "description": "Emitter selection and options for specs transform. Optional; absence means CLI defaults apply."
}
```

### Notes

- `include` and `exclude` on `EmitConfig` accept `string[]` rather than `Array<EmitGroup | string>` because the string union `EmitGroup | string` collapses to `string` in TypeScript. The valid group names are documented via `EmitGroup` and enforced at the CLI layer, not the schema layer.
- Per-emitter `options` values are typed as `Record<string, unknown>` in v1. Individual emitter option shapes (e.g. `css.keys`, `tailwind.layer`) are validated in `specs-cli` against emitter-local schemas, not here. If option shapes solidify into a stable cross-consumer contract, a future ADR can type them explicitly.
- `ResolvedEmitConfig` mirrors the pattern of `ResolvedConfig` — all fields required after merge with `DEFAULT_CONFIG`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `EmitPreset` → `#/definitions/EmitPreset` (string enum)
  - `EmitGroup` → `#/definitions/EmitGroup` (string enum)
  - `EmitConfig` → `#/definitions/EmitConfig` (object with `preset`, `include`, `exclude`, `options`)
  - `ResolvedEmitConfig` — runtime-only; no schema definition needed (same shape as `EmitConfig` with all fields required; not serialized to component YAML)
  - `Config.emit` → `#/definitions/Config/properties/emit` (`$ref` to `EmitConfig`)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Primary consumer — reads `Config.emit` to determine which emitters the `transform` command runs | Implement `transform` command; resolve `Config.emit` from flag → config → `DEFAULT_CONFIG.emit` |
| `specs-from-figma` | None — does not read or write `Config.emit`; `emit` is ignored during contract generation | Recompile against updated `Config` type |
| `specs-plugin-2` | None — plugin does not invoke `transform` or read `emit` config | Recompile against updated `Config` type |

---

## Semver Decision

**Version bump**: `0.23.0 → 0.24.0` (`MINOR`)

**Justification**: All changes are additive optional fields on existing interfaces (`Config.emit?`) and new exported types (`EmitPreset`, `EmitGroup`, `EmitConfig`, `ResolvedEmitConfig`). No existing fields are removed, renamed, or narrowed. Per constitution versioning policy: additive → MINOR.

---

## Consequences

- `Config` gains a fourth top-level block (`emit`) that is optional and ignored by consumers that don't invoke `transform`
- `specs-cli` can read a fully-typed `EmitConfig` from `specs.config.yaml` and resolve it against `DEFAULT_CONFIG` without defining the shape locally
- Per-component YAML contracts may carry `config.emit` overrides — the schema validates them against `EmitConfig`
- `EmitGroup` is the canonical list of RFC 001 emitter group names; adding a new group in a future ADR requires a MINOR bump here
- Per-emitter option shapes remain untyped in the shared schema (v1); if they grow into a stable cross-consumer contract, a follow-on ADR types them explicitly
