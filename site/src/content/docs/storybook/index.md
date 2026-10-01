---
title: "Storybook Overview"
description: "See your emitted components, foundations, and analyses in one Storybook, built from your workspace."
---

:::caution[Not built yet]
This section describes work in progress. The `specs storybook` command does not
exist yet, and the pages below describe what it will produce. Only
[Technical Details](/storybook/technical-details/) documents something you can
use today.
:::

Everything the toolkit produces — components in every platform you emit, the
foundations they are built from, the analyses that describe them — is viewable in
one place. Not one Storybook per framework, but one for the workspace, organised
the way the design system is organised.

## What you get

| Section | Holds |
|---|---|
| [Overview](/storybook/overview/) | Where to start: component status, and the visual report |
| [Foundations](/storybook/foundations/) | Icons, colour, typography, and the rest — generated from your library, never hand-written |
| [Components](/storybook/components/) | One entry per component, with each platform as a view of it rather than a separate branch |
| [Analysis](/storybook/analysis/) | Props, styling, naming and dependency analyses, rendered from the reports the CLI already writes |
| [Versioning](/storybook/versioning/) | Every release, with its report, changelog, and specs |

## How it stays current

The pages are generated from your workspace, so they move when your library does.
Re-run the command after regenerating and every page reflects the new state —
there is nothing to edit by hand, and nothing to forget to update.

## What you can change

Some of what the Storybook does is your choice rather than a property of your
library: which sections exist, how colour groups are laid out, what a page shows.
[Customization](/storybook/customization/) covers what is adjustable, and what
survives a rebuild.
