---
title: "slotContentExamples"
description: "Emit structurally-detected default slot content as examples"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

:::note[Pro feature]
`slotContentExamples` output requires a [Pro license](/specs/overview/licensing/). On the free tier the flag is silently ignored — slot content is neither stamped nor emitted, regardless of config. This applies to the CLI, the REST API, and the Figma plugin (where the control is hidden until a Pro license is active).
:::

When `true`, the generator emits `Component.slotContentExamples` — the **default content placed inside a component's slot layers**, captured structurally and referenced from each slot binding via `$slotContent`. Defaults to `false`, so output for unannotated components is unchanged until you opt in.

Unlike [`instanceExamples`](/specs/config/instance-examples/), slot content examples need **no detection config** — they are derived structurally from whatever content sits inside slot layers. This flag is the only control.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `slotContentExamples` | `boolean` | `false` | Emit `Component.slotContentExamples` — default fills detected structurally from content inside slot layers |

## Path

`config.include.slotContentExamples`

### Example

```yaml
config:
  include:
    slotContentExamples: true   # emit structurally-detected slot fills
```

## See Also

- [Guide: Default Slot Content](/specs/guides/default-slot-content/) — what it captures and how to author it
- [`processing.instanceExamples`](/specs/config/instance-examples/) — the separate, presence-driven instance-example feature
- [Schema: Component](/specs/schema/component/) — `slotContentExamples` registry shape
