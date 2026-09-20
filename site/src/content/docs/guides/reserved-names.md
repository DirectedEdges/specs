---
title: "Prop Naming"
description: "A prop name is a claim about what the prop means — when that claim is right, when it collides, and which names are never yours"
---

## About

A prop name in Figma becomes an identifier in generated code — a property on a custom
element, a prop on a React component, an attribute a stylesheet selects. Some names
already mean something there, and the generated code will act on the meaning it knows.

**Checked by** — Schema: no • `generate`: no • `react`: no • `webcomponents`: no

Nothing validates any of this. A spec naming a prop `hidden` is a valid spec and every
command accepts it. What follows is what the targets do with the name once they have it.

## A name is a claim about meaning

Using a name the platform knows is not a problem. It is usually the **right** answer:
a `textbox` whose text layer is named `value` is naming it exactly what it is, and a slot
called `children` means what React means by children. The machinery lines up because the
name and the meaning agree.

The hazard is a disagreement between the two.

| Your prop | Outcome |
|---|---|
| A conventional name, for the conventional meaning | **Correct.** The role or the platform is already expecting it, and its handling is what you wanted. |
| A name of your own | **Safe**, and you may have to declare intent that the conventional name would have implied. A primary slot called `primarySlot` breaks nothing; it just is not recognised as children without being declared. |
| A conventional name, for a different meaning | **Collides.** A `value` prop that means a displayed price, on a component later annotated as a `textbox`, is two things competing for one slot in the contract. |

So the question to ask of a name is not "is this on a list" but **"does this prop mean
what that name already means here?"** If yes, use it. If no, call it something else.

A role contributes its props **only when it is applied**, so `value` is free until the
component is annotated. That makes this a naming risk rather than a spec error: a prop
named `value` becomes a collision on the day someone annotates the component as a
`textbox`. See the [roles overview](/roles/) for what each role contributes — `button`
brings `onClick`, `textbox` brings `value`, `name` and `type`.

## Names that are never yours

A second group has no correct use, because what they mean has nothing to do with your
component's data model. A custom element reflects a variant prop to a real attribute, and
these already carry behaviour on any element: `hidden` stops the element rendering,
`title` raises a tooltip, `id` collides with every id reference in the document.

| Group | Names |
|---|---|
| Global HTML attributes | `id`, `title`, `hidden`, `role`, `slot`, `style`, `class`, `tabindex`, `lang`, `dir`, `part`, `popover`, `inert`, `contenteditable`, `draggable`, `spellcheck`, `translate` |
| Accessibility attributes | any name whose kebab form starts with `aria-` |
| React reserved | `children` *(outside its conventional use)*, `key`, `ref` |
| Scaffold-declared | `className`, `style` |

For an accessible name, nominate the prop through `specs.accessibility.label` rather than
naming it `ariaLabel`. The roles layer routes it correctly on both targets; a prop named
`ariaLabel` writes a second `aria-label` beside the one the role computed.

## What each target does

| Target | With a name it owns |
|---|---|
| Web Components | Falls back to the `data-` form on both sides — the element writes `data-hidden`, the stylesheet selects `[data-hidden]`. Nothing breaks; it is just inconsistent with the `:host([appearance="filled"])` every other variant prop produces. |
| React | `key` and `ref` are consumed by React and never reach the component. `className` and `style` are declared by the scaffold, so a spec prop of either name competes with it. |

The rule tests the **kebab-cased** name, which is what reaches the attribute. `tabIndex`
becomes `tab-index`, which no browser knows, so it is free; a prop literally named
`tabindex` is not.

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

## See also

- [Roles overview](/roles/) — what each role contributes to a contract
- [Precedence](/roles/precedence/) — how a role, a states classification and an action resolve together
