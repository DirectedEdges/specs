---
title: "run"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Brings the workspace up to date, then keeps it that way. Watches your data, specs and config, and redoes only the part a change affects. Runs until Ctrl-C.

It is [`specs build`](/cli/commands/build/) — the same chain, the same steps, in the same order — with a watcher on the front.

## Usage

```bash
specs run                        # the whole workspace
specs run --skip storybook       # watch, but leave Storybook out
specs run --dry-run              # print the plan and what it would watch
```

## What a change starts

The point of the chain is that a change enters at one step and everything after it follows. Editing a spec does not re-scan your Figma data.

| You change | It starts at | So this runs |
|---|---|---|
| `data/<alias>.file/` — you ran `specs fetch` | `scan` | scan → generate → react, webcomponents → storybook |
| `data/<alias>.manifest.md` — you ticked a checkbox | `generate` | generate → react, webcomponents → storybook |
| `specs/components/Alert/api.yaml` | `react` | react, webcomponents → storybook, **for Alert only** |
| `config/` — a convention or setting | `react` | react, webcomponents → storybook, for everything |

A spec change is narrowed to the component it is inside. A `config/` change is not: one file there decides the shape of every component's output.

Every pass prints what it decided before it does it:

```
specs/components/Alert/api.yaml changed
[specs run] react → webcomponents → storybook publish (Alert)
  ✓ react — 1 component (0.4s)
  ✓ webcomponents — 1 component (0.3s)
  ✓ storybook publish — 2 files changed (0.2s)
```

That line is worth reading when something looks stale. A chain that decided wrongly what to rebuild looks exactly like a broken transform, and the printed plan is the difference between the two.

## Curation runs both ways

`data/<alias>.manifest.md` is yours — you tick the boxes. Because `scan` writes it and `generate` reads it, it is a step in the chain, which means **editing the manifest regenerates what you selected.** No rescan, no second command.

The other direction needs a word of warning. When new data arrives and `scan` runs, it re-derives the checkboxes from each component's dev status in Figma, which can un-tick something you ticked. That is `settings.curation.preserveManualSelections`, and `run` says so once at startup when it is off:

```
[specs run] note: new data in data/ will re-tick the manifest from Figma's dev status.
            Set settings.curation.preserveManualSelections to keep your own selections.
```

The setting behaves exactly as it always has — see [Curation](/settings/curation/). It is just no longer silent.

## Failures do not stop the session

A failed step is reported and the watcher keeps running, because the fix is the next time you save a file. Only the steps after the failed one are skipped for that pass — their input is what the failed step did not write.

## The license is checked once per session

`run` asks once, at startup, and never again. Steps are function calls in one process, so the answer is reused by every step and every later pass.

One consequence worth knowing: a session holds the answer until you quit it. If a license is revoked while `specs run` is open, that session keeps working until it is restarted. This is deliberate — re-checking on a timer would bring back the repeated calls that used to push a run past the proxy's rate limit and silently produce free-tier output under a paid key.

## Options

| Option | Effect |
|---|---|
| `--only <steps...>` | Watch and run these steps and nothing else |
| `--skip <steps...>` | Everything except these steps |
| `--components <keys...>` | Limit every pass to these component folders |
| `--render` | Also render each changed spec into the connected Figma file |
| `--dry-run` | Print the plan and the paths it would watch, then stop |
| `--config <path>` | A workspace whose `config/` is not in the current directory |
| `--verbose` | Per-step detail |

`--only` and `--skip` name steps — `scan`, `generate`, `react`, `webcomponents`, `storybook`, `render` — and cannot be combined. `specs fetch` is not a step; [`build`](/cli/commands/build/#what-is-not-in-the-chain) explains why.

### `--render`

Renders each changed spec back into the connected Figma file as the last step of every pass. Needs a running bridge and an open Figma session — see the [Render to Figma guide](/guides/render-to-figma/).

Unlike [`specs build --render`](/cli/commands/build/#--render), this **overwrites**: it deletes the existing same-titled page component before re-rendering. In a watch loop that is the whole point — you edit a spec, the component in Figma is replaced. It is also why the flag is off by default, and why the one-shot `build` refuses instead.

Scoping applies here too. A spec edit is already narrowed to the component it is inside, so a pass renders that one component rather than the catalogue.

## `run` and `specs storybook dev`

Both watch. They differ in where they start.

| | Watches | Use it when |
|---|---|---|
| [`specs storybook dev`](/cli/commands/storybook/#specs-storybook-dev) | `specs/`, `config/`, `assets/` — and serves Storybook | You are working on Storybook, and generate your specs yourself |
| `specs run` | All of that, plus `data/` and the manifest | You want one command for the whole workspace |

`specs storybook dev` keeps working exactly as before.

## See Also

- [`build`](/cli/commands/build/) — the same chain, once, for CI
- [`storybook`](/cli/commands/storybook/) — the Storybook-scoped watch loop
- [Curation](/settings/curation/) — what `preserveManualSelections` does
