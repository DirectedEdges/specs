---
title: "togglebutton"
description: "Emit a button that carries its pressed state in aria-pressed, with an onPressedChange contract"
---

The `togglebutton` role declares that an element performs an action and retains a two-state condition — a favorite affordance, a bold control in a formatting bar, a filter chip that stays on.

## Why it matters

Without the role, a toggle scaffolds as an inert container whose pressed condition exists only as a `data-*` attribute. Assistive technology has no way to learn that the control is a toggle at all, let alone which way it is set — a screen reader announces "Favorite, button" whether the item is favorited or not, so the one piece of information the control exists to convey is the piece that is missing.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<button type="button" aria-pressed>` |
| Accepted element types | `container`, `glyph` |
| Accepted parts | `label`, `description`, `indicator` |

The role element becomes the button, and its descendants render inside it. Where the role lands on a `glyph`, the glyph is re-hosted inside the button rather than becoming it, which adds one level to the markup.

There is no `togglebutton` ARIA role. The emission is a button plus `aria-pressed`; `role="togglebutton"` is never emitted, because it is not a valid ARIA value.

This is also where `togglebutton` and [button](/roles/button/) divide the word "pressed": a `button` bridges the momentary `active` concept — the condition while a pointer is held down — and never emits `aria-pressed`; a `togglebutton` bridges the retained `pressed` concept and does. A component with both a momentary highlight and a retained toggle declares two state entries against two different Figma props, and the role decides which one reaches ARIA.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onPressedChange?` | `(pressed: boolean) => void` | MUST | **Wired** — flips the pressed state, then calls the prop |
| `onClick?` | `(e: MouseEvent) => void` | SHOULD | Stub, called after the toggle |
| `pressed` | `boolean` | — | The existing variant prop |
| `onFocus?` / `onBlur?` | `(e: FocusEvent) => void` | COULD | Forwarded to the element |

`onPressedChange` is **wired**, not stubbed. The transform generates real state logic: it holds internal state seeded from the `pressed` prop, flips that state on activation, and then calls the consumer callback — the toggle works before a consumer attaches anything.

Wiring has a prerequisite: the transform must know which prop holds the pressed state, and it never guesses one by name. That binding comes from the `pressed` classification in [`processing.states`](/settings/states/). Without it the handler degrades to a stub and the transform warns.

`onClick` is a stub — the transform calls the prop and nothing else, because what a click means beyond the toggle is the consumer's decision and the design file cannot say what it is.

The existing `pressed` variant prop is the value source: no `defaultPressed` companion is emitted, and the scaffold seeds its internal state from it.

## States

| State | What the togglebutton does | Classify in `processing.states`? |
|-------|----------------------------|----------------------------------|
| `pressed` | `aria-pressed`, flipped by the wired handler | Recommended |
| `disabled` | Native `disabled` — unfocusable and unclickable, enforced by the platform | Recommended |
| `hover` | Native hover | Recommended, if the library styles it |
| `active` | Native pressed-down | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus ring | **Optional — prefer the platform default** |

Platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect, so specifying one from Figma usually replaces a good default with a worse one.

## Accessible name

Toggle buttons frequently have no text descendant, so the name usually comes from the prop nominated as the accessible-name source, emitted as `aria-label`. An unnamed toggle warns — a correctly-roled control that announces nothing is worse than the container it replaced.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<button type="button" aria-pressed>` | Tab-focusable, Enter and Space toggle, screen readers announce the pressed state |
| iOS | `Toggle` with `.toggleStyle(.button)` | VoiceOver announces the on/off value, and double-tap flips it |
| Android | `IconToggleButton` | TalkBack announces the checked value, double-tap toggles, and it joins the accessibility focus order |

## Before and after

Without the role:

```tsx
<div className="favorite" data-element="root" data-pressed={p.pressed}>
  {/* … */}
</div>
```

With the role:

```tsx
<button
  type="button"
  className="favorite"
  data-element="root"
  aria-pressed={isPressed}
  aria-label={p.accessibleName}
  disabled={p.disabled}
  onClick={() => { setPressed(!isPressed); p.onPressedChange?.(!isPressed); p.onClick?.(); }}
>
  {/* … */}
</button>
```

## See also

- [button](/roles/button/) — the same emission without the retained state
- [indicator](/roles/indicator/) — the decorative glyph a toggle usually contains
- [Roles overview](/roles/) — how roles and `processing.states` fit together
