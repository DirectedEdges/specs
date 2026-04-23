---
title: "Commands Reference"
---
Complete reference for all Specs CLI commands, options, and usage patterns.

## Command Overview

| Command | Purpose | Output |
|---------|---------|--------|
| [`init`](/specs/cli/commands/init/) | Initialize config file with defaults | `specs.config.yaml` |
| [`fetch`](/specs/cli/commands/fetch/) | Download raw REST payloads from Figma | JSON files in `dataDirectory` |
| [`generate`](/specs/cli/commands/generate/) | Generate specs from a manifest or single component | YAML/JSON spec file(s) |
| [`scan`](/specs/cli/commands/scan/) | List all components in file | Markdown manifest |
| [`applyCustomTokens`](/specs/cli/commands/apply-custom-tokens/) | Inject `$custom` objects into fetched data | Modified variables/styles JSON |

## Global Options

These options work with all commands:

- `--verbose` - Enable detailed logging
- `--help` - Show command help
- `--version` - Show CLI version

## Quick Start

### 1. Initialize Configuration

```bash
specs init
```

See [Init Command](/specs/cli/commands/init/) for details.

### 2. Download Figma Data

```bash
# Option A: .env in project root
# FIGMA_TOKEN=your_token

# Option B: export in current shell
export FIGMA_TOKEN="your_token"

specs fetch --verbose
```

See [Fetch Command](/specs/cli/commands/fetch/) for details.

### 3. Generate Component Specs

#### From a Manifest (recommended)
```bash
# Create manifest (auto-resolves configured source; default output: data/library.manifest.md)
specs scan

# Curate (edit data/library.manifest.md to select components)

# Generate specs — uses default manifest + outputDirectory from config
specs generate
```

#### Single Component
```bash
specs generate data/library.file.json -c "Button" -o specs/button.yaml
```

See [Generate Command](/specs/cli/commands/generate/) for details.

## File Outputs

`specs fetch` writes deterministic filenames based on your config aliases.

Example (with `dataDirectory: ./data`):

```
data/
├── library.file.json
├── library.variables.json
├── library.styles.json
├── foundations.variables.json
└── foundations.styles.json
```

`generate` uses these files by default when your `specs.config.yaml` declares the corresponding aliases and data types.

## Configuration File Discovery

Config file locations (searched in order):

1. `./specs.config.yaml` (current directory)
2. `./specs.config.json` (current directory)
3. `~/.specs/config.yaml` (user home)

Or specify a custom location:

```bash
specs generate data/library.file.json -c "Button" --config ./custom.yaml
```

## Priority System

When multiple sources provide the same setting, this priority applies.

### Output Format

1. `generate --format`
2. Config `config.format.output`

### Variables

`--variables` flag > config-derived `${dataDirectory}/${alias}.variables.json` list > `foundations/variables.json` fallback

### Styles

`--styles` flag > config-derived `${dataDirectory}/${alias}.styles.json` list > `foundations/styles.json` fallback

### Component Source File (manifest mode)

1. Manifest `**File:**`
2. Config-derived `${dataDirectory}/${alias}.file.json` (first alias with `data: [file]`, preferring `library`)

## Tips

### 1. Use Verbose Mode for Debugging

```bash
specs generate data/library.file.json -c "Button" --verbose 2>&1 | tee debug.log
```

### 2. Manifests Are Faster Than Multiple Generate Calls

```bash
# Slow (3 separate processes, each loads and indexes the file)
specs generate data/library.file.json -c "Button" -o specs/button.yaml
specs generate data/library.file.json -c "Alert" -o specs/alert.yaml
specs generate data/library.file.json -c "Modal" -o specs/modal.yaml

# Fast (1 process for all 3)
# Edit data/library.manifest.md to select Button, Alert, Modal
specs generate
```

### 3. Use Node IDs for Special Characters

```bash
# Component name: "Icon/Menu" (has slash)
specs generate data/library.file.json -c "5507:123"  # Node ID
```

### 4. Pipe to Other Tools

```bash
# Extract just props
specs generate data/library.file.json -c "Button" | yq '.props'

# Format and validate
specs generate data/library.file.json -c "Button" | yamllint -

# Convert YAML to JSON
specs generate data/library.file.json -c "Button" --format yaml | yq -o json > button.json
```

### 5. Check Manifest Before Generating

```bash
# Count selected components
grep "^\- \[x\]" data/library.manifest.md | wc -l

# List selected component names
grep "^\- \[x\]" data/library.manifest.md | sed 's/- \[x\] \(.*\) (.*/\1/'
```

## See Also

- [Getting Started](/specs/cli/getting-started/) - Installation and quick start
- [Configuration Reference](/specs/cli/configuration/) - Config file options
- [Examples](/specs/cli/examples/) - Real-world usage patterns

---

**Last Updated**: April 2026
