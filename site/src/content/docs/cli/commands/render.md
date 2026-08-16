---
title: "render"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Sends a spec (or a batch of specs) to a running CLI bridge, which renders the matching component live in a Figma file — creating or updating it.

This is the reverse of the rest of the CLI: instead of reading Figma and producing a spec, `render` reads a spec and renders it in Figma. It requires the bridge to be running (`specs bridge start`) with a connected Figma plugin — see the [Render to Figma guide](/guides/render-to-figma/) for full setup before running this command for the first time.

It also requires a current [cache](/cli/commands/cache/) — the lookup tables that give a spec's component, token, style, and icon names meaning. `fetch` builds it, so a normal workflow already has one. When it's missing or no longer matches your fetched data, `render` stops and names what to rebuild rather than rendering against data that has moved on.

## How a Render Works

Each render is a single round trip through four steps:

1. **Load the spec.** A spec file is read directly; a component folder is assembled from its `api.*`, `variants.*`, and optional `examples.*` files.
2. **Resolve the target file.** From `--file`, or from the bridge's connections — prompting when more than one plugin is connected and the terminal is interactive. In a directory batch this happens once, up front, so a sweep never prompts per component.
3. **Post to the bridge.** The bridge validates the [cache](/cli/commands/cache/) against your fetched data, builds the lookup manifests the spec's names resolve through, and relays the payload to the connected plugin.
4. **The plugin writes.** The component is built inside the live Figma document — frames, styles, variants, instances — and the resulting node id comes back.

`render` reports that outcome and stops there. It performs no round-trip check of its own: reading back what actually landed is an explicit [`generate --from-bridge`](/cli/commands/generate/#bridge-mode) call. The bridge holds one render slot, so concurrent calls queue rather than overlap.

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

### `--refresh-cache`

Rebuild the [cache](/cli/commands/cache/) from your fetched data before rendering. Off by default, since `fetch` already builds it and rebuilding on every render would reintroduce the cost the cache exists to remove.

Use it when a render has just failed on a stale cache and you'd rather not run a separate command.

```bash
specs render specs/deButton/ --refresh-cache
```

### `--timing`

Print a phase-by-phase timing report after the render: the bridge's lookup work and payload size, then each phase of the write inside Figma, with each phase's share of total time and how many times it ran.

Phases that run concurrently — one row per variant, for instance — can sum to more than the total; the count column is what makes that readable.

```bash
specs render specs/deButton/ --timing
```

### `--strict`

Fail the render when an instance element can't be resolved, instead of rendering a component with missing content.

By default an unresolvable instance is a warning: the component is still created in Figma, minus that content, and `render` reports how many elements were dropped. `--strict` turns that into a failure — useful in CI, where a silently incomplete component is worse than a red build.

```bash
specs render specs/deButton.yaml --strict
```

In a directory batch, `--strict` fails the individual component; the sweep continues and the exit code reflects the total.

## Output

While the plugin works, a spinner holds a single line (`⠹ Rendering: deButton (3s)`); the outcome then prints over it, so a batch reads as one line per component. In a non-interactive terminal the status is printed as a plain line instead.

### A successful render

```
✓ Rendered: deButton (2.4s, nodeId: 1234:5678)
```

The node id is the component that was created or updated — open it directly at `figma.com/file/.../?node-id=1234-5678`.

### An incomplete render

```
  ⚠ INCOMPLETE: 2 instance element(s) could not be resolved and were not rendered. The component exists in Figma but is missing content.
✓ Rendered: deCard (3.1s, nodeId: 1234:5690)
```

An instance element that can't be resolved is content the component was supposed to contain, so this is called out as a count rather than left to a per-element warning that scrolls past in a batch. It's still a success — the component exists — unless you pass [`--strict`](#--strict).

The usual cause is a cache that doesn't know the referenced component: run [`specs fetch`](/cli/commands/fetch/) to refresh it.

### A batch

```
Found 6 components in specs:
  - deButton
  - deCard
  ...
✓ Rendered: deButton (2.4s, nodeId: 1234:5678)
✓ Rendered: deCard (3.1s, nodeId: 1234:5690)
  ✗ deModal: Render failed: no page component named "DS Modal"
...

Done: 5 rendered in Figma, 1 failed.
⚠ 1 rendered with missing content: deCard (2)
```

A failure doesn't abort the sweep — the remaining components still render, and the exit code reflects the total. Incomplete renders are reported separately from failures, because they succeeded.

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

# Rebuild the lookup cache first, then render
specs render specs/deButton/ --refresh-cache

# See where a slow render spends its time
specs render specs/deButton/ --timing

# Scripted run: pin the file and page, fail on incomplete renders
specs render specs/ --file abc123XYZ --page 12:345 --strict
```

## Fidelity

A component rendered from its spec and read back should be byte-identical to the spec that
produced it, except where a limitation below explains the difference or an open defect
accounts for it — anything else is a bug nobody has written down yet.

### Limitations

Permanent, and imposed by Figma rather than by this tool. None of them lose a property, a
value or a binding; each is about how something is expressed.

- **Property order in the panel.** Figma orders properties by creation, with no way to
  reorder afterwards, so slots lead and code-only props trail. Variant order *is* preserved.
- **A locked aspect ratio holds one bound dimension, not two.** Declaring a ratio plus both
  dimensions is over-specified, and Figma derives the second from the first.
- **A filling root has no width to reproduce.** Derived from the ratio where one exists,
  otherwise a fixed fallback ([#341](https://github.com/DirectedEdges/specs/issues/341)).
- **Boolean variant values render lowercase.** `True` becomes `true`; identical behaviour,
  different casing.
- **Bindings from slot content to the component that holds it are ignored.** Figma withdrew
  that capability; older files keep theirs, and each affected component reports it once.

### Open defects

Real differences between a component and a render of its own spec. Expect these in a
comparison until they are fixed.

- Per-variant slot content is layered as if it inherits, so content lands on the wrong
  variants — [#345](https://github.com/DirectedEdges/specs/issues/345)
- A code-only prop whose name collides with a native property is dropped —
  [#344](https://github.com/DirectedEdges/specs/issues/344)
- Elements sized FILL drift in measured width, so a comparison reports variants the source
  does not state — [#346](https://github.com/DirectedEdges/specs/issues/346)
- A boolean variant's value inverts, so the variant that differs is not the same variant —
  [#348](https://github.com/DirectedEdges/specs/issues/348)
- A slot constraint naming a component absent from the fetched data is dropped —
  [#325](https://github.com/DirectedEdges/specs/issues/325)

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
- [`cache`](/cli/commands/cache/) — the lookup tables `render` resolves component, style, token, and glyph names against
- [`fetch`](/cli/commands/fetch/) — downloads the library data and builds that cache
- [`generate`](/cli/commands/generate/) — produces the specs that `render` consumes
