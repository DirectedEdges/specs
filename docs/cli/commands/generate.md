# `generate` Command

Generate component specifications from Figma data. Accepts either a markdown manifest (for multiple components) or a JSON file with a component flag (for a single component).

## Usage

```bash
# From a manifest (multiple components)
specs generate <manifest.md> [options]

# From a JSON file (single component)
specs generate <file.json> -c <component> [options]
```

## Source Modes

### Manifest Mode (recommended)

Pass a markdown manifest created by `audit` to generate specs for all selected components in one pass. This is faster than running `generate` multiple times, because the file is loaded and indexed once.

```bash
specs generate components.md -o specs/library.yaml
```

The manifest references the source file and tracks which components to include. See [Audit Command](./audit.md) for creating manifests.

### File Mode

Pass a Figma JSON file directly and specify a single component by name or node ID. Useful when setting up a new component or quickly iterating on one spec.

```bash
specs generate data/library.file.json -c "DS Button" -o specs/button.yaml
```

## Arguments

### `<source>` (required)
Path to a markdown manifest or Figma REST API JSON file.

```bash
# Manifest
specs generate components.md -o specs/all.yaml

# JSON file
specs generate data/library.file.json -c "Button" -o specs/button.yaml
```

## Options

### `-c, --component <name|id>`
Component name or Figma node ID. Required in file mode, ignored in manifest mode.

```bash
# By name
specs generate data/library.file.json -c "DS Button"

# By node ID (useful for names with special characters)
specs generate data/library.file.json -c "1234:5678"
```

### `-l, --license <key>`
License key for premium features. Can also be set via the `SPECS_LICENSE_KEY` environment variable.

When a valid Pro license is provided, generated specs include additional detail such as design token references, variable bindings, and visibility bindings. Without a license (or with an invalid key), specs are generated at the free tier — full structure and variants, but with raw values instead of token references.

```bash
# Via flag
specs generate components.md -o specs/all.yaml -l "your-license-key"

# Via environment variable (recommended)
export SPECS_LICENSE_KEY="your-license-key"
specs generate components.md -o specs/all.yaml
```

See [Getting Started — License](../getting-started.md#step-3-set-your-license-key-optional) for setup details.

### `-o, --output <path>`
Output file or directory path. If not provided, outputs to stdout.

```bash
# Single file
specs generate components.md -o specs/library.yaml

# Directory for split output
specs generate components.md -o specs/ --split-components

# Output to stdout
specs generate data/library.file.json -c "Button" | yq .
```

### `-f, --format <format>`
Output format: `yaml` or `json`.

- **Default**: Uses `config.format.output` from config (or `JSON` if no config)
- **Override**: CLI flag takes precedence over config

```bash
specs generate components.md --format yaml -o specs/library.yaml
```

### `-v, --variables <path>`
External variables JSON file.

- **Default** (no flag): loads all `${alias}.variables.json` for aliases in config whose `data` includes `variables`.
- **Fallback** (no sources configured): tries `foundations/variables.json` next to the `<file>`.
- **Override**: CLI flag replaces that list for this run.

```bash
specs generate data/library.file.json -c "Button" --variables data/library.variables.json
```

### `-s, --styles <path>`
External styles JSON file.

- **Default** (no flag): loads all `${alias}.styles.json` for aliases in config whose `data` includes `styles`.
- **Fallback** (no sources configured): tries `foundations/styles.json` next to the `<file>`.
- **Override**: CLI flag replaces that list for this run.

```bash
specs generate data/library.file.json -c "Button" --styles data/library.styles.json
```

### `--split-components`
Create a separate file per component (manifest mode only).

- **Default**: `false` (single file with all components)
- **Output**: Individual files named `componentName.yaml`

```bash
specs generate components.md -o specs/ --split-components
```

```
specs/
├── dsButton.yaml
├── dsAlert.yaml
└── dsCard.yaml
```

### `--split-concerns`
Separate API specification from variant configuration.

- **Default**: `false` (complete component data in each file)
- **Output**: Two files: `api.yaml` (anatomy, props) and `variants.yaml` (default, variants)

```bash
specs generate components.md -o specs/ --split-concerns
```

```
specs/
├── api.yaml
└── variants.yaml
```

When combined with `--split-components`, each component gets its own directory with concern files:

```bash
specs generate components.md -o specs/ --split-components --split-concerns
```

```
specs/
├── dsButton/
│   ├── api.yaml
│   └── variants.yaml
├── dsAlert/
│   ├── api.yaml
│   └── variants.yaml
└── dsCard/
    ├── api.yaml
    └── variants.yaml
```

### `--use-subfolders`
Organize component files in subdirectories (requires `--split-components`). Wraps each component file in its own folder.

```bash
specs generate components.md -o specs/ --split-components --use-subfolders
```

```
specs/
├── dsButton/
│   └── dsButton.yaml
├── dsAlert/
│   └── dsAlert.yaml
└── dsCard/
    └── dsCard.yaml
```

### `--config <path>`
Path to configuration file.

```bash
specs generate components.md --config configs/mobile.yaml -o specs/mobile.yaml
```

### `--verbose`
Enable detailed logging with progress indicator.

```bash
specs generate components.md --verbose -o specs/library.yaml
```

**Manifest mode output:**
```
✓ Loaded manifest: 150 components (42 selected)
⏳ Processing 42 components...

[1/42] DS Accordion... ✓
[2/42] DS Alert... ✓
...
[42/42] DS Toggle... ✓

✓ Generated specs
  - 42 components successful
✓ Saved to specs/library.yaml
```

## Examples

### Manifest workflow

```bash
# 1. Fetch data
specs fetch

# 2. Create manifest
specs audit data/library.file.json -o components.md

# 3. Curate (edit components.md to select [x] components)

# 4. Generate specs
specs generate components.md -o specs/library.yaml
```

### Single component

```bash
specs generate data/library.file.json -c "DS Button" -o specs/button.yaml
```

### Per-component files

```bash
specs generate components.md -o specs/ --split-components
```

### With license key

```bash
export SPECS_LICENSE_KEY="your-license-key"
specs generate components.md -o specs/library.yaml
```

---

**See Also:**
- [Audit Command](./audit.md) - Create component manifest
- [Configuration Reference](../configuration.md) - Format and config options
- [Getting Started](../getting-started.md) - Installation and license setup
