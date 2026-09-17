---
title: "togglebutton"
description: "Emit a button that carries its pressed state in aria-pressed, with an onPressedChange contract"
---

## About

`togglebutton` declares that an element performs an action and retains a two-state condition — a favorite affordance, a bold control in a formatting bar, a filter chip that stays on. Without it the pressed condition exists only as a `data-*` attribute: a screen reader announces "Favorite, button" whether the item is favorited or not, so the one fact the control exists to convey is the one that is missing.

**Status** — React: Implemented • Web Components: Implemented • iOS: Not yet planned • Android: Not yet planned

### Roles

| Role | Type | Element |
|---|---|---|
| `togglebutton` | Control | Element of `type: container` or `type: glyph` |
| `label` | Part | Element of `type: text` or nested instance prop of `type: string` |
| `description` | Part | Element of `type: text` or nested instance prop of `type: string` |
| `indicator` | Part | Element of `type: container` or `type: glyph` |

There is no `togglebutton` ARIA role. The emission is a button plus `aria-pressed`; `role="togglebutton"` is never emitted because it is not a valid ARIA value.

A `glyph` carrying the role is re-hosted inside the button rather than becoming it, adding one level to the markup.

### The two meanings of "pressed"

| Concept | Bound to | Emitted as | Owned by |
|---|---|---|---|
| `active` | The momentary prop — the condition while a pointer is held down | `:active` | [`button`](/roles/button/) |
| `pressed` | The retained prop — the condition the control keeps | `aria-pressed` | `togglebutton` |

A component with both declares two state entries against two different Figma props. The role decides which one reaches ARIA and which stays a pseudo-class.

### States

| State | Effect | Classify in `states`? |
|---|---|---|
| `pressed` | `aria-pressed`, flipped by the wired handler | Recommended |
| `disabled` | Natively disabled, enforced by the platform | Recommended |
| `hover` / `active` | Native, on the button itself | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus indicator | **Optional — prefer the platform default** |

### Wired state

`onPressedChange` follows [the wired state model](/roles/#the-wired-state-model): internal state seeded from the `pressed` prop, flipped on activation, then the consumer callback. The toggle works before a consumer attaches anything.

Prerequisite: a `pressed` classification in the [`states` convention](/settings/states/) naming the prop. Without it the handler degrades to a stub and warns.

The existing `pressed` variant prop is the value source — no `defaultPressed` companion is emitted.

### Accessible name

| Source | Result |
|---|---|
| Text the button contains, or a `label` part | Names it |
| A prop nominated as the accessible-name source | Emitted as `aria-label` — the usual case, since toggles are often icon-only |
| Nothing resolves | **Warns** |

## Specs

```yaml
anatomy:
  root:
    type: container
    role: togglebutton
  icon:
    type: glyph
    role: indicator
```

## Figma

- `root` as `role:togglebutton` — on the component node
- decorative glyphs as `role:indicator`

Classify the retained prop as `pressed` in the states convention, not as `active`. A toggle whose prop is classified `active` emits a pseudo-class and no `aria-pressed`.

## React

### Authored as

```tsx
<FavoriteButton
  pressed={isFavorite}
  onPressedChange={setIsFavorite}
  accessibilityLabel="Favorite"
/>
```

### Before / After

```tsx
// before
<div className="favorite" data-element="root" data-pressed={p.pressed}>
  {/* … */}
</div>

// after
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

### Contract

| Prop | Type | Tier | Generated body |
|---|---|---|---|
| `onPressedChange?` | `(pressed: boolean) => void` | MUST | **Wired** — flips pressed, then calls the prop |
| `onClick?` | `(e: MouseEvent) => void` | SHOULD | Stub, called after the toggle |
| `pressed` | `boolean` | — | The existing variant prop |
| `onFocus?` / `onBlur?` | `(e: FocusEvent) => void` | COULD | Forwarded to the element |

## Web Components

As [`button`](/roles/button/#web-components) — a real `<button>` inside the shadow root with `delegatesFocus`, not host semantics. One addition: `aria-pressed` is written through a tri-state host setter, because removing the attribute when false would make the toggle announce as a plain button. It is removed only on `null`.

## iOS

Not yet planned. Intended binding:

| | |
|---|---|
| Type | `Toggle` with `.toggleStyle(.button)` |
| Announced | The on/off value; double-tap flips it |

## Android

Not yet planned. Intended binding:

| | |
|---|---|
| Type | `IconToggleButton` with `Role.Switch` |
| Announced | The checked value; double-tap toggles |

## See also

- [button](/roles/button/) — the same emission without the retained state
- [switch](/roles/switch/) — on/off with immediate effect, announced as a switch
- [indicator](/roles/indicator/) — the decorative glyph a toggle usually contains
- [Roles overview](/roles/) — the vocabulary and how roles are authored
