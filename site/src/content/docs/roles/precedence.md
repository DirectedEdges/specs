---
title: "Precedence"
description: "How a role, a states classification and an action resolve when more than one describes the same element"
---

Three independent inputs describe an element, and more than one can apply at once:

| Input | Answers | How many per element |
|-------|---------|----------------------|
| [`role`](/roles/) | What the element **is** | At most one |
| the [`states` convention](/settings/states/) | Which prop carries a state concept | Any number |
| [`action`](/actions/) | What activating it **does** | Any number |

None supersedes another. They are authored separately, by different people, for
different reasons — a role is annotated in Dev Mode by whoever knows the component is a
button, a states entry is configured by whoever knows the library spells its disabled
state `isDisabled`, an action is annotated by whoever knows this particular button
closes the alert.

Because they are independent, they collide, and the collision has to resolve the same
way in every transform. This page is that rule set. It governs every role and every
action, so a new concept inherits it rather than deciding for itself.

## The three rules

### 1. A role and a states classification: emitted once

Where both describe one concept on one element, **the role decides the mechanism and
the states convention decides which prop drives it.** The concept is emitted once.

A button with `disabled` classified emits a real `disabled` attribute the platform
enforces. It does not *also* emit the `aria-disabled` string an unroled container would
carry. Emitting both leaves two attributes disagreeing about which is authoritative,
and a control that announces itself disabled while still firing clicks.

This suppresses **emission only**. It does not unclassify anything:

- The states entry is still what tells the role which prop to read. Without it the role
  knows the concept exists but not what changes it.
- The CSS transform still writes the concept's selector. A role changes how a state is
  expressed, never whether the library styles it.
- Concepts the role does *not* express keep their existing `data-*` or `aria-*`
  behavior, on the same element, unchanged.

Each role page's **States** table says which concepts that role takes over. A concept
absent from it is not claimed.

#### Suppression follows the prop, not the concept name

A role claims *concepts*, but what it actually takes over is the **prop** behind each
one — and a library may classify one prop under more than one concept.

A retained toggle spelled `selected` is the common case. A library classifies that prop
as `selected`, because most of its components announce it that way. A `togglebutton`
announces the same prop as `pressed`. Both entries name the same prop, the role claims
one of them, and left alone the other still emits — so the control announces
`aria-pressed` *and* `aria-selected`, where `aria-selected` is not even valid on a
button.

So **a concept sharing a prop with a claimed concept is suppressed too.** The role
decided the mechanism for that prop, and one prop cannot announce two ways at once.

This is narrower than it sounds, and it is worth being precise about what it does *not*
reach, because two unrelated concepts can share a word:

| Concept | Bound to | Claimed by `togglebutton`? |
|---------|----------|----------------------------|
| `pressed` | the retained toggle prop | Yes — becomes `aria-pressed` |
| `active` | the momentary press prop, often a `state` enum whose value is literally `Pressed` | **No** — different prop, untouched |

`active` is the condition while a pointer is held down; `pressed` is a condition the
control keeps after the pointer leaves. They are different facts on different props, and
the shared word is a coincidence of naming. A component declaring both keeps both: the
role takes the retained one to ARIA, and the momentary one goes on styling exactly as it
did before.

The test is always the same: **is this concept bound to a prop the role took over?** If
yes, the role speaks for it. If no, nothing changed.

#### The state still has to be styleable

"Emitted once" means one **semantic** mechanism. It does not mean the state stops being
addressable by CSS, and on some targets keeping it addressable takes deliberate work.

Where the emitted control is a *descendant* rather than the element the stylesheet
targets, the native carrier is out of reach. A custom element is the clearest case: the
role emits a real `<button>` inside the shadow root, so the host — the element every
rule is written against — carries no state at all, and cannot match `:disabled` either,
since that needs form association. Left alone, every rule for that state is dead, and
worse, every `:not(...)` guard that excludes it always passes. A disabled control keeps
responding to hover.

So the host carries a plain styling attribute for the concept — `[disabled]`, not
`[aria-disabled]`. The inner element already announces the state natively; repeating the
announcement on a wrapper that has no role of its own adds nothing for assistive
technology, and this hook exists for the stylesheet.

One fact, two places, two jobs: the semantic element carries behavior and announcement,
the styled element carries the hook. That is not a second emission — it is the same
emission made reachable where the styles live.

#### A claimed concept nothing drives

A role may express a concept natively and find no states entry naming the prop behind
it. Several roles cannot work at all in that position — a `togglebutton` must be told
which prop holds its pressed state, or it has a toggle it can never toggle.

The transform **warns and degrades**. It emits the role and its element, and leaves the
concept unbound rather than inventing a prop. The warning names the role, the element,
and the concept, because the fix is a one-line states entry and the author needs to
know which one.

### 2. A role and an action on the same event: composed, not contested

A role and an action can want the same event. A dismiss button is a button — its
consumer is listening for clicks — *and* it closes the component. Both are correct, and
neither is a reason to drop the other.

So they **compose into a single handler**, in a fixed order:

1. the role's own contract prop
2. each action's behavior, in annotation order

One handler, not one per contributor. Two handlers for one event means the platform
decides which survives, and on the web the second silently replaces the first.

**The role goes first**, and the order is not arbitrary. The role's prop is the
component's public interface: a consumer who attached `onClick` expects to hear about
the click whether or not the design also attached a behavior. Several actions remove
the component from the page — an action running first can unmount it before the
consumer's handler is ever reached.

An action that wants no event composes with nothing and emits on its own.

### 3. One role, many actions

A role answers a question with one answer, so an element carries **at most one**. Where
a file annotates two, the first wins, by the same variant rule that governs roles
generally.

A behavior does not answer a question with one answer, so an element may carry
**several actions**. They apply in annotation order, and a duplicate collapses —
declaring the same behavior twice means it once.

## What this means for a component

A button that closes an alert, with `disabled` classified, carries all three inputs at
once. What each contributes:

```
role:button      →  a real <button>, type, disabled, an onClick prop, the accessible name
states.disabled  →  which prop drives disabled, and the CSS selector for it
action:dismiss   →  the component removes itself, and an onDismiss prop
```

And what resolves between them:

- `disabled` is emitted once, as a native attribute, driven by the classified prop.
  No `aria-disabled`.
- One click handler, calling the consumer's `onClick` first and then dismissing.
- Both `onClick` and `onDismiss` appear in the contract. Composition does not remove a
  prop from the public interface.

## Where the rules live

Precedence is resolved **once, in the shared spec-reading layer**, before any transform
emits anything. Each transform then binds an already-resolved answer to its own
platform. This is deliberate: precedence is a fact about the spec, not about React or
Web Components, and a rule re-derived in two places is a rule that eventually differs
between them.

The consequence for anyone adding a role or an action: you do not implement these
rules. You declare what your concept claims — which states it expresses, which event it
wants — and the shared layer resolves the rest.

## See also

- [Roles overview](/roles/) — the vocabulary and how roles are authored
- [Actions overview](/actions/) — the second annotation key
- The [`states` convention](/settings/states/) — state concept classification
- [ADR 067](https://github.com/DirectedEdges/specs/blob/main/adr/067-anatomy-element-roles.md) — role mechanism and obligations
- [ADR 087](https://github.com/DirectedEdges/specs/blob/main/adr/087-behavior-actions.md) — behavior actions
