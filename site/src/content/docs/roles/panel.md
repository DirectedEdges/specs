---
title: "panel"
description: "Mark the region a disclosure controls, generating the id that aria-controls points at"
---

The `panel` part role marks the region that a [disclosure](/roles/disclosure/) trigger expands and collapses.

## Why it matters

`aria-expanded` on a trigger tells assistive technology that something expands. It does not say *what*. Without the linkage a screen reader user hears that a control is expanded and has no way to reach the content that appeared — they must hunt for it in reading order. The `panel` part supplies the missing half of the pattern, and it is the only way to supply it, because ids are generated at render and cannot be authored.

## Emission

### Scaffold

| Where | What is emitted |
|-------|-----------------|
| The panel element itself | A generated `id` |
| The `disclosure` trigger | `aria-controls={panelId}` |

The panel element's tag, classes, and children are unchanged.

The role never hides the panel. Visibility stays with CSS and the variant conditions the analysis already produced — the role adds linkage, never show/hide logic.

### Contract

None. Like most parts, `panel` adds an `id` to its own element and an attribute to a *different* element — the trigger. It is wiring, not behavior; the only parts that carry handlers are `increment` and `decrement`, which call `stepUp()` / `stepDown()` on their control.

The expansion event belongs to the trigger, which owns `onExpandedChange`.

## How it resolves

`disclosure` is not a value-bearing control, so `panel` resolves by proximity:

- The candidate disclosure whose subtree contains the panel, if there is one.
- Otherwise the candidate that is the panel's closest sibling-path ancestor's child.

The panel is usually a *sibling* of its trigger rather than a descendant, which is exactly the case the proximity rule exists for. Two disclosures in one component with an ambiguous panel is an error naming the panel and every candidate — never a silent pick.

A `panel` with no `disclosure` in its own component is valid and self-describing: it declares that the component *provides* a panel rather than consuming one. Such a component emits the generated id but no wiring, because it has no trigger to wire to. The wiring arrives when the component is composed.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `id` on the panel, `aria-controls` on the trigger | Assistive technology can move from the trigger to the content it expands |
| iOS | The panel as the disclosure's content | The content appears with the expanded state VoiceOver announces on the trigger |
| Android | The panel as the disclosure's content | The content appears with the expanded state TalkBack announces on the trigger |

## Before and after

Without the role:

```tsx
{/* … */}
<div className="accordion-panel" data-element="panel">{p.children}</div>
{/* … */}
```

With the role:

```tsx
{/* … */}
<div className="accordion-panel" data-element="panel" id={panelId}>{p.children}</div>
{/* … */}
```

The panel's own diff is a single attribute. The change that matters happens on the trigger, which gains `aria-controls={panelId}`.

## See also

- [disclosure](/roles/disclosure/) — the trigger this part wires to
- [errormessage](/roles/errormessage/) — the same id-plus-attribute shape, for controls
- [Roles overview](/roles/) — how roles and `processing.states` fit together
