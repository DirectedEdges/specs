---
title: "indicator"
description: "Mark a state glyph as decoration so it is hidden from assistive technology"
---

The `indicator` part role marks an element as a decorative representation of state — a check glyph inside a checkbox, the thumb of a switch, the chevron on a disclosure.

## Why it matters

This is the one part whose job is subtraction, and it prevents a specific and common double-announcement. A checkbox with a check glyph already announces "checked" through `aria-checked` or the native input. If the glyph also exposes itself — as an image with a filename, or as a text node containing a character — the same fact is announced twice, and the second announcement is usually noise like "checkmark graphic."

Without the role, the transform has no way to distinguish a glyph that means something from a glyph that merely draws the state, so it must either hide all of them or none.

## Emission

### Scaffold

| Where | What is emitted |
|-------|-----------------|
| The indicator element itself | `aria-hidden="true"` |
| The resolved control | Nothing |

The element's tag, classes, layout, and styling are unchanged. Only the attribute is added, so nothing about the visual result changes.

An `aria-hidden` element must not contain focusable content. An `indicator` whose subtree contains a slot or an interactive element is a warning: hiding it would strand the focusable descendant in a region assistive technology cannot see.

### Contract

None. Most parts add an `id` to their own element and an attribute to a different element; `indicator` touches only itself, and the control gains nothing. Either way a part is wiring, not behavior — the only parts that carry handlers are `increment` and `decrement`, which call `stepUp()` / `stepDown()` on their control.

An indicator is decoration by declaration. If an element needs a handler it is not an indicator — it is a [button](/roles/button/) or an `increment` / `decrement` part.

## How it resolves

`indicator` is accepted by both value-bearing and non-value-bearing control concepts, so it follows the standard two-path rule:

- Where the component's single value-bearing control accepts it (`checkbox`, `radio`, `switch`), the part resolves to that control regardless of tree position.
- Where only non-value-bearing concepts accept it (`button`, `togglebutton`, `disclosure`), it resolves by proximity, and ambiguity is an error naming every candidate.

In practice resolution rarely matters for this part, because the emission does not depend on which control it resolved to — `aria-hidden="true"` is the same attribute either way. Resolution matters only for validating that the part is accepted at all.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `aria-hidden="true"` | Screen readers skip the glyph; the state announces once, from the control |
| iOS | The glyph hidden from accessibility | VoiceOver skips the glyph and announces the state once, from the control |
| Android | The glyph's semantics cleared | TalkBack skips the glyph and announces the state once, from the control |

## Before and after

Without the role:

```tsx
{/* … */}
<span className="check" data-element="checkGlyph" />
{/* … */}
```

With the role:

```tsx
{/* … */}
<span className="check" data-element="checkGlyph" aria-hidden="true" />
{/* … */}
```

## See also

- [checkbox](/roles/checkbox/) — the control whose state the indicator draws
- [togglebutton](/roles/togglebutton/) — another common host for an indicator
- [Roles overview](/roles/) — how roles and `processing.states` fit together
