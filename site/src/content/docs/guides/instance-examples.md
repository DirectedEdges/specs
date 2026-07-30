---
title: "Instance (Ready-Made) Examples"
description: "Detect named frames that demonstrate a complete, pre-configured usage of a component"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Instance examples are **ready-made usages** of a component — named frames in your Figma file that show the whole component configured for a real scenario: an alert with a title, body, and two actions; a card with an image, heading, and CTA. They turn "here are the props" into "here's what good looks like."

## The Problem

A component spec lists every prop and variant, but a consumer still has to assemble a believable instance themselves. Teams already build these reference instances in Figma — on an "Examples" page or beside the component — yet that knowledge never reaches the spec. Instance examples harvest those frames into structured output.

## What It Does

When detection is configured, the engine finds matching instance frames and emits them under `Component.instanceExamples` — each with its resolved `propConfigurations` (and slot content via `$slotContent`). Consumers and code/AI tooling get concrete, named starting points.

```yaml
instanceExamples:
  dsAlertAllContentHorizontal:
    title: DS Alert - All Content Horizontal
    propConfigurations:
      appearance: critical
      children:
        $slotContent: "#/components/dsAlert/slotContentExamples/dsAlert__children"
```

## How to Author It

1. Build representative instances of the component in Figma.
2. Name them with a consistent pattern, e.g. `DS Alert - All Content Horizontal`.
3. Optionally group them inside a frame or section named `Examples`.
4. Configure detection (below) and generate.

## Configuration

Detection mirrors [`subcomponents`](/settings/subcomponents/): the **presence** of `processing.instanceExamples` is the on-switch. There is no separate `include` flag — when the block is present (and the license is Pro), examples are detected *and* emitted.

```yaml
# specs.config.yaml
config:
  processing:
    instanceExamples:
      scope: PAGE          # PAGE (default) or FILE
      match:
        - "{C} - *"        # {C} = component name
      parentNames:
        - Examples         # immediate parent must be an "Examples" frame/section
```

- `match` (required) — name patterns identifying example frames; `{C}` expands to the component name, `*` is a wildcard.
- `exclude` — patterns that disqualify a frame (exclusion wins over match).
- `parentNames` — restrict to frames whose **immediate** parent is one of these names.
- `scope` — `PAGE` (component's page) or `FILE` (all pages, e.g. a dedicated Examples page).

:::note[Pro feature]
Instance examples require a [Pro license](/overview/licensing/). On the free tier `processing.instanceExamples` is ignored — no detection, no output. In the Figma plugin the control is hidden until a Pro license is active.
:::

## Naming Tips

`match: ["{C}"]` only matches a frame named *exactly* the component name (patterns are anchored). To catch suffixed names like `DS Alert - All Content Horizontal`, use a wildcard: `"{C} - *"` or `"{C}*"`. The `{C}` placeholder resolves to the component's exact Figma name, so keep your example instance names prefixed consistently.

## Instance Examples vs. Default Slot Content

- **Instance examples** (this guide) — whole pre-configured *instances*, detected from named frames.
- **[Default slot content](/guides/default-slot-content/)** — the content *inside a slot*, captured structurally with no detection config.

## Further Reading

- [`processing.instanceExamples`](/settings/instance-examples/) — config reference
- [Default Slot Content](/guides/default-slot-content/) — the sibling feature
- [`subcomponents`](/settings/subcomponents/) — the presence-driven detection model this mirrors
- [Schema: Component](/schema/component/) — the `instanceExamples` registry shape
