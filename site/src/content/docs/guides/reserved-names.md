---
title: "Reserved Names"
description: "Prop names the generated code cannot give you cleanly, and what each target does with one"
---

## About

A prop name in Figma becomes an identifier in generated code — a property on a custom
element, a prop on a React component, an attribute a stylesheet selects. Most names
travel through untouched. A small number are already spoken for, and naming a prop after
one of them gets you something other than what you asked for.

**Checked by** — Schema: no • `generate`: no • `react`: no • `webcomponents`: no

Nothing validates this. A spec naming a prop `hidden` is a valid spec, and every command
accepts it. What follows is what each target does with the name once it has it.

## Reserved names

| Group | Names | Reached by |
|---|---|---|
| Global HTML attributes | `id`, `title`, `hidden`, `role`, `slot`, `style`, `class`, `tabindex`, `lang`, `dir`, `part`, `popover`, `inert`, `contenteditable`, `draggable`, `spellcheck`, `translate` | Web Components |
| Accessibility attributes | any name whose kebab form starts with `aria-` | Web Components, React |
| React reserved | `children`, `key`, `ref` | React |
| Scaffold-declared | `className`, `style` | React |
| Role-contributed | `value`, `name`, `type`, `href`, `target`, `rel`, `min`, `max`, `onClick`, `onChange`, `onBlur`, `onFocus`, `onPressedChange`, `onExpandedChange`, `onDismiss` | React, Web Components |
| Native Figma property | any name the component already carries natively | the spec itself |

The rule tests the **kebab-cased** name, which is what reaches the attribute. `tabIndex`
becomes `tab-index`, which no browser knows, so it is free; a prop literally named
`tabindex` is not.

## Web Components

A variant prop reflects to an attribute so the stylesheet can select
`:host([appearance="filled"])`. That makes it a real attribute on a real element, and the
global names above already carry behaviour — `hidden` stops the element rendering,
`title` raises a tooltip, `id` collides with every id reference in the document.

A reserved name falls back to the `data-` form on both sides: the element writes
`data-hidden` and the stylesheet selects `[data-hidden]`. Nothing breaks. The cost is
that most of your variant props produce `:host([appearance="filled"])` and this one
produces `:host([data-hidden])`, so a reader of the emitted CSS has to know why one
is different.

## React

| Name | What happens |
|---|---|
| `key`, `ref` | Consumed by React; never reaches the component |
| `children` | Content nested between the tags — correct for a slot, wrong for anything else |
| `className`, `style` | The scaffold declares both so a caller can style the root; a spec prop of either name competes with it |

## Roles and actions

A role contributes props to the contract **only when it is applied**, so `value` is free
on a component with no control role on it. The risk is in naming rather than in the spec:
a prop named `value` on a component you later annotate as a `textbox` becomes a collision
you did not have yesterday.

| Role or action | Contributes |
|---|---|
| `link` | `href`, `target`, `rel` |
| `progressbar` | `min`, `max` |
| `textbox`, `checkbox`, `switch` | `value`, `name`, `type` |
| `togglebutton` | `onPressedChange`, `onClick` |
| `disclosure` | `onExpandedChange` |
| any wired control | `onChange`, `onBlur`, `onFocus`, `onClick` |
| `dismiss` | `onDismiss` |

For an accessible name, nominate the prop through `specs.accessibility.label` rather than
naming it `ariaLabel`. The roles layer routes it correctly on both targets; a prop named
`ariaLabel` writes a second `aria-label` beside the one the role computed.

## Figma authoring

A code-only prop sharing a name with a **native** property of the same component is the
one case that loses data. The native property wins and the code-only one is discarded —
with it, its type, its examples, and the provenance recording that it was code-only. It
warns:

```
Code-only prop "Value" conflicts with native prop — skipping
```

but in a catalogue run that scrolls past, and the run still reports success.

Give a code-only prop a name the component does not already use natively.

## Choosing a name

Name the prop for what it means to a consumer, not for what it does to the DOM. `hidden`
becomes `isCollapsed`, `title` becomes `heading`, `id` becomes `itemId`. A name that
describes the component's own vocabulary is not a name the platform has taken.

## See also

- [Roles overview](/roles/) — what each role contributes to a contract
- [Precedence](/roles/precedence/) — how a role, a states classification and an action resolve together
- [dismiss](/actions/dismiss/) — the action contributing `onDismiss`
