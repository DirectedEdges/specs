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

From then on your page renders instead of the generated one, and regeneration
can never destroy it — the command does not write into that tree. The generated
original keeps being refreshed underneath, so diffing the two later shows you
what you have diverged from.

One thing to stay aware of: your copy still reads the generated data files
under `content/`, and those move when the library and the toolkit move. If a
page you forked stops matching its data, the publish output names the overrides
it found so the divergence is visible rather than a surprise.

## Editing the host

Everything `init` wrote — the Storybook config, the theme, the port in
`package.json` — is yours. `specs storybook` never touches it. Re-running
`init` refuses so it cannot clobber your edits; `init --force` rewrites the
host files deliberately, and still never touches `content-overrides/`.

## Colour layout is a setting

By default the Color page lists every colour on its own row, full name visible —
the generator asserts nothing about which values belong side by side. Grouping
is yours to declare, in `config/settings.yaml`:

```yaml
storybook:
  color:
    layout:
      # default: group          # change the default for every collection…
      overrides:                 # …or name collections / Collection/Group keys
        "Palette": row           # a ramp: the whole group as one row
        "Color": group           # one row per folder in the variable names
```

`row` suits ramps, whose steps mean something next to each other; `group` puts
each folder of a collection side by side so parallel structure reads across.
Very large rows wrap rather than compressing into slivers.

## What is taste rather than data

A few remaining choices are judgment calls, not facts from your library — the
order of the sidebar sections, how wide a colour row may grow before wrapping.
These ship as defaults; the list is tracked with the toolkit's development
notes, and the common ones graduate to settings like the colour layout did.
