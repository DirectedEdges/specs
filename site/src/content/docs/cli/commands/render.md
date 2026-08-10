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

## Examples

```bash
# Render one component
specs render specs/deButton.yaml

# Render every component in the output directory
specs render specs/

# Same, resolved from config (outputDirectory)
specs render
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error — bridge unreachable (run `specs bridge start`), render failed, or the plugin isn't connected |
| `2` | Invalid arguments — no spec path given and no `outputDirectory` to fall back to |

---

**See Also:**

- [`bridge`](/cli/commands/bridge/) — start/stop/check the bridge `render` talks to
- [Render to Figma](/guides/render-to-figma/) — bridge architecture, setup, and prerequisites
- [`scan`](/cli/commands/scan/) — refreshes the manifest data `render` uses to bind styles, variables, and glyphs
- [`generate`](/cli/commands/generate/) — produces the specs that `render` consumes
