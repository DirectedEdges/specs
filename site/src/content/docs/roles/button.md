---
title: "button"
description: "Emit a native button that focuses, activates from the keyboard, and carries an onClick contract"
---

The `button` role declares that an element performs an action when activated.

## Why it matters

Without the role, a button scaffolds as a generic container. It cannot be tabbed to, Enter and Space do nothing, and the generated props contain no `onClick` — so a consumer cannot attach a handler through the component's own interface. A disabled state renders as an `aria-disabled` attribute the element cannot enforce, so a greyed-out button still receives clicks.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<button type="button">` |
| Accepted element types | `container`, `glyph` |
| Accepted parts | `label`, `description`, `indicator` |

The role element becomes the button, and its descendants render inside it. Descendants that would otherwise be `<div>` become `<span>`, because a button may only contain phrasing content — classes and layout are unchanged.

Where the role lands on a `glyph`, the glyph is re-hosted inside the button rather than becoming it, which adds one level to the markup.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onClick?` | `(e: MouseEvent) => void` | Always | Calls the prop, nothing more |
| `type?` | `'button' \| 'submit' \| 'reset'` | Always | — |
| `onFocus?` / `onBlur?` | `(e: FocusEvent) => void` | On request | Forwarded to the element |

`onClick` is generated empty on purpose. A click on a button means whatever the consumer decides, and the design file has no way to say what that is, so the transform calls the prop and does nothing else.

This is where `button` differs from [togglebutton](/roles/togglebutton/), which owns a state the click changes and so gets real generated logic.

## States

| State | What the button does | Classify in `processing.states`? |
|-------|----------------------|----------------------------------|
| `disabled` | Native `disabled` — unfocusable and unclickable, enforced by the platform | Recommended |
| `hover` | Native hover | Recommended, if the library styles it |
| `active` | Native pressed-down | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus ring | **Optional — prefer the platform default** |

A button transforms best when the Figma variant props for these states are classified in [`processing.states`](/settings/states/), which is what tells the transform that a given prop carries a given state. Unclassified props still work; they emit as `data-*` attributes for styling, as they do today.

**Focus is the exception worth calling out.** Browsers and mobile platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect. Specifying one from Figma usually replaces a good default with a worse one, so leave `focus` unclassified unless the library deliberately overrides it.

## Accessible name

A button needs a name. It takes one from a `label` part, or from text it already contains.

Where the button has no text at all — an icon-only button is the common case — the name comes from a prop nominated as the accessible-name source, and the transform emits it as the platform's label. Where no name source resolves, the transform warns: a correctly-marked button that announces nothing is worse than the container it replaced.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<button type="button">` | Tab-focusable, Enter and Space activate, `disabled` blocks interaction |
| iOS | `Button` | VoiceOver announces "Button", it becomes a rotor stop, and Full Keyboard Access can reach it |
| Android | `Button` with `Role.Button` | TalkBack announces "Button", double-tap activates, and it joins the accessibility focus order |

## Before and after

Without the role:

```tsx
<div
  className="button"
  data-element="root"
  aria-disabled={p.disabled ? 'true' : undefined}
>
  {/* … */}
</div>
```

With the role:

```tsx
<button
  type="button"
  className="button"
  data-element="root"
  disabled={p.disabled}
  onClick={p.onClick}
>
  {/* … */}
</button>
```

## See also

- [togglebutton](/roles/togglebutton/) — a button that keeps a pressed state
- [indicator](/roles/indicator/) — decorative glyphs inside a button
- [Roles overview](/roles/) — how roles and `processing.states` fit together
