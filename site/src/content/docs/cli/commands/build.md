---
title: "build"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Brings every derived part of a workspace up to date, in order, then exits.

A workspace is a chain: data produces a manifest, the manifest produces specs, specs produce each platform's code, and that code is what Storybook shows. Running those commands by hand means remembering the order and never skipping one — and nothing tells you when you did. `build` performs the whole chain, says what it ran, and fails with a non-zero exit code when a step fails, which is what makes it usable in CI.

[`specs run`](/cli/commands/run/) is the same chain, watching.

## Usage

```bash
specs build                          # everything this workspace has
specs build --components Alert       # just one component, through every step
specs build --only react             # one step
specs build --skip storybook         # everything but one step
specs build --dry-run                # print what would run, run nothing
```

## The chain

Each step reads what the one before it wrote. A step runs only when the workspace actually has something for it to do — a `react/src` tree, a scaffolded Storybook — so nothing needs declaring in settings.

| Step | Reads | Writes | Runs when |
|---|---|---|---|
| `scan` | `data/<alias>.file/` | `data/<alias>.manifest.md` | A fetched file payload is on disk |
| `generate` | `data/<alias>.manifest.md` | `specs/` | A manifest exists |
| `react` | `specs/`, `config/` | `react/src/` | `react/src/` exists |
| `webcomponents` | `specs/`, `config/` | `webcomponents/src/` | `webcomponents/src/` exists |
| `storybook` | `specs/`, `config/`, `assets/` | `storybook/content/` | `storybook/.storybook/` exists |

### What is not in the chain

**`specs fetch`** is not a step. Everything above runs because a file it watches changed, and fetch's input is the Figma file — which the CLI cannot watch. It is something you run when you mean to, and what it writes into `data/` is picked up from `scan` onward. In a script, say so plainly:

```bash
specs fetch && specs build
```

**`specs render`** is not in the chain yet. It writes to a live Figma file rather than to disk, so it stays a deliberate act — see [`render`](/cli/commands/render/). Passing `--render` is refused with that explanation rather than quietly doing nothing.

## Options

| Option | Effect |
|---|---|
| `--only <steps...>` | Run these steps and nothing else |
| `--skip <steps...>` | Run everything except these steps |
| `--components <keys...>` | Limit the run to these component folders |
| `--dry-run` | Print the steps that would run, and run nothing |
| `--config <path>` | A workspace whose `config/` is not in the current directory |
| `--verbose` | Per-step detail |

`--only` and `--skip` name steps — `scan`, `generate`, `react`, `webcomponents`, `storybook` — and cannot be combined.

## Exit codes

`build` stops at the first step that fails and exits non-zero. It does not carry on: a step's output is the next step's input, so continuing would run the rest against stale files and report success.

| Code | Meaning |
|---|---|
| `0` | Every step succeeded |
| non-zero | A step failed — the code is the one that step's own command would have returned |

## The license is checked once

Steps run as function calls inside one process, not as separate `specs …` commands. That is what keeps the license check to one per run.

It matters more than it sounds. The license proxy is rate limited, and a throttled check is not a verdict — it means the question went unanswered. Asking repeatedly used to push a run past the limit, and a throttled check inside `generate` came back as free, so specs were written at the wrong tier and the run still reported success. One check per run removes that.

## In CI

`build` needs no `FIGMA_TOKEN` and cannot reach a live Figma file — every step in the chain is local. Fetch separately, in a step that makes the network call visible:

```yaml
- run: specs fetch
  env:
    FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
- run: specs build
  env:
    SPECS_LICENSE_KEY: ${{ secrets.SPECS_LICENSE_KEY }}
```

## See Also

- [`run`](/cli/commands/run/) — the same chain, watching
- [`storybook`](/cli/commands/storybook/) — the Storybook-only version of the watch loop
- [Workflows](/cli/workflows/) — where these fit in day-to-day use
