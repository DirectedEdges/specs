# ADR 054: Workspace Schema File

**Branch**: `053-transform-emit-config`
**Created**: 2026-06-05
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*
**Follows**: [ADR 053](053-transform-emit-config.md)

---

## Context

`component.schema.json` validates the component YAML output format — anatomy, props, variants, styles, and the `config` block recording how a component was ingested. It has historically been the only schema file in the package, so all definitions landed there by default.

ADR 053 added `TransformEntry` and `TransformConfig` to `component.schema.json`. These types describe CLI/workspace behavior (`specs transform` configuration) — they are not part of a component's output format and will never appear in a component YAML file. Their presence in `component.schema.json` is incorrect.

This ADR creates `workspace.schema.json` as the canonical home for CLI and workspace-level configuration shapes, and moves the ADR 053 definitions there.

---

## Options Considered

*(Pre-decided — no alternatives evaluated)*

---

## Decision

### New file: `schema/workspace.schema.json`

Validates workspace-level CLI configuration. Initial contents: `TransformEntry` and `TransformConfig`, moved verbatim from `component.schema.json`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://specs.directededges.com/workspace.schema.json",
  "title": "Specs Workspace Configuration",
  "description": "Schema for workspace-level CLI configuration (specs.config.yaml transform block and related settings).",
  "definitions": {
    "TransformEntry": { ... },
    "TransformConfig": { ... }
  }
}
```

### Changes to `schema/component.schema.json`

- Remove `TransformEntry` definition
- Remove `TransformConfig` definition
- Remove `transform` property from `#/definitions/Config/properties`

`Config` in `component.schema.json` reverts to `processing`, `format`, `include` only — matching what actually appears in component YAML output.

### Changes to `types/` — none

The TypeScript types (`TransformEntry`, `TransformConfig`, `ResolvedTransformConfig`, `Config.transform`) are unchanged. The constitution's "or its siblings" clause covers schema definitions split across sibling files in the same package.

### Package exports

Add `workspace.schema.json` to the `exports` field in `packages/schema/package.json` so consumers can validate workspace config files directly.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — `TransformEntry` and `TransformConfig` move to a sibling schema file, not removed
- **Parity check**:
  - `TransformEntry` → `workspace.schema.json#/definitions/TransformEntry`
  - `TransformConfig` → `workspace.schema.json#/definitions/TransformConfig`
  - `Config` (component) → `component.schema.json#/definitions/Config` (`processing`, `format`, `include` only — no `transform`)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Reads `TransformConfig` from TypeScript types — unaffected by schema file reorganization | None beyond recompile |
| `specs-from-figma` | No change | Recompile |
| `specs-plugin-2` | No change | Recompile |

---

## Semver Decision

**Version bump**: none beyond ADR 053's `0.23.0 → 0.24.0`

**Justification**: Schema reorganization within the same package version. No types added or removed; no published schema contract broken. `workspace.schema.json` is a net-new export (additive).

---

## Consequences

- `component.schema.json` validates only component output — anatomy, variants, styles, config as ingested
- `workspace.schema.json` is the home for all future CLI/workspace config shapes
- The split is enforced structurally: if a type belongs in component YAML, its schema definition goes in `component.schema.json`; if it belongs in `specs.config.yaml`, it goes in `workspace.schema.json`
