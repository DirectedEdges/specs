---
title: "Configuration"
---

Configure Specs' processing behavior and data sources using `specs.config.yaml` for consistent, reproducible component specifications.

## Priority System

The CLI uses a hierarchical configuration system with three priority levels:

1. **CLI flags** (highest) - Explicit overrides for individual commands
2. **Config file** - Project defaults via `specs.config.yaml`
3. **Fallbacks** (lowest) - Convention-based defaults when no sources are configured

### CLI Flags

CLI flags always override config file settings:

```bash
# Config has format.output: JSON
# Flag overrides to YAML
specs generate data/library.file.json -c Button --format yaml
```

**Available flag overrides**:
- `--format` → overrides `config.format.output`
- `--variables` → overrides the variables file path for that run
- `--styles` → overrides the styles file path for that run

### Config File

Settings from `specs.config.yaml` apply when no CLI flag is provided.

### Fallbacks

Convention-based defaults when no sources are configured and no flags are provided:

```
project/
├── specs.config.yaml  # Config (if exists)
├── data/
│   ├── library.file.json      # Main file (specified in command)
│   └── foundations/           # Auto-discovery directory
│       ├── variables.json     # Auto-discovered
│       └── styles.json        # Auto-discovered
```

## Configuration File

### Location

The CLI searches for configuration in these locations (in order):

1. `./specs.config.yaml` (current directory)
2. `./specs.config.json` (current directory)
3. `~/.specs/config.yaml` (user home directory)
4. Custom path via `--config <path>` flag

### Format

Configuration uses YAML or JSON format:

```yaml
# specs.config.yaml

# Where `specs fetch` writes payloads, and where `generate` loads them from
dataDirectory: ./data

# Default location for generated spec files (can override with -o flag)
outputDirectory: ./specs

# Figma file keys and which payloads to fetch/load
sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
  foundations:
    key: REPLACE_WITH_FOUNDATIONS_FILE_KEY
    data: ['variables','styles']

# Processing and output configuration (shared with Figma plugin)
config:
  format:
    output: YAML
    keys: SAFE
    layout: LAYOUT
    tokens: TOKEN

  processing:
    subcomponents:
      match:
        - '{C} / _ / {S}'
    variantDepth: 2
    details: LAYERED

  include:
    invalidVariants: false
    invalidCombinations: true
```

## Validation

The CLI validates all configuration values and provides helpful error messages:

```bash
$ specs generate data/library.file.json -c Button
Warning: Invalid format.keys: 'invalid'. Using default: SAFE.
Valid values: SAFE, CAMEL, SNAKE, KEBAB, PASCAL, TRAIN
```

Invalid values fall back to defaults with warnings, so builds continue.

## Best Practices

### 1. Version Control Config

Commit `specs.config.yaml` to share settings across team:

```bash
git add specs.config.yaml
git commit -m "Add Specs CLI configuration"
```

### 2. Environment-Specific Configs

Use different configs for different environments:

```
project/
├── specs.config.yaml           # Default (development)
├── .specs.production.yaml       # Production
└── .specs.staging.yaml          # Staging
```

```bash
# Development (uses default)
specs generate data/library.file.json -c Button

# Production
specs generate data/library.file.json -c Button --config .specs.production.yaml
```

### 3. Document Custom Patterns

Add comments to explain project-specific settings:

```yaml
config:
  processing:
    # Match direct children and underscore-nested subcomponents
    subcomponents:
      match:
        - '{C} / {S}'
        - '{C} / _ / {S}'
      exclude:
        - '{C} / Examples / {S}'

    # Only 2 levels: size + variant (not size + variant + state)
    variantDepth: 2
```

### 4. Consistent Key Format

Choose one key format and stick with it:

```yaml
config:
  format:
    keys: CAMEL  # All keys in camelCase for consistency
```

## See Also

- [CLI Overview](/specs/cli/) - CLI command options
- [Getting Started](/specs/cli/getting-started/) - Installation and setup
- [Examples](/specs/config/examples/) - Configuration examples
