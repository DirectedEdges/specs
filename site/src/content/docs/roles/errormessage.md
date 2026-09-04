---
title: "errormessage"
description: "Generate an id on the message element and aria-describedby on the control"
---

The `errormessage` part role marks the element that carries a control's validation message.

The name comes from the ARIA *attribute* `aria-errormessage` — there is no ARIA role by this name, and the emitted wiring uses `aria-describedby`.

## Why it matters

Without the role, an error message is just red text near an input — a screen reader announces the input's invalid state but never reads *why*. With the role, the message is programmatically associated with the control, so assistive technology reads the message when the control is focused. Because the message typically renders only when the [`invalid` state](/settings/states/) is active, the association appears and disappears with it — an `aria-describedby` pointing at an absent id is worse than none.

## Emission

### Scaffold

| Where | What is emitted |
|-------|-----------------|
| The `errormessage` element itself | A generated `id` |
| The resolved control | `aria-describedby` referencing that id, present only while the message renders |
| An `instance` element carrying the role | Routing only — the id wiring is routed through the instance; the wrapper's tag never changes |

`aria-describedby` omits ids for elements whose render condition is false in the current variant, so a conditional error message contributes nothing when it does not render. The message's visibility stays with the render condition the analysis already produced — the role adds linkage, never show/hide logic.

The related `description` part works identically for supplementary (non-error) text: generated id on the element, `aria-describedby` on the control.

Roles never invent markup: the message element exists only when the library designed a matching element. Where no element carries the part, the control's contract omits the message prop entirely rather than shipping a dead one.

### Contract

None. Like most parts, `errormessage` adds an `id` to its own element and an attribute to a *different* element — the control, not the message. It is wiring, not behavior; the only parts that carry handlers are `increment` and `decrement`, which call `stepUp()` / `stepDown()` on their control.

Validation state changes arrive through the control's own contract — the `invalid` state concept bridged to `aria-invalid` — not through anything on the message element.

## How it resolves

- Accepted by the value-bearing form controls (`textbox`, `password`, `searchbox`, `spinbutton`, `textarea`, `checkbox`, `radio`) and by `group` — it resolves to the component's single value-bearing control regardless of where either element sits in the layout.
- At most one element per part role per control: two elements both claiming `errormessage` for the same control is an error naming both.
- An `errormessage` with no candidate control in its own component is valid and self-describing. A standalone error-message component emits its element and generated id but no wiring — it *provides* the part. Wiring arrives when a consumer composes it beside a control.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `id` on the message, `aria-describedby` on the control | The message is read when the control is focused |
| iOS | The message folded into the field's accessibility output | VoiceOver reads the error together with the field |
| Android | Error semantics on the field | TalkBack announces the error together with the field |

## Before and after

Without the role:

```tsx
{/* … */}
<div className="ds-input" data-validation={p.validation} />
{p.validation === 'invalid' && (
  <div className="ds-error-text">{p.errorText}</div>
)}
{/* … */}
```

With the role:

```tsx
{/* … */}
<input className="ds-input" aria-invalid={invalid}
  aria-describedby={invalid ? errorId : undefined} />
{invalid && (
  <div className="ds-error-text" id={errorId}>{p.errorText}</div>
)}
{/* … */}
```

## See also

- [label](/roles/label/) — the naming part; `errormessage` is the describing part
- [textbox](/roles/textbox/) and [checkbox](/roles/checkbox/) — controls that accept `errormessage`
- [States](/settings/states/) — the `invalid` concept that gates rendering
- [Roles overview](/roles/) — how roles and `processing.states` fit together
