# CLAUDE.md

## What This Is

`specs` is a monorepo containing the schema definitions and CLI tooling for the Specs design system specification ecosystem. It produces structured, machine-readable component specifications from Figma designs.

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@directededges/specs-schema` | `packages/schema/` | TypeScript types and JSON schema definitions for component specifications. Exports are type-only except for `DEFAULT_CONVENTIONS`, `DEFAULT_SETTINGS`, and `DEFAULT_PIPELINE`. |
| `@directededges/specs-cli` | `packages/cli/` | CLI for design system operations: generate, scan, and fetch component specs from the Figma REST API. |

## Dependency Flow

```
@directededges/specs-schema (types/schema)
  ↓
@directededges/specs-from-figma (transformer — external)
  ↓
@directededges/specs-cli (CLI)
```

- The CLI depends on `specs-schema` for types and on `specs-from-figma` (the transformer engine) for processing Figma data into structured specs.
- `specs-schema` has no runtime dependencies — it is pure type definitions and a build step.

## Architecture

```
packages/
├── schema/                      # @directededges/specs-schema
│   ├── types/                   # TypeScript type definitions (source of truth)
│   │   ├── index.ts             # Barrel export
│   │   ├── Component.ts         # Top-level component spec shape
│   │   ├── Conventions.ts       # Conventions interface + DEFAULT_CONVENTIONS
│   │   ├── Settings.ts          # Settings interface + DEFAULT_SETTINGS
│   │   ├── Pipeline.ts          # Pipeline interface + DEFAULT_PIPELINE
│   │   └── ...                  # Anatomy, Props, Element, Styles, etc.
│   ├── schema/                  # JSON Schema definitions (for validation)
│   │   ├── component.schema.json
│   │   ├── components.schema.json
│   │   ├── styles.schema.json
│   │   └── root.schema.json
│   └── tests/                   # Type-level tests (.test-d.ts)
├── cli/                         # @directededges/specs-cli
│   └── src/
│       ├── index.ts             # Entry: command registry, createProgram(), runCli()
│       ├── bin/                  # CLI binary entry point
│       ├── commands/            # Command implementations (Generate, Audit, Batch, Fetch, Init)
│       ├── Config/              # CLI configuration
│       ├── Types/               # TypeScript types
│       ├── Writers/             # Output writers
│       ├── utilities/           # Shared helpers
│       └── figma-shim.ts       # Figma API shim for Node.js context
adr/                             # Architecture Decision Records
```

## Build & Test

```bash
npm run build          # Build all workspaces
npm test               # Vitest run (all packages)
npm run build --workspace=packages/schema   # Build schema only
npm run build --workspace=packages/cli      # Build CLI only
```

## Conventions

- **Test framework**: Vitest with globals enabled
- **Path alias**: `@` → `./src` (used in CLI package)
- **Deterministic output**: Same input produces identical output. No side effects in the processing pipeline.
- **Conventions / Settings / Pipeline types** (from `@directededges/specs-schema`): `Conventions` declares facts about the Figma library (`figma.naming`, `figma.glyphs`, `figma.states`, etc. — a wrong value produces incorrect output); `Settings` controls output shape (`spec.details`, `spec.keys`, `spec.color`, `spec.layout`, `spec.variantDepth`, etc. — a different value produces different output); `Pipeline` declares `transformers` and `analyses`

## Schema Governance

All `specs-schema` type and schema changes must pass the 6-gate Constitution Check defined in `packages/schema/CONSTITUTION.md`. The constitution enforces type–schema parity, no-logic exports, minimal stable API, and strict naming conventions.

## ADR Lifecycle

Schema changes are proposed and tracked through Architecture Decision Records in `adr/`.

1. **`/specs.adr.create`** — Draft a new ADR, claim the next index number, create a branch
2. **`/specs.adr.implement`** — Apply type, schema, test, doc, and changelog changes described in the ADR (runs compile + schema validation gates)
3. **`/specs.adr.accept`** — Re-run all gates, flip status to ACCEPTED, update the index, create a PR

Each step is a separate skill; run them in order. The ADR stays `DRAFT` until all gates pass in the accept step.

## Doc Site

The documentation site is built with Astro (port 4323) from `site/src/content/docs/`. Content sections:

- `schema/` — one page per schema type (Component, Styles, Props, etc.)
- `settings/` — one page per convention or setting (color, keys, layout, tokens, states, etc.)
- `guides/` — how-to guides for specific features (slot constraints, variant depth, token format, etc.)
- `cli/` — CLI overview, getting started, and per-command reference
- `overview/` — product overview, licensing, releases

**Spec output examples use YAML, never JSON.** Any Result block or example showing
component spec output — on a schema page, a settings page, or a guide — is a `yaml`
fenced block. YAML is what the CLI writes and what an author reads in a workspace, so
a JSON example shows a shape the reader will never see on disk.

## Rules

- **Never merge or commit to main without asking first.** Use `AskUserQuestion` with Yes/No options before running `gh pr merge`, `git merge` into main, `git push` to main, or any direct commit on the main branch.
- Do not perform deep recursive scans on initial analysis
- Limit exploration to a depth of 2 folders unless requested
- Ignore `dist/` unless troubleshooting
