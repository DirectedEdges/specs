---
title: "Storybook Overview"
description: "See your components, foundations, and analyses in one Storybook, generated from your workspace."
---

Everything the toolkit produces — components in every platform you emit, the
foundations they are built from, the analyses that describe them — is viewable in
one place. Not one Storybook per framework: one for the workspace, organised the
way your design system is organised.

Two commands produce it, and you own everything they write:

```bash
specs storybook init        # once: scaffold the host
specs storybook             # after every change: regenerate what it shows
```

We never ship or install Storybook itself. `init` writes a `package.json` that
declares it; you (or an agent helping you) run `npm install` in `storybook/`
once, and Storybook arrives from npm under its own MIT licence. Everything
`specs storybook` does is free — no Pro licence involved.

## What you get

| Section | Holds |
|---|---|
| [Getting Started](/storybook/overview/) | Where to begin, and the refresh loop |
| [Foundations](/storybook/foundations/) | Color, Icons, Typography — generated from your library, never hand-written |
| [Components](/storybook/components/) | One entry per component, with each platform as a tab rather than a separate list |
| [Analysis](/storybook/analysis/) | Placeholder today; the analysis reports will render here |
| [Versioning](/storybook/versioning/) | Placeholder today; your release history will render here |

## How it stays current

Every page is generated from your workspace, so the loop after a library change
is the same pipeline you already run, plus one command:

```bash
specs fetch
specs generate
specs react
specs webcomponents
specs storybook
```

While Storybook is running you rarely type that: the dev server watches your
workspace — `config/` (the conventions file included), `specs/`, and `assets/` —
and republishes itself when anything changes; the open page refreshes on its
own. Manual `specs storybook` is for when no server is up. Re-running it when
nothing changed writes nothing and says so.

## What you can change

The host files `init` writes are yours to edit — `specs storybook` never touches
them again. Generated pages live under `storybook/content/`, which is rewritten
on every run; to take control of one, copy it into `storybook/content-overrides/`
at the same path. [Customization](/storybook/customization/) covers the rules.

For the wiring underneath — what the host config does and why — see
[Technical Details](/storybook/technical-details/). You should not need it.
