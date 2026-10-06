---
title: "Infer Composable Slots"
description: "Read a slot whose default content is a single text layer as accepting string content"
---

When enabled, a Figma slot whose default content is exactly one text layer is read as string-composable: the prop is emitted with `'string'` among its [`accepts`](/schema/props/#slotcontentkind) kinds, and that text layer's formatting is captured onto the slot element's [`contentStyles`](/schema/elements/#styles-vs-content-styles) instead of being emitted as its own anatomy element.

A library fact, declared in `config/conventions/figma.yaml`. It states that this library expresses composable content the way Figma already lets it: a designer who wants a label that can also hold a Badge authors a **slot with a text layer inside**, while a designer who wants a plain string authors a **`TEXT` property on a text layer**. Nothing names the prop and nothing annotates it — the two shapes already differ, and the difference is the intent.

That is why this works per component rather than per catalogue. An Alert's `description` is composable because *that* slot has text in it; a Tooltip's `message` is a plain string because it is a `TEXT` prop. Neither needs an entry anywhere.

## Configuration

```yaml
inferComposableSlots: true  # Read a text-only slot as accepting string content
```

## Result

**Without** the reading (`false`), a slot holding a text layer is emitted as it is today — components only, and the text layer is its own anatomy element:

```json
{
  "props": {
    "children": { "type": "slot" }
  },
  "anatomy": [
    { "key": "children", "type": "slot" },
    { "key": "buttonLabel", "type": "text" }
  ]
}
```

**With** the reading (`true`), the slot states that it accepts a string, the text layer leaves anatomy, and its formatting moves onto the slot element:

```json
{
  "props": {
    "children": { "type": "slot", "accepts": ["string", "component"] }
  },
  "anatomy": [
    { "key": "children", "type": "slot" }
  ]
}
```

```yaml
# variants.yaml
default:
  elements:
    children:
      styles:
        padding: { $token: "DS Space.200", $type: dimension }
      contentStyles:
        typography: { $token: "DS Type.Label.Medium", $type: typography }
        textColor: { $token: "DS Color.Text.OnPrimary", $type: color }
```

A slot whose default content is a text layer *plus* another child is unaffected — two children are a composed arrangement, not a string. So is any prop authored as a Figma `TEXT` property.

## Independent of the default slot

Whether a slot accepts a string and whether it is the component's [default slot](/schema/props/) are separate questions, recorded separately:

| Component | Prop | `accepts` | `defaultSlot` |
|-----------|------|-----------|---------------|
| Button | `children` | `[string, component]` | `true` |
| Alert | `description` | `[string, component]` | — |
| Layout | `children` | — | `true` |

## A note on placeholder slots

A slot holding a lone text layer purely as placeholder scaffolding, with no intent that a string ever fill it, reads as composable too. The failure mode is a content set wider than intended, not a wrong one — a consumer permits a string fill the design never meant to offer.

This is the reason the reading is opt-in rather than on by default. If a library has such slots, either author them without a lone text layer, or leave this off.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, a slot whose default content is a single text layer is emitted with `'string'` in `accepts`, that layer's formatting is captured into the slot element's `contentStyles` per variant, and the layer is not emitted as an anatomy element. When `false`, slots are emitted exactly as they are today.

## Path

`inferComposableSlots` in `config/conventions/figma.yaml`
