---
title: "switch"
description: "Inject a native input announced as a switch, so the on/off state is keyboard-operable and heard"
---

The `switch` role declares an on/off control whose change takes effect immediately — no submit, no confirm.

## Why it matters

Without the role, a switch scaffolds as a container drawing a track and a handle: it cannot be focused or flipped from the keyboard, and its condition reaches assistive technology as a `data-*` attribute if at all, so a screen reader announces the same thing whether the switch is on or off. With it, the control announces as a switch — "on" or "off", not "checked" — and flips from the keyboard.

## Emission

### Scaffold

| | |
|---|---|
| Element | Visually hidden `<input type="checkbox" role="switch">`, injected as first sibling of the role element |
| Accepted element types | `container`, `glyph` |
| Accepted parts | `label`, `description`, `indicator` |

The same proxy-input structure as [checkbox](/roles/checkbox/): the real input carries state and contract, and the visual proxy — the element the role landed on — **becomes the click-target label itself**: it emits as `<label htmlFor>` pointing at the input, keeping its class and `data-element`, marked `aria-hidden`. Its whole footprint activates the input through HTML's own label behavior, with no positioning CSS involved. Because the proxy is a `<label>`, a `label` part must not sit inside its subtree — labels do not nest — and resolution warns if one does. `role="switch"` on a native checkbox input is the standard pattern: the input supplies keyboard operation, focus, and form participation; the role changes only the announcement, from "checked" to "on".

A switch's track, handle, and state glyphs are all drawn state. Each carries [`indicator`](/roles/indicator/) and is hidden from assistive technology — the state announces once, from the input.

### How it differs from its neighbors

| | `switch` | [`checkbox`](/roles/checkbox/) | [`togglebutton`](/roles/togglebutton/) |
|---|---|---|---|
| Element | `<input role="switch">` | `<input type="checkbox">` | `<button>` |
| State attribute | `aria-checked`, announced "on"/"off" | native checked, announced "checked" | `aria-pressed` |
| Immediacy | Applies at once | Usually submits with a form | Applies at once |
| Indeterminate | None — a switch is binary | Native `.indeterminate` | None |

They do not collapse into one implementation: a togglebutton is a button that stays pressed; a switch and a checkbox are form controls whose announcements differ because their timing differs.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — flips the state, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `name?` | `string` | MUST | — form submission identity |
| `value?` | `string` | MUST | — submitted value |

`onChange` is **wired**, exactly as on checkbox: internal state seeded from the classified prop, flipped on activation, consumer callback after. Without a binding it degrades to a stub and warns.

## States

The switch reads the `checked` classification, falling back to `selected` — the same alias rule as checkbox, because libraries split this one fact across both vocabularies, and a switch's prop is routinely the same `selected` boolean its checkbox sibling uses. Precedence suppresses by prop, so whichever concept binds, the fact announces once.

| State | What the switch does | Classify in `states`? |
|-------|----------------------|----------------------------------|
| `checked` / `selected` | Native checked on the input, announced on/off via `role="switch"` | Recommended |
| `disabled` | Native `disabled` | Recommended |
| `hover` / `active` | Native on the proxy input | Recommended, if the library styles it |
| `focus` / `focus-visible` | Platform ring, re-drawn on the proxy | **Optional — prefer the platform default** |

There is no indeterminate arm: a switch is binary by definition.

The focus ring reaches the visible proxy the same way it does on [checkbox](/roles/checkbox/): the platform draws its ring around the focused hidden input, so the generated stylesheet re-draws it on the proxy through the adjacent-sibling selector (`.switch__action-input:focus-visible + .switch__action { outline: auto; }`). Override that selector to draw a custom indicator.

## Accessible name

From the `label` part — owned or routed through a composed label component — emitted as a real `<label htmlFor>`. The click-target proxy label is `aria-hidden` and contributes nothing to the name.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | Hidden `<input type="checkbox" role="switch">` beside the visual control | Click and keyboard flip it; screen readers announce "on"/"off" |
| iOS | `Toggle` with switch styling | VoiceOver announces the label and on/off value; double-tap flips it |
| Android | `Switch` with `Role.Switch` | TalkBack announces "on"/"off", double-tap flips it |

## Before and after

Without the role:

```tsx
<div className="switch__action" data-element="action">
  <div className="switch__track" data-element="track" />
  <div className="switch__handle" data-element="handle" />
</div>
```

With the role:

```tsx
<input className="switch__action-input" id={actionId} type="checkbox" role="switch"
  checked={checked}
  onChange={(e) => { setChecked(e.target.checked); p.onChange?.(e); }}
  disabled={p.disabled} name={p.name} value={p.value} />
<label className="switch__action" data-element="action" htmlFor={actionId} aria-hidden="true">
  <div className="switch__track" data-element="track" />
  <div className="switch__handle" data-element="handle" />
</label>
```

## See also

- [checkbox](/roles/checkbox/) — the same structure, announced as a checkbox
- [togglebutton](/roles/togglebutton/) — pressed state on a button, not a form control
- [Roles overview](/roles/) — how roles and the `states` convention fit together
