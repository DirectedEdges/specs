---
title: "scan"
---
Scan a Figma file and generate a manifest of all components.

## Usage

```bash
specs scan [file] [options]
```

## Format

The manifest is a markdown file with a metadata header, a Components table, and (when `glyphNamePattern` is configured) a read-only Glyphs table:

```markdown
# Component Manifest

**Scan format version:** 2  
**Generated:** 2026-05-08T18:02:11Z  
**File:** /absolute/path/to/data/library.file.json
**Variables:** /absolute/path/to/data/library.variables.json
**File last modified:** 2026-05-08T17:48:26Z

---

## Components

| ✓ | Name | ID | Type | Dev Status |
|------|------|------|------|------------|
| [x] | DS Accordion | 1234:5678 | COMPONENT_SET | READY_FOR_DEV |
| [x] | DS Alert | 1234:5679 | COMPONENT_SET | READY_FOR_DEV |
| [ ] | DS Avatar | 1234:5680 | COMPONENT_SET | NONE |
| [ ] | DS Button Copy | 1234:5681 | COMPONENT | NONE |
| [x] | DS Button | 1234:5682 | COMPONENT_SET | READY_FOR_DEV |

## Glyphs

_Detected via `glyphNamePattern`. Excluded from `specs generate`._

| Name | ID | Type |
|------|------|------|
| DS Icon Glyph / arrow-down | 1234:9001 | COMPONENT |
| DS Icon Glyph / close | 1234:9002 | COMPONENT |
```

**Metadata:**
- `Scan format version` — manifest format version (currently `2`); used to detect and migrate older manifests automatically.
- `Generated` — Timestamp of manifest creation.
- `File` — Path to Figma file used.
- `Variables` — Path to variables file (if provided).
- `File last modified` — File-level `lastModified` timestamp from the Figma REST payload.

**Components row format:**
- `[x]` / `[ ]` — checked / unchecked. Edit by hand to curate.
- `Dev Status` — `READY_FOR_DEV` (designer-flagged in Figma Dev Mode) or `NONE` (unset). Read-only on each scan; changes drive the default merge behavior.

**Glyphs row format:**
- No checkboxes — glyphs are always excluded from `specs generate`. The section is purely informational so you can see what was detected.
- `Type` — `COMPONENT` or `COMPONENT_SET`.

## Authoring

Edit the manifest to refine selections. The `Dev Status` column is informational — only the `✓` cell drives `generate`:

```markdown
| ✓ | Name | ID | Type | Dev Status |
|------|------|------|------|------------|
| [x] | DS Button | 1234:1 | COMPONENT_SET | READY_FOR_DEV |
| [x] | DS Alert | 1234:2 | COMPONENT_SET | READY_FOR_DEV |
| [ ] | DS Button OLD | 1234:3 | COMPONENT_SET | NONE |
| [ ] | Example/Usage | 1234:4 | COMPONENT | NONE |
```

### Defaults

When generating a fresh manifest (no prior file exists, or `--reset-checks` is set), `scan` decides which components to check using this rule:

1. **If any component in the file has `devStatus: READY_FOR_DEV`** (set by designers in Figma's Dev Mode): only those components are checked. Everything else is unchecked.
2. **Otherwise** (no `devStatus` signal exists anywhere in the file): falls back to a heuristic that includes all `COMPONENT_SET` and standalone `COMPONENT` nodes. This preserves backward compatibility for libraries that haven't adopted Dev Mode status.

`--include-all` overrides both — every row is checked.

### Rescan

If a manifest already exists at the output path, `scan` merges with it instead of overwriting:

- **devStatus unchanged for a row** → prior checkbox state is preserved.
- **devStatus changed for a row** → Figma wins by default. The checkbox flips to match the new devStatus (`READY_FOR_DEV` → `[x]`, `NONE` → `[ ]`). Use `--keep-checks` to suppress this and preserve manual choices.
- **New components** discovered in the file → checked according to the default rule above.
- **Components removed** from the file → dropped from the manifest. The summary line reports the count.

A summary line is printed after each merge, e.g. `Merge: 2 added, 1 removed, 5 updated by devStatus, 180 preserved`.

### Glyph partitioning

When `config.processing.glyphNamePattern` is set in `specs.config.yaml`, top-level components whose names match the pattern are routed to a separate `## Glyphs` section in the manifest instead of `## Components`. The pattern uses `{i}` as the glyph-name placeholder — for example, `'DS Icon Glyph / {i}'` matches `DS Icon Glyph / arrow-down` and extracts `arrow-down`. This is the same pattern syntax the processing engine uses for glyph detection inside component instances, so what `scan` partitions matches what `generate` treats as a glyph at processing time.

```yaml
# specs.config.yaml
config:
  processing:
    glyphNamePattern: 'DS Icon Glyph / {i}'
```

Glyphs in the partitioned section are:

- **Read-only.** No checkbox column; `specs generate` ignores them entirely. To include or exclude a glyph from generation, change its name in Figma so it no longer matches (or change the pattern).
- **Re-derived on every scan.** The Glyphs section is rebuilt from the current Figma payload — manual edits to that section won't survive a rescan.
- **Omitted when empty.** If no components match the pattern, the section isn't written.

If you remove `glyphNamePattern` from config and rescan, previously-partitioned glyphs return to `## Components` and become curatable again.

## Examples

### Basic scan

```bash
# Zero-config: auto-resolves the only configured source
# Default output: {dataDirectory}/library.manifest.md
specs scan

# Or pass an explicit file path
specs scan data/library.file.json -o components.md
```

### Multiple sources

```bash
# When specs.config.yaml has multiple sources, pick one:
specs scan --source library
specs scan --source foundations
```

### With variables

```bash
# Include variables path in manifest metadata
specs scan --variables data/library.variables.json
```

### Verbose output

```bash
# See component count and file stats
specs scan --verbose

# Output:
# ✓ Scanned library.file.json
# ✓ Found 164 components (12 selected, 152 excluded)
# ✓ Detected 48 glyphs (excluded from generate)
#   Merge: 1 updated by devStatus, 163 preserved
# ✓ Saved to /absolute/path/to/data/library.manifest.md
```

## Arguments

### `[file]` (optional)
Path to Figma REST API JSON file. When omitted, `scan` resolves the file from your configured sources in `specs.config.yaml`:

- **1 source configured** → auto-selected
- **2+ sources configured** → must specify one with `--source <alias>`
- **No sources configured** → error; pass `[file]` explicitly

```bash
# Zero-config: auto-resolves when one source is configured
specs scan

# Select a specific source when multiple are configured
specs scan --source library

# Or pass a file path explicitly
specs scan data/library.file.json
```

## Options

### `--source <alias>`
Configured source alias to scan. Required when multiple sources exist in `specs.config.yaml`. Cannot be combined with an explicit `[file]` argument.

```bash
specs scan --source library
```

### `-o, --output <path>`
Output manifest path. Optional — defaults to `{dataDirectory}/{alias}.manifest.md`, where `dataDirectory` comes from `specs.config.yaml` and `alias` is either the resolved source name or derived from the input filename (e.g., `library.file.json` → `library.manifest.md`).

```bash
# Explicit output path
specs scan -o manifests/design-system.md

# Default: writes to data/library.manifest.md (from config dataDirectory)
specs scan --config specs.config.yaml
```

### `--data-dir <dir>`
Override the data directory used for resolving input files and default output path. Defaults to `dataDirectory` from config, or `./data` if not configured.

```bash
specs scan --data-dir ./custom-data
```

### `--config <path>`
Path to config file. Used to resolve `dataDirectory` and `sources` for auto-selection and the default output path.

### `--include-all`
Include all components regardless of devStatus or heuristics. Overrides the default rule and bypasses the merge step entirely.

### `--keep-checks`
Preserve the prior manifest's checkbox state for every existing row, even when a component's `devStatus` has changed since the last scan. The Dev Status column still updates so you can see Figma's signal — only the `✓` column is locked. Newly-discovered components still use the default inclusion rule.

Use this when you've made deliberate manual curation choices that should survive Figma's signal flipping.

### `--reset-checks`
Ignore the existing manifest entirely and re-derive every checkbox from current `devStatus` (or the heuristic fallback). Equivalent to deleting the manifest before running `scan`.

`--keep-checks` and `--reset-checks` are mutually exclusive.

### `-v, --variables <path>`
Variables JSON file path.

This is written into the manifest header as metadata for reference.

```bash
specs scan --variables data/library.variables.json
```

### `--verbose`
Enable detailed logging.

```bash
specs scan --verbose
```

## Migration

Manifests produced by older versions of `scan` (checkbox-list format like `- [x] Name (id, TYPE)`) are detected automatically. On the next `scan`, prior checkbox state is preserved as-is, the new `Dev Status` column is populated from the current Figma payload, and the file is rewritten in the v2 table format. No manual migration step is required.

---

**See Also:**
- [Generate Command](/cli/commands/generate/) - Generate specs from manifest or single component
- [Render Command](/cli/commands/render/) - Uses scan data to bind glyphs, styles, and variables when rendering in Figma
- [glyphNamePattern](/settings/glyph-name-pattern/) - Pattern syntax that drives Glyphs-section partitioning
- [Configuration Reference](/settings/) - Format and config options
