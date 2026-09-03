---
title: "init"
---
Initialize the `config/` directory — `conventions.yaml`, `settings.yaml`, and `pipeline.yaml` — with production-ready defaults.

## Usage

```bash
specs init [options]
```

## Purpose

The `init` command scaffolds three configuration files, each answering one question:

- **`config/conventions/figma.yaml`** — facts about the Figma library: naming patterns, state classification, how images are expressed. See [Conventions](/schema/conventions/).
- **`config/settings.yaml`** — choices about this run: sources, spec output, assets. See [Settings](/schema/settings/).
- **`config/pipeline.yaml`** — transformers and analyses to run. See [Pipeline](/schema/pipeline/).

Each file ships with sensible defaults and inline documentation with links to the full configuration reference. `settings.yaml` includes an empty `data.sources` object ready for your Figma file keys.

This is the recommended way to get started with Specs in a new project.

## What Gets Created

```
config/
  conventions.yaml     # what the library is
  settings.yaml        # how output behaves, and where it goes
  pipeline.yaml        # what to run
```

`config/conventions/figma.yaml` declares how the library is authored — most conventions start commented out, since absence means the library declares no such convention:

```yaml
# Facts about the Figma library — every consumer of that library declares the same values.
# naming: NONE

# glyphs:
#   match: 'DS Icon Glyph / {i}'

subcomponents:
  # scope: NESTED
  match:
    - '{C} / _ / {S}'
  # exclude:
  #   - '{C} / Examples / {S}'

slotConstraints: false

# states:
#   hover:
#     prop: state
#     value: hover
```

`config/settings.yaml` declares run choices, grouped by concern:

```yaml
# Choices about this run — sources, spec output, assets.
author: <Your Name Here>

data:
  directory: ./data
  sources: {}

spec:
  directory: ./specs
  format: JSON
  keys: SAFE
  layout: LAYOUT
  tokens: TOKEN
  color: HEX
  variantDepth: 9999
  details: LAYERED
  # splitComponents: true
  # splitConcerns: true
  # useSubfolders: true
```

`config/pipeline.yaml` declares the work to run — everything commented out until you opt in:

```yaml
# Work this workspace runs: transformers and analyses.
# transformers:
#   - name: contract
#   - name: css
#   - name: react

# analyses:
#   - name: dependencies
```

Each section includes inline comments with references to the full documentation.

## Options

### `--force`
Overwrite existing config files without prompting.

By default, if any of the three files exists, `init` prompts before overwriting. Use `--force` to skip the prompt.

```bash
# Prompt before overwrite (default)
specs init

# Overwrite without prompting
specs init --force
```

### `--config <path>` / `-c <path>`
Custom directory to write the `config/` folder into (default: current directory).

```bash
# Scaffold config/ inside a workspace subdirectory
specs init --config ./workspaces/library
# Creates ./workspaces/library/config/{conventions,settings,pipeline}.yaml
```

## Examples

### Example 1: Basic Initialization

```bash
cd my-design-system
specs init

# Output:
# ✓ Created config/conventions/figma.yaml
# ✓ Created config/settings.yaml
# ✓ Created config/pipeline.yaml
# 📚 Next steps:
#    1. Edit the config file to add your Figma file keys
#    2. Run: specs fetch
#    3. Run: specs scan
#    4. Run: specs generate
```

### Example 2: Multiple Workspaces

```bash
# One config/ directory per workspace
specs init --config ./workspaces/dev --force
specs init --config ./workspaces/prod --force

# Use with --config flag on other commands
specs fetch --config ./workspaces/dev/config
specs generate data/library.file.json -c "Button" --config ./workspaces/prod/config
```

### Example 3: Force Overwrite

```bash
# If you accidentally delete your config, recreate it
specs init --force
```

## Upgrading from a single config file

A pre-split `specs.config.yaml` (or `.json`) is no longer read (ADR-071), and `init` refuses to run while one is present — scaffolding defaults over it would quietly replace whatever the workspace actually declared:

```
Error: found specs.config.yaml — a pre-split configuration (ADR-071).
  Run `specs migrate config` to convert it, keeping what this workspace declares.
  To scaffold fresh defaults instead, remove specs.config.yaml first.
```

Run [`specs migrate config`](/cli/commands/migrate/) to convert the file into the three-file layout — the [Settings](/schema/settings/) and [Conventions](/schema/conventions/) references show where each former member now lives. Use `init` only for a workspace with no existing configuration.

---

**See Also:**
- [Configuration Reference](/settings/) - Config file options
- [Getting Started](/cli/getting-started/) - Quick start guide
