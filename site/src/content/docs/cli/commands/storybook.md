---
title: "storybook"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Scaffolds, generates, and runs the workspace Storybook — one instance for the whole system, not one per framework. [The Storybook section](/storybook/) covers what you get; this page is the command reference.

Free on every tier. The CLI never ships or installs Storybook itself: `init` writes a `package.json` that declares it, and you run the one install in your own workspace.

## Usage

```bash
specs storybook init [--force] [--port <port>]   # scaffold the host, once
specs storybook dev                              # run everything, watching
specs storybook [publish] [concern]              # regenerate content, once
```

Every form accepts `--config <path>` for a workspace whose `config/` is not in the current directory.

## `specs storybook init`

Writes the host, once:

```
storybook/
├── package.json          declares Storybook; you run `npm install`
├── tsconfig.json
├── .storybook/           main.ts, preview.tsx, manager.tsx, scaffold.json
├── content/components/   tabs.json + modes.json, seeded so the host compiles
└── content-overrides/    yours — no command ever writes here
```

Prints the install and next steps rather than running them. Refuses if `.storybook/` already exists.

### `--force`

Rewrite the host files deliberately — the upgrade path when a newer CLI ships newer templates (a stale host announces itself at every publish). Rewrites only what `init` owns; `content/` and `content-overrides/` are never touched.

### `--port <port>`

The dev-server port written into the scaffolded `package.json` (default `6006`).

## `specs storybook dev`

The one process a designer runs. Publishes once, then starts everything that reacts and keeps running until Ctrl-C:

| Child | Job |
|---|---|
| [`specs react --watch`](/cli/commands/react/#--watch) | Re-emits components when specs change — spawned when `react/` exists |
| [`specs webcomponents --watch`](/cli/commands/webcomponents/#--watch) | Same, for the Web Components tree |
| The workspace's own Storybook | Serves, hot-reloads emitted output, and republishes generated pages when `config/`, `specs/`, or `assets/` change |

`fetch`, `generate`, and `render` stay yours to run; everything downstream of them follows. One interrupt stops all children.

## `specs storybook publish [concern]`

Regenerates the content tree, once — the form for scripts and CI, and the default when no subcommand is given (`specs storybook` alone publishes everything). While `dev` runs you never type this; the server runs it for you.

```bash
specs storybook publish              # every concern
specs storybook publish foundations # just one
```

Concerns: `overview`, `foundations`, `components`, `analysis`, `versions`. Each writes `storybook/content/<concern>/` wholesale and prunes what no longer belongs; an unknown concern name errors with the list.

Publishing is deterministic and diff-aware: unchanged input writes nothing and says so. The run also reports any overrides in effect, warns when their underlying data changed, warns on unknown keys in [`conventions/storybook.yaml`](/storybook/customization/) by name, and announces a host scaffolded by an older CLI.

## Exit behavior

`init` and `publish` exit non-zero on refusal or error with the reason named. `dev` runs until interrupted; a child that dies is reported and the rest keep running.

## See Also

- [Storybook section](/storybook/) — what each generated page shows, customization, the override tree
- [Technical Details](/storybook/technical-details/) — how the emitted trees expect to be served
- [`react`](/cli/commands/react/) / [`webcomponents`](/cli/commands/webcomponents/) — the transforms whose output the instance shows
