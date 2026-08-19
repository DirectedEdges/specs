---
title: "generate"
---
Generate component specifications from Figma. There are three ways to run it, distinguished by where the Figma data comes from: a **manifest** listing many components, a **JSON file** plus one named component, or the **live Figma file** itself over the CLI bridge.

```bash
specs generate                                    # manifest mode — many components
specs generate <file.json> -c <component>         # single component mode
specs generate --from-bridge                      # bridge mode — live selection
```

| Mode | Source | Produces | Use it when |
|------|--------|----------|-------------|
| [Manifest](#manifest-mode) | `.md` manifest + downloaded JSON | Every selected component | Generating or regenerating the library |
| [Single component](#single-component-mode) | Downloaded JSON + `-c` | One component | Setting up or iterating on one spec |
| [Bridge](#bridge-mode) | The connected Figma file, live | The current selection | Checking work in progress, or a `render` round-trip |

Manifest and single component mode both read a Figma REST API snapshot that `specs fetch` downloaded, and run the transformer inside the CLI. Bridge mode reads nothing from disk — the plugin generates against the live document and the CLI only writes the result out.

## Manifest Mode

Pass a markdown manifest created by [`scan`](/cli/commands/scan/) to generate specs for all selected components in one pass. The manifest points at the source JSON file and tracks which components are included (`[x]`). This is faster than running `generate` per component, because the file is loaded and indexed once.

The full workflow:

```bash
# 1. Download the Figma data
specs fetch

# 2. Build a manifest of everything in the file
specs scan

# 3. Curate — edit data/library.manifest.md and check [x] the components you want

# 4. Generate
specs generate
```

With no arguments, step 4 uses the default manifest (`{data.directory}/{alias}.manifest.md`) and writes to `spec.directory` from `config/settings.yaml`. Pass either explicitly to override:

```bash
specs generate components.md -o specs/library.yaml
```

Manifest mode requires an output destination — `-o` or `spec.directory` — since it can produce many files. Control the file layout with [`--split-components`](#--split-components), [`--split-concerns`](#--split-concerns), and [`--use-subfolders`](#--use-subfolders):

```bash
specs generate -o specs/ --split-components
```

```
✓ Loaded manifest: 150 components (42 selected)
⏳ Processing 42 components...

[1/42] DS Accordion... ✓
[2/42] DS Alert... ✓
...
[42/42] DS Toggle... ✓

✓ Generated specs
  - 42 components successful
```

Components that fail are reported individually and the rest still generate; the run exits non-zero if any failed.

## Single Component Mode

Pass a Figma JSON file directly and name one component with `-c`, by name or node ID. Useful when setting up a new component, or iterating quickly on one spec without touching the rest of the library.

```bash
specs fetch
specs generate data/library.file.json -c "DS Button" -o specs/button.yaml
```

The component is resolved against the JSON file's components and component sets. Node IDs work equally well, and are the reliable choice when a name contains special characters or is duplicated:

```bash
specs generate data/library.file.json -c "1234:5678" -o specs/button.yaml
```

Without `-o` (and with no configured `spec.directory`), the spec goes to stdout — handy for piping:

```bash
specs generate data/library.file.json -c "DS Button" -f yaml | yq '.dsButton.anatomy'
```

Variables and styles are resolved from your configured sources; without config, `generate` falls back to `foundations/variables.json` and `foundations/styles.json` next to the JSON file. Override either with [`-v`](#-v---variables-path) / [`-s`](#-s---styles-path).

## Bridge Mode

Generate from whatever is selected right now in a connected Figma file — no `specs fetch`, no downloaded JSON. Requires the [bridge](/cli/commands/bridge/) running and the Specs 2 plugin open in Figma with its **CLI Bridge** toggle enabled.

```bash
specs bridge start
specs generate --from-bridge -o specs/button.yaml
```

```
✓ Generated from selection: DS Button
✓ Saved to specs/button.yaml
```

Because the plugin does the generating, bridge mode behaves differently from the other two in ways worth knowing:

- **The plugin's settings and license govern the spec.** The conventions and settings that shaped the output — key formatting, tier-gated detail — are the plugin's, not your `config/` files. `-l/--license` has no effect; the plugin uses the license stored in its own UI.
- **Your CLI config still controls where and how the spec is written.** `spec.directory`, `spec.format`, and the output flags all apply as usual.
- **The output is as current as the file.** Unsaved and just-edited work is included, so this reflects the document rather than the last fetch.
- **`-c`, `-v`, `-s`, and `--data-dir` are ignored**, and passing a `source` argument is an error.

The selection must be a component, component set, or frame. To target something other than the selection — for a repeatable script, where relying on a manual selection is fragile — pass [`--node`](#--node-id). When several Figma files are connected to one bridge, pick one with [`--file`](#--file-filekey).

Since bridge mode reads the live document, it closes the loop on [`render`](/cli/commands/render/) — render a spec into Figma, then read the result back and compare:

```bash
specs bridge start
specs render specs/dsButton.yaml
specs generate --from-bridge -o specs/roundtrip/dsButton.yaml
diff specs/dsButton.yaml specs/roundtrip/dsButton.yaml
```

Common failures:

- `Error: bridge is not running.` — start it with `specs bridge start`.
- `Nothing selected in Figma...` — select a component, component set, or frame in the connected file.
- `Selection must be a component, component set, or frame — got INSTANCE.` — select the source component rather than an instance of it.

## Arguments

### `[source]`
Path to a markdown manifest or a Figma REST API JSON file. The mode is detected from its content.

- **Not provided**: defaults to `{data.directory}/{alias}.manifest.md`, where `data.directory` comes from `config/settings.yaml` and `alias` is `library` if configured with `fetch: [file]`, otherwise the first source alias with `fetch: [file]`. This matches the default output of `specs scan`.
- **Markdown manifest**: manifest mode.
- **Figma JSON**: single component mode — requires `-c`.
- **Bridge mode**: takes no source argument; passing one is an error.

## Options

### `-c, --component <name|id>`
Component name or Figma node ID. Required in single component mode; ignored in manifest and bridge mode.

### `-o, --output <path>`
Output file or directory path.

- **File path**: writes all output to a single file (e.g. `-o specs/library.yaml`).
- **Directory path**: writes output files into the directory (e.g. `-o specs/`).
- **Not provided**: falls back to `spec.directory` from `config/settings.yaml` (default `./specs`). Required in manifest mode if that isn't configured; single component and bridge mode write to stdout instead.

### `-f, --format <format>`
Output format: `yaml` or `json`. Defaults to `spec.format` from `config/settings.yaml` (or JSON with no config); the flag takes precedence.

### `-l, --license <key>`
License key for premium features.

With a valid Pro license, generated specs include additional detail such as design token references, variable bindings, and visibility bindings. Without one (or with an invalid key), specs are generated at the free tier — full structure and variants, but raw values instead of token references.

**Resolution priority**: `--license` flag > `SPECS_LICENSE_KEY` env > `ANOVA_LICENSE_KEY` env

```bash
export SPECS_LICENSE_KEY="your-license-key"
specs generate
```

No effect in bridge mode, where the plugin's own license applies. See [Getting Started](/cli/getting-started/#step-2-set-up-your-environment) for setup.

### `--data-dir <dir>`
Override the data directory used for resolving input files and auxiliary data (variables, styles). Defaults to `data.directory` from `config/settings.yaml`, or `./data`.

### `-v, --variables <path>`
External variables JSON file.

- **Default** (no flag): loads all `${alias}.variables.json` for aliases in config whose `fetch` includes `variables`.
- **Fallback** (no sources configured): tries `foundations/variables.json` next to the source JSON file.
- **Override**: the flag replaces that list for this run.

### `-s, --styles <path>`
External styles JSON file.

- **Default** (no flag): loads all `${alias}.styles.json` for aliases in config whose `fetch` includes `styles`.
- **Fallback** (no sources configured): tries `foundations/styles.json` next to the source JSON file.
- **Override**: the flag replaces that list for this run.

### `--split-components`
Create a separate file per component, instead of one file containing all of them.

```bash
specs generate -o specs/ --split-components
```

```
specs/
├── dsButton.yaml
├── dsAlert.yaml
└── dsCard.yaml
```

### `--split-concerns`
Separate API specification, variant configuration, and examples into up to three files: `api.yaml` (anatomy, props), `variants.yaml` (default, variants), and `examples.yaml` (`slotContentExamples`, `instanceExamples`).

```bash
specs generate -o specs/ --split-concerns
```

```
specs/
├── api.yaml
├── variants.yaml
└── examples.yaml
```

`examples.yaml` is written only when at least one component has example data, and components without examples are omitted from it. Example output is a [Pro feature](/settings/default-slot-content/) — on the free tier it's omitted entirely, so no `examples.yaml` is produced.

Combined with `--split-components`, each component gets its own directory of concern files:

```bash
specs generate -o specs/ --split-components --split-concerns
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
specs generate -o specs/ --split-components --use-subfolders
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
Resolve unresolved registry images into real image files. Requires a [`figma.images`](/settings/images/) convention in `config/conventions.yaml`, a configured source file key, and the `FIGMA_TOKEN` environment variable (the same token `specs fetch` uses).

```bash
specs generate -o specs/ --split-components --get-images
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

### `--from-bridge`
Generate from the current selection in a connected Figma file via the [CLI bridge](/cli/commands/bridge/), instead of from a manifest or downloaded JSON. See [Bridge Mode](#bridge-mode).

### `--file <fileKey>`
Target a specific connected Figma file (bridge mode only). More than one file can be connected to a single bridge at once.

- **One file connected**: not needed.
- **Several connected, interactive terminal**: omitting it prints a numbered picker and prompts you to choose.
- **Several connected, non-interactive (scripts, CI)**: required — the run fails rather than hanging on a prompt.

### `--node <id>`
Generate from a specific node ID instead of the current selection (bridge mode only). The plugin selects the node first, switching pages if the node lives on another one, then restores the page you were on.

### `--config <path>`
Path to a `config/` directory (or a legacy `specs.config.yaml` file), when it isn't the `config/` directory in the working directory.

```bash
specs generate --config workspaces/mobile/config -o specs/mobile.yaml
```

### `--verbose`
Enable detailed logging — resolved config path, source and mode detection, foundations loaded, and per-component progress.

---

**See Also:**
- [Scan Command](/cli/commands/scan/) - Create component manifest
- [Fetch Command](/cli/commands/fetch/) - Download Figma data for manifest and single component mode
- [Render Command](/cli/commands/render/) - Send a generated spec back into Figma
- [Bridge Command](/cli/commands/bridge/) - Start the local bridge used by `--from-bridge`
- [Render to Figma](/guides/render-to-figma/) - Bridge architecture, setup, and prerequisites
- [Configuration Reference](/settings/) - Format and config options
- [Getting Started](/cli/getting-started/) - Installation and license setup
