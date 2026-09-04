---
title: "label"
description: "Emit a real label element wired to the control it names with htmlFor"
---

The `label` part role marks the element that carries a control's visible label text.

## Why it matters

Without the role, a label renders as a `<div>` with text: clicking it does nothing, and assistive technology has no way to connect the text to the control it names. With the role, clicking the label focuses or activates the control, and the control's accessible name is the label text and nothing else. For a proxy-input control like [checkbox](/roles/checkbox/), keeping the label as its own element is what stops the accessible name from swallowing description and required-indicator text that happens to share a wrapper.

## Emission

### Scaffold

| Where | What is emitted |
|-------|-----------------|
| The `label` element itself | A real `<label>` tag with `htmlFor` referencing the control's generated `id` |
| The resolved control | A generated `id` the association points at |
| An `instance` element carrying the role | Routing only — the control's id is routed into the instance; the wrapper's tag never changes |

Inside a text-family control's collapse, a descendant carrying `label` is lifted out and re-emitted as a sibling of the emitted `<input>`, at the control's depth.

A component only emits the `<label>` element for text it owns. A consumer wrapping a label subcomponent routes its control id in; the subcomponent emits the element. Two nested `<label>` tags are impossible by construction.

### Contract

None. Like most parts, `label` adds an `id` to one element and an attribute to a different element — it is wiring, not behavior. Clicking a `<label htmlFor>` focuses or activates its control because HTML supplies that behavior, and the control's own role carries the event surface (`onChange`, `onClick`).

The only parts that carry handlers are `increment` and `decrement`, which call `stepUp()` / `stepDown()` on their control — `label` is not one of them.

## How it resolves

- Accepted by every value-bearing control concept (`textbox`, `checkbox`, `radio`, `switch`, `slider`, …) — resolves to the component's single value-bearing control, wherever either element sits in the layout.
- Accepted by the non-value-bearing concepts (`button`, `togglebutton`, `link`, `disclosure`) — resolves by proximity, since a component may have several; an ambiguous lookup is an error naming the part and every candidate.
- A `label` with no candidate control in its own component is valid and self-describing. A standalone label component emits `<label>` with a generated id but no `htmlFor` — it *provides* the part rather than consuming one. Wiring arrives when it is composed beside a control.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<label htmlFor>` on the text, `id` on the control | Clicking the label focuses or activates the control; the control announces by the label text |
| iOS | The label text as the control's accessibility label | VoiceOver announces the control by this text |
| Android | The label text merged into the control's semantics | TalkBack announces the control by this text |

## Before and after

Without the role:

```tsx
{/* … */}
<div className="ds-field-label">
  {p.label}
</div>
<div className="ds-input">
{/* … */}
```

With the role:

```tsx
{/* … */}
<label className="ds-field-label" htmlFor={inputId}>
  {p.label}
</label>
<input className="ds-input" id={inputId}
{/* … */}
```

## See also

- [errormessage](/roles/errormessage/) — the sibling part, wired through `aria-describedby`
- [textbox](/roles/textbox/) and [checkbox](/roles/checkbox/) — controls that accept `label`
- [Roles overview](/roles/) — how roles and `processing.states` fit together
