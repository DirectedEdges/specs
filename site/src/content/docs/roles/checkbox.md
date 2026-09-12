---
title: "checkbox"
description: "Inject a native checkbox input beside the visual control so the component can be checked, focused, and submitted"
---

The `checkbox` role declares that an element is a binary (or indeterminate) selection control.

## Why it matters

Without the role, a checkbox scaffolds as a generic container carrying `aria-selected` — a listbox-option attribute — and an inert `aria-checked`. It cannot be focused, checked, submitted, or validated; the label is an unassociated sibling; and the error message, correctly rendered only when invalid, is announced to no one. The `:checked`, `:disabled`, and `:indeterminate` selectors the `css` transformer emits match nothing.

## Emission

### Scaffold

| | |
|---|---|
| Element | Visually hidden `<input type="checkbox">`, injected as first sibling of the role element |
| Accepted element types | `container`, `glyph` |
| Accepted parts | `label`, `description`, `errormessage`, `indicator` |

The real input carries the states and the contract. The visual proxy — the element the role landed on — **becomes the click-target label itself**: it emits as `<label htmlFor>` pointing at the input, keeping its class and `data-element`, and is marked `aria-hidden`. Its whole footprint activates the input through HTML's own label behavior, with no positioning CSS involved — `aria-hidden` silences announcement but not pointer events. The proxy label carries only the drawn state, never the label text: the accessible name comes from a second, separate `<label>` emitted by the element carrying the `label` part, and HTML permits multiple labels per control. Where the role lands on a glyph element, the glyph's decorative `<span>` is re-hosted inside the proxy structure first.

Because the proxy is a `<label>`, a `label` part must not sit inside its subtree — labels do not nest — and resolution warns if one does. The injection adds one sibling (the input), so positional CSS (`:nth-child`, adjacent-sibling selectors) in that subtree needs review; classes and `data-element` values are unchanged, and the stylesheet gives the proxy `cursor: pointer`.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — flips checked, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `name?` | `string` | MUST | — form submission identity |
| `value?` | `string` | MUST | — submitted value |
| `checked` | `boolean` | — | The existing variant prop |

`onChange` is **wired**: the transform generates real state logic — it holds internal state seeded from the checked prop, flips it on activation, and calls the consumer callback. The checkbox toggles before a consumer attaches anything.

Wiring has a prerequisite: the transform must know which prop holds the checked state, and it never guesses one by name. That binding comes from the `checked` classification in the [`states` convention](/settings/states/). Without it the handler degrades to a stub and the transform warns.

`onBlur` is a stub — the transform calls the prop and nothing else, because what happens on blur (typically validation) is the consumer's decision and the design file cannot say what it is.

Where an existing variant prop already supplies the value, the role contributes only the change signal and emits no `default*` companion. `name` and `value` are genuinely new API the spec does not declare.

## States

| State | What the checkbox does | Classify in `states`? |
|-------|------------------------|----------------------------------|
| `checked` | Native `checked`, flipped by the wired handler | Recommended |
| `indeterminate` | Native `.indeterminate` DOM property, set via a ref effect | Recommended |
| `disabled` | Native `disabled` — unfocusable and unclickable, enforced by the platform | Recommended |
| `required` | Native `required` | Recommended |
| `invalid` | `aria-invalid` on the input | Recommended |
| `hover` | Native hover on the proxy input | Recommended, if the library styles it |
| `active` | Native pressed-down on the proxy input | Recommended, if the library styles it |
| `focus` / `focus-visible` | Platform ring, re-drawn on the proxy | **Optional — prefer the platform default** |

Platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect, so specifying one from Figma usually replaces a good default with a worse one.

The proxy structure needs one assist to keep that advice true: the platform draws its ring around the *focused* element, which is the hidden input with no visible box. The generated stylesheet re-draws it on the visible proxy —

```css
.checkbox__control-input:focus-visible + .checkbox__control {
  outline: auto;
  outline-offset: 2px;
}
```

— using `outline-style: auto`, which asks for the platform's own ring rather than imitating it. The input is injected immediately before the proxy, so the adjacent-sibling selector holds by construction. A library that wants its own indicator overrides this same selector; a classified `focus-visible` state otherwise behaves as on any control.

### Enum-valued state props

A checked fact is boolean, but libraries routinely carry it in a three-value enum prop
(`unselected` / `selected` / `indeterminate`). The mapping is declared entirely by the
[`states` classification](/settings/states/), and the rule is the same for every wired
role reading an enum-valued prop, not just checkbox:

- The classification names the prop and, optionally, the **value that means the concept
  holds**: `selected: { prop: selected, value: Selected }`. Without a `value`, the
  concept's own name is the value — `checked: { prop: state }` means `state === "checked"`.
- Enum values are **normalized to lowercase** in the emitted contract, and every
  generated comparison matches that spelling — which is why the example below compares
  against `"selected"` even where the design file spells the variant `Selected`.
- The wired handler **writes back through the same mapping**: a boolean prop is assigned
  directly; an enum prop is written to the declared checked value when the control
  checks, and to the remaining arm when it unchecks. A tri-state enum keeps its
  `indeterminate` arm — the flip only ever rewrites the checked/unchecked pair, so an
  indeterminate value set by the consumer survives until the user operates the control.

Nothing about this mapping is decided by the transform: which prop, and which value
counts as checked, both come from the classification.

## Accessible name

The name comes from the `label` part, emitted as a real `<label>` associated to the input by `htmlFor`. The click-target proxy label is `aria-hidden` and contributes nothing to the name.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | Hidden native `<input type="checkbox">` beside the visual control | Click and keyboard toggle, focus, form submission and validation |
| iOS | `Toggle` | VoiceOver announces the label and checked value, and double-tap flips it |
| Android | `Checkbox` with `Role.Checkbox` | TalkBack announces "checked" or "not checked", double-tap toggles, and it joins the accessibility focus order |

## Before and after

Without the role:

```tsx
<div className="checkbox" data-element="root"
  aria-disabled={p.disabled ? 'true' : undefined}
  aria-selected={p.selected ? 'true' : undefined}>
  <div className="checkbox__control" data-element="control">{/* … */}</div>
  {/* … unassociated label and error message … */}
</div>
```

With the role (annotations `control#checkbox`, `formLabel#label`, `errorMessage#errormessage`):

```tsx
<div className="checkbox" data-element="root">
  <input id={controlId} type="checkbox"
    checked={selected === "selected"}
    onChange={(e) => { setSelected(e.target.checked ? "selected" : "unselected"); p.onChange?.(e); }}
    disabled={p.disabled} name={p.name} value={p.value} />
  <label className="checkbox__control" data-element="control" htmlFor={controlId} aria-hidden="true">{/* … */}</label>
  {/* … label routed htmlFor={controlId}; error message gains id + aria-describedby … */}
</div>
```

The proxy becoming a label is the single most important detail: without it the visual looks correct and does nothing on click. `aria-selected` is gone; `aria-invalid` and `aria-describedby` sit on the control and disappear when the error does.

## See also

- [textbox](/roles/textbox/) — the collapse alternative for text-family controls
- [togglebutton](/roles/togglebutton/) — pressed state on a button, not checked state on an input
- [Roles overview](/roles/) — how roles and the `states` convention fit together
