# `audit` Command

Scan a Figma file and generate a manifest of all components.

## Usage

```bash
specs audit <file> -o <manifest> [options]
```

## Arguments

### `<file>` (required)
Path to Figma REST API JSON file.

```bash
specs audit data/library.file.json -o components.md
```

## Options

### `-o, --output <path>`
Output manifest path.

- Required.

```bash
specs audit data/library.file.json -o manifests/design-system.md
```

### `--include-all`
Include all components by default (ignore heuristics).

### `-v, --variables <path>`
Variables JSON file path.

This is written into the manifest header as metadata for reference.

```bash
specs audit data/library.file.json -o components.md \
  --variables data/library.variables.json
```

### `--verbose`
Enable detailed logging.

```bash
specs audit data/library.file.json --verbose -o components.md
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

### Basic Audit

```bash
# Generate manifest
specs audit data/library.file.json -o components.md
```

### With Variables

```bash
# Include variables path in manifest metadata
specs audit data/library.file.json -o components.md \
  --variables data/library.variables.json
```

### Verbose Output

```bash
# See component count and file stats
specs audit data/library.file.json --verbose -o components.md

# Output:
# ✓ Scanned library.file.json
# ✓ Found 164 components
# ✓ Saved to /absolute/path/to/components.md
```

---

**See Also:**
- [Generate Command](./generate.md) - Generate specs from manifest or single component
- [Configuration Reference](../configuration.md) - Format and model options
