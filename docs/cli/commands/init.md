# `init` Command

Initialize a `specs.config.yaml` file with production-ready defaults.

## Usage

```bash
specs init [options]
```

## Purpose

The `init` command scaffolds a fully-populated configuration file with:
- Sensible defaults for dataDirectory (`./data`) and outputDirectory (`./specs`)
- All processing, format, and include options with production-ready values
- Inline documentation with links to the full configuration reference
- Empty sources object ready for your Figma file keys

This is the recommended way to get started with Specs in a new project.

## Options

### `--force` / `-f`
Overwrite existing config file without prompting.

By default, if `specs.config.yaml` exists, `init` prompts before overwriting. Use `--force` to skip the prompt.

```bash
# Prompt before overwrite (default)
specs init

# Overwrite without prompting
specs init --force
```

### `--config <path>` / `-c <path>`
Custom path for the config file (default: `specs.config.yaml`).

```bash
# Create config in a custom location
specs init --config ./configs/dev.yaml

# Create multiple configs for different environments
specs init --config ./configs/dev.yaml --force
specs init --config ./configs/prod.yaml --force
```

## Examples

### Example 1: Basic Initialization

```bash
cd my-design-system
specs init

# Output:
# ✓ Created specs.config.yaml
# 📚 Next steps:
#    1. Edit the config file to add your Figma file keys
#    2. Run: specs fetch
#    3. Run: specs scan data/library.file.json -o components.md
#    4. Run: specs generate components.md -o specs.yaml
#
# 📖 Documentation: docs/cli/configuration.md
```

### Example 2: Environment-Specific Configs

```bash
# Development config
specs init --config .specs.dev.yaml --force

# Production config  
specs init --config .specs.prod.yaml --force

# Use with --config flag on other commands
specs fetch --config .specs.dev.yaml
specs generate data/library.file.json -c "Button" --config .specs.prod.yaml
```

### Example 3: Force Overwrite

```bash
# If you accidentally delete your config, recreate it
specs init --force
```

## What Gets Created

The init command creates a `specs.config.yaml` file with the following structure:

```yaml
# Specs CLI Configuration (production-ready defaults)
#
# This file configures how Specs fetches and processes Figma component data.
# See: docs/cli/configuration.md for complete documentation.

# Where fetch writes payloads, and where generate reads from.
# See: https://docs.specs.dev/cli/configuration#dataDirectory
dataDirectory: ./data

# Default location for generated spec files (can override with -o flag).
# See: https://docs.specs.dev/cli/configuration#outputDirectory
outputDirectory: ./specs

# Figma file sources to fetch and process.
# See: https://docs.specs.dev/cli/configuration#sources
sources: {}

# Processing and output configuration.
# See: https://docs.specs.dev/cli/configuration#config
config:
  processing:
    subcomponents:
      # scope: NESTED
      match:
        - '{C} / _ / {S}'
      # exclude:
      #   - '{C} / Examples / {S}'
    # glyphNamePattern: 'DS Icon Glyph /'
    variantDepth: 9999
    details: LAYERED
  format:
    output: JSON
    keys: SAFE
    layout: LAYOUT
    tokens: TOKEN
  include:
    invalidVariants: false
    invalidCombinations: true
```

Each section includes inline comments with references to the full documentation.

---

**See Also:**
- [Configuration Reference](../configuration.md) - Config file options
- [Getting Started](../getting-started.md) - Quick start guide
