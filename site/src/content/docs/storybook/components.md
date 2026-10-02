---
title: "Components"
description: "One entry per component, with each platform you emit as a tab."
---

The sidebar lists each component once, under **Components** — not once per
framework. The component's name is the link; clicking it opens its docs page:
a live example, a controls table generated from the component's props, and
every emitted story.

## The framework tabs

At the top of a component's page — ordinary tabs inside the page, the same treatment the Analysis pages use:

| Tab | Shows | Present when |
|---|---|---|
| **React** | The React docs page — controls, stories | You ran `specs react` |
| **Web Components** | The same component's Lit output, same stories | You ran `specs webcomponents` |
| **Specs** | The authored spec itself — `api`, `variants`, `examples` — formatted | **Always** |

The tab set follows from what your workspace actually contains. A platform you
never emitted gets no tab, and the Specs tab is always there because it is the
one view that doesn't depend on a transform having run. A workspace that emits
nothing still has a complete, browsable component list — specs only.

The tabs appear on component pages and nowhere else; a Foundations page has no
React/Web Components split, so it doesn't offer one.

## Subcomponents

A component with subcomponents (Alert with its Actions, say) appears as a small
group: an **Overview** page for the component itself, and one entry per
subcomponent beneath it.

## Stories on the docs page

Every story down the page carries **Show code** and **Open full screen**. The
stories themselves come from your specs — the examples and variants you
authored — via `specs react` / `specs webcomponents`, not from this command.
