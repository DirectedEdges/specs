# CLI Configuration

Configure Specs' processing behavior and data sources using `specs.config.yaml` for consistent, reproducible component specifications.

## Overview

The CLI uses a hierarchical configuration system with three priority levels:

1. **CLI flags** (highest) - Explicit overrides for individual commands
2. **Config file** - Project defaults via `specs.config.yaml`
3. **Fallbacks** (lowest) - Convention-based defaults when no sources are configured

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
  # Format options - how data is serialized
  format:
    output: YAML
    keys: SAFE
    layout: LAYOUT
    tokens: TOKEN

  # Processing options - how data is analyzed
  processing:
    subcomponents:
      match:
        - '{C} / _ / {S}'
    variantDepth: 2
    details: LAYERED

  # Include options - what data to include
  include:
    invalidVariants: false
    invalidCombinations: true

```

## Config Section

The `config` section controls how Specs processes and outputs component data.

### Processing Options

Controls **how data is analyzed**:

#### `subcomponents` (object, optional)

Subcomponent discovery configuration. When present, enables subcomponent detection. When absent, subcomponents are not detected.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `scope` | `"NESTED"` \| `"PAGE"` | No | `NESTED` | Where to search. `NESTED` = component anatomy only; `PAGE` = also search the Figma page |
| `match` | `string[]` | Yes | — | Template patterns using `{C}` (component name) and `{S}` (subcomponent name) placeholders |
| `exclude` | `string[]` | No | — | Template patterns to exclude from matches. Same `{C}/{S}` syntax |

```yaml
config:
  processing:
    subcomponents:
      scope: PAGE
      match:
        - '{C} / {S}'
        - '{C} / _ / {S}'
      exclude:
        - '{C} / Examples / {S}'
```

An asset must match at least one `match` pattern to be considered a subcomponent. If it also matches an `exclude` pattern, the exclusion wins regardless of discovery source.

#### `variantDepth` (number)
Maximum variant property depth to process.

- **Default**: `9999` (unlimited)
- **Options**: `1`, `2`, `3`, or `9999` (unlimited)

```yaml
config:
  processing:
    variantDepth: 3  # Process up to 3 levels of variant properties
```

#### `details` (enum)
Detail level for variant data.

- **Default**: `LAYERED`
- **Options**:
  - `FULL` - Complete data for all variants
  - `LAYERED` - Optimized layered format showing only differences from default

```yaml
config:
  processing:
    details: LAYERED
```

### Format Options

Controls **how data is serialized**:

#### `output` (enum)
Output serialization format.

- **Default**: `JSON`
- **Options**:
  - `JSON` - JavaScript Object Notation
  - `YAML` - Human-readable YAML format

```yaml
config:
  format:
    output: YAML  # Generate YAML by default
```

**Note**: CLI `--format` flag overrides this setting for individual commands.

#### `keys` (enum)
Key name transformation strategy.

- **Default**: `SAFE`
- **Options**:
  - `SAFE` - Preserve structure without corrupting special characters
  - `CAMEL` - camelCase
  - `SNAKE` - snake_case
  - `KEBAB` - kebab-case
  - `PASCAL` - PascalCase
  - `TRAIN` - Train-Case

```yaml
config:
  format:
    keys: CAMEL  # Transform keys to camelCase
```

**Examples**:
- Input: `Padding Left` or `padding-left`
- `SAFE` → `Padding Left` (preserved)
- `CAMEL` → `paddingLeft`
- `SNAKE` → `padding_left`
- `KEBAB` → `padding-left`
- `PASCAL` → `PaddingLeft`
- `TRAIN` → `Padding-Left`

#### `layout` (enum)
Layout representation format.

- **Default**: `LAYOUT`
- **Options**:
  - `LAYOUT` - Tree structure with layout properties
  - `PARENT_CHILDREN` - Parent-child relationships only
  - `BOTH` - Include both representations

```yaml
config:
  format:
    layout: LAYOUT
```

#### `tokens` (enum)
Token reference format profile.

- **Default**: `TOKEN`
- **Options**:
  - `TOKEN` - Resolved token values with collection/name references
  - `TOKEN_NAME` - Token name only (no collection prefix)
  - `TOKEN_FIGMA_EXTENSIONS` - Token with Figma-specific extension data
  - `FIGMA_NAME` - Raw Figma variable/style names as-is
  - `CUSTOM` - Custom token objects injected via `applyCustomTokens`. Variables/styles with `$custom` use that object verbatim as the property value; those without fall back to `TOKEN_FIGMA_EXTENSIONS` format.

```yaml
config:
  format:
    tokens: TOKEN  # Default resolved token references
```

> **Using CUSTOM**: First run `specs applyCustomTokens <mapping>` to inject `$custom` objects into your fetched data files, then run `batch` or `generate`. The `applyCustomTokens` command auto-discovers variables/styles files from `dataDirectory` and `sources` in this config, or accepts explicit `-v`/`-s` paths. See [applyCustomTokens command](./commands/apply-custom-tokens.md) for details.

### Include Options

Controls **what data to include**:

#### `invalidVariants` (boolean)
Include invalid variant data in output.

- **Default**: `false`
- **Effect**: When `true`, includes variants that don't match all property combinations

```yaml
config:
  include:
    invalidVariants: false  # Exclude invalid variants
```

#### `invalidCombinations` (boolean)
Calculate and include invalid property combinations.

- **Default**: `true`
- **Effect**: When `true`, computes which prop combinations are invalid

```yaml
config:
  include:
    invalidCombinations: true  # Show invalid combinations (default)
```

#### `emptyVariants` (boolean)
Include layered variants that contain no element overrides.

- **Default**: `false`
- **Effect**: When `true`, includes all variants regardless of element presence. When `false`, excludes semantically empty layered variants from output.

```yaml
config:
  include:
    emptyVariants: false  # Exclude empty variants (default)
```

---

## Output Configuration

Controls **where and how to write** generated specifications. Configured via the `output` field in `specs.config.yaml` or CLI flags.

```yaml
output:
  splitComponents: false    # Create separate file per component
  splitConcerns: false      # Separate API from variants
  useSubfolders: false      # Use component subdirectories
  defaultFormat: yaml       # Output format (yaml|json)
```

### Output Modes

The CLI supports four output modes based on flag combinations:

| Mode | `--split-components` | `--split-concerns` | Output Structure |
|------|---------------------|-------------------|------------------|
| **Single-file** | ❌ | ❌ | `library.yaml` (all components) |
| **Per-component** | ✅ | ❌ | `button.yaml`, `alert.yaml`, ... |
| **Per-concern** | ❌ | ✅ | `api.yaml` + `variants.yaml` |
| **Combined** | ✅ | ✅ | `button/api.yaml`, `button/variants.yaml`, ... |

### `splitComponents` (boolean)
Create separate file per component.

- **Default**: `false` (single library file)
- **Output**: Individual `<component>.yaml` files
- **CLI Flag**: `--split-components`
- **Use Case**: Component-level ownership, isolated PRs

```yaml
output:
  splitComponents: true
  useSubfolders: false  # button.yaml, alert.yaml (flat)
```

```yaml
output:
  splitComponents: true
  useSubfolders: true   # button/button.yaml, alert/alert.yaml
```

**File naming**: Converts display names to camelCase (e.g., `"DS Alert"` → `dsAlert.yaml`)

### `splitConcerns` (boolean)
Separate API specification from variant configuration.

- **Default**: `false` (complete component data)
- **Output**: `api.yaml` (anatomy, props) + `variants.yaml` (default, variants)
- **CLI Flag**: `--split-concerns`
- **Use Case**: Backend/frontend separation, API-first development

```yaml
output:
  splitConcerns: true
```

**API file** (`api.yaml`):
```yaml
components:
  - name: Button
    anatomy: ...
    props: ...
  - name: Alert
    anatomy: ...
    props: ...
```

**Variants file** (`variants.yaml`):
```yaml
components:
  - name: Button
    default: ...
    variants: ...
  - name: Alert
    default: ...
    variants: ...
```

### `useSubfolders` (boolean)
Create component subdirectories when splitting by component.

- **Default**: `false` (flat structure)
- **Effect**: Only applies when `splitComponents: true`
- **CLI Flag**: `--use-subfolders`
- **Use Case**: Large component libraries, namespace organization

```yaml
output:
  splitComponents: true
  useSubfolders: true
```

**Without subfolders** (flat):
```
specs/
├── button.yaml
├── alert.yaml
└── card.yaml
```

**With subfolders**:
```
specs/
├── button/
│   └── button.yaml
├── alert/
│   └── alert.yaml
└── card/
    └── card.yaml
```

### `defaultFormat` (string)
Default output format for stdout only.

- **Default**: `yaml`
- **Options**: `yaml`, `json`
- **Override**: CLI `--format` flag takes precedence
- **Note**: File output is always YAML. This setting controls stdout format only.
- **Note**: Different from `config.format.output` (controls serialization, not file format)

```yaml
output:
  defaultFormat: yaml  # stdout format (files use YAML)
```

### Combined Mode Example

Using both `splitComponents` and `splitConcerns` creates component directories with concern files:

```yaml
output:
  splitComponents: true
  splitConcerns: true
  useSubfolders: false  # Component dirs created automatically
```

**Output structure**:
```
specs/
├── button/
│   ├── api.yaml       # Anatomy + props
│   └── variants.yaml  # Default + variants
├── alert/
│   ├── api.yaml
│   └── variants.yaml
└── card/
    ├── api.yaml
    └── variants.yaml
```

**Use cases**:
- Monorepo with separate concerns
- API versioning (track api.yaml in Git, exclude variants.yaml)
- Backend/frontend repositories (clone api files only)

### CLI Flag Priority

Output configuration follows the standard priority system:

1. **CLI flags** (highest): `--split-components`, `--split-concerns`, `--use-subfolders`
2. **Config file**: `output` field in `specs.config.yaml`
3. **Defaults** (lowest): Single-file mode, YAML format

```bash
# Config has splitComponents: false
# CLI overrides to true
specs generate --split-components
```

---

## Data Sources

Specs uses *raw REST payload files* on disk.

### `dataDirectory` (string)
Directory where `fetch` writes downloaded payloads, and where `generate` loads them from.

- **Default**: `./data`
- **Purpose**: Acts as the central repository for Figma data downloaded via the `fetch` command, and the default source for commands that process component specifications.
- **CLI override**: `--data-dir` flag on `fetch`, `scan`, and `generate` commands

```yaml
dataDirectory: ./data
```

> **Backward compatibility**: The deprecated `sourceDirectory` field still works as an alias for `dataDirectory`. If both are present, `dataDirectory` takes precedence. Using `sourceDirectory` will emit a deprecation warning.

### `outputDirectory` (string)
Default directory where `generate` commands write their output files. Can be overridden with the `-o` flag on individual commands.

- **Default**: `./specs`
- **Purpose**: When `-o` flag is not provided, generated spec files are written to this directory with names like `ComponentName.yaml` or `ComponentName.json`. In manifest mode, `generate` falls back to `outputDirectory` when `--output` is not specified.
- **Note**: The `generate` command's `--format` flag still controls output format (YAML vs JSON); this controls the directory only.

```yaml
outputDirectory: ./specs
```

### `sources` (map)
Map of aliases to Figma file keys and which data to fetch/load.

```yaml
sources:
  library:
    key: vtOioqf0hbfCzjj5iRgG3p
    data: ['file','variables','styles']
  foundations:
    key: n488on7ZWi67JDiFwoNul2
    data: ['variables','styles']
```

For each alias, the CLI uses deterministic filenames in `dataDirectory`:

- `${alias}.file.json` (only if `data` includes `file`)
- `${alias}.variables.json` (only if `data` includes `variables`)
- `${alias}.styles.json` (only if `data` includes `styles`)

#### Branch keys

The `key` field accepts either a main file key or a **branch file key**. To fetch from a Figma branch, replace the key with the branch's key (found in the branch URL: `figma.com/design/<KEY>/...`).

```yaml
sources:
  library:
    key: BRANCH_FILE_KEY   # fetches from the branch, not main
    data: ['file', 'variables', 'styles']
```

Branch data includes unpublished changes — variables, styles, and components that haven't been merged or published to main. See [Fetching Figma Branches](./commands/fetch.md#fetching-figma-branches) for implications.

## Priority System

When multiple configuration sources exist, they're merged with this priority:

### 1. CLI Flags (Highest Priority)

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

### 2. Config File

Settings from `specs.config.yaml` apply when no CLI flag is provided:

```yaml
# specs.config.yaml
config:
  format:
    output: YAML  # Used unless --format flag provided

dataDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

### 3. Fallbacks (Lowest Priority)

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

## Examples

### Example 1: Development Config

Optimized for fast iteration:

```yaml
# specs.config.yaml (development)

config:
  processing:
    variantDepth: 1  # Faster processing
    details: FULL    # Complete data for debugging
  format:
    output: YAML  # Human-readable
    keys: SAFE    # Preserve Figma names
  include:
    invalidVariants: true  # Show issues
    invalidCombinations: true

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

### Example 2: Production Config

Optimized for production output:

```yaml
# specs.config.yaml (production)

config:
  processing:
    variantDepth: 2
    details: LAYERED  # Compact output
  format:
    output: JSON  # Machine-readable
    keys: CAMEL   # Consistent naming
  include:
    invalidVariants: false  # Clean output
    invalidCombinations: false  # Omit combination analysis

dataDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

### Example 3: Custom Config Location

Use project-specific config:

```bash
# Use custom config for this project
specs generate data/library.file.json \
  -c "Button" \
  --config ./configs/mobile.config.yaml \
  -o specs/mobile/button.yaml
```

### Example 4: Override Config with Flags

Mix config file with CLI overrides:

```yaml
# specs.config.yaml
config:
  format:
    output: YAML
    keys: SAFE

dataDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

```bash
# Override format and variables for this command
specs generate data/library.file.json \
  -c "Button" \
  --format json \
  --variables ./custom/vars.json
```

**Result**: Uses `json` format and `./custom/vars.json`, but other config settings (keys, etc.) from config file.

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

- [Commands Reference](./commands/) - CLI command options
- [Getting Started](./getting-started.md) - Installation and setup
- [Examples](./examples.md) - Real-world usage patterns

---

**Last Updated**: April 2026
