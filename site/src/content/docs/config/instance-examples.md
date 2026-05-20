---
title: "Instance Examples"
description: "Detect named example frames that demonstrate a configured whole-component usage"
---

Instance examples are named frames in your Figma file that show a pre-configured, real-world usage of a component (for example, an alert with a title, body, and two actions filled in). When detection is configured, matching frames are harvested into `Component.instanceExamples` and emitted when [`include.instanceExamples`](#gating-the-output) is enabled.

When `processing.instanceExamples` is absent, no instance example detection runs — the same opt-in model as [`subcomponents`](/specs/config/subcomponents/).

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
  include:
    instanceExamples: true
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
  include:
    instanceExamples: true
```

## Gating the output

Detection populates the data, but output is gated by the `include.instanceExamples` flag (defaults to `false`). Both must be set for instance examples to appear:

- `processing.instanceExamples` — *how* to detect example frames
- `include.instanceExamples` — *whether* to emit the detected data

## See Also

- [`include.instanceExamples` / `include.slotContentExamples`](/specs/config/slot-content-examples/) — the output gates
- [Schema: Component](/specs/schema/component/) — the `instanceExamples` registry shape
- [`subcomponents`](/specs/config/subcomponents/) — the detection model this mirrors
