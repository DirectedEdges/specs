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

Choices that are taste rather than library data are declared in a conventions
file, keyed by concern. For colour:

```yaml
# config/conventions/storybook.yaml
color:
  collections:         # which collections render, in this order
    - "Color"
    - "Shadow"
  rowGroup:            # variable hierarchies that read as ramps — one shared row
    - "Palette"
  groupLeaves: true    # group every folder's values side by side
modes:
  collections:         # collections whose modes become toolbar controls
    - "Brand"
    - "Color"
```

Only a library's **own** collections render — the Figma payload also carries
imported copies of subscribed collections, including earlier versions of the
file's own, which would read as inexplicable duplicates. `collections` is ordered and
selects by name among those local collections; absence means all of them.

Without the file, every colour is its own row with its full name visible — the
generator asserts nothing about which values belong together until you do.
`rowGroup` names win over `groupLeaves`; very wide rows wrap rather than
compressing into slivers.

Each listed `modes` collection becomes a toolbar dropdown in the running
Storybook, switching the attribute the generated stylesheet already carries —
every page and story re-renders in the selected mode.

Anything the file says that the tool does not understand — an unknown concern,
an unknown feature, a wrong value shape — is ignored **with a warning naming
it**, never silently. A typo tells you about itself.

## What is still taste rather than declared

The order of the sidebar sections, and how wide a colour row may grow before
wrapping. These ship as defaults; they graduate to the conventions file the
same way colour layout did if they earn it.
