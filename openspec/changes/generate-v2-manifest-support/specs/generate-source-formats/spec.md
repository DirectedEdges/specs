## ADDED Requirements

### Requirement: Generate accepts JSON file sources

The `specs generate` command SHALL accept a JSON file as a source. JSON mode is identified by the trimmed source content starting with `{`.

#### Scenario: JSON source is recognized

- **WHEN** the source file content (after trimming leading whitespace) starts with `{`
- **THEN** `specs generate` processes the file in JSON mode without printing the unrecognized-source error

#### Scenario: JSON mode still requires --component

- **WHEN** a JSON source is provided without `--component`
- **THEN** `specs generate` exits with the existing JSON-mode argument error and a non-zero exit code

### Requirement: Generate accepts v2 markdown manifests

The `specs generate` command SHALL accept a v2 markdown manifest as a source. A v2 manifest is identified by `ManifestParserV2.isV2(content)` returning true (presence of `**Scan format version:** N` where `N >= 2`).

#### Scenario: v2 manifest emitted by scan round-trips through generate

- **WHEN** `specs scan` produces a v2 manifest at `{dataDirectory}/{alias}.manifest.md` and `specs generate` is invoked with no `--source` argument
- **THEN** `specs generate` loads the manifest, prints `✓ Loaded manifest: N components (M selected)`, and proceeds to generation
- **AND** `specs generate` does NOT print `Error: Unrecognized source format. Expected JSON file or markdown manifest.`

#### Scenario: v2 manifest with zero selected components

- **WHEN** a valid v2 manifest is provided but no row has `[x]`
- **THEN** `specs generate` exits with `Error: No components selected in manifest (none have [x])` and a non-zero exit code

### Requirement: Generate accepts v1 markdown manifests

The `specs generate` command SHALL continue to accept v1 (legacy checkbox-list) markdown manifests as a source. A v1 manifest is identified by `isV1Manifest(content)` returning true (no `**Scan format version:**` header AND at least one line matching `- [x]` or `- [ ]`).

#### Scenario: Legacy v1 manifest still parses and generates

- **WHEN** a v1 manifest with `- [x] Name (id, COMPONENT_SET)` lines is provided as a source
- **THEN** `specs generate` loads the manifest and proceeds to generation with the same `✓ Loaded manifest` output as v2

### Requirement: Generate rejects unrecognized source formats

When a source file is neither JSON, a v2 manifest, nor a v1 manifest, `specs generate` SHALL exit with the existing error message and exit code.

#### Scenario: Plain text file is rejected

- **WHEN** a source file is provided whose content is neither JSON nor a recognizable manifest
- **THEN** `specs generate` prints `Error: Unrecognized source format. Expected JSON file or markdown manifest.` and exits with `ERROR_CODES.INVALID_ARGS`

### Requirement: v2 manifest parser honors escaped pipes in cell content

The v2 manifest parser SHALL treat the two-character sequence `\|` inside a table cell as a literal `|` belonging to that cell, NOT as a column separator. After splitting a row into cells, each cell SHALL have `\|` replaced with `|` and surrounding whitespace trimmed.

#### Scenario: Component name with an escaped pipe round-trips

- **WHEN** a v2 manifest row is `| [x] | Toggle \| On/Off | 99:1 | COMPONENT | NONE |`
- **THEN** `ManifestParserV2.parse()` produces a component with `name === 'Toggle | On/Off'`, `id === '99:1'`, `type === 'COMPONENT'`, `included === true`

#### Scenario: Names without pipes are unaffected

- **WHEN** a v2 manifest row is `| [x] | .base button | 12719:50050 | COMPONENT_SET | NONE |`
- **THEN** `ManifestParserV2.parse()` produces a component with `name === '.base button'` (no spurious escape handling artifacts)

### Requirement: v2 manifest parser public shape is stable

`ManifestParserV2.parse(content)` SHALL return an object with the existing `ManifestResultV2` shape: `components: ManifestRowV2[]` and `metadata: ManifestMetadataV2`. No fields are added, removed, or renamed by this change.

#### Scenario: Result shape is preserved

- **WHEN** `ManifestParserV2.parse()` is called on any valid v2 manifest
- **THEN** the returned object has exactly the keys `components` and `metadata`
- **AND** each entry of `components` has exactly the keys `id`, `name`, `type`, `included`, `devStatus`
- **AND** `metadata` has the keys `scanFormatVersion` and optionally `file`, `variables`, `fileLastModified`
