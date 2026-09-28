---
title: "Composed Dependencies"
description: "Select the components a selected component composes, so the generated set is closed under composition"
---

A run choice in `config/settings.yaml`. When on, selecting a component also selects everything that component is built from.

You normally choose what to generate by marking components Ready for dev in Figma. `specs scan` reads those marks and checks the matching rows in the manifest.

Marks alone leave gaps. A slider marked ready is built from a handle that nobody marked — a piece has no status of its own, and a component the slider instances was marked on its own merits. Generate from the marks alone and the slider's spec points at a handle spec that was never written.

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
