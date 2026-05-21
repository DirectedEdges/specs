---
title: "Instance Examples"
description: "Detect named example frames that demonstrate a configured whole-component usage"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

:::note[Pro feature]
Instance example detection and output requires a [Pro license](/specs/overview/licensing/). On the free tier `processing.instanceExamples` is silently ignored — no detection runs and nothing is emitted. The Figma plugin hides these controls until a Pro license is active.
:::

Instance examples are named frames in your Figma file that show a pre-configured, real-world usage of a component (for example, an alert with a title, body, and two actions filled in). When detection is configured, matching frames are harvested into `Component.instanceExamples` and emitted.

The **presence** of `processing.instanceExamples` is the on-switch — the same opt-in model as [`subcomponents`](/specs/config/subcomponents/). There is no separate `include` flag: when the block is present (and the license is Pro), examples are detected *and* emitted. When it is absent, no detection runs.

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `scope` | `"PAGE"` \| `"FILE"` | No | `PAGE` | Search boundary. `PAGE` = the component's Figma page only; `FILE` = all pages in the file (for teams with a dedicated "Examples" page) |
| `match` | `string[]` | Yes | — | Name patterns identifying example frames, using the `{C}` (component name) placeholder |
| `exclude` | `string[]` | No | — | Name patterns to exclude. Same `{C}` syntax as `match` |
| `parentNames` | `string[]` | No | — | Immediate-parent frame or section names a candidate must be contained within. Absence means no parent-name filtering |

A frame must match at least one `match` pattern. If it also matches an `exclude` pattern, the exclusion wins. When `parentNames` is set, a frame additionally qualifies only when its **immediate** parent (frame or section) is named one of the listed values — useful for grouping examples inside a frame named `"Examples"` to distinguish them from test cases or playground instances.

`NESTED` scope is intentionally unavailable: a component instance used as an example cannot live inside the component frame itself.

## Path

`config.processing.instanceExamples`

### Example — examples on a dedicated page, inside an "Examples" frame

```yaml
config:
  processing:
    instanceExamples:
      scope: FILE
      parentNames:
        - Examples
      match:
        - "{C} / *"
      exclude:
        - "* / Deprecated / *"
```

### Example — examples alongside the component, no parent filter

```yaml
config:
  processing:
    instanceExamples:
      scope: PAGE
      match:
        - "{C} – *"
        - "{C} Example *"
```

## See Also

- [Guide: Instance (Ready-Made) Examples](/specs/guides/instance-examples/) — authoring example frames end to end
- [`slotContentExamples`](/specs/config/slot-content-examples/) — the separate default-slot-content output flag
- [Schema: Component](/specs/schema/component/) — the `instanceExamples` registry shape
- [`subcomponents`](/specs/config/subcomponents/) — the presence-driven detection model this mirrors
