# CLI Architecture

`@directededges/specs-cli` — orchestrates fetch → scan → generate → transform
→ render over the closed processing engine and emitter packages. Two esbuild
bundles: `dist/specs.js` (the binary) and `dist/bridge-server.js` (the bridge
daemon). Dev invocation is always `node <repo>/packages/cli/dist/specs.js …`,
never the globally installed `specs` binary (a stale published release — a
hook blocks it).

## Invariants & gotchas

- **There is no MCP server.** The persistent local process is the *bridge*
  (`src/bridge/server.ts`): WebSocket 9001 for plugin connections keyed by
  `fileKey`, HTTP 9002 control (`POST /render`, `POST /generate`,
  `GET /status`). Pid/log files live under `~/.specs`.
- `npm run watch` rebuilds only `dist/specs.js` — **bridge/server changes need
  an explicit `npm run build`** to refresh `dist/bridge-server.js`.
- Legacy single-file configs (`specs.config.yaml`) are **refused with an
  error, never read** — `specs migrate config` is the only path to the split
  `config/` layout (ADR-071/078).
- `src/index.ts` auto-loads `.env` from cwd before commander parses (never
  overwrites existing env).
- `SPECS_DEV_TIER` is an **engine** seam, not a CLI one — it lives in
  from-specs' `entitlement.ts` (dev builds only). The CLI just displays the
  license level the engine stamped into `component.metadata.generator.license`
  via `src/utilities/LicenseStatus.ts`.
- Version is compile-time (`__SPECS_CLI_VERSION__` esbuild define) — not
  readable from package.json at runtime.
- Tests run from the **repo root** (`vitest -c vitest.config.ts
  packages/cli/tests`), not from the package.
- Engine + emitters are ordinary `dependencies`, statically imported, external
  to the bundle (`--packages=external`) — resolved from `node_modules` at
  runtime, which in dev are symlinks into sibling checkouts.
- `src/figma-shim.ts` installs a stub `global.figma` so engine code written
  against the Plugin API runs in Node — imported first, by design.

## Commands

Registered in `createProgram()` (`src/index.ts`); flat files in
`src/commands/*Command.ts`:

| Command | File | Role |
|---|---|---|
| `init` | `InitCommand.ts` | Scaffold split `config/` |
| `migrate` | `MigrateCommand.ts` | Legacy config → split layout; manifest v1→v2 |
| `generate` | `GenerateCommand.ts` | Figma file / manifest / bridge → specs |
| `scan` | `ScanCommand.ts` | Discover components → `<alias>.manifest.md` |
| `fetch` | `FetchCommand.ts` | Figma REST download (file, variables, styles, icons) |
| `cache` | `CacheCommand.ts` | Render lookup caches |
| `applyCustomTokens` | `ApplyCustomTokensCommand.ts` | Inject custom tokens into foundations |
| `transform` | `TransformCommand.ts` | Project `api.yaml` → derived files |
| `analyze` | `AnalyzeCommand.ts` | Dependency/prop/styling/key analyzers |
| `render` | `RenderCommand.ts` | Spec → Figma via bridge |
| `bridge` | `BridgeCommand.ts` | start/stop/status for the daemon |
| `audit` | (inline alias) | Deprecated; rewrites argv to `scan` |

## Key nodes

| Node | Role |
|---|---|
| `src/Config/ConfigLoader.ts` | **The config seam.** Precedence: CLI flags > file > defaults. Discovery: `./config/` → legacy files (refused) → `~/.specs/config.yaml`. Conventions are a *directory*, one file per platform; `conventions/primitives.yaml` reserved (ADR-075). Relative directories resolve against the parent of `config/`, not cwd |
| `src/Config/PlatformConventions.ts` | `figmaOf()` / `platformOf()` — every conventions consumer goes through these |
| `src/bridge/` | server, client (`postRender`, `postGenerateFromSelection`), connection pick (`resolveFileKey`), pidfile |
| `src/utilities/LicenseStatus.ts` | Reads engine-stamped license state; the CLI validates nothing |
| `src/transforms/` | Open counterparts of transform modules (see drift note below) |
| `src/Writers/` | Output *strategy* writers: single / component / concern / combined file |
| `src/Render/SpecLoader.ts` | Spec discovery + loading for render |
| `tests/unit/config/ConfigLoader.test.ts` | The config feature suite — temp `config/` trees on disk |
| `tests/integration/cli.integration.test.ts` | In-process runner (spied exit/console, no subprocess) |

## Data flow — generate

Source auto-detect: `.json` → file mode · `*.manifest.md` → manifest mode ·
`--from-bridge` → plugin returns a built spec (no REST, no engine call).
File/manifest path: `ConfigLoader.load()` → `loadFoundations` →
**`Components.fromRestApi(ids, library, conventions, settings, {styles,
variables, collections, author, generator}, onProgress, licenseInput)`**
(batch, plural — not `Component.fromRestApi`) → `LicenseStatus.display()` →
strategy writer. Guards: all-error "not valid for this runtime" → AUTH_ERROR;
with a key present, transient license statuses exit NETWORK_ERROR/RATE_LIMIT
rather than silently emitting FREE output (specs#119).

## Data flow — transform

`ConfigLoader.load()` → transformer names from positionals |
`pipeline.transformers` | default `['contract']` → per component dir with
`api.yaml`: `transformer.run(apiYaml, context)` — context carries
`processingStates`/`propRoles` from `figmaOf(conventions)` and
`platform: platformOf(conventions, transformer.platformId)` (react and
web-components are peer platform ids, ADR-073) → `transformer.finalize()` for
catalog-level output. Unknown transformer names warn and skip; any component
failure → non-zero exit.

## Verification

Repo-root `npm test`; invoke the built CLI as `node
packages/cli/dist/specs.js` (watcher keeps it fresh). License integration
tests are placeholder-only (skipped without `ANOVA_TEST_KEY_*` env).

## Known drift (as of 2026-09-05)

- `packages/cli/CLAUDE.md` (May 11) is badly stale: claims an MCP server,
  directory-per-command layout, `Component.fromRestApi`, a working
  `specs.config.yaml`, and lists half the commands. Prefer this file.
- `src/transforms/` holds open counterparts of from-specs modules in the
  other repo — deliberately unsynced; which side is authoritative is an open
  cross-repo question.
- No tsc declaration step despite `types: dist/index.d.ts` in package.json.
