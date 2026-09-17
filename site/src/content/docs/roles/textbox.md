---
title: "textbox, password, searchbox, and textarea"
description: "Collapse the elements standing in for a text control into a native input with label association and a change contract"
---

Four roles cover free-text entry. They share one emission strategy, one contract shape, and one set of parts, and differ only in the element each reaches for: `textbox` for single-line text, `password` for concealed text, `searchbox` for search text, and `textarea` for multi-line text.

They are four concepts rather than one concept with a modifier because the difference is not a web attribute. Each names a distinct native type on at least one platform, and a transform that knew only "text control" would have nothing to bind.

## Why it matters

Without a role, a text input scaffolds as a stack of styled text elements standing in for one control — a `label` span, a conditional `placeholder` span, a `value` span — with no `<input>` anywhere. The component is render-only: no focus, no typing, no form participation, and no label association. The `:placeholder-shown`, `:disabled`, and `:focus-visible` selectors the `css` transformer emits target states the markup can never enter.

## The family at a glance

| Role | Web emission | Where the value lives | Notable addition |
|------|--------------|-----------------------|------------------|
| `textbox` | `<input type="text">` | `value` attribute | — |
| `password` | `<input type="password">` | `value` attribute | `autoComplete` must be set |
| `searchbox` | `<input type="search">` | `value` attribute | UA clear affordance is suppressed |
| `textarea` | `<textarea>` | element **content**, not an attribute | `rows` |

Everything below applies to all four unless a row or a note says otherwise.

## Emission

### Scaffold

| | |
|---|---|
| Element | The row above |
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

A password field's reveal affordance is the clearest case of that rule. It is a control
in its own right — usually an instance of an icon button — and it carries [`button`](/roles/button/)
as a **sibling** of the collapsing container. Placed inside, it is dropped with a warning;
placed beside, both roles emit and the field keeps its affordance.

### Where `textarea` differs

`<textarea>` has no `value` attribute — its value is its content. The generated code
still binds a `value` prop, because both web targets accept one and normalize it, but
two consequences are visible in output:

- The element is never self-closing, and an empty field emits `<textarea />` with no
  children rather than a `value=""` attribute on the web-components target.
- `rows` is emitted where the spec carries a height the role can express as a line
  count; otherwise it is omitted and the stylesheet governs, as it does for every other
  dimension.

`type` is not emitted for `textarea` — the element carries no `type` attribute, and
emitting one is invalid.

### Where `searchbox` differs

`<input type="search">` brings a user-agent clear affordance that the design did not
draw. The `css` transformer suppresses it alongside the other UA resets a swapped
element gets, so the field renders as specified. Where the design *does* draw its own
clear affordance, it is a `button` sibling of the collapsing container, exactly as the
password reveal is.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<E>) => void` | MUST | **Wired** — sets the value, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `onFocus?` / `onKeyDown?` | — | COULD | Forwarded to the element |
| `name?` | `string` | MUST | — form submission identity |
| `autoComplete?` | `string` | SHOULD | Pass-through, no default — see below |
| `rows?` | `number` | COULD | `textarea` only |
| `value` | `string` | — | The existing variant prop |

`E` is the emitted element's type — `HTMLInputElement` for three of the four,
`HTMLTextAreaElement` for `textarea`.

`onChange` is **wired**: the transform generates real state logic — it holds internal state seeded from the value prop, sets it on input, and calls the consumer callback. The field is typeable before a consumer attaches anything. It follows [the wired state model](/roles/#the-wired-state-model): uncontrolled between prop changes, and the prop wins whenever it changes.

Wiring has a prerequisite: a resolved `value` binding, either an existing variant prop or the `value` convention in `conventions/specs.yaml`. The transform never guesses a prop by name; without the binding the handler degrades to a stub and warns.

`onBlur` is a stub — the transform calls the prop and nothing else. It is emitted because blur is the conventional point at which a field validates, but validation logic is not something a spec can supply.

### Autofill is the consumer's to set

A text field with no `autocomplete` is a field browsers and password managers handle badly, so the prop is in the contract and the generated code says it should be set. What the transform will not do is choose a value, because the correct one is not a property of the component: the same password component is `current-password` on a sign-in form and `new-password` on a registration form. Guessing one actively harms the other — `current-password` on a registration field invites a manager to fill the old password.

Nor is it annotated. Annotations carry two **categorical** keys, `role` and `action`, each naming a concept from a governed vocabulary. Autofill is neither identity nor behavior; it is one of a long tail of platform attributes — input mode, spellcheck, enterkeyhint — and admitting the first of them makes the annotation surface an API with no principle saying where it stops. A closed set of two keys is worth more than any single attribute it excludes.

So the obligation is made visible instead of resolved. The generated prop carries a doc comment naming the two common values and saying the choice belongs to the form, not the field:

```tsx
/**
 * Autofill hint. Set this — a password field without one autofills badly.
 * `current-password` on a sign-in form, `new-password` on a registration form.
 */
autoComplete?: string;
```

Where an existing variant prop already supplies the value, the role contributes only the change signal and emits no `default*` companion.

## States

| State | What the control does | Classify in `states`? |
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

The family fans out differently on each platform, and the asymmetry is the reason these
are four concepts rather than one.

| Role | Web | iOS | Android |
|------|-----|-----|---------|
| `textbox` | `<input type="text">` | `TextField` | `TextField` |
| `password` | `<input type="password">` | `SecureField` | `TextField` + `PasswordVisualTransformation` |
| `searchbox` | `<input type="search">` | `TextField` + `.searchable` | `SearchBar` |
| `textarea` | `<textarea>` | `TextEditor` | `TextField(singleLine = false)` |

Web has four spellings, iOS has three types plus a modifier, and Android has **one**
type plus three parameter values. Carrying the distinction in the concept name is what
lets each transform map it with a lookup table. Collapsing to a single concept with
modifier fields would move the same information into a second schema surface without
removing any of it.

In every case the behavior a user gets is the same: focus opens the keyboard, typing
works, the label is announced on focus, and the field participates in its form.

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

The same component annotated `role:password` differs by two lines — the emitted `type`,
and the reveal affordance that survives because it sits beside the collapse rather than
inside it:

```tsx
<label className="password__label" data-element="label" htmlFor={controlId}>{p.label}</label>
<input id={controlId} type="password" data-element="labelAndValue" value={value}
  onChange={(e) => { setValue(e.target.value); p.onChange?.(e); }}
  autoComplete={p.autoComplete} />
<IconButton {...defaults} data-element="maskedAction" onClick={p.onMaskedActionClick} />
```

## See also

- [value](/roles/value/) — the part that drives the collapse, and where `placeholder` is described
- [checkbox](/roles/checkbox/) — the proxy + wrap alternative for selection controls
- [button](/roles/button/) — reveal and clear affordances beside a text field carry this role
- [group](/roles/group/) — grouping several fields under one legend
- [Roles overview](/roles/) — how roles and the `states` convention fit together
