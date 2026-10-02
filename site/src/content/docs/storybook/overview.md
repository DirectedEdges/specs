---
title: "Getting Started"
description: "From an empty folder to a browsable Storybook, and the loop that keeps it current."
---

## The whole sequence

```bash
npm install -g @directededges/specs-cli

specs init                  # workspace + config; add your Figma file key
specs fetch                 # pull the library: file, variables, styles, icons
specs scan                  # find the components
specs generate              # write the specs
specs react                 # emit React (optional)
specs webcomponents         # emit Web Components (optional)

specs storybook init        # scaffold the host, once
cd storybook && npm install && cd ..
specs storybook             # generate everything the host shows

cd storybook && npm run storybook
```

That last command opens a Storybook with your components under **Components**,
your library's color, icons and typography under **Foundations**, and a Getting
Started page that repeats the refresh loop so you never have to find this page
again.

## The loop after the first run

When the library changes in Figma:

```bash
specs fetch
specs generate
specs react
specs webcomponents
specs storybook
```

The running instance reloads as the files change. Skip `react` and
`webcomponents` if you only want the foundations refreshed.

## Code emission is optional

Skip `specs react` and `specs webcomponents` entirely and everything still
works: component pages show the **Specs** tab alone, and Foundations build from
the fetched library data. Seeing your system does not require emitting code for
it.

## If something refuses to run

- `specs storybook` before `init` explains what to scaffold rather than
  guessing for you.
- `specs storybook init` over an existing host refuses rather than overwriting
  your edits; `--force` rewrites the host files only, never your overrides.
