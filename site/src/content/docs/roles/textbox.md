---
title: "textbox"
description: "Collapse the elements standing in for a text control into a native input with label association and a change contract"
---

The `textbox` role declares that an element and its annotated descendants together represent a single-line free-text control.

## Why it matters

Without the role, a text input scaffolds as a stack of styled text elements standing in for one control — a `label` span, a conditional `placeholder` span, a `value` span — with no `<input>` anywhere. The component is render-only: no focus, no typing, no form participation, and no label association. The `:placeholder-shown`, `:disabled`, and `:focus-visible` selectors the `css` transformer emits target states the markup can never enter.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<input type="text">` |
| Accepted element types | `container` |
| Accepted parts | `value`, `placeholder`, `label`, `description`, `errormessage`, `indicator` |

The role collapses its subtree into the control, driven by part roles rather than discovery:

- `#value` becomes the control's value
- `#placeholder` becomes the `placeholder` attribute
- `#label` is lifted out as a `<label htmlFor>` sibling at the control's depth
- `#indicator` — a required asterisk drawn inside the field's layer stack — is lifted out
  the same way, `aria-hidden` per its own role, keeping its render condition
- Unannotated descendants are chrome and do not render — annotation is the declaration
  of what matters. A bare wrapper drops silently; unannotated descendants that carry
  content of their own (a text node, a glyph, an image, a composed instance) are named
  together in one warning, so the drop is a stated choice rather than a silent regression
- A slot descendant is dropped with a warning — place the role below the slot, not above it
- A descendant carrying a role that is not a part this control accepts (a `button`, an
  `indicator`) is dropped with a warning naming it — move it outside the control

What to expect in practice: land the role on the container that holds only the control's
own layers — the value, placeholder, and label stack. Leading icons, affordance buttons,
and other adjacent chrome belong *beside* that container, not inside it; content inside
the collapse does not render, and everything except a bare wrapper says so. Where the
design's layer tree offers no such container, restructure the layers rather than
accepting the drops.

The sibling concepts behave identically with a different emitted element. They are separate roles because the concept differs across platforms, not just in the web attribute:

- `password` — `<input type="password">`
- `searchbox` — `<input type="search">`
- `textarea` — `<textarea>`

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — sets the value, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `onFocus?` / `onKeyDown?` | — | COULD | Forwarded to the element |
| `name?` | `string` | MUST | — form submission identity |
| `value` | `string` | — | The existing variant prop |

`onChange` is **wired**: the transform generates real state logic — it holds internal state seeded from the value prop, sets it on input, and calls the consumer callback. The field is typeable before a consumer attaches anything.

Wiring has a prerequisite: a resolved `value` binding, either an existing variant prop or the `value` convention in `conventions/specs.yaml`. The transform never guesses a prop by name; without the binding the handler degrades to a stub and warns.

`onBlur` is a stub — the transform calls the prop and nothing else. It is emitted because blur is the conventional point at which a field validates, but validation logic is not something a spec can supply.

Where an existing variant prop already supplies the value, the role contributes only the change signal and emits no `default*` companion.

## States

| State | What the textbox does | Classify in `states`? |
|-------|-----------------------|----------------------------------|
| `disabled` | Native `disabled` — unfocusable and uneditable, enforced by the platform | Recommended |
| `readonly` | Native `readonly` | Recommended |
| `required` | Native `required` | Recommended |
| `invalid` | `aria-invalid` | Recommended |
| `placeholder-shown` | Native `:placeholder-shown` | Recommended |
| `hover` | Native hover | Recommended, if the library styles it |
| `active` | Native pressed-down | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus ring | **Optional — prefer the platform default** |

Platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect, so specifying one from Figma usually replaces a good default with a worse one.

## Accessible name

The name comes from the `#label` part, lifted out beside the control and associated to it by `htmlFor` — a screen reader announces it when the field takes focus.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<input type="text">` with an associated `<label>` | Focus, typing, and form participation; the label is announced on focus |
| iOS | `TextField` | Tapping focuses and opens the keyboard; VoiceOver announces the label and "text field" |
| Android | `TextField` | Focus opens the keyboard; TalkBack announces the label and that the field is editable |

## Before and after

Without the role:

```tsx
<div className="text-input__label-and-value" data-element="labelAndValue">
  <span className="text-input__label" data-element="label">{p.label}</span>
  {p.displayedContent === "Placeholder" && (
    <span className="text-input__placeholder" data-element="placeholder">{p.placeholder}</span>
  )}
  <span className="text-input__value" data-element="value">&nbsp;</span>
</div>
```

With the role (annotations `labelAndValue#textbox`, `label#label`, `placeholder#placeholder`, `value#value`):

```tsx
<label className="text-input__label" data-element="label" htmlFor={controlId}>{p.label}</label>
<input
  id={controlId}
  type="text"
  data-element="labelAndValue"
  value={value}
  onChange={(e) => { setValue(e.target.value); p.onChange?.(e); }}
  placeholder={p.placeholder}
  required={p.required}
/>
```

The placeholder conditional vanishes because it was compensating for the missing control — placeholder is an attribute, and the browser knows when to show it. The lift changes the label's depth, so a library whose visual depends on that structure (float labels) needs restyling; one whose label is already a sibling of one input-shaped element pays almost nothing.

## See also

- [checkbox](/roles/checkbox/) — the proxy + wrap alternative for selection controls
- [button](/roles/button/) — affordance siblings inside a text field carry this role
- [Roles overview](/roles/) — how roles and the `states` convention fit together
