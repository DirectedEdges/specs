---
title: "generate"
---
Generate component specifications from Figma data. Accepts either a markdown manifest (for multiple components) or a JSON file with a component flag (for a single component). The source argument is optional — without it, `generate` uses the default manifest location derived from your config.

## Usage

```bash
# Zero-config: uses default manifest from config (recommended)
specs generate

# From an explicit manifest (multiple components)
specs generate <manifest.md> [options]

# From a JSON file (single component)
specs generate <file.json> -c <component> [options]
```

## Source Modes

### Manifest Mode (recommended)

Pass a markdown manifest created by `scan` to generate specs for all selected components in one pass. This is faster than running `generate` multiple times, because the file is loaded and indexed once.

```bash
# Uses the default manifest from config: {dataDirectory}/{alias}.manifest.md
specs generate

# Or pass an explicit manifest path
specs generate components.md -o specs/library.yaml
```

The manifest references the source file and tracks which components to include. See [Scan Command](/cli/commands/scan/) for creating manifests.

### File Mode

Pass a Figma JSON file directly and specify a single component by name or node ID. Useful when setting up a new component or quickly iterating on one spec.

```bash
specs generate data/library.file.json -c "DS Button" -o specs/button.yaml
```

## Arguments

### `[source]` (optional)
Path to a markdown manifest or Figma REST API JSON file.

- **Not provided**: defaults to `{dataDirectory}/{alias}.manifest.md`, where `dataDirectory` comes from `specs.config.yaml` and `alias` is `library` if configured with `data: [file]`, otherwise the first source alias with `data: [file]`. This matches the default output of `specs scan`.
- **Manifest path (`.md`)**: manifest mode (multiple components)
- **Figma JSON (`.json`)**: file mode (requires `-c`)

```bash
# Default: data/library.manifest.md (from config)
specs generate

# Explicit manifest
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
License key for premium features.

When a valid Pro license is provided, generated specs include additional detail such as design token references, variable bindings, and visibility bindings. Without a license (or with an invalid key), specs are generated at the free tier — full structure and variants, but with raw values instead of token references.

**Resolution priority**: `--license` flag > `SPECS_LICENSE_KEY` env > `ANOVA_LICENSE_KEY` env

```bash
# Via flag
specs generate components.md -o specs/all.yaml -l "your-license-key"

# Via environment variable (recommended)
export SPECS_LICENSE_KEY="your-license-key"
specs generate components.md -o specs/all.yaml
```

See [Getting Started — License](/cli/getting-started.md/#step-3-set-your-license-key-optional) for setup details.

### `-o, --output <path>`
Output file or directory path. Accepts both file paths and directory paths.

- **File path**: Writes all output to a single file (e.g., `-o specs/library.yaml`)
- **Directory path**: Writes output files into the directory (e.g., `-o specs/`)
- **Not provided (manifest mode)**: Falls back to `config.outputDirectory` (default `./specs`)
- **Not provided (file mode)**: Outputs to stdout

```bash
# Single file
specs generate components.md -o specs/library.yaml

# Directory for split output
specs generate components.md -o specs/ --split-components

# Manifest mode without -o: uses config.outputDirectory
specs generate components.md

# Output to stdout (file mode)
specs generate data/library.file.json -c "Button" | yq .
```

### `-f, --format <format>`
Output format: `yaml` or `json`.

- **Default**: Uses `config.format.output` from config (or `JSON` if no config)
- **Override**: CLI flag takes precedence over config

```bash
specs generate components.md --format yaml -o specs/library.yaml
```

### `--data-dir <dir>`
Override the data directory used for resolving input files and auxiliary data (variables, styles). Defaults to `dataDirectory` from config, or `./data` if not configured.

```bash
specs generate components.md --data-dir ./custom-data -o specs/library.yaml
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
Separate API specification, variant configuration, and examples.

- **Default**: `false` (complete component data in each file)
- **Output**: Up to three files: `api.yaml` (anatomy, props), `variants.yaml` (default, variants), and `examples.yaml` (slotContentExamples, instanceExamples)
- `examples.yaml` is written only when at least one component has example data; components without examples are omitted from it.
- Example output (`slotContentExamples`, `instanceExamples`) is a [Pro feature](/settings/default-slot-content/) — on the free tier it is omitted, so `examples.yaml` is not produced.

```bash
specs generate components.md -o specs/ --split-concerns
```

```
specs/
├── api.yaml
├── variants.yaml
└── examples.yaml
```

When combined with `--split-components`, each component gets its own directory with concern files (`examples.yaml` appears only for components that have examples):

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
│   ├── variants.yaml
│   └── examples.yaml
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

### `--get-images`
Resolve unresolved registry images into real image files. Requires a [`processing.images`](/settings/images/) block in config, a configured source file key, and the `FIGMA_TOKEN` environment variable (the same token `specs fetch` uses).

```bash
specs generate components.md -o specs/ --split-components --get-images
```

Generation alone (the *detect* phase) records each image fill as an unresolved registry entry — the Figma identity in `$extensions['com.figma'].imageHash`, no `src` — structurally complete, but with no pixels. With `--get-images`, the CLI calls Figma's Get Image Fills endpoint, downloads each distinct image once, writes it as `_images/<imageHash>.<ext>` inside the output directory (format detected from the bytes — png, jpg, gif, or webp), and **adds** `src` to each entry — a path relative to the spec file that references it. The Figma identity survives for reverse-direction tooling:

```yaml
# without --get-images (detect phase)
images:
  dsCard__hero:
    $extensions:
      com.figma:
        imageHash: 705867125834a686a51bdf161a0a39cdba0f9a58

# with --get-images — src is ADDED; the identity survives
images:
  dsCard__hero:
    src: _images/705867125834a686a51bdf161a0a39cdba0f9a58.png
    $extensions:
      com.figma:
        imageHash: 705867125834a686a51bdf161a0a39cdba0f9a58
```

```
specs/
├── _images/
│   └── 705867125834a686a51bdf161a0a39cdba0f9a58.png
└── dsCard.yaml
```

`$image` pointers (in `backgroundImage` fills and `ImageBinding` examples) are unaffected — resolution touches one registry entry per image, never the references. Files are named by Figma's content hash, so an image shared by many components is downloaded and stored once, and re-runs are idempotent. Figma's download URLs are temporary and are never persisted. With `--use-subfolders` (or the combined component + concern layout), `src` becomes `../_images/...` so it still resolves relative to each spec file.

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

# 2. Create manifest (auto-resolves configured source; writes to data/library.manifest.md by default)
specs scan

# 3. Curate (edit data/library.manifest.md to select [x] components)

# 4. Generate specs (uses default manifest + outputDirectory from config)
specs generate
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
specs generate
```

---

**See Also:**
- [Scan Command](/cli/commands/scan/) - Create component manifest
- [Configuration Reference](/settings/) - Format and config options
- [Getting Started](/cli/getting-started/) - Installation and license setup
