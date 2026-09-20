---
title: "Transforms"
description: "The artifacts specs react and specs webcomponents emit from component spec files"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge eol-badge">EOL</span>')</script>

:::caution[No longer emitted this way]
This page describes `specs transform` targets. That command is retired — a target
is emitted whole by [`specs react`](/cli/commands/react/) or
[`specs webcomponents`](/cli/commands/webcomponents/), which is why these artifacts
can no longer be produced one at a time. Kept for reference on what each artifact
contains.
:::


[`specs react`](/cli/commands/react/) and [`specs webcomponents`](/cli/commands/webcomponents/) fan a component specification out into artifacts your codebase can consume: a TypeScript contract, a baseline stylesheet, a working component, a token inventory. Instead of writing those by hand, you derive them from the spec and keep them in sync as the design evolves.

These pages describe those artifacts one at a time. They are **not** separately invocable — a target emits everything it needs together, because a role annotated in Figma changes the element emitted, the props the contract declares and the CSS reset applied. Naming the pieces separately was how it worked before; ordering them correctly was the user's problem. This concept is described in [RFC 001: Component Dictionary](https://github.com/DirectedEdges/specs/blob/main/rfc/001-component-dictionary/README.md).

Transforms take spec data as far as it deterministically goes — every prop, token, and style Figma captured — before inference enters the picture. Structured spec data is stable, regeneratable, and cheap to re-read; it's the right foundation for agents and tooling to build on, not a replacement for them. What the spec can't know — behavior, interaction states, accessibility semantics — belongs to agentically-extended specs and the authored files that live alongside.

## Where output lands now

Each platform emits into its own tree, and the library-level variable definitions land in `assets/`:

```
react/src/components/<Component>/       # contract, stylesheet, scaffold, stories
webcomponents/src/components/<Component>/
assets/cssvars/cssvars.css              # what the stylesheets' var() references resolve against
assets/cssvars/modes.json
```

The [`react`](/cli/commands/react/) and [`webcomponents`](/cli/commands/webcomponents/) command pages document the current trees, the authored-vs-generated split, and every option.

## The artifacts

| Artifact | Emitted by | What it contains |
|----------|------------|------------------|
| contract | both commands | TypeScript Props interface and defaults constant, plus Slots/SlotRules when variant data is present |
| [`css`](/cli/transforms/css/) | both commands, per target | CSS rules per anatomy element, with token vars, variant selectors, and structural presence/stacking fixes |
| [`cssvars`](/cli/transforms/cssvars/) | whichever command runs | CSS variable definitions for the library's variables, text/effect/fill styles, and collection modes |
| [`react`](/cli/transforms/react/) | `specs react` | A working React component wired to the contract and stylesheet, seeded once into an authored file you own |
| [`stories`](/cli/transforms/stories/) | `specs react` | A Storybook CSF page with a story per prop-expressible variant, importing the authored component |
| [`webcomponents`](/cli/transforms/webcomponents/) | `specs webcomponents` | A working Lit element wired to the contract and stylesheet, seeded once into an authored file you own |
| [`webcomponents-stories`](/cli/transforms/webcomponents-stories/) | `specs webcomponents` | A web-components Storybook CSF page with a story per prop-expressible variant, importing the authored element |

Stories are emitted by default; pass `--no-stories` to omit them. Components without variant data skip the scaffold/stories artifacts with a warning.

## How these are emitted now

```bash
# Everything the React target needs, for every component
specs react

# Scope to specific components
specs react --components dsAlert dsBadge

# The Web Components target, without stories
specs webcomponents --no-stories
```

There is no list of transformers to configure and no order to get right — each command emits everything its target imports.

## See Also

- [`react`](/cli/commands/react/) and [`webcomponents`](/cli/commands/webcomponents/) — the commands that emit these artifacts
