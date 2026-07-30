---
title: "bridge"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Starts, stops, and checks the local CLI bridge — the background process [`render`](/cli/commands/render/) relays render requests through to a connected Specs 2 Figma plugin.

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
