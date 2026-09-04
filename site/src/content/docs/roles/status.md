---
title: "status, alert, and progressbar"
description: "Announce content that changes after load through live regions and progress semantics"
---

Three roles cover content that appears or changes after the page has loaded and must be announced without moving focus: `status` for transient confirmations, `alert` for interruptions, and `progressbar` for determinate or indeterminate progress.

## Why it matters

A toast that fades in, a validation summary that appears on submit, and a progress bar that fills are all invisible to a screen reader user unless the region is declared live before the content changes. There is no partial credit here: a live region declared *after* its content arrives announces nothing. Because the declaration must be in the markup up front, this is exactly the kind of signal a spec can carry and a runtime cannot infer.

## Emission

### Scaffold

All three are literal WAI-ARIA role tokens, so the emission is `role="<name>"` directly, and all three substitute in place — the element's tag, classes, and children are unchanged.

| Role | Web emission |
|------|--------------|
| `alert` | `role="alert"` |
| `status` | `role="status"` |
| `progressbar` | `role="progressbar"` + `aria-valuemin` / `aria-valuemax` / `aria-valuenow` |

### Contract

| Prop | Type | Role | Generated body |
|------|------|------|----------------|
| `min?` | `number` (default `0`) | `progressbar` only | Emitted as `aria-valuemin` |
| `max?` | `number` (default `100`) | `progressbar` only | Emitted as `aria-valuemax` |

`alert` and `status` add no props. None of the three adds an event handler — an announcement region reports; it does not respond.

## States

| State | What the region does | Classify in `processing.states`? |
|-------|----------------------|----------------------------------|
| `busy` | Bridged to `aria-busy` on `status` and `progressbar` | Recommended |

The role does not replace the classification: the Figma variant prop carrying `busy` still wants an entry in [`processing.states`](/settings/states/), which is what tells the transform that the prop carries that state.

## Choosing alert or status

The choice is a declaration of interruption severity, and it is the designer's to make — the two produce materially different user experiences and nothing in the markup can derive one from the other.

| Role | Live region politeness | Use for |
|------|------------------------|---------|
| `alert` | Assertive — interrupts whatever is being read | Errors, session expiry, destructive-action warnings |
| `status` | Polite — waits for a pause | Save confirmations, transient toasts, result counts |

Choosing `alert` for a routine confirmation makes an application hostile to screen reader users, because every toast cuts off the sentence in progress. Choosing `status` for a genuine error means the error may not be announced until the user stops interacting.

## Determinate and indeterminate progress

The split comes from `propRoles` bindings, never from a prop-name guess, and it needs two bindings rather than one:

- **`value`** names the prop carrying progress.
- **`indeterminate`** names a boolean prop that forces the indeterminate presentation regardless of value.

Two bindings are necessary because many libraries model an indeterminate loading bar with a boolean and no value prop at all. A value-only mechanism would discard the one signal such a component actually carries.

Resolution order:

1. An `indeterminate` binding that resolves true suppresses `aria-valuenow`.
2. Otherwise a resolved `value` binding produces the determinate form.
3. Otherwise the indeterminate form is emitted, with a warning.

## Interactive content inside an announcement

An announcement region may legitimately contain an interactive element — a toast with a dismiss affordance is the common case. Where that affordance is an instance of another component, it carries its own [button](/roles/button/) role in its own spec, and the containing `status` role is unaffected. This is the sanctioned form of two roles in one rendered tree: different elements, different specs. The prohibited form is two specs claiming the same DOM position.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `role="status"` / `role="alert"` / `role="progressbar"` with `aria-value*` | Changes announce without moving focus — politely for `status`, immediately for `alert`; progress reads with its value |
| iOS | Spoken announcements for changed content; progress semantics for progress | VoiceOver speaks the change without moving focus; progress reads with its value |
| Android | Live-region semantics (polite or assertive); progress range semantics | TalkBack speaks the change without moving focus; progress reads with its value |

## Before and after

Without the role:

```tsx
<div className="toast" data-element="root">
  {/* … */}
</div>
```

With the role:

```tsx
<div className="toast" data-element="root" role="status">
  {/* … */}
</div>
```

And for a progress bar with an indeterminate boolean and no value prop:

```tsx
<div
  className="loading-bar"
  data-element="root"
  role="progressbar"
  aria-valuemin={p.min ?? 0}
  aria-valuemax={p.max ?? 100}
  {/* aria-valuenow omitted — the indeterminate binding resolved true */}
/>
```

## See also

- [errormessage](/roles/errormessage/) — validation text wired to a specific control, a different job from a page-level `alert`
- [States](/settings/states/) — the `busy` state concept
- [Roles overview](/roles/) — how roles and `processing.states` fit together
