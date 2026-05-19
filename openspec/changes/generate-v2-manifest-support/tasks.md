## 1. ManifestParserV2 — escape-aware row parsing

- [x] 1.1 Replace the combined `ROW_REGEX` with a cheap recognition regex matching `^\|\s*\[[x ]\]\s*\|` plus a separate character-walking row splitter that treats `\|` as part of the cell.
- [x] 1.2 After splitting, trim each cell and `replaceAll('\\|', '|')`; validate `id` matches `\d+:\d+`, `type ∈ {COMPONENT, COMPONENT_SET}`, `devStatus ∈ {READY_FOR_DEV, NONE}`; skip rows that fail validation (matches current behavior).
- [x] 1.3 Keep the public `ManifestResultV2`, `ManifestRowV2`, `ManifestMetadataV2` shapes unchanged. Do not export the new splitter from the package surface.
- [x] 1.4 Add a failing unit test in `packages/cli/tests/unit/utilities/ManifestParserV2.test.ts` for `| [x] | Toggle \| On/Off | 99:1 | COMPONENT | NONE |` → name `Toggle | On/Off`. Confirm it fails against the current parser.
- [x] 1.5 Implement 1.1–1.3 until 1.4 passes; confirm all existing `ManifestParserV2` tests still pass.

## 2. GenerateCommand — v2/v1 detection and routing

- [x] 2.1 In `packages/cli/src/commands/GenerateCommand.ts`, import `ManifestParserV2` and `isV1Manifest` from `../utilities/ManifestParserV2.js` and `../utilities/ManifestMigrationV1ToV2.js`.
- [x] 2.2 Replace `const isManifest = trimmed.includes('- [');` with detection that sets `isJson`, `isV2Manifest`, `isV1ManifestSrc`, and a derived `isManifest = isV2Manifest || isV1ManifestSrc`.
- [x] 2.3 Preserve the existing `Error: Unrecognized source format. Expected JSON file or markdown manifest.` message and `ERROR_CODES.INVALID_ARGS` exit code for the `!isManifest && !isJson` branch.
- [x] 2.4 In the manifest branch, replace the `ManifestParser.parse(sourceContent)` call with a conditional: `isV2Manifest ? ManifestParserV2.parse(sourceContent) : ManifestParser.parse(sourceContent)`. Downstream code (`components.filter(c => c.included)`, `metadata.file`, success log line) is unchanged.
- [x] 2.5 Preserve the existing verbose-mode log (`[CLI] Mode: ${isManifest ? 'manifest' : 'file'}`).

## 3. Command-level tests

- [x] 3.1 In `packages/cli/tests/unit/commands/GenerateCommand.test.ts`, add a test that runs `generate` against a v2 manifest fixture and asserts the success path (no unrecognized-source error, components loaded).
- [x] 3.2 Add a regression test that v1 manifests still parse and generate.
- [x] 3.3 Add a regression test that JSON source mode still works and still requires `--component`.
- [x] 3.4 Add a test that an unrecognized source still prints the existing error and exits with `ERROR_CODES.INVALID_ARGS`.

## 4. Validation

- [x] 4.1 Run `npm test --workspace=packages/cli`. All tests pass.
- [x] 4.2 Run `npm run build`. Build succeeds.
- [x] 4.3 Manual round-trip: in a configured project, run `node packages/cli/dist/specs.js scan` then `node packages/cli/dist/specs.js generate`. Confirm `✓ Loaded manifest: N components (M selected)` and no `Unrecognized source format` error.
- [x] 4.4 `openspec validate generate-v2-manifest-support --strict` passes.
