---
title: "render"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Sends a spec (or a batch of specs) to a running CLI bridge, which renders the matching component live in a Figma file — creating or updating it.

This is the reverse of the rest of the CLI: instead of reading Figma and producing a spec, `render` reads a spec and renders it in Figma. It requires the bridge to be running (`specs bridge start`) with a connected Figma plugin — see the [Render to Figma guide](/guides/render-to-figma/) for full setup before running this command for the first time.

## Usage

```bash
specs render [specPath] [options]
```

## Arguments

### `[specPath]`

What to render. Three shapes are accepted:

- **A spec file** (`.yaml`, `.yml`, `.json`) — one component.
- **A component folder** — a directory holding `api.*` and `variants.*` (plus optional `examples.*`), as produced by `generate --split-components --split-concerns`. Renders that one component.
- **A directory of component folders** — renders every component beneath it, sequentially, in path order.

```bash
specs render specs/deButton.yaml     # one spec file
specs render specs/deButton/         # one component folder
specs render specs/                  # every component in the directory
specs render specs/forms/            # every component in one group
```

Batch scanning looks at most two levels deep, so both `specs/deButton/` and `specs/forms/deInput/` are found. It never descends into a component folder.

Optional — when omitted, `render` uses the configured `outputDirectory` as a batch.

A directory batch renders in path order. Render order isn't configurable, so when one component's spec references another, render them individually in the order you need.

## Options

### `--config <path>`

Use a specific config file instead of the default `specs.config.yaml`.

### `--file <fileKey>`

Target a specific connected Figma file. Only matters when the bridge has more than one plugin connected:

- **Passed explicitly** — that file is used, no prompt.
- **Omitted, interactive terminal, 2+ connections** — `render` lists the connected files and asks which to use.
- **Omitted, non-interactive (scripts, CI)** — no prompt; the bridge reports the ambiguity as an error rather than hanging on stdin.

Scripted runs against a multi-file bridge should always pass `--file`.

```bash
specs render specs/deButton.yaml --file abc123XYZ
```

In a directory batch the file is resolved once, up front, so a sweep never prompts per component.

### `--page <id>`

Render onto a specific page instead of whatever page the plugin currently has open. Recommended for scripted runs — without it, the target is the user's current page, which can drift mid-run if someone navigates in Figma.

```bash
specs render specs/deButton.yaml --page 12:345
```

### `--overwrite`

Delete any existing page component with the same title before rendering. Without it, a title collision is an error.

This is destructive — the existing component is removed, not merged into. When a directory batch would overwrite more than one component and the terminal is interactive, `render` asks for confirmation first; non-interactive runs proceed without asking.

```bash
specs render specs/deButton.yaml --overwrite
```

### `--watch`

Watch the spec path and re-render on every change. Implies `--overwrite`, since each re-render replaces the component produced by the last one.

Requires an explicit spec path — it can't be combined with zero-arg config resolution. It accepts any of the three `[specPath]` shapes; for a single spec file the watch is set on its containing directory, so sibling edits also trigger it. Changes are debounced (300ms), and a render in flight defers the next one rather than overlapping. Runs until interrupted with Ctrl+C.

In watch mode a failed render is logged and the watch continues, rather than exiting — the next save may fix it.

```bash
specs render specs/deButton/ --watch
```

### `--strict`

Fail the render when an instance element can't be resolved, instead of rendering a component with missing content.

By default an unresolvable instance is a warning: the component is still created in Figma, minus that content, and `render` reports how many elements were dropped. `--strict` turns that into a failure — useful in CI, where a silently incomplete component is worse than a red build.

```bash
specs render specs/deButton.yaml --strict
```

In a directory batch, `--strict` fails the individual component; the sweep continues and the exit code reflects the total.

## Examples

```bash
# Render one component
specs render specs/deButton.yaml

# Render every component in the output directory
specs render specs/

# Same, resolved from config (outputDirectory)
specs render

# Re-render on every save while iterating on a spec
specs render specs/deButton/ --watch

# Replace an existing component instead of erroring on the title collision
specs render specs/deButton.yaml --overwrite

# Scripted run: pin the file and page, fail on incomplete renders
specs render specs/ --file abc123XYZ --page 12:345 --strict
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error — bridge unreachable (run `specs bridge start`), render failed, or the plugin isn't connected |
| `2` | Invalid arguments — spec path not found, `--watch` without a spec path, or no spec path given and no `outputDirectory` to fall back to |

---

**See Also:**

- [`bridge`](/cli/commands/bridge/) — start/stop/check the bridge `render` talks to
- [Render to Figma](/guides/render-to-figma/) — bridge architecture, setup, and prerequisites
- [`scan`](/cli/commands/scan/) — refreshes the manifest data `render` uses to bind styles, variables, and glyphs
- [`generate`](/cli/commands/generate/) — produces the specs that `render` consumes
