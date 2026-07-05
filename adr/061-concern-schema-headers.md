# ADR: Schema Entry Points for Concern-Split Output, and a YAML Schema Header Comment

**Branch**: `061-concern-schema-headers`
**Created**: 2026-07-05
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`specs-cli`'s `generate` command produces five distinct file shapes depending on `--split-components`, `--split-concerns`, and `--use-subfolders`:

| Mode | Shape | Root structure |
|------|-------|-----------------|
| 1 | Whole library, one file | `{ components: { name: Component } }` |
| 2/3 | One component per file (flat or subfoldered) | `Component` |
| 4 | Concern-split, library-wide (`api.yaml`, `variants.yaml`, `examples.yaml`) | `{ components: { name: <partial Component> }, metadata: { generatedAt, componentCount, concern } }` |
| 5 | Concern-split, per-component (`Button/api.yaml`, etc.) | `<partial Component>` merged with `metadata: { ...Metadata, generatedAt, concern }` |

Only modes 1–3 have a corresponding JSON Schema today: `components.schema.json` (mode 1) and `component.schema.json` (modes 2/3), unioned by `root.schema.json`. `Props`, `Anatomy`, `Variant`, `Variants`, `InstanceExamples`, and the slot-content-example map exist only as `#/definitions/*` fragments inside `component.schema.json` — they are not independently addressable root schemas, and no schema describes the partial-`Component` shapes that modes 4/5 actually emit.

The concern split itself is fixed and implemented downstream (`specs-cli`'s `splitComponentByConcern`), grouping `Component` fields as:

- **`api`**: `title`, `anatomy`, `props`, `metadata`, `subcomponents` (API-only, recursive)
- **`variants`**: `default`, `variants`, `invalidVariantCombinations` (if present), `metadata`, `subcomponents` (variants-only, recursive)
- **`examples`**: `metadata`, `slotContentExamples` (if present), `instanceExamples` (if present), `subcomponents` (examples-only, recursive)

Separately, users who install the RedHat YAML VS Code extension get schema-driven validation and autocomplete only if a file either (a) is schema-mapped in workspace settings, or (b) carries a `# yaml-language-server: $schema=<url>` comment at its top. No convention exists today for `specs-cli` to emit that comment, so generated YAML files are unvalidated in-editor even though a matching schema may exist.

---

## Decision Drivers

- **Additive-only**: new schema entry points and the header comment must not change any existing file's shape or require a MAJOR bump.
- **Type ↔ schema symmetry (Constitution I, IV)**: any new schema root needs a corresponding named type in `types/`, and vice versa.
- **No logic in this package (Constitution II)**: the schema package only *describes* the concern shapes; it does not implement `splitComponentByConcern` or decide which schema URL to select at generation time — that selection logic is `specs-cli`'s.
- **Minimal, intentional public API (Constitution III)**: avoid introducing more schema/type surface than the five observed output shapes require.
- **Naming — code platforms first (Constitution VI)**: concern names (`api`, `variants`, `examples`) are already established CLI/config vocabulary (`--split-concerns`, `concern: 'api' | 'variants' | 'examples'`); no code-platform disagreement exists to resolve.

---

## Options Considered

### Option A: Three concern schemas + three "set" wrappers *(Selected)*

Add six new schema files mirroring the existing `component.schema.json` / `components.schema.json` pairing, one pair per concern:

- `component-api.schema.json`, `component-variants.schema.json`, `component-examples.schema.json` — each describes the per-component partial shape (mode 5's root).
- `components-api.schema.json`, `components-variants.schema.json`, `components-examples.schema.json` — each wraps its singular counterpart in `{ components: { name: ... } }` (mode 4's root), exactly as `components.schema.json` wraps `component.schema.json`.

Each pair is backed by one new type in `types/`: `ComponentApi`, `ComponentVariants`, `ComponentExamples` — structural subsets of `Component`, referencing the same `Anatomy`, `Props`, `Variant`, `Variants`, `Metadata`, `InstanceExamples` types already exported.

**Pros**:
- Mirrors an established, already-understood pattern (`component.schema.json` ↔ `components.schema.json`) — no new schema idiom introduced.
- Every one of the five observed output shapes gets an exact, addressable schema.
- Purely additive: new files, new types, no changes to existing schemas.

**Cons / Trade-offs**:
- Six new files is more surface than a single "partial-component" schema with conditional requirements — but conditional (`if`/`then`) JSON Schema is harder for RedHat YAML's validator to give useful autocomplete against, so explicit shapes are preferred over a clever union.

---

### Option B: Single generic `PartialComponent` schema with a `concern` discriminator

One schema and one type, `PartialComponent`, where every `Component` field is optional and a sibling `metadata.concern` value is documented (not enforced) as indicating which subset should be populated.

**Rejected because**: it validates far looser than what `specs-cli` actually emits (e.g. it would silently accept a `variants.yaml` file with a stray `props` key), which undermines Constitution IV's "mechanically verifiable" schema goal. It also can't distinguish the mode-4 wrapped shape from the mode-5 unwrapped shape without a `oneOf`, at which point it's no simpler than Option A.

---

### Option C: Workspace-level `yaml.schemas` glob mapping instead of a per-file header comment

Since every output mode produces deterministically-named files (`api.yaml`, `variants.yaml`, `examples.yaml` at a known base dir, or `<Component>/api.yaml` etc.), a one-time `yaml.schemas` mapping in `.vscode/settings.json` (or documented for users to add) could associate each glob pattern with its schema URL, giving RedHat YAML validation without touching generated file content or adding any `Config` field at all. `Component`'s existing `metadata.schema.url` data field already carries the resolved URL for programmatic consumers (round-trip tooling, version checks); this option would rely on it being the *only* schema pointer, with the editor association handled entirely out-of-band.

**Rejected because**: the mapping doesn't travel with the file. A generated spec pasted into a gist, copied into another repo, or opened outside the workspace that configured the mapping loses validation entirely, whereas a self-contained header comment keeps working anywhere the RedHat extension is installed. `metadata.schema.url` alone doesn't help here either — the extension does not scan arbitrary data keys for schema hints, only the `yaml.schemas` setting or the modeline comment. The per-file comment and `metadata.schema.url` are not redundant in purpose: one is a data-plane field for programmatic consumers, the other is an editor-plane directive with its own reserved syntax — they happen to carry the same URL, generated from the same source, rather than being computed independently.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Component.ts` (or new `types/ComponentConcerns.ts`) | Add `ComponentApi`, `ComponentVariants`, `ComponentExamples` types | MINOR |
| `types/index.ts` | Export the three new types | MINOR |

**Example — new shape** (`types/ComponentConcerns.ts`):
```yaml
# New types, each a structural subset of Component
ComponentApi:
  title: string
  anatomy: Anatomy
  props: Props
  metadata: Metadata
  subcomponents?: Record<string, ComponentApiSubcomponent>  # recursive, API fields only

ComponentVariants:
  default: Variant
  variants: Variants
  invalidVariantCombinations?: PropConfigurations[]
  metadata: Metadata
  subcomponents?: Record<string, ComponentVariantsSubcomponent>

ComponentExamples:
  metadata: Metadata
  slotContentExamples?: Record<string, SlotContent>
  instanceExamples?: InstanceExamples
  subcomponents?: Record<string, ComponentExamplesSubcomponent>
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component-api.schema.json` | New — mode 5 `api` root, mirrors `#/definitions/ComponentApi` | MINOR |
| `component-variants.schema.json` | New — mode 5 `variants` root | MINOR |
| `component-examples.schema.json` | New — mode 5 `examples` root | MINOR |
| `components-api.schema.json` | New — mode 4 `api` root, wraps `component-api.schema.json` in `{ components: {...} }` | MINOR |
| `components-variants.schema.json` | New — mode 4 `variants` root | MINOR |
| `components-examples.schema.json` | New — mode 4 `examples` root | MINOR |
| `root.schema.json` | Extend the top-level `oneOf` to include all six new refs alongside the existing two | MINOR |

**Example — new shape** (`schema/component-api.schema.json`):
```yaml
$schema: "http://json-schema.org/draft-07/schema#"
title: "Specs Component API Concern Schema"
description: "The api concern subset of a component: title, anatomy, props, metadata."
type: object
properties:
  title: { $ref: "component.schema.json#/definitions/Component/properties/title" }
  anatomy: { $ref: "component.schema.json#/definitions/Anatomy" }
  props: { $ref: "component.schema.json#/definitions/Props" }
  metadata: { $ref: "component.schema.json#/definitions/Metadata" }
  subcomponents:
    type: object
    additionalProperties: { $ref: "#" }   # recursive, same api-only shape
required: [title, props, metadata]
additionalProperties: false
```

**Example — set wrapper** (`schema/components-api.schema.json`, mirrors `components.schema.json`):
```yaml
type: object
properties:
  components:
    type: object
    patternProperties:
      "^[a-zA-Z0-9_-]+$": { $ref: "component-api.schema.json" }
    additionalProperties: false
  metadata:
    type: object
    properties:
      generatedAt: { type: string, format: date-time }
      componentCount: { type: integer }
      concern: { const: "api" }
required: [components]
additionalProperties: false
```

### Notes

- `variants` and `examples` schemas follow the same two-file pattern (singular + set), substituting the relevant `$ref`s and `concern` const per the field mapping in Context.
- The library-wide `metadata` block (`generatedAt`, `componentCount`, `concern`) at mode-4's root is *not* the same as `Component`'s per-component `Metadata` type — it's new, manifest-level metadata scoped to these six schemas only, not added to `Metadata` itself.
- `additionalProperties: false` mirrors the strictness already present in `components.schema.json`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `ComponentApi` ↔ `component-api.schema.json`; `ComponentVariants` ↔ `component-variants.schema.json`; `ComponentExamples` ↔ `component-examples.schema.json`. Each "set" schema has no independent type — it's structurally `Record<string, ComponentApi>` etc., expressed the same way `components.schema.json` has no separate type from `component.schema.json`.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Concern-split output (modes 4/5) can now be validated against a real schema; new config option controls a YAML header comment | Point `FileManifest` at the matching new schema URL per mode/concern when populating `metadata.schema`; add the config flag described below and emit the header comment when enabled |
| `specs-from-figma` | None | No change — it produces the full `Component` object; splitting happens in `specs-cli` |
| `specs-plugin-2` | None | No change — plugin output is not concern-split |

### Config flag for the YAML schema header comment

Separately from the schema additions, add a boolean to `Config.format` (not `Config.include` — this governs a file-level YAML decoration, not component data content, so it belongs alongside the other output-shaping toggles like `format.output` and `format.keys`, and only has meaning when `format.output = 'YAML'`):

```yaml
# types/Config.ts — format block
format:
  output?: 'JSON' | 'YAML'
  keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN'
  layout?: 'LAYOUT' | 'PARENT_CHILDREN' | 'BOTH'
  # ...existing fields...
  yamlSchemaComment?: boolean   # NEW — default true (see DEFAULT_CONFIG)
```

Recommended name: **`format.yamlSchemaComment`** — scoped to YAML specifically (parallels `format.output`), and "comment" signals it's a header annotation, not data. Alternatives considered and rejected:
- `include.schemaHeaderComment` — `include` is reserved for toggles that add/remove *component data* (`invalidVariants`, `emptyVariants`, etc.); this isn't data, it's a file decoration.
- `format.schemaHeader` — ambiguous with the existing `metadata.schema` data block; "comment" disambiguates that this is the RedHat-YAML-specific `# yaml-language-server:` line, not the JSON `$schema` keyword.
- `format.emitSchemaReference` — accurate but longer with no added clarity over `yamlSchemaComment`.

When `true` (default) and `format.output = 'YAML'`, `specs-cli` writes `# yaml-language-server: $schema=<url>` as the first line of every generated file, selecting `<url>` from the schema matching that file's shape (one of the eight schemas now covered by `root.schema.json`'s `oneOf`, using the same versioned-URL construction already used for `metadata.schema.url`). This is `specs-cli` writer logic, not a schema-package concern — `specs-schema`'s only obligation here is the new `Config.format.yamlSchemaComment` type/schema field and `DEFAULT_CONFIG.format.yamlSchemaComment = true`.

| File | Change | Bump |
|------|--------|------|
| `types/Config.ts` | Add `format.yamlSchemaComment?: boolean` to `Config`; add required `format.yamlSchemaComment: boolean` to `ResolvedConfig` | MINOR |
| `types/Config.ts` (`DEFAULT_CONFIG`) | Set `format.yamlSchemaComment: true` | MINOR |
| `schema/workspace.schema.json` | Add `format.yamlSchemaComment` boolean property, default `true` | MINOR |

---

## Semver Decision

**Version bump**: none beyond the active release target — lands within `0.28.0` (the version `release/schema-0.28.0+cli-0.25.0` already targets for this cycle), classified `MINOR` relative to the prior published version.

**Justification**: Every change is additive — six new schema files, three new types, one new optional `Config.format` field with a documented default. No existing type, field, or schema is removed, renamed, or made stricter. Per constitution Versioning Policy, additive types and optional fields are MINOR. This ADR does not introduce a further bump on top of the release branch's reserved version.

---

## Consequences

- Concern-split output (`--split-concerns`, both library-wide and per-component modes) has a real, addressable JSON Schema for the first time — `root.schema.json`'s `oneOf` grows from 2 to 8 entries.
- Users with the RedHat YAML extension get in-editor validation/autocomplete on any generated file, once `specs-cli` implements the header-comment writer logic against `Config.format.yamlSchemaComment`.
- `specs-cli` must be updated to select the correct one of eight schema URLs per output mode/concern when populating `metadata.schema.url` and the new header comment — this is tracked as `specs-cli` follow-up work, not part of this ADR's schema-package changes.
- Consumers who parse `Config.format` should treat `yamlSchemaComment` as optional-with-default; no migration needed since the default preserves current behavior for JSON output and only adds a comment line to YAML output.
