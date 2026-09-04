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

The real input carries the states and the contract. The visual proxy — the element the role landed on — is wrapped in an empty click-target `<label htmlFor>` and marked `aria-hidden`. The wrap encloses only the visual proxy, never the label text: the accessible name comes from a second, separate `<label>` emitted by the element carrying the `label` part, and HTML permits multiple labels per control. Where the role lands on a glyph element, the glyph's decorative `<span>` is re-hosted inside the proxy structure first.

The injection adds a sibling and a wrapper level, so positional CSS (`:nth-child`, adjacent-sibling selectors) in that subtree needs review; classes and `data-element` values are unchanged.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — flips checked, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `name?` | `string` | MUST | — form submission identity |
| `value?` | `string` | MUST | — submitted value |
| `checked` | `boolean` | — | The existing variant prop |

`onChange` is **wired**: the transform generates real state logic — it holds internal state seeded from the checked prop, flips it on activation, and calls the consumer callback. The checkbox toggles before a consumer attaches anything.

Wiring has a prerequisite: the transform must know which prop holds the checked state, and it never guesses one by name. That binding comes from the `checked` classification in [`processing.states`](/settings/states/). Without it the handler degrades to a stub and the transform warns.

`onBlur` is a stub — the transform calls the prop and nothing else, because what happens on blur (typically validation) is the consumer's decision and the design file cannot say what it is.

Where an existing variant prop already supplies the value, the role contributes only the change signal and emits no `default*` companion. `name` and `value` are genuinely new API the spec does not declare.

## States

| State | What the checkbox does | Classify in `processing.states`? |
|-------|------------------------|----------------------------------|
| `checked` | Native `checked`, flipped by the wired handler | Recommended |
| `indeterminate` | Native `.indeterminate` DOM property, set via a ref effect | Recommended |
| `disabled` | Native `disabled` — unfocusable and unclickable, enforced by the platform | Recommended |
| `required` | Native `required` | Recommended |
| `invalid` | `aria-invalid` on the input | Recommended |
| `hover` | Native hover on the proxy input | Recommended, if the library styles it |
| `active` | Native pressed-down on the proxy input | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus ring | **Optional — prefer the platform default** |

Platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect, so specifying one from Figma usually replaces a good default with a worse one.

## Accessible name

The name comes from the `label` part, emitted as a real `<label>` associated to the input by `htmlFor`. The click-target wrap around the visual proxy is an empty label and contributes nothing to the name.

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
  <label className="checkbox__control-wrap" htmlFor={controlId} />
  <input id={controlId} type="checkbox"
    checked={selected === "Selected"}
    onChange={(e) => { setSelected(e.target.checked ? "Selected" : "Unselected"); p.onChange?.(e); }}
    disabled={p.disabled} name={p.name} value={p.value} />
  <div className="checkbox__control" data-element="control" aria-hidden="true">{/* … */}</div>
  {/* … label routed htmlFor={controlId}; error message gains id + aria-describedby … */}
</div>
```

The proxy's empty label is the single most important detail: without it the visual looks correct and does nothing on click. `aria-selected` is gone; `aria-invalid` and `aria-describedby` sit on the control and disappear when the error does.

## See also

- [textbox](/roles/textbox/) — the collapse alternative for text-family controls
- [togglebutton](/roles/togglebutton/) — pressed state on a button, not checked state on an input
- [Roles overview](/roles/) — how roles and `processing.states` fit together
