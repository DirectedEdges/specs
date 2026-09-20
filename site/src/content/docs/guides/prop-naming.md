---
title: "Prop Naming"
description: "Which prop names the platform and the roles already use, and what happens when yours is one of them"
---

## About

A prop name in Figma becomes an identifier in generated code — a property on a custom
element, a prop on a React component, an attribute a stylesheet selects. Some names
already mean something there, and the generated code acts on the meaning it knows.

**Checked by** — Schema: no • `generate`: no • `react`: no • `webcomponents`: no

## Conventional names

A name the platform or a role already uses is correct when the prop means the same
thing — `value` on a `textbox`, `children` on a primary slot.

| Your prop | Meaning | Result |
|---|---|---|
| A conventional name | Matches the convention | **Correct.** The role or platform already handles it. |
| A name of your own | — | **Safe.** Intent the conventional name implies has to be declared instead. |
| A conventional name | Differs from the convention | **Collides.** Two things compete for one slot in the contract. |

A role contributes its props only when applied, so `value` is free until the component
is annotated as a `textbox`. See the [roles overview](/roles/) for what each contributes
— `button` brings `onClick`, `textbox` brings `value`, `name` and `type`.

## Names with no correct use

These carry platform behaviour unrelated to a component's data model. A custom element
reflects a variant prop to a real attribute, where `hidden` stops the element rendering,
`title` raises a tooltip, and `id` collides with every id reference in the document.

| Group | Names |
|---|---|
| Global HTML attributes | `id`, `title`, `hidden`, `role`, `slot`, `style`, `class`, `tabindex`, `lang`, `dir`, `part`, `popover`, `inert`, `contenteditable`, `draggable`, `spellcheck`, `translate` |
| Accessibility attributes | any name whose kebab form starts with `aria-` |
| React reserved | `key`, `ref` |
| Scaffold-declared | `className`, `style` |

Nominate an accessible name through `specs.accessibility.label`, not a prop named
`ariaLabel` — a prop of that name writes a second `aria-label` beside the one the role
computed.

## What each target does

| Target | With a name it owns |
|---|---|
| Web Components | Falls back to the `data-` form on both sides — the element writes `data-hidden`, the stylesheet selects `[data-hidden]`. Inconsistent with the `:host([appearance="filled"])` every other variant prop produces. |
| React | `key` and `ref` are consumed by React and never reach the component. `className` and `style` are declared by the scaffold, so a spec prop of either name competes with it. |

Matching is on the **kebab-cased** name. `tabIndex` becomes `tab-index`, which no browser
knows, so it is free; a prop named `tabindex` is not.

## Figma authoring

A code-only prop sharing a name with a native property of the same component loses its
data: the native property wins, and the code-only one is discarded with its type, its
examples, and the provenance recording that it was code-only. It warns, in a line a
catalogue run scrolls past, and the run reports success.

```
Code-only prop "Value" conflicts with native prop — skipping
```

Give a code-only prop a name the component does not already use natively.

## See also

- [Roles overview](/roles/) — what each role contributes to a contract
- [Precedence](/roles/precedence/) — how a role, a states classification and an action resolve together
