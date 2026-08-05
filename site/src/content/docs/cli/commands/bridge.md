---
title: "bridge"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Starts, stops, and checks the local CLI bridge — the background process that relays requests between the CLI and a connected Specs 2 Figma plugin. [`render`](/cli/commands/render/) sends specs into the live file through it, and [`generate --from-bridge`](/cli/commands/generate/#bridge-mode) reads specs back out of the current selection.

## Usage

```bash
specs bridge <start|stop|status> [options]
```

## Subcommands

### `start`

Starts the bridge server in the background. Prints the process ID, the ports it's listening on, and where its logs go. Safe to run again while already running — reports the existing process instead of starting a second one.

```bash
specs bridge start
```

#### `--workspace <path>`

Pin a workspace directory for the whole bridge session, instead of deriving it per-request from each spec's path. Useful when every render in a session targets the same workspace.

```bash
specs bridge start --workspace ~/design-system
```

### `stop`

Stops the background bridge server. Sends a graceful shutdown signal, then forces termination if it doesn't exit within a few seconds. Safe to run when nothing is running.

```bash
specs bridge stop
```

### `status`

Reports whether the bridge server is running and, if so, whether a Figma plugin is currently connected to it.

```bash
specs bridge status
```

```
Bridge running (pid 12345). Plugin: connected.
```

Exits non-zero when the bridge isn't running, so it's safe to use in a conditional (`if specs bridge status; then ...`).

## What It Does

The bridge server listens on two local ports: a WebSocket for the Specs 2 plugin (`ws://localhost:9001`) and an HTTP control endpoint for the CLI (`http://localhost:9002`). `specs render` posts a spec (or a render manifest) to the HTTP endpoint; the bridge relays it to whichever plugin is connected over the WebSocket, which builds the component live in Figma and reports back.

Traffic runs both directions. `specs generate --from-bridge` posts to the same endpoint asking the plugin to generate a spec from its current selection; the plugin runs generation against the live document and returns the finished spec, which the CLI writes out. Reading a rendered component's spec is always this explicit second call — never a side effect of `render`.

Starting the bridge doesn't connect it to anything by itself — you still need the Specs 2 plugin open in Figma with its **CLI Bridge** toggle enabled. See the [Render to Figma guide](/guides/render-to-figma/) for the full setup.

## Logs and Process Files

`bridge start` writes a pid file and a log file under `~/.specs/`:

```
~/.specs/
  bridge.pid   # process ID of the running bridge server
  bridge.log   # stdout/stderr from the bridge server
```

Tail the log while debugging a render:

```bash
tail -f ~/.specs/bridge.log
```

---

**See Also:**

- [Render to Figma](/guides/render-to-figma/) — bridge architecture, setup, and prerequisites
- [`render`](/cli/commands/render/) — sends specs to the bridge
