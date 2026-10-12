---
title: "defaultSlotContent"
description: "Emit the component's structurally-detected default slot content as examples"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>
<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

A run choice in `config/settings.yaml`. When `true`, the generator emits `Component.slotContentExamples` — the **default content placed inside a component's slot layers**, captured structurally and referenced from each slot binding via `$slotContent`. Defaults to `false`, so output for unannotated components is unchanged until you opt in.

Unlike [`instanceExamples`](/settings/instance-examples/), slot content examples need **no detection convention** — they are derived structurally from whatever content sits inside slot layers. This flag is the only control, and because it is a run choice rather than a library fact, it lives in `settings.yaml`.

## Configuration

```yaml
spec:
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

## Not the same thing as `slots.default`

Two names sit uncomfortably close together, and they answer different questions:

| | What it is | Where it lives | What it decides |
|---|---|---|---|
| `defaultSlotContent` | a run choice | `config/settings.yaml` | **whether** composed slot content is recorded at all |
| [`slots.default`](/settings/default-slot/) | a library fact | `config/conventions/figma.yaml` | **which** slot is the designated default, and therefore what shape its fill takes |

"Default" means a different thing in each. Here it means the content a slot *defaults to* — whatever a designer placed inside the slot layer. There it means the *designated* slot, the one a layout component always composes through.

They compose rather than overlap. This flag governs a **component's own** slot layers, which is the case `slots.default` does not touch: the component declares that slot, so content in it is the slot's authored default and stays a `slotContentExamples` entry pointed at from the binding, exactly as shown above — whether or not the prop is also marked `defaultSlot: true`.

Where they meet is a **nested instance**. When this flag is on *and* the library declares `slots.default`, a fill into a nested instance's default slot is captured as that instance's children instead of as an entry. So turning this flag on is what opens the door; the convention decides which slots walk through it. A composition is exempt from this flag — composed content is the whole reason a composition exists — so its nesting follows the convention alone.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultSlotContent` | `boolean` | `false` | Emit the component's default slot content into `Component.slotContentExamples` — fills detected structurally from content inside slot layers |

## Path

`spec.defaultSlotContent` in `config/settings.yaml`

## Licensing

`defaultSlotContent` output requires a [Pro license](/overview/licensing/). On the free tier the flag is silently ignored — slot content is neither stamped nor emitted, regardless of config. This applies to the CLI, the REST API, and the Figma plugin (where the control is hidden until a Pro license is active).

## See Also

- [Guide: Default Slot Content](/guides/default-slot-content/) — what it captures and how to author it
- [`slots.default`](/settings/default-slot/) — the library fact that decides which slot is the default one
- [`instanceExamples`](/settings/instance-examples/) — the separate, presence-driven instance-example feature
- [Schema: Component](/schema/component/) — `slotContentExamples` registry shape
