---
title: "scan"
---
Scan a Figma file and generate a manifest of all components.

## Usage

```bash
specs scan [file] [options]
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
Include all components by default (ignore heuristics).

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

## Output Format

The manifest is a markdown file with metadata and component list:

```markdown
# Component Manifest

**Generated:** 2026-01-17T10:30:00.000Z
**File:** /absolute/path/to/data/library.file.json
**Variables:** /absolute/path/to/data/library.variables.json

---

## Components

- [x] DS Accordion (1234:5678, COMPONENT_SET)
- [x] DS Alert (1234:5679, COMPONENT_SET)
- [x] DS Avatar (1234:5680, COMPONENT_SET)
- [ ] DS Button Copy (1234:5681, COMPONENT)
- [x] DS Button (1234:5682, COMPONENT_SET)
- [x] DS Card (1234:5683, COMPONENT_SET)
```

**Metadata:**
- `Generated` - Timestamp of manifest creation
- `File` - Path to Figma file used
- `Variables` - Path to variables file (if provided)

**Component Format:**
- `[x]` - Included by default (`COMPONENT_SET` nodes)
- `[ ]` - Excluded (for curation)
- `(ID, TYPE)` - Figma node ID and type

## Curation

Edit the manifest to select which components to process:

```markdown
## Components

<!-- Include core components -->
- [x] DS Button (1234:1, COMPONENT_SET)
- [x] DS Alert (1234:2, COMPONENT_SET)

<!-- Exclude deprecated -->
- [ ] DS Button OLD (1234:3, COMPONENT_SET)

<!-- Exclude documentation examples -->
- [ ] Example/Usage (1234:4, COMPONENT)
```

## Examples

### Basic Scan

```bash
# Zero-config: auto-resolves the only configured source
# Default output: {dataDirectory}/library.manifest.md
specs scan

# Or pass an explicit file path
specs scan data/library.file.json -o components.md
```

### Multiple Sources

```bash
# When specs.config.yaml has multiple sources, pick one:
specs scan --source library
specs scan --source foundations
```

### With Variables

```bash
# Include variables path in manifest metadata
specs scan --variables data/library.variables.json
```

### Verbose Output

```bash
# See component count and file stats
specs scan --verbose

# Output:
# ✓ Scanned library.file.json
# ✓ Found 164 components
# ✓ Saved to /absolute/path/to/data/library.manifest.md
```

---

**See Also:**
- [Generate Command](/specs/cli/commands/generate/) - Generate specs from manifest or single component
- [Configuration Reference](/specs/cli/configuration/) - Format and config options
