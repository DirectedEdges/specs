---
title: "defaultSlotContent"
description: "Emit the component's structurally-detected default slot content as examples"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>
<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

When `true`, the generator emits `Component.slotContentExamples` — the **default content placed inside a component's slot layers**, captured structurally and referenced from each slot binding via `$slotContent`. Defaults to `false`, so output for unannotated components is unchanged until you opt in.

Unlike [`instanceExamples`](/settings/instance-examples/), slot content examples need **no detection config** — they are derived structurally from whatever content sits inside slot layers. This flag is the only control.

## Configuration

```yaml
config:
  include:
    defaultSlotContent: true   # emit structurally-detected default slot fills
```

## Result

Each slot binding gains a `$slotContent` example pointer, and the referenced fill is emitted into `slotContentExamples`. From the `DS Alert` output, the `children` slot points at its captured default content:

```json
{
  "default": {
    "elements": {
      "children": {
        "children": {
          "$binding": "#/props/children",
          "examples": [
            { "$slotContent": "#/components/dsAlert/slotContentExamples/dsAlert__children__default" }
          ]
        }
      }
    }
  }
}
```

That reference resolves to a structurally-captured fill — here a title, description, and an `actions` instance (trimmed):

```json
{
  "slotContentExamples": {
    "dsAlert__children__default": {
      "anatomy": {
        "text": { "type": "container" },
        "title": { "type": "text" },
        "description": { "type": "text" },
        "actions": { "type": "instance", "instanceOf": "dsAlertActions" }
      },
      "elements": {
        "title": { "content": "{Title}" },
        "description": { "content": "{Description}" }
      },
      "layout": [
        { "text": ["title", "description"] },
        "actions"
      ]
    }
  }
}
```

With `defaultSlotContent: false` (the default), the slot binding carries no `$slotContent` example and the `slotContentExamples` registry is omitted.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultSlotContent` | `boolean` | `false` | Emit the component's default slot content into `Component.slotContentExamples` — fills detected structurally from content inside slot layers |

## Path

`config.include.defaultSlotContent`

## Licensing

`defaultSlotContent` output requires a [Pro license](/overview/licensing/). On the free tier the flag is silently ignored — slot content is neither stamped nor emitted, regardless of config. This applies to the CLI, the REST API, and the Figma plugin (where the control is hidden until a Pro license is active).

## See Also

- [Guide: Default Slot Content](/guides/default-slot-content/) — what it captures and how to author it
- [`processing.instanceExamples`](/settings/instance-examples/) — the separate, presence-driven instance-example feature
- [Schema: Component](/schema/component/) — `slotContentExamples` registry shape
