---
title: "Example Output Gates"
description: "Toggle slot content and instance example output independently"
---

Two independent `include` flags gate the two example registries on a component. Both default to `false`, so existing output for unannotated components is unchanged until you opt in.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `slotContentExamples` | `boolean` | `false` | Emit `Component.slotContentExamples` — sample fills detected **structurally** from content placed inside slot layers |
| `instanceExamples` | `boolean` | `false` | Emit `Component.instanceExamples` — named example frames detected via [`processing.instanceExamples`](/specs/config/instance-examples/) |

The two flags are independent: a team ready to publish slot fills can set `slotContentExamples: true` while leaving `instanceExamples: false`.

## Detection vs. gating

- **Slot content examples** require *no* detection config — they are derived structurally from slot layers that have content placed in them. The `slotContentExamples` flag is the only control.
- **Instance examples** require *both* a [`processing.instanceExamples`](/specs/config/instance-examples/) detection block (which frames, where) *and* the `instanceExamples` flag (whether to emit).

## Path

`config.include.slotContentExamples`, `config.include.instanceExamples`

### Example

```yaml
config:
  include:
    slotContentExamples: true   # emit structurally-detected slot fills
    instanceExamples: true      # emit detected example frames
  processing:
    instanceExamples:           # required for instanceExamples output
      scope: PAGE
      match:
        - "{C} Example *"
```

## See Also

- [`processing.instanceExamples`](/specs/config/instance-examples/) — instance example detection
- [Schema: Component](/specs/schema/component/) — `slotContentExamples` and `instanceExamples` registry shapes
