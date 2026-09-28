---
title: "Composed Dependencies"
description: "Select the components a selected component composes, so the generated set is closed under composition"
---

A run choice in `config/settings.yaml`. When enabled, curating a component also curates everything it composes, transitively.

Curation usually starts from the library's own signal — most commonly a component's Figma dev status. That signal is incomplete by nature. A component marked ready composes others that carry no marking of their own: a subcomponent has no status to read, and a sibling it instances was curated on its own merits. Selecting only what is marked therefore deselects the very pieces the selection needs.

## Configuration

```yaml
spec:
  composedDependencies: true
```

On by default. A workspace that has never thought about this setting gets the complete set.

## Result

A slider marked ready instances a handle that is not marked. **With** the setting on, both are selected and both are generated:

```
specs/
  dsSlider/
  dsSliderHandle/
```

**With** it off, only the marked component is selected. The handle is still referenced by the slider's anatomy, but no spec is written for it:

```
specs/
  dsSlider/          # anatomy still reads instanceOf: dsSliderHandle
```

## What this does not decide

Whether one component *counts* as part of another is a convention, not a setting — see [`subcomponents`](/settings/subcomponents/). This setting governs only whether the closure is applied to the selection.

A component the design system composes as a true subcomponent is specced inside its parent, not beside it, and is unaffected either way.

## Turning it off

A reference that resolves to no spec does not fail. Every consumer resolves `instanceOf` by lookup and treats a miss as "not composable":

| Consumer | Behaviour |
|----------|-----------|
| React | The element is not emitted as an instance; it falls through to the container emitter |
| Web Components | Mirrors React |
| Figma render | The reference is not counted as a dependency and is not rendered as that component |

No dangling import, no build error, no Storybook failure. The instance is emitted as a plain container, so a composed element renders as an empty box where a real component belongs.

That degradation is silent, and harder to attribute than an error would be. Turn this off only where the generated set is deliberately narrower than what the library composes, and expect to notice the gaps yourself.
