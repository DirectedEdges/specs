---
title: "Customization"
description: "What you can change, what survives a rebuild, and how to take over a page."
---

Three kinds of file live under `storybook/`, with three different rules:

| Where | Written by | Rewritten? |
|---|---|---|
| `storybook/*` and `.storybook/*` — the host | `specs storybook init`, once | Never touched again (`init --force` rewrites them on request) |
| `storybook/content/**` — the generated pages and their data | `specs storybook`, every run | **Wholesale, every run.** Never edit here |
| `storybook/content-overrides/**` — your pages | You | Never. No command writes here |

## Taking over a generated page

Copy it to the same path under `content-overrides/` and edit the copy:

```bash
cp storybook/content/foundations/Color.stories.tsx \
   storybook/content-overrides/foundations/Color.stories.tsx
```

It takes effect immediately — with the server running, the override is indexed
and the generated twin withdrawn within a second or two, and deleting the
override brings the generated page back the same way. No restart in either
direction. Regeneration can never destroy your copy; the command does not
write into that tree.

One consequence of taking a page over: its generated twin is withheld rather
than refreshed underneath, so publish's override report is what tells you when
the data your copy reads has moved.

One thing to stay aware of: your copy still reads the generated data files
under `content/`, and those move when the library and the toolkit move. If a
page you forked stops matching its data, the publish output names the overrides
it found so the divergence is visible rather than a surprise.

## Editing the host

Everything `init` wrote — the Storybook config, the theme, the port in
`package.json` — is yours. `specs storybook` never touches it. Re-running
`init` refuses so it cannot clobber your edits; `init --force` rewrites the
host files deliberately, and still never touches `content-overrides/`.

When a CLI upgrade ships newer host files, the next `specs storybook` run tells
you — the host is stamped at `init`, and a stale stamp prints the one command
that upgrades it. Nothing upgrades silently.

## Declaring presentation: `config/conventions/storybook.yaml`

Choices that are taste rather than library data, declared under the concern
they belong to. For colour:

```yaml
color:
  collections:           # which collections render, in this order
    - "Color"
    - "Color Primitives"
  groupLeaves:           # collapse values into one row per folder…
    - "Color Primitives" #   …for just these collections (true = all of them)
  rowGroup:              # a whole group as ONE row — for ramps
    - "Palette"
modes:
  collections:           # collections whose modes become toolbar controls
    - "Color"
```

| Feature | Value | Effect |
|---|---|---|
| `color.collections` | ordered list of collection names | Which collections render, and their order. Absent = every local collection |
| `color.groupLeaves` | `true`/`false`, **or a list of keys** | One row per *folder* of variable names, side by side — for the listed collections, or everywhere with `true` |
| `color.rowGroup` | list of keys | The whole group as a single row — for ramps, whose steps mean something next to each other |
| `modes.collections` | list of collection names | Each becomes a toolbar dropdown switching the attribute the generated stylesheet carries |

**What a layout key may name** — exactly two shapes, nothing deeper:

- A **collection name** (`Color Primitives`) — applies to all of it.
- `Collection/Group`, where *Group* is the **first level** of the variable
  names (`Color/color`, `Color/elevation`). A deeper path like `Color/Neutral`
  names nothing — it is ignored **with a warning naming it** in the publish
  output.

**When an edit seems to do nothing**, in order:

1. Is `specs storybook dev` running? It republishes on save. If not, run
   `specs storybook` yourself.
2. Read the publish output. An unknown collection, feature, or layout key
   warns by name — never silently.
3. Silence plus "nothing changed" means the file genuinely matches what is
   already published.

## What is still taste rather than declared

The order of the sidebar sections, and how wide a colour row may grow before
wrapping. These ship as defaults; they graduate to the conventions file the
same way colour layout did if they earn it.
