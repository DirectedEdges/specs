## Context

`specs scan` and `specs generate` form the documented pipeline for turning Figma data into structured specs:

```
fetch → scan → generate
         │       │
         │       └─ reads {alias}.manifest.md
         └─ writes {alias}.manifest.md
```

The scan writer was migrated to a v2 table format. The generate reader was not. As a result, the documented round-trip fails on a fresh project.

Today's state of the parsing utilities:

```
packages/cli/src/utilities/
├── ManifestParser.ts          v1 only. checkbox-list. legacy.
├── ManifestParserV2.ts        v2 only. table. ScanCommand already uses it.
└── ManifestMigrationV1ToV2.ts isolated legacy adapter, has a DELETE-WHEN
                               comment for when v1 disappears entirely.
```

`ScanCommand` already routes between v1 and v2 (via `ManifestMigrationV1ToV2`) when reading an existing manifest. `GenerateCommand` does not — it has a single inline check `trimmed.includes('- [')` and a single `ManifestParser.parse()` call.

Constraint: the project explicitly designs `ManifestMigrationV1ToV2.ts` as an isolated legacy module so v1 can be deleted mechanically later. Any new code should preserve that property — v1-specific knowledge should not leak into new call sites.

## Goals / Non-Goals

**Goals:**

- `specs generate` accepts a v2 manifest as a valid source format.
- `specs generate` continues to accept v1 manifests and JSON files unchanged.
- v2 component names containing `\|` round-trip correctly through `scan → generate`.
- v1 support remains structured as a single deletable branch.
- Public types of `ManifestParserV2` (`ManifestRowV2`, `ManifestMetadataV2`, `ManifestResultV2`) are unchanged.

**Non-Goals:**

- Removing or deprecating v1 manifests.
- Changing the v2 manifest emitter in `ScanCommand`.
- Unifying `ManifestParser` and `ManifestParserV2` behind a common interface or façade.
- Expanding the `DevStatus` enum (today's `ROW_REGEX` hard-codes `READY_FOR_DEV|NONE`; that constraint is preserved here and tracked separately).
- Verifying downstream consumers via `npm pack` — release/consumer concern.

## Decisions

### D1. Dispatch lives in `GenerateCommand`, not behind a façade

`GenerateCommand` will detect source format and pick the parser directly:

```
read sourceContent
├─ starts with '{'              → JSON mode
├─ ManifestParserV2.isV2(c)     → v2 manifest mode
├─ isV1Manifest(c)              → v1 manifest mode
└─ else                         → error (unchanged message + exit code)
```

**Alternatives considered:**

- _Façade on `ManifestParserV2` exposing `isManifest()` + unified `parse()`._ Rejected: it grows the public API, requires `ManifestParserV2` to import v1 helpers, and breaks the "isolated legacy" property of `ManifestMigrationV1ToV2.ts`. When v1 is removed, a façade has to be unwound; an explicit `if` branch in `GenerateCommand` is one-line deletion.
- _Unified `ManifestResult` type across v1/v2._ Rejected: `GenerateCommand` consumes only `{ id, name, included }` and `metadata.file`, which both shapes already satisfy. No unifying type is needed; coupling shapes now would just create migration drag later.

### D2. v2 row parsing: separate recognition from extraction

Current `ManifestParserV2.ROW_REGEX` does both in one regex:

```
/^\|\s*\[([x ])\]\s*\|\s*(.+?)\s*\|\s*(\d+:\d+)\s*\|\s*(COMPONENT_SET|COMPONENT)\s*\|\s*(READY_FOR_DEV|NONE)\s*\|/i
```

It cannot honor escaped pipes — `(.+?)` stops at the first literal `|` regardless of a preceding `\`.

The new approach:

```
1. Recognition (cheap regex):
   line matches /^\|\s*\[[x ]\]\s*\|/

2. Extraction (character walker):
   walk between outer '|'s, treating '\|' as part of the cell.
   trim each cell. replaceAll('\\|', '|') on the trimmed cell.
   → cells: [checkbox, name, id, type, devStatus]

3. Validation:
   id matches /^\d+:\d+$/
   type ∈ {COMPONENT, COMPONENT_SET}
   devStatus ∈ {READY_FOR_DEV, NONE}
   rows that fail validation are skipped (matches today's silent-skip behavior).
```

**Alternatives considered:**

- _Extend `ROW_REGEX` with a negative-lookbehind for `\`._ Rejected: hard to read, hard to extend if a second escape ever appears, and JS regex engines vary in lookbehind support across runtimes the CLI targets.
- _Pull in a markdown table parser dependency._ Rejected: adds a runtime dep for one trivial parsing concern; the input format is fully controlled by `ScanCommand`.

### D3. Public shape of `ManifestParserV2.parse()` does not change

Same return type, same fields, same semantics for valid rows. Only the row-extraction internals change. Existing tests of the parse output must continue to pass.

### D4. Error path and exit codes preserved

`GenerateCommand` keeps:

- the same error message `Error: Unrecognized source format. Expected JSON file or markdown manifest.`
- the same exit code `ERROR_CODES.INVALID_ARGS`
- the same verbose mode label (`Mode: ${isManifest ? 'manifest' : 'file'}`) — `isManifest` becomes "v1 OR v2".

## Risks / Trade-offs

- **Risk:** A v2 manifest with no recognizable rows would now produce an empty `components` array and `GenerateCommand` already errors on that with `No components found in manifest`. → Mitigation: behavior matches the current v1 case; no change needed.
- **Risk:** Hardening the row extractor could change which rows are accepted vs silently dropped at the margins (e.g., trailing whitespace, missing dev-status column). → Mitigation: keep the validation set identical to today's regex (id pattern, type enum, devStatus enum); only the _splitting_ changes. Add unit tests pinning the accept/reject set.
- **Risk:** Future `DevStatus` values silently drop rows. → Mitigation: out of scope for this change, but documented here. Followup change should make the enum the single source of truth.
- **Trade-off:** Two `if` branches in `GenerateCommand` (v1, v2) instead of a single façade call. Slightly more lines at the call site, in exchange for a one-line deletion when v1 is dropped.
- **Trade-off:** Character-walking splitter is more code than a regex, but it's the smallest correct implementation for the escape rule `ScanCommand` already emits.

## Migration Plan

No data migration. The change is read-side compatible:

- existing v1 manifests on disk continue to work
- existing v2 manifests on disk start working with `generate`
- no config flag, no opt-in

Rollback is a straight revert; manifests on disk are unaffected.

## Open Questions

None. v1 retention is decided (kept). Escape handling is decided (in-scope).
