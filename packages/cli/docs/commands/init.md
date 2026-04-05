# `init` Command

Initialize a `.anova.config.yaml` file with production-ready defaults.

## Usage

```bash
anova init [options]
```

## Purpose

The `init` command scaffolds a fully-populated configuration file with:
- Sensible defaults for sourceDirectory (`./data`) and outputDirectory (`./specs`)
- All model processing, format, and include options with production-ready values
- Inline documentation with links to the full configuration reference
- Empty sources object ready for your Figma file keys

This is the recommended way to get started with Anova in a new project.

## Options

### `--force` / `-f`
Overwrite existing config file without prompting.

By default, if `.anova.config.yaml` exists, `init` prompts before overwriting. Use `--force` to skip the prompt.

```bash
# Prompt before overwrite (default)
anova init

# Overwrite without prompting
anova init --force
```

### `--config <path>` / `-c <path>`
Custom path for the config file (default: `.anova.config.yaml`).

```bash
# Create config in a custom location
anova init --config ./configs/dev.yaml

# Create multiple configs for different environments
anova init --config ./configs/dev.yaml --force
anova init --config ./configs/prod.yaml --force
```

## Examples

### Example 1: Basic Initialization

```bash
cd my-design-system
anova init

# Output:
# ✓ Created .anova.config.yaml
# 📚 Next steps:
#    1. Edit the config file to add your Figma file keys
#    2. Run: anova fetch
#    3. Run: anova audit data/library.file.json -o components.md
#    4. Run: anova generate components.md -o specs.yaml
#
# 📖 Documentation: packages/cli/docs/configuration.md
```

### Example 2: Environment-Specific Configs

```bash
# Development config
anova init --config .anova.dev.yaml --force

# Production config  
anova init --config .anova.prod.yaml --force

# Use with --config flag on other commands
anova fetch --config .anova.dev.yaml
anova generate data/library.file.json -c "Button" --config .anova.prod.yaml
```

### Example 3: Force Overwrite

```bash
# If you accidentally delete your config, recreate it
anova init --force
```

## What Gets Created

The init command creates a `.anova.config.yaml` file with the following structure:

```yaml
# Anova CLI Configuration (production-ready defaults)
#
# This file configures how Anova fetches and processes Figma component data.
# See: docs/cli/configuration.md for complete documentation.

# Where fetch writes payloads, and where generate reads from.
# See: https://docs.anova.dev/cli/configuration#sourceDirectory
sourceDirectory: ./data

# Default location for generated spec files (can override with -o flag).
# See: https://docs.anova.dev/cli/configuration#outputDirectory
outputDirectory: ./specs

# Figma file sources to fetch and process.
# See: https://docs.anova.dev/cli/configuration#sources
sources: {}

# Model processing and output configuration.
# See: https://docs.anova.dev/cli/configuration#model
model:
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
    variantNames: false
    invalidVariants: false
    invalidCombinations: true
```

Each section includes inline comments with references to the full documentation.

---

**See Also:**
- [Configuration Reference](../configuration.md) - Config file options
- [Getting Started](../getting-started.md) - Quick start guide
