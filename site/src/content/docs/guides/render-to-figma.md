---
title: "Render to Figma"
description: "Set up the CLI bridge and use specs render to turn a spec back into a live Figma component"
---

Every other command in Specs reads Figma and produces a spec. `render` runs the pipeline in reverse: it takes a spec YAML file and creates or updates the matching component in a real, open Figma file. This guide covers the one-time setup and the parts of the workflow you need to understand before running it — the bridge that connects your terminal to Figma, what your workspace needs to look like, and what to expect when a render succeeds or fails.

## The Problem

A spec is just a file. Making it real in Figma means placing frames, applying styles, wiring variants, and building instances inside a running Figma session — work that can only happen inside the Figma plugin sandbox, not in a Node process. `render` bridges the two: your terminal talks to a small local server, which talks to the Specs 2 plugin over a WebSocket connection, which does the actual rendering inside Figma.

You don't need to understand how the plugin builds the component — that part just works. What you do need is the bridge running and connected, and a spec that's ready to render.

## How the Bridge Works

Three things run at once, on your machine, for the duration of a render session:

1. **The bridge server** — a background process, started with [`specs bridge start`](/cli/commands/bridge/), that stays running until you stop it. It listens for render requests and forwards them to Figma.
2. **The Specs 2 plugin, open in Figma, with its CLI Bridge connected** — this is what actually builds the component, inside the file you have open.
3. **Your workspace** — the directory holding your specs and the data Specs has scanned from your Figma file.

```
specs render  →  bridge server  →  Specs 2 plugin (in Figma)  →  component rendered in Figma
                 (localhost)         (WebSocket connection)
```

`specs render` itself doesn't start the bridge server — it's a thin client that expects one already running and connected. If it isn't, the command fails immediately with a clear message rather than hanging.

## Prerequisites

### Local setup

- The **bridge server running**, started once per session:
  ```bash
  specs bridge start
  ```
  Check it any time with `specs bridge status`, and stop it with `specs bridge stop` when you're done. See the [`bridge` command reference](/cli/commands/bridge/) for details.
- **Figma open**, with the target file loaded and the Specs 2 plugin running, its **CLI Bridge enabled and connected** to the bridge server. If the plugin was already open before you started the server, toggle the CLI Bridge off and back on to connect.
- The right **Figma page active**. The bridge renders to whatever page is currently open in Figma at the moment you run `render` — navigate there first.

### Workspace and spec prerequisites

`render` expects the same workspace shape as the rest of the CLI — no special splitting or restructuring needed:

```
my-workspace/
  specs.config.yaml
  specs/
    deButton.yaml
  data/
    library.manifest.md       # from `specs scan`
    library.file.json         # from `specs scan`
    library.variables.json    # from `specs scan`
```

A spec rendered by `render` binds glyphs, styles, and variables using the data files your last `specs scan` produced. If you've added or renamed components in Figma, or updated styles or variables, **run `specs scan` again before rendering** so those bindings are current. Everything else — resolving the spec's structure into Figma nodes, styles, and variants — is handled automatically; there's no manual prep beyond having an up-to-date scan and a spec generated the normal way with [`generate`](/cli/commands/generate/).

## Running a Render

### One component

```bash
specs render specs/deButton.yaml
```

On success:

```
✓ Rendered in Figma. nodeId: 1234:5678
```

The node ID is the Figma node that was created or updated — open it directly in Figma via `figma.com/file/.../?node-id=1234-5678`.

### A batch, from a directory

Point `render` at a directory of component folders to render every component beneath it:

```bash
specs render specs/
```

Renders happen one at a time, in path order. On completion:

```
Done: 6 rendered in Figma, 0 failed.
```

### What to expect

- **No round-trip check.** `render` reports success or failure and the node ID — nothing more. To read back what actually landed in Figma, run [`generate --from-bridge`](/cli/commands/generate/#bridge-mode) as a separate step.
- **One render at a time.** The bridge holds a single render slot; concurrent `render` calls queue rather than run in parallel.
- **This is a young feature.** The writer is under active development — expect rough edges on more elaborate components, and treat every render as something to visually check in Figma afterward rather than a guaranteed match to the source spec.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Error: bridge is not running.` | Run `specs bridge start`, then retry |
| `No plugin connected` | Enable the CLI Bridge in the Specs 2 plugin; if it was already open, toggle it off and on |
| Nothing happens / times out | Run `specs bridge status` to confirm the plugin shows connected, and check you're on the intended page in Figma |
| Missing glyphs, styles, or variable bindings | Run `specs scan` to refresh the workspace's data files, then render again |

## Further Reading

- [`bridge` command reference](/cli/commands/bridge/) — start/stop/status, logs, pid file
- [`render` command reference](/cli/commands/render/) — flags and exit codes
- [`scan`](/cli/commands/scan/) — keeps glyph, style, and variable data current for rendering
- [`generate`](/cli/commands/generate/) — produces the specs that `render` consumes
- [sources config](/settings/data-sources/) — how workspace aliases and data files are resolved
