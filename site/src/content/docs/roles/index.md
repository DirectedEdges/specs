---
title: "Roles"
description: "Declare what an anatomy element is for, so transforms emit native controls, accessibility wiring, and event contracts"
---

A **role** declares the interaction semantic of an anatomy element — this element *is* the button, *is* the checkbox control, *is* the label for that control. Without roles, transforms emit visually correct but behaviorally inert markup: a button scaffolds as a `<div>` that cannot be focused or clicked through the contract, and a checkbox has no `<input>` to check. With a role, each transform deterministically emits the platform's native control, the accessibility wiring between elements, and the event handlers in the generated contract.

Roles are stored in `anatomy.<element>.role` in the spec. The value is an open string; the documented vocabulary comes from ADRs 067, 068, and 086 (087 for actions). Nothing is read or emitted unless [`settings.spec.roles`](/schema/settings/) is on.

## Control roles and part roles

The vocabulary splits into two kinds:

- **Control roles** name an interactive or announced thing — `button`, `checkbox`, `textbox`, `disclosure`, `alert`. A control role changes what element is emitted and adds event handlers to the contract.
- **Part roles** name a piece of a control — `label`, `value`, `errormessage`, `panel`. Most parts add **no handlers**: their value is id generation plus an attribute on some other element (a `<label htmlFor>`, an `aria-describedby`, an `aria-controls`). A part resolves **by component**, not by tree position: a part a value-bearing control accepts resolves to that component's single value-bearing control wherever either sits in the layout, and a part only the non-value-bearing concepts accept (`button`, `togglebutton`, `link`, `disclosure`) resolves to the nearest of those by proximity. Resolution never walks for an ancestor — a control's label and error message are usually siblings of it, not descendants.

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

## Parts across a composed component

A part is authored in the component that **wires** it, which is not always the component
that renders it.

Where the element carrying the part is one the component owns, the part role is an
**emission** signal: this is where the `<label>`, the id, the `aria-describedby` target
is emitted.

Where the element is an `instance` of another component, it is a **routing** signal: the
consumer's control id is routed into that instance, and the instance emits its own
element. The wrapper's tag never changes, and two nested `<label>` elements are
impossible by construction — a component never emits a part's semantic element for
content it does not own.

A component with a part and no control of its own is valid and self-describing: a label
component carrying `label` declares that it *provides* that part. It emits the element
and an id, and no wiring, because it has nothing to wire to. Wiring arrives when it is
composed.

### Routing more than one part

A composed component may provide several parts — a label component that also holds a
description. So on an `instance` element, `role` accepts a list. The consumer names every
concept it is wiring:

```yaml
# switch — the consumer declares what it wires
formLabel:
  type: instance
  instanceOf: formLabel
  role: [label, description]
```

```yaml
# formLabel — the provider declares what it is
label:
  type: text
  role: label
description:
  type: text
  role: description
requiredAsterisk:
  type: text
  role: indicator
```

Each concept routes to whichever element of the provider ascribes it. **Two declarations
that must agree** — the consumer asserts, the provider declares — and a concept the
provider does not ascribe is an error naming it and the component. Nothing reads across
the boundary to resolve: the consumer has already said everything, and the agreement is
checked rather than discovered.

The consumer names concepts, never the provider's element keys, so renaming an element
inside the provider breaks nothing.

`requiredAsterisk` is not in the consumer's list. `indicator` is self-contained — it hides
itself wherever it renders and needs nothing routed — so naming it would wrongly suggest
the consumer wires it. Only parts that wire by id need declaring: `label`, `description`,
`errormessage`, `value`, `placeholder`.

In Figma this is one `role:` line per concept on the instance layer, the same way `action:`
lines accumulate. Where the set is annotated on more than one variant, the first variant
wins for the whole set.

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

## The vocabulary

Every concept, what it declares, and whether anything emits for it yet, is on the
[Inventory](/roles/inventory/). The two tables below name the split the inventory
groups by.

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

## Roles and actions

A role answers what an element **is**. A second annotation key, [`action`](/actions/), answers
what activating it **does** — a dismiss affordance in an alert is a button in every way that
announcement can see, and what distinguishes it is that pressing it closes the alert. The two
keys sit side by side on the same element:

```
role:button
action:dismiss
```

The boundary between them is announcement:

> **Does it change how the control is announced?** If yes, it is a role. If no, it is an
> action.

`togglebutton` and `disclosure` announce their own state, so both are roles. `dismiss` never
changes how its button is announced, so it is an action. Keeping the two apart is what confines
this vocabulary to concepts ARIA and the native platforms have counterparts for — the
alternative was a role per behavior-and-control pair, such as `dismissbutton`, which no
platform can bind to a native type.

An element the component **owns** carries **at most one role**, because the question of what
it *is* has one answer. It may carry **several actions**, because that question does not. An
`instance` element is different — see below — because a role there routes rather than claims. Where a role and an action want the
same event, they compose into one handler rather than competing — see
[precedence](/roles/precedence/). Both keys are read from the same
annotation, with the same variant rules, and both route rather than emit when they land on an
`instance` element.

## Roles and states

Roles and the [`states` convention](/settings/states/) are **independent inputs**. Either can
exist without the other, and neither supersedes the other. They answer different questions:

| Input | Answers |
|-------|---------|
| the `states` convention | Which variant prop carries this concept? |
| `anatomy.role` | What mechanism is available to express it? |

Neither answer is derivable from the other. The states convention cannot know an element will
become a native control; the role cannot know a library spells its disabled state
`isDisabled`. A states classification with no role behaves exactly as it does today, and a
role with no states classification still emits its element, its semantics, and its contract
additions.

Where both apply to the same concept on the same element, the concept is emitted **once**:
the role decides the mechanism, the config decides which prop drives it. The full rule,
including what happens when a role claims a concept nothing drives, is on
[precedence](/roles/precedence/). What a role changes
is emission quality — `disabled` becomes a real attribute rather than an `aria-disabled`
string on an inert container.

This holds for the pointer and focus concepts too, where it is easiest to get backwards. A
role makes `:hover` and `:focus-visible` *reachable*, because a container can never enter
those states and a native control always can. The config is what makes them *addressable*,
by naming which variant prop's styling belongs to each. Both are needed; a role never makes
a states entry unnecessary.

The dependency runs **role → states**, not the reverse. Several roles generate real state
management — a `togglebutton` flips its own pressed state — and to do that they must be told
which prop holds the state. Only the `states` convention can tell them. Without that binding the
role degrades to an inert handler and warns.

## See also

- [Precedence](/roles/precedence/) — how role, states and action resolve when more than one applies
- [Actions overview](/actions/) — what activating an element *does*, the other annotation key
- The [`states` convention](/settings/states/) — state concept classification the roles bridge
- [Anatomy schema](/schema/anatomy/) — where `role` lives in the spec
- [ADR 067](https://github.com/DirectedEdges/specs/blob/main/adr/067-anatomy-element-roles.md) — the mechanism: role field, Dev Mode annotation, obligations, contract composition
- [ADR 068](https://github.com/DirectedEdges/specs/blob/main/adr/068-form-control-roles.md) — form controls and field plumbing
- [ADR 086](https://github.com/DirectedEdges/specs/blob/main/adr/086-interactive-root-roles.md) — interactive roots and announcements
