## Why

`specs scan` emits a v2 markdown table manifest, but `specs generate` only detects the legacy v1 checkbox-list format (`- [`) and fails with `Error: Unrecognized source format. Expected JSON file or markdown manifest.` The codebase already ships `ManifestParserV2` with `isV2()` and `parse()` — `GenerateCommand` was never wired to it, so the documented `scan && generate` round-trip is broken out of the box.

A latent secondary defect: even when `ManifestParserV2.parse()` is invoked, its single combined `ROW_REGEX` cannot honor escaped pipes (`\|`) inside component names. `ScanCommand` already escapes them via `escapeCell`, so the read side must be capable of round-tripping them.

## What Changes

- `specs generate` recognizes v2 manifests (table form, `**Scan format version:** 2`) as a valid source format, in addition to JSON files and v1 manifests.
- `specs generate` dispatches parsing to `ManifestParserV2` for v2 manifests and to `ManifestParser` for v1 manifests; JSON mode is unchanged.
- v1 manifests remain accepted input. Deprecation is out of scope.
- `ManifestParserV2` row parsing is hardened to honor `\|` escapes inside cell content, so a component name like `Toggle | On/Off` round-trips through `scan → generate`.
- The public `{ components, metadata }` shape of `ManifestParserV2.parse()` is unchanged.

## Capabilities

### New Capabilities

- `generate-source-formats`: The contract for what source formats `specs generate` accepts (JSON file, v2 markdown manifest, v1 markdown manifest), how they are detected, and the requirement that the v2 manifest parser correctly handles escaped pipes inside component names.

### Modified Capabilities

<!-- none — no prior specs in openspec/specs/ -->

## Impact

- **Code**:
  - `packages/cli/src/commands/GenerateCommand.ts` — replace `trimmed.includes('- [')` detection; route to v2 or v1 parser.
  - `packages/cli/src/utilities/ManifestParserV2.ts` — replace combined row regex with recognition regex + escape-aware splitter; preserve the public result shape.
- **Tests**:
  - `packages/cli/tests/unit/utilities/ManifestParserV2.test.ts` — add escaped-pipe row coverage.
  - `packages/cli/tests/unit/commands/GenerateCommand.test.ts` — add v2 manifest end-to-end; preserve v1 and JSON regressions.
- **APIs**: no public type changes. `ManifestParserV2.parse()` keeps the same return shape; `ManifestParser` is untouched.
- **Dependencies**: none.
- **Out of scope**: removing v1, changing `ScanCommand` output format, expanding `DevStatus` enum, `npm pack`/downstream verification.
