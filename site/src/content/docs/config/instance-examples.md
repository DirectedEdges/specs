---
title: "Instance Examples"
description: "Detect named example frames that demonstrate a configured whole-component usage"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Instance examples are named frames in your Figma file that show a pre-configured, real-world usage of a component (for example, an alert with a title, body, and two actions filled in). When detection is configured, matching frames are harvested into `Component.instanceExamples` and emitted.

The **presence** of `processing.instanceExamples` is the on-switch — the same opt-in model as [`subcomponents`](/specs/config/subcomponents/). There is no separate `include` flag: when the block is present (and the license is Pro), examples are detected *and* emitted. When it is absent, no detection runs.

## Configuration

Examples on a dedicated page, inside an "Examples" frame:

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

Examples alongside the component, no parent filter:

```yaml
config:
  processing:
    instanceExamples:
      scope: PAGE
      match:
        - "{C} – *"
        - "{C} Example *"
```

## Result

Matched frames are harvested into an `instanceExamples` registry, each entry recording the example's `propConfigurations`. Below is one entry from the `DS Alert` output — a fully filled-in alert whose slot content is referenced via `$slotContent`:

```json
{
  "instanceExamples": {
    "dsAlert": {
      "title": "DS Alert",
      "propConfigurations": {
        "showIcon": true,
        "icon": "info",
        "appearance": "info",
        "children": {
          "$slotContent": "#/components/dsAlert/slotContentExamples/dsAlert__children"
        }
      }
    }
  }
}
```

When `processing.instanceExamples` is absent (or the license is not Pro), the registry is omitted entirely.

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

## Licensing

Instance example detection and output requires a [Pro license](/specs/overview/licensing/). On the free tier `processing.instanceExamples` is silently ignored — no detection runs and nothing is emitted. The Figma plugin hides these controls until a Pro license is active.

## See Also

- [Guide: Instance (Ready-Made) Examples](/specs/guides/instance-examples/) — authoring example frames end to end
- [`defaultSlotContent`](/specs/config/default-slot-content/) — the separate default-slot-content output flag
- [Schema: Component](/specs/schema/component/) — the `instanceExamples` registry shape
- [`subcomponents`](/specs/config/subcomponents/) — the presence-driven detection model this mirrors
