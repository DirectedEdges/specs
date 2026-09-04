---
title: "value"
description: "Mark the text element that stands in for a control's value during collapse"
---

The `value` part role marks the text element that stands in for a control's value in the design.

## Why it matters

A designed text input is a stack of styled layers: a value text node, a placeholder text node, decorations, wrappers. A native `<input>` is one element with attributes. Collapse replaces the stack with the native control, and it is driven by annotation rather than discovery: the author marks what matters, and everything unannotated is chrome by declaration. Without `value`, the transform would have to guess which text node is the value.

The name is specs-native — ARIA has no vocabulary for pieces of a component, so the part vocabulary supplies one.

## Emission

### Scaffold

| Where | What is emitted |
|-------|-----------------|
| The `value` element itself | Consumed by collapse — its text seeds the emitted control's `value`; the element does not render |
| The resolved control | The native control renders with that value; its own contract carries the change signal |

The sibling `placeholder` part works the same way: consumed into the control's `placeholder` attribute rather than rendered.

Unannotated descendants of a collapsing control are dropped silently — a decorative text node, an intermediate wrapper, a trailing icon all disappear, because the author declared what mattered by annotating it.

### Contract

None. Like most parts, `value` adds no props and no handlers — it only tells the control where its value lives. The control's own role carries the event surface: its `onChange` fires on every keystroke (text family) or on drag and arrow keys (`slider`).

The only parts that carry handlers sit beside `value` on a `spinbutton`: `increment` and `decrement` each emit a real `<button>` whose `onClick` calls `stepUp()` / `stepDown()` on the control. Both delegate to the control rather than owning behavior themselves.

## How it resolves

- Accepted only by value-bearing control concepts (`textbox`, `password`, `searchbox`, `spinbutton`, `slider`, `textarea`) — so it resolves to the component's single value-bearing control, wherever either element sits in the layout. No tree walk, no ambiguity.
- At most one element per part role per control: two elements both claiming `value` for the same control is an error naming both.
- A `value` with no candidate control in its own component is valid and self-describing — it emits its own semantics but no wiring, which arrives when composed.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | The native control's `value` (and `placeholder`) | One real editable value — no phantom text layers behind the field |
| iOS | The text field's bound value | VoiceOver reads the field's current value |
| Android | The text field state's value | TalkBack reads the field's current value |

## Before and after

Without the role:

```tsx
{/* … */}
<div className="ds-input-field">
  <div className="ds-input-value">{p.value}</div>
  <div className="ds-input-placeholder">{p.placeholder}</div>
</div>
{/* … */}
```

With the role (both text layers annotated):

```tsx
{/* … */}
<input
  className="ds-input-field"
  value={value}
  placeholder={p.placeholder}
  onChange={handleChange}
/>
{/* … */}
```

## See also

- [textbox](/roles/textbox/) — the flagship collapse consumer
- [label](/roles/label/) — lifted out of the collapse rather than consumed
- [Roles overview](/roles/) — how roles and `processing.states` fit together
