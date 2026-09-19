---
title: "Reserved Names"
description: "Prop names the generated code cannot give you cleanly, and what happens when you use one anyway"
---

A prop name in Figma becomes an identifier in generated code: a property on a custom
element, a prop on a React component, an attribute in a stylesheet selector. Most names
travel through untouched. A small number are already spoken for by the platform, and
naming a prop after one of them gets you something other than what you asked for.

This page lists them, says what actually happens in each case, and gives the rename
that avoids it.

None of this is a schema rule. The spec will happily record a prop named `hidden`;
these are collisions that surface later, in the code, which is why they live here rather
than in the schema reference.

## The short version

| Avoid | Because |
|---|---|
| `id`, `title`, `hidden`, `role`, `slot`, `style`, `class`, `tabindex`, `lang`, `dir`, `part`, `popover`, `inert` | Global HTML attributes that already do something on any element |
| anything starting with `aria` | Reserved for accessibility state the roles layer emits |
| `children`, `key`, `ref`, `className` | React's own props |
| `value`, `name`, `type`, `href`, `target`, `rel`, `min`, `max` | Claimed by a role when one applies to the element |
| `onClick`, `onChange`, `onBlur`, `onFocus`, `onPressedChange`, `onExpandedChange`, `onDismiss` | Contributed by a role or an action |

Each group behaves differently. The sections below say how.

## Global HTML attributes

A custom element reflects its variant props to attributes, so the stylesheet can select
`:host([appearance="filled"])`. That makes the attribute a **real** attribute on a real
element — and a handful of names already carry browser behaviour:

- **`hidden`** stops the element rendering at all
- **`title`** raises a tooltip on hover
- **`id`** collides with every id reference in the document
- **`style`**, **`class`**, **`role`**, **`slot`**, **`part`** are each read by something

### What happens today

Nothing breaks. The generator recognises these names and falls back to the `data-`
form — a prop named `hidden` is written as `data-hidden`, and the stylesheet selects
`[data-hidden]` to match.

So the cost is not a bug, it is an inconsistency: most of your variant props produce
`:host([appearance="filled"])` and this one produces `:host([data-hidden])`. Anyone
reading the emitted CSS has to know why one is different.

The rule tests the **kebab-cased** name, which is what actually reaches the attribute.
`tabIndex` becomes `tab-index`, which no browser knows, so it reflects normally; a prop
literally named `tabindex` does not.

### The rename

Say what the prop means rather than what it does to the DOM. `hidden` → `isCollapsed`.
`title` → `heading`. `id` → `itemId`.

## `aria` names

Every name whose kebab form starts with `aria-` is reserved. The roles layer owns
accessibility state: a `checkbox` role emits `aria-checked`, a `disclosure` emits
`aria-expanded`, and a states classification decides which prop drives them.

A prop called `ariaLabel` would write a second `aria-label` alongside the one the role
computed, and the two would disagree the moment they diverged.

Use [`specs.accessibility.label`](/settings/) to nominate the prop that supplies an
accessible name. That is the supported way to reach the same outcome, and the roles
layer routes it correctly for both targets.

## React's own props

React reserves four names outright:

| Name | What React does with it |
|---|---|
| `children` | Content nested between the tags |
| `key` | Reconciliation identity — never reaches the component |
| `ref` | Forwarded element handle |
| `className` | The scaffold declares it so a caller can style the root |

`style` is in the same group for the same reason: the scaffold declares it.

A prop named `children` is the awkward case, because it is also a perfectly natural name
for a slot — and for a slot it is currently the *right* name, since that is how a slot
is recognised as the primary one. For a non-slot prop, rename it.

## Names a role claims

When a role applies to an element, it adds props to the component's contract. If your
spec already declares a prop of the same name, the two are describing the same slot in
the API and one of them wins.

| Role | Props it contributes |
|---|---|
| `link` | `href`, `target`, `rel` |
| `progressbar` | `min`, `max` |
| `textbox`, `checkbox`, `switch` | `value`, `name`, `type` |
| `togglebutton` | `onPressedChange`, `onClick` |
| `disclosure` | `onExpandedChange` |
| any wired control | `onChange`, `onBlur`, `onFocus`, `onClick` |
| the `dismiss` action | `onDismiss` |

A role only contributes these when it is actually applied, so `value` is free on a
component with no control role on it. The risk is in naming rather than in the spec: a
prop named `value` on a component you later annotate as a `textbox` becomes a collision
you did not have yesterday.

## Code-only props colliding with native properties

A code-only prop sharing a name with a native Figma property of the same component is
the one case that currently **loses data**. The native property wins and the code-only
one is discarded — with it, its type, its examples, and the provenance recording that it
was code-only.

It prints a warning:

```
Code-only prop "Value" conflicts with native prop — skipping
```

but in a catalogue run that scrolls past, and the run still reports success.

This is tracked in [specs#350](https://github.com/DirectedEdges/specs/issues/350),
which is also weighing whether the collision should exist at all — the prop is named
from the picker's internal variant key rather than from the layer the designer named,
and reading the layer name instead would remove most of these.

Until then: give a code-only prop a name the component does not already use natively.

## What the generator does not check

There is no validation pass for any of this. A spec naming a prop `hidden` is a valid
spec, and `specs generate` will not mention it. The behaviours above are what the
**code** transforms do when they meet the name.

If a prop of yours appears in a table on this page and the generated output looks wrong,
that is the first thing to check.
