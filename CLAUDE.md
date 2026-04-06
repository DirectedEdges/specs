# CLAUDE.md

## What This Is

`specs` is a monorepo containing the schema definitions and CLI tooling for the Specs design system specification ecosystem. It produces structured, machine-readable component specifications from Figma designs.

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@directededges/specs-schema` | `packages/schema/` | TypeScript types and JSON schema definitions for component specifications. Exports are type-only except for `DEFAULT_CONFIG`. |
| `@directededges/specs-cli` | `packages/cli/` | CLI for design system operations: generate, audit, batch-process, and fetch component specs from the Figma REST API. |

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
│   │   ├── Config.ts            # Config interface + DEFAULT_CONFIG
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
- **Config type** (from `@directededges/specs-schema`): Controls output shape — `DETAILS`, `FORMAT_KEYS`, `FORMAT_COLOR`, `DATA_LAYOUT`, `VARIANT_DEPTH`, etc.

## Rules

- **Never merge or commit to main without asking first.** Use `AskUserQuestion` with Yes/No options before running `gh pr merge`, `git merge` into main, `git push` to main, or any direct commit on the main branch.
- Do not perform deep recursive scans on initial analysis
- Limit exploration to a depth of 2 folders unless requested
- Ignore `dist/` unless troubleshooting
