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
  `POST /variables`, `GET /status`). Pid/log files live under `~/.specs`.
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
- **A file payload is built before any of it is sent, and a fetch is two stages,
  not one.** Figma serializes the whole document before the first byte leaves,
  and only repeats that work when the file changed since the last fetch:
  measured at 10–18 seconds per 100MB against a transfer that runs near 75MB/s,
  so a 700MB fetch is ~100 seconds of silence then ~10 seconds of download. Treating the two as one is what made a healthy wait look like a hang
  and made the elapsed figure describe neither stage (specs#707).
- **The first-byte deadline covers the wait only — never the body.**
  `figmaFetch` aborts if no headers arrive within `FIRST_BYTE_TIMEOUT_MS`
  (4 minutes) and clears the timer the moment they do: a transfer already in
  flight is making progress, and a partial payload is worth nothing. Moving that
  `clearTimeout` would silently start killing slow downloads. Giving up also
  discards the build — Figma starts over on the next request — so nothing here
  retries, and the failure says so rather than implying a cheap retry.
- `src/utilities/fetchEstimate.ts` predicts the wait from the **previous** fetch
  of the same source (`manifest.json`'s `sourceBytes`, else the monolithic
  payload's size on disk), and deliberately answers in bands rather than
  figures — the measured rate spans a wide enough range that a number would
  claim precision the data does not support.

## Commands

Registered in `createProgram()` (`src/index.ts`); flat files in
`src/commands/*Command.ts`:

| Command | File | Role |
|---|---|---|
| `init` | `InitCommand.ts` | Scaffold split `config/` |
| `migrate` | `MigrateCommand.ts` | Legacy config → split layout; manifest v1→v2 |
| `generate` | `GenerateCommand.ts` | Figma file / manifest / bridge → specs |
| `scan` | `ScanCommand.ts` | Discover components → `<alias>.manifest.md` |
| `fetch` | `FetchCommand.ts` | Figma REST download (file, variables, styles, icons); `--from-bridge` reads variables through the plugin instead (non-Enterprise path) |
| `cache` | `CacheCommand.ts` | Render lookup caches |
| `applyCustomTokens` | `ApplyCustomTokensCommand.ts` | Inject custom tokens into foundations |
| `transform` | `TransformCommand.ts` | Project `api.yaml` → derived files |
| `analyze` | `AnalyzeCommand.ts` | Dependency/prop/styling/key analyzers. Naming none runs every analyzer |
| `render` | `RenderCommand.ts` | Spec → Figma via bridge |
| `bridge` | `BridgeCommand.ts` | start/stop/status for the daemon |
| `version` | `VersionCommand.ts` | Spec workspace versioning: diff/history/bump/restore/premerge/report over `src/version/` (diff engine, rules-as-data classifier, ledgers, report renderer). Free tier |
| `skills` | `SkillsCommand.ts` | Emits the canonical premerge/release orchestration skills into `.claude/skills/` |
| `audit` | (inline alias) | Deprecated; rewrites argv to `scan` |

- **Nothing removes a spec folder.** `generate` overwrites what it produces and
  reports folders it found but did not write; a run cannot tell a component
  deselected on purpose, or one generated from another source, from a stale one.
  The platform trees are derived and *are* pruned — the full rule is in the
  repo-root `ARCHITECTURE.md` under "What the tooling may delete".
- `✓ Fetch complete` is checked against disk, not inferred from the absence of an
  error: a requested kind missing on disk fails the run, a configured kind that
  `--only` excluded warns. Counts printed by `reportCache()` are cache contents
  across every source, not what the run downloaded.
- A transformer that writes into each component's own folder declares
  `perComponentOutput` (basename, extension follows the run's format) so the
  command can name those files — output appearing unannounced in a spec folder
  reads as corruption.

## Key nodes

| Node | Role |
|---|---|
| `src/Config/ConfigLoader.ts` | **The config seam.** Precedence: CLI flags > file > defaults. Discovery: `./config/` → legacy files (refused) → `~/.specs/config.yaml`. Conventions are a *directory*, one file per platform; `conventions/primitives.yaml` reserved (ADR-075). Relative directories resolve against the parent of `config/`, not cwd |
| `src/Config/PlatformConventions.ts` | `figmaOf()` / `platformOf()` — every conventions consumer goes through these |
| `src/bridge/` | server, client (`postRender`, `postGenerateFromSelection`), connection pick (`resolveFileKey`), pidfile |
| `src/utilities/LicenseStatus.ts` | Reads engine-stamped license state; the CLI validates nothing |
| `src/transforms/` | Open counterparts of transform modules (see drift note below) |
| `src/Writers/` | Output *strategy* writers: single / component / concern / combined file. `WriteResult.filesWritten` documents itself as relative to the output directory and in fact holds **absolute** paths — re-base before comparing |
| `src/version/` | Versioning internals: `assemble` (concern files → component) → `diff` → `rules` classifier (rules-as-data in `semverRules.ts`, `--rules` overrides) → `bump`/`ledger` (`versions/<libVersion>/` folders + `ledgers/*.json`, no snapshots) → `report` renderer (premerge canon). Skill markdown emitted by `skills.ts` |
| `src/Writers/RunMetadataFile.ts` | `latest.metadata.<format>` — a manifest run's facts, stated once (ADR-089). `RunMetadataFile.separate()` lifts them out of every spec and reduces each block to `source`; `RunMetadataReader.find()` reads the document back, looking in the spec's own directory then one level up |
| `src/Render/SpecLoader.ts` | Spec discovery + loading for render. Rehydrates a reduced spec's run metadata here, at the one place every render input is loaded, so no reader downstream has to know the spec was reduced |
| `tests/unit/config/ConfigLoader.test.ts` | The config feature suite — temp `config/` trees on disk |
| `tests/integration/cli.integration.test.ts` | In-process runner (spied exit/console, no subprocess) |

## Data flow — generate

Source auto-detect: `.json` → file mode · `*.manifest.md` → manifest mode ·
`--from-bridge` → plugin returns a built spec (no REST, no engine call).
File/manifest path: `ConfigLoader.load()` → `loadFoundations` →
**`Components.fromRestApi(ids, library, conventions, settings, {styles,
variables, collections, author, generator}, onProgress, licenseInput)`**
(batch, plural — not `Component.fromRestApi`) → `LicenseStatus.display()` →
`RunMetadataFile.separate()` (manifest mode only) → strategy writer. Guards: all-error "not valid for this runtime" → AUTH_ERROR;
with a key present, transient license statuses exit NETWORK_ERROR/RATE_LIMIT
rather than silently emitting FREE output (specs#119).

## Data — split file payloads (specs#559–#563, umbrella #553)

The file payload artifact is the page-split `<alias>.file/` directory —
`manifest.json` (formatVersion, page index with id/name/bytes/sha256,
separators, whole-payload sha256), `root.json` (the payload with
`document.children` emptied — valid JSON, holds the root
components/componentSets/styles maps), and one raw `page-NNN.json` per page.
`fetch` streams the download through the splitter
(`utilities/payloadSplit.ts`, byte-level JSON state machine; 769MB in ~13s)
and removes the transient monolithic file on success; a split failure keeps
`<alias>.file.json` as the rescue. `finish()` refuses a payload that did not end
on a structural boundary — balanced depth, no open string, non-empty: the
response is chunked with no `content-length`, so a body that stops early without
a transport error is otherwise indistinguishable from a complete one and would be
written as a real artifact. Reassembly is byte-perfect:
`root[0..prefixBytes) + sep_i + page_i … + root[prefixBytes..)`, verifiable
against `sourceSha256` (harness/dev check only).

All consumers read through `utilities/sectionedFile.ts` (`SectionedFile`) —
root maps, per-page iteration, or `assembleDocument()` (pruned documents with
automatic cross-page fault-in; generate seeds the manifest-selected
components' pages). Pre-existing monolithic payloads keep working everywhere
as a read fallback. `SPECS_SHADOW_INGEST=1` runs both paths and diffs
(dev-only). Scan and generate accept a `<alias>.file` directory path wherever
a payload path is accepted; version premerge passes whichever exists.

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

## Known drift (as of 2026-09-22)

- `packages/cli/CLAUDE.md` (May 11) is badly stale: claims an MCP server,
  directory-per-command layout, `Component.fromRestApi`, a working
  `specs.config.yaml`, and lists half the commands. Prefer this file.
- `src/transforms/` holds open counterparts of from-specs modules in the
  other repo — deliberately unsynced; which side is authoritative is an open
  cross-repo question.
- `src/transforms/states.ts` mirrors two facts from the closed packages'
  RoleSpecs: `ROLE_NATIVE_STATES` (which state concepts a role announces on
  its own element) and `COLLAPSING_ROLES` (which roles consume their subtree).
  The stylesheet needs both to know what markup the scaffold actually emits —
  a change to either fact there must land here too, or selectors anchor on
  elements and attributes that no longer exist.
- No tsc declaration step despite `types: dist/index.d.ts` in package.json.
