---
title: "group"
description: "Emit a fieldset whose legend names every control inside it, so a set of related fields is announced as one thing"
---

The `group` role declares that an element gathers several related controls that are answered together — a set of radio buttons, a row of checkboxes, an address block.

## Why it matters

Without the role, a group of controls is a `<div>` with a heading above it. Each control announces its own label and nothing more, so a screen reader user hears "Economy, radio button, 1 of 3" with no indication of what is being chosen. The heading that answers that question is visually adjacent and programmatically unconnected. A `disabled` variant on the group styles every child and disables none of them.

With the role the set is announced as one thing — its legend is read when focus enters it, and native `fieldset[disabled]` really does disable every control inside.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<fieldset>` |
| Accepted element types | `container` |
| Accepted parts | `label`, `description`, `errormessage` |

`group` is the one control concept that is not value-bearing and has no single control beneath it — that is what makes it a group. It accepts the same plumbing parts a control does, and its `label` part behaves differently from everywhere else in the vocabulary:

**A `label` part resolved to a `group` emits `<legend>`, not `<label htmlFor>`.** There is no control id to point at; the association is structural. HTML requires the `<legend>` to be the **first rendered child** of its `<fieldset>`, so the part is lifted to that position if the design's layer order puts it elsewhere. That lift is the one structural change this role makes, and it is worth checking: a group whose heading sits below its controls, or beside them in a row, will move in the DOM while its classes and `data-element` values stay put. Positional CSS in that subtree needs review.

`description` and `errormessage` wire by id to the `<fieldset>` through `aria-describedby`, exactly as they do on a control.

**What this asks of a Figma file:** put the group's heading layer first, above the controls, and annotate it `role:label`. Where the design puts it elsewhere the transform still lifts it, and the output is still correct — but the DOM no longer matches the layer order, and positional CSS written against that subtree is what breaks. Authoring the heading first is the cheaper half of the bargain.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `name?` | `string` | COULD | Overrides the generated group name |

`group` adds no event handler. A group does not respond to anything; the controls inside it do.

### It names its radios, through the slot

A set of radios is mutually exclusive only when every radio shares one `name`, and the group is the only element that knows the set exists. The hard part is that the radios usually arrive through a **slot** — runtime content the spec deliberately does not carry — so there is no `instance` element to route a prop into.

The group publishes the name instead of passing it, which reaches slotted content that prop-threading cannot:

```tsx
// group
const groupName = p.name ?? React.useId();
<RadioGroupContext.Provider value={{ name: groupName }}>
  <fieldset /* … */>{p.children}</fieldset>
</RadioGroupContext.Provider>
```

Each [`radio`](/roles/radio/) reads the context and falls back to its own `name` prop, so the consumer writes nothing and a radio used outside a group still works.

On Web Components there is no context and none is needed: slotted children are real descendants of the group's host, so each radio walks up on connect and reads the group's name. No provider, no event protocol, and it re-resolves on reconnect.

This is the first runtime coupling the transforms emit between two components. It is deliberate: the alternative is a `name` prop the consumer must thread identically through every option, where one miss produces two radio sets that silently behave as one.

## States

| State | What the group does | Classify in `states`? |
|-------|---------------------|----------------------------------|
| `disabled` | Native `disabled` on the `<fieldset>` — disables every descendant control, enforced by the platform | Recommended |
| `required` | `aria-required` on the `<fieldset>` | Recommended |
| `invalid` | `aria-invalid` on the `<fieldset>` | Recommended |

`disabled` is the state most worth classifying here, because it is the one a `<div>` could never express: one attribute on the group disables everything inside it without the transform touching a single child.

`<fieldset>` has no `readonly`, and there is no ARIA equivalent — a group that models one needs it on each control.

## Accessible name

The name comes from the `#label` part, emitted as the `<legend>`. Where no `label` part resolves, the group emits a `<fieldset>` with no legend and **warns**: an unnamed group is announced as a group with nothing said about what it groups, which is close to no improvement over the `<div>` it replaced.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<fieldset>` with a `<legend>` | The legend is announced when focus enters the set; `disabled` on the fieldset disables every control inside |
| iOS | A `Section` with a header, descendants' semantics merged under it | VoiceOver announces the group name before the first control |
| Android | `Modifier.semantics(mergeDescendants = true)` with a content description | TalkBack announces the group name before the first control |

## Before and after

Without the role:

```tsx
<div className="form-group" data-element="root">
  <div className="form-group__header" data-element="header">{p.header}</div>
  <div className="form-group__children" data-element="children">{p.children}</div>
</div>
```

With the role (annotations `root#group`, `header#label`):

```tsx
const groupName = p.name ?? React.useId();

<RadioGroupContext.Provider value={{ name: groupName }}>
  <fieldset className="form-group" data-element="root" disabled={p.disabled}>
    <legend className="form-group__header" data-element="header">{p.header}</legend>
    <div className="form-group__children" data-element="children">{p.children}</div>
  </fieldset>
</RadioGroupContext.Provider>
```

Here the header is already first, so nothing moves. `disabled` becomes one attribute that really disables every control in the set, the heading is announced when focus enters it, and any radio slotted into `children` gets its grouping name without the consumer writing a line.

## See also

- [radio](/roles/radio/) — the control this role most often gathers, and the one that needs its `name`
- [label](/roles/label/) — the part that becomes the `<legend>` here and a `<label htmlFor>` everywhere else
- [errormessage](/roles/errormessage/) — group-level validation text
- [Roles overview](/roles/) — how roles and the `states` convention fit together
