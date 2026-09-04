---
title: "Roles"
description: "Declare what an anatomy element is for, so transforms emit native controls, accessibility wiring, and event contracts"
---

A **role** declares the interaction semantic of an anatomy element — this element *is* the button, *is* the checkbox control, *is* the label for that control. Without roles, transforms emit visually correct but behaviorally inert markup: a button scaffolds as a `<div>` that cannot be focused or clicked through the contract, and a checkbox has no `<input>` to check. With a role, each transform deterministically emits the platform's native control, the accessibility wiring between elements, and the event handlers in the generated contract.

Roles are stored in `anatomy.<element>.role` in the spec. The value is an open string; the documented vocabulary comes from ADRs 066–068.

## Control roles and part roles

The vocabulary splits into two kinds:

- **Control roles** name an interactive or announced thing — `button`, `checkbox`, `textbox`, `disclosure`, `alert`. A control role changes what element is emitted and adds event handlers to the contract.
- **Part roles** name a piece of a control — `label`, `value`, `errormessage`, `panel`. Most parts add **no handlers**: their value is id generation plus an attribute on some other element (a `<label htmlFor>`, an `aria-describedby`, an `aria-controls`). A part resolves to its nearest ancestor control.

## Where roles are authored

Roles are annotated in Figma, on the component node or on a layer inside it, and
`specs generate` writes them into the component's anatomy. No generated file is ever
hand-edited, and there is no authored file to keep in sync.

An annotation's text carries one signal per line, in the form `key:value`:

```
role:button
```

Anything the pipeline does not recognize is ignored, so an annotation may hold ordinary
prose alongside its signals, and existing annotations in a file pick up no new meaning.

Three rules cover components with variants:

- Annotate the **default variant**. Where a layer does not exist there, annotate a variant
  where it does appear.
- **Annotate once.** One annotation per element per role.
- Where the same element is annotated on more than one variant, the **first variant wins**.

A component *set* carries no layers of its own, so roles go on a component node or below.

## Platform reach

A role names a concept, not a web element. Every transform binds the concept to its own
platform's type, and **no binding is normative in the schema** — which is what lets one
vocabulary serve web, iOS, and Android without any of them owning it.

Most concepts reach all three platforms. Two do not, and that is recorded rather than
treated as a defect:

| Role | Reach | Note |
|------|-------|------|
| `spinbutton` | web + iOS | Compose has no stepper type; the concept degrades to its parts — the field plus its two affordance buttons |
| `increment` / `decrement` | web + Android | On iOS the `Stepper` owns these internally, so they are not separately addressable |
| everything else | all | — |

A concept that serves two platforms well and degrades explicitly on the third is a working
concept. Where a concept does not reach a platform it degrades to its **parts**, never to
nothing — the role still records that the affordances belong to the control between them,
which is information no structural analysis recovers.

## Where the names come from

The tokens are borrowed from several places, and it is easy to over-read that. Origin does
not predict reach: `password` is an HTML-derived name for a concept every platform has, and
`switch` is an ARIA name for a concept every platform has.

| Origin | Roles |
|--------|-------|
| WAI-ARIA role tokens | `button`, `link`, `checkbox`, `radio`, `switch`, `textbox`, `searchbox`, `spinbutton`, `slider`, `group`, `alert`, `status`, `progressbar` |
| ARIA *attribute* or APG *pattern* names | `togglebutton`, `disclosure`, `errormessage`, `description` |
| HTML element names | `textarea`, `password`, `label` |
| Specs-native, no external counterpart | `value`, `placeholder`, `indicator`, `panel`, `increment`, `decrement` |

Origin has exactly one consequence, and it belongs to the **web** transform alone: only the
first row contains legal ARIA role values. Emitting `role="disclosure"` or `role="password"`
is invalid — assistive technology discards an unrecognized role, leaving the element with no
semantics at all rather than approximate ones. Each role page states its web emission
explicitly for this reason.

For the iOS and Android transforms this distinction is inert, because neither platform has a
role string to emit. They bind concepts to native types and read the reach table above.

## Control role vocabulary

| Role | Declares | Page |
|------|----------|------|
| `button` | An element that performs an action on activation | [button](/roles/button/) |
| `togglebutton` | A button with a persistent pressed state | [togglebutton](/roles/togglebutton/) |
| `link` | An element that navigates on activation | — |
| `disclosure` | A trigger that shows and hides a companion panel | [disclosure](/roles/disclosure/) |
| `textbox` | A single-line free-text control | [textbox](/roles/textbox/) |
| `password` | A concealed-text control | — |
| `searchbox` | A search-text control | — |
| `textarea` | A multi-line text control | — |
| `spinbutton` | A numeric control with stepper affordances | — |
| `slider` | A control selecting a value from a range | — |
| `checkbox` | A binary (or indeterminate) selection control | [checkbox](/roles/checkbox/) |
| `radio` | An exclusive-selection control within a group | — |
| `switch` | An on/off control with immediate effect | — |
| `group` | A fieldset grouping related controls | — |
| `alert` | An assertive live region announcing interruptions | — |
| `status` | A polite live region announcing transient updates | — |
| `progressbar` | An element reporting progress toward completion | — |

## Part role vocabulary

| Part | Declares |
|------|----------|
| `label` | The control's visible label; wires `htmlFor` to the control. On a `group` it emits `<legend>` |
| `description` | Supplementary text; wires `aria-describedby` |
| `errormessage` | Validation message; wires `aria-describedby` when it renders |
| `value` | The element standing in for the control's value |
| `placeholder` | The element standing in for placeholder text |
| `indicator` | Decorative state indicator (check glyph, switch thumb); `aria-hidden` |
| `panel` | The region a `disclosure` shows and hides |
| `increment` | Step-up affordance on a `spinbutton` |
| `decrement` | Step-down affordance on a `spinbutton` |

Composite widgets — `dialog`, `tablist`/`tab`, `menu`, `combobox`/`listbox`/`option`, `select`, `tooltip` — are deferred to a future vocabulary: their value is focus and keyboard *behavior*, which scaffolds deliberately do not implement. Until that lands, the `selected` state concept has no role that bridges it and keeps its `data-*` behavior.

## Roles and states

Roles and [`processing.states`](/settings/states/) are **independent inputs**. Either can
exist without the other, and neither supersedes the other. They answer different questions:

| Input | Answers |
|-------|---------|
| `processing.states` | Which Figma variant prop carries this concept? |
| `anatomy.role` | What mechanism is available to express it? |

Neither answer is derivable from the other. The states config cannot know an element will
become a native control; the role cannot know a library spells its disabled state
`isDisabled`. A states classification with no role behaves exactly as it does today, and a
role with no states classification still emits its element, its semantics, and its contract
additions.

Where both apply to the same concept on the same element, the concept is emitted **once**:
the role decides the mechanism, the config decides which prop drives it. What a role changes
is emission quality — `disabled` becomes a real attribute rather than an `aria-disabled`
string on an inert container.

This holds for the pointer and focus concepts too, where it is easiest to get backwards. A
role makes `:hover` and `:focus-visible` *reachable*, because a container can never enter
those states and a native control always can. The config is what makes them *addressable*,
by naming which variant prop's styling belongs to each. Both are needed; a role never makes
a states entry unnecessary.

The dependency runs **role → states**, not the reverse. Several roles generate real state
management — a `togglebutton` flips its own pressed state — and to do that they must be told
which prop holds the state. Only `processing.states` can tell them. Without that binding the
role degrades to an inert handler and warns.

## See also

- [`processing.states`](/settings/states/) — state concept classification the roles bridge
- [Anatomy schema](/schema/anatomy/) — where `role` lives in the spec
- [ADR 067](https://github.com/DirectedEdges/specs/blob/main/adr/067-anatomy-element-roles.md) — the mechanism: role field, Dev Mode annotation, obligations, contract composition
- [ADR 068](https://github.com/DirectedEdges/specs/blob/main/adr/068-form-control-roles.md) — form controls and field plumbing
- [ADR 086](https://github.com/DirectedEdges/specs/blob/main/adr/086-interactive-root-roles.md) — interactive roots and announcements
