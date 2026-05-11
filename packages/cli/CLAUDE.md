# CLAUDE.md — specs-cli

## What This Is

`@directededges/specs-cli` is the CLI and MCP server for the Specs ecosystem. It orchestrates Figma data fetching, component scanning, and spec generation via the `specs-from-figma` engine.

## Commands

| Command | Source | Role |
|---------|--------|------|
| `init` | `commands/Init/` | Scaffold a `specs.config.yaml` file |
| `fetch` | `commands/Fetch/` | Download raw Figma file, variables, and styles via REST API |
| `scan` | `commands/Scan/` | Discover components in fetched data and build a manifest |
| `generate` | `commands/Generate/` | Produce structured specs from the manifest |
| `applyCustomTokens` | `commands/ApplyCustomTokens/` | Inject custom token objects into fetched foundation data |

## Key Files

- `index.ts` — command registry, `createProgram()`, `runCli()`
- `bin/` — CLI binary entry point
- `figma-shim.ts` — adapts Figma Plugin API calls to Node.js (REST API context)
- `Config/` — CLI configuration loading and validation
- `Writers/` — output writers (YAML, JSON, Markdown)
- `Types/` — internal TypeScript types
- `utilities/` — shared helpers

## Dependencies

- `@directededges/specs-schema` — types and `DEFAULT_CONFIG` (linked via workspace symlink)
- `@directededges/specs-from-figma` — processing engine (`Component.fromRestApi`)

## Build

```bash
npm run build    # esbuild bundle + tsc declarations
npm test         # Vitest
```
