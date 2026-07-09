---
title: "Instance Examples"
description: "Pre-configured whole-component usages for documentation"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>
<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

An `InstanceExample` is a pre-configured usage of a *whole* component — a documented configuration for human readers and tooling, not a live data flow. Scalar props are set directly; slot props are filled with a [`SlotContentRef`](/schema/slot-content-ref/). They live on [`Component.instanceExamples`](/schema/component/) and are emitted only with a Pro license.

```ts
type InstanceExample = {
  title?: string;
  propConfigurations?: Record<string, string | number | boolean | SlotContentRef>;
};

type InstanceExamples = Record<string, InstanceExample>;
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | No | Human-readable label for this example |
| `propConfigurations` | `Record<string, string \| number \| boolean \| `[`SlotContentRef`](/schema/slot-content-ref/)`>` | No | Prop values — scalars for scalar props, a `SlotContentRef` for slot props |

A [`PropBinding`](/schema/prop-binding/) is **not** permitted in `propConfigurations` — an instance example is a static configuration, not a binding.

Slot fills encountered inside an example instance are contributed to the shared [`slotContentExamples`](/schema/slot-content/) registry (de-duplicated against existing entries), so an `InstanceExample` holds no slot content of its own — only a `SlotContentRef` into that registry.

## Registry shape

`InstanceExamples` (`Record<string, InstanceExample>`) is the shape of `Component.instanceExamples`. Keys are plain identifier strings matching `^[a-zA-Z0-9_-]+$`.

## Detection

How example instances are harvested from a Figma file is controlled by [`processing.instanceExamples`](/settings/instance-examples/).

## Further Reading

- [Component Examples as Data](https://nathanacurtis.substack.com/p/component-examples-as-data) — the thinking behind examples in the spec
- [ADR 048 — Component Instance Examples](https://github.com/DirectedEdges/specs/blob/main/adr/048-component-instance-examples.md)
- [Instance Examples (config)](/settings/instance-examples/) — detection setup
- [Instance Examples (guide)](/guides/instance-examples/)
