---
title: "radio"
description: "Emit a real radio input, styled in place, grouped by name through the group that contains it"
---

The `radio` role declares that an element is one option in a mutually exclusive set.

## Why it matters

Without the role, a radio scaffolds as a generic container carrying `aria-selected` — a listbox-option attribute — and an inert `aria-checked`. It cannot be focused, chosen, submitted, or validated; the label is an unassociated sibling; and nothing makes the option exclusive with its siblings, so a set of them behaves as a set of unrelated toggles.

Radio is the concept where the missing native element costs the most. Exclusivity, arrow-key roving between options, wrapping at the ends of the set, and skipping the whole set with one Tab are all behaviors the browser supplies for a named group of real `<input type="radio">` elements — and all of them would otherwise have to be written by hand.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<input type="radio">`, **in place** — the role element becomes the input |
| Accepted element types | `container` |
| Accepted parts | `label`, `description`, `errormessage`, `indicator` |

The role element *becomes* the control rather than standing beside one. The emitted `<input>` keeps the element's class and `data-element`, the stylesheet gives it `appearance: none`, and the design's own box — its size, border, radius, and fill — draws the control directly.

This is one node where a proxy pattern needs three, and it is the reason the platform's focus ring lands in the right place with no assistance: the focused element and the visible element are the same element.

### Why this differs from checkbox

[`checkbox`](/roles/checkbox/) hides a native input and makes the visual a proxy label. `radio` styles the native input directly. The difference is what each control draws:

- A checkbox's checked indicator is usually a **drawn glyph** — a real vector the design owns, which has to render as a node. A proxy structure is what gives it one.
- A radio's indicator is a filled circle, which CSS draws from the control's own box with no node at all.

Where a radio's design genuinely needs a drawn vector indicator, this pattern cannot serve it — see the `indicator` note below.

### The `indicator` part is consumed, not rendered

A radio's inner dot is annotated `indicator` like any other state indicator, and on this role it is **consumed into the stylesheet** rather than emitted as an element. Its drawn styles move onto the control's `::before`, keyed off the control's checked state.

This is the one thing `radio` asks of the `css` transform that no other role does, and it has a bound: a `container`-typed indicator is a shape, and its fill, size, and radius transfer cleanly. A **`glyph`-typed indicator is a vector and cannot be consumed** — the transform warns, names the element, and emits the control without it. A design in that position wants checkbox's proxy pattern, and the warning says so.

### Everything else in the subtree

Like every collapsing role, `radio` renders only what is declared:

- Unannotated descendants do not render. A bare wrapper drops silently; anything carrying content of its own is named together in one warning
- `label`, `description`, and `errormessage` are lifted out and emitted as siblings at the control's depth, wired by id
- A descendant carrying a role this control does not accept is dropped with a warning naming it

**What this asks of a Figma file:** land `role:radio` on the layer that draws the control's box and nothing else — not on the row that also holds the label. The label, description, and error layers are that container's **siblings**, and each is annotated with its part. Where the layer tree offers no such container, restructure the layers; the alternative is a set of warnings and a control missing its chrome.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — sets checked, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `name?` | `string` | SHOULD | Overrides the group's name; see below |
| `value?` | `string` | MUST | — submitted value |
| `checked` | `boolean` | — | The existing variant prop |

`onChange` is **wired**, following [the wired state model](/roles/#the-wired-state-model): uncontrolled between prop changes, and the prop wins whenever it changes.

That model matters more here than anywhere else in the vocabulary. A radio cannot un-check itself — only a sibling becoming checked clears it, and the sibling is a different component instance. The internal state is what makes a single radio feel live in isolation; the prop-wins rule is what lets a consumer holding the group's selection drive every radio in it correctly. A consumer that owns the set should drive `checked` from its own state and treat `onChange` as the report.

Wiring has a prerequisite: the transform must know which prop holds the checked state, and it never guesses one by name. That binding comes from the `checked` classification in the [`states` convention](/settings/states/). Without it the handler degrades to a stub and the transform warns.

## Grouping: the name comes from the group

A set of radios is mutually exclusive only when every radio shares one `name`. A component spec describes **one** radio and cannot see its siblings, so the name comes from the [`group`](/roles/group/) that contains it — including when the radios arrive through a slot, which is the usual shape and which prop-threading cannot reach.

**Web.** The group publishes its generated name on a context, and each radio reads it:

```tsx
// group
const groupName = React.useId();
<RadioGroupContext.Provider value={{ name: groupName }}>
  <fieldset /* … */>{p.children}</fieldset>
</RadioGroupContext.Provider>

// radio
const group = React.useContext(RadioGroupContext);
<input type="radio" name={p.name ?? group?.name} /* … */ />
```

The consumer does nothing. An explicit `name` prop still wins, so a radio used outside a group — a legitimate thing to build — works by being told its name.

**Web Components.** There is no context, and none is needed: slotted children are real descendants of the group's host element, so each radio resolves its group by walking up the tree once on connect and reading the group's generated name. No provider, no event protocol, and it survives re-slotting because it re-resolves on reconnect.

A radio that resolves no group and is given no `name` prop **warns**, naming the component. The failure it prevents is quiet and severe: two unnamed sets on one page silently become one set, and choosing in the second clears the first.

## States

| State | What the radio does | Classify in `states`? |
|-------|---------------------|----------------------------------|
| `checked` | Native `checked`, set by the wired handler; `:checked` draws the dot | Recommended |
| `disabled` | Native `disabled` — unfocusable and unclickable, enforced by the platform | Recommended |
| `required` | Native `required` | Recommended |
| `invalid` | `aria-invalid` on the input | Recommended |
| `hover` | Native `:hover` on the control itself | Recommended, if the library styles it |
| `active` | Native `:active` on the control itself | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native ring on the control itself | **Optional — prefer the platform default** |

Every one of these lands on the element the stylesheet already targets, because the control and the visual are one element. There is no focus-ring re-draw to arrange and no state to mirror onto a wrapper.

There is no `indeterminate` — that state belongs to `checkbox` alone. A library that classifies it on a radio gets a warning naming the concept and the role.

A library that spells its chosen state `selected` rather than `checked` classifies it as `checked` for this role. The prop keeps its name; only the concept it is classified under decides the mechanism, and `aria-selected` is not valid on a radio.

## Accessible name

The name comes from the `label` part, emitted as a real `<label>` associated to the input by `htmlFor`. Where the label is an `instance` of a label component — the usual shape — the part routes rather than emits, and the control id is threaded into that instance.

A radio with no resolving `label` warns. An unnamed option in a set is announced as "radio button, 2 of 3" with nothing said about what choosing it means.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<input type="radio">` styled in place, named by its group | Click and arrow-key selection, roving focus and wrapping within the set, one Tab stop for the whole set, form submission and validation |
| iOS | A `Picker` option | VoiceOver announces the label and selected state, and double-tap chooses it |
| Android | `RadioButton` with `Role.RadioButton` | TalkBack announces "selected" or "not selected", double-tap chooses, and it joins the accessibility focus order |

Roving focus, wrapping, and the single Tab stop are the browser's own behavior for a named radio set. The role gets all of it by reaching for the native element rather than by generating any keyboard code.

## Before and after

Without the role:

```tsx
<div className="radio" data-element="root"
  aria-disabled={p.disabled ? 'true' : undefined}
  aria-selected={p.selected ? 'true' : undefined}>
  <div className="radio__control" data-element="control">
    <div className="radio__selected" data-element="selected" />
  </div>
  <FormLabel {...defaults} data-element="formLabel" />
</div>
```

With the role (annotations `control#radio`, `formLabel#label`, `selected#indicator`):

```tsx
<div className="radio" data-element="root">
  <input
    id={controlId}
    className="radio__control"
    data-element="control"
    type="radio"
    name={p.name ?? group?.name}
    value={p.value}
    checked={selected === "selected"}
    onChange={(e) => { setSelected(e.target.checked ? "selected" : "unselected"); p.onChange?.(e); }}
    disabled={p.disabled}
  />
  <FormLabel {...defaults} data-element="formLabel" htmlFor={controlId} />
</div>
```

and the dot the designer drew becomes a rule rather than a node:

```css
.radio__control { appearance: none; /* the drawn box: size, border, radius, fill */ }
.radio__control::before { /* the drawn dot, from the indicator element */ }
.radio__control:checked::before { opacity: 1 }
```

Three nodes become one, `aria-selected` is gone, and `name` arrives from the group without the consumer touching anything.

## See also

- [group](/roles/group/) — what supplies the name that makes a set exclusive
- [checkbox](/roles/checkbox/) — the proxy pattern, and when a drawn indicator needs it
- [indicator](/roles/indicator/) — the drawn dot, consumed into the stylesheet here
- [Roles overview](/roles/) — how roles and the `states` convention fit together
