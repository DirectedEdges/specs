---
title: "radio"
description: "Declare that an element is one option in a mutually exclusive set, so the platform supplies selection, roving focus, and grouping"
---

## About

The `radio` role declares that an element is one option in a mutually exclusive set.

Without it, a radio is a container announced as a generic selectable thing, or as nothing at all. It cannot be focused, chosen, submitted, or validated; its label is an unassociated sibling; and nothing makes the option exclusive with its siblings, so a set of them behaves as a set of unrelated toggles.

Radio is the concept where the missing native control costs the most. Every platform ships behavior for a group of real radios that a scaffold would otherwise have to write by hand:

- choosing one option clears the others
- arrow keys move between options and wrap at the ends
- the whole set is one stop in the focus order, not one stop per option
- the chosen value participates in form submission and validation

None of that is markup. All of it arrives by reaching for the platform's own control.

### Roles

| | |
|---|---|
| Concept | `radio` |
| Accepted element types | `container` |
| Accepted parts | `label`, `description`, `errormessage`, `indicator` |
| Value-bearing | Yes |

The role element **becomes** the control rather than standing beside one. Everything the control needs is either an attribute on it or a sibling wired to it by id; everything else in the subtree is declared or dropped.

Like every collapsing role, `radio` renders only what is declared. Unannotated descendants do not render — a bare wrapper drops silently, and anything carrying content of its own is named together in one warning. `label`, `description`, and `errormessage` are lifted out and emitted as siblings at the control's depth. A descendant carrying a role this control does not accept is dropped with a warning naming it.

### The indicator is consumed, not rendered

A radio's inner dot is annotated `indicator` like any other state indicator, and on this role it is **consumed into styling** rather than emitted as an element. Its drawn appearance moves onto the control itself, keyed off the chosen state.

This has a bound worth knowing before annotating: a `container`-typed indicator is a shape, and its fill, size, and radius transfer cleanly. A **`glyph`-typed indicator is a vector and cannot be consumed** — the transform warns, names the element, and emits the control without it. A design in that position wants [checkbox](/roles/checkbox/)'s pattern, and the warning says so.

### Why this differs from checkbox

[`checkbox`](/roles/checkbox/) hides the native control and turns the visual into a proxy for it. `radio` styles the native control directly. The difference is what each one draws:

- A checkbox's indicator is usually a **drawn glyph** — a real vector the design owns, which needs an element to render into. The proxy structure is what gives it one.
- A radio's indicator is a filled circle, which every platform's styling can draw from the control's own box with no element at all.

One control, one element, and the platform's focus indicator lands on the visible thing with no assistance. Where a radio genuinely needs a drawn vector indicator, this pattern cannot serve it — see the note above.

### States

| State | What the radio does | Classify in `states`? |
|-------|---------------------|----------------------------------|
| `checked` | Natively chosen; draws the indicator | Recommended |
| `disabled` | Natively disabled — unfocusable and unselectable, enforced by the platform | Recommended |
| `required` | Announced as required | Recommended |
| `invalid` | Announced as invalid | Recommended |
| `hover` | Native, on the control itself | Recommended, if the library styles it |
| `active` | Native, on the control itself | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native, on the control itself | **Optional — prefer the platform default** |

Every one of these lands on the element the stylesheet already targets, because the control and the visual are one element. There is no focus indicator to re-draw and no state to mirror onto a wrapper.

Platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect, so specifying one from Figma usually replaces a good default with a worse one.

There is no `indeterminate` — that state belongs to `checkbox` alone. A library that classifies it on a radio gets a warning naming the concept and the role.

A library that spells its chosen state `selected` rather than `checked` classifies it as `checked` for this role. The prop keeps its name; only the concept it is classified under decides the mechanism.

### The wired state model, and why it matters more here

`onChange` is wired, following [the wired state model](/roles/#the-wired-state-model): uncontrolled between prop changes, and the prop wins whenever it changes.

That model matters more here than anywhere else in the vocabulary. **A radio cannot un-choose itself** — only a sibling becoming chosen clears it, and the sibling is a different component instance. Internal state is what makes a single radio feel live in isolation; the prop-wins rule is what lets a consumer holding the set's selection drive every radio in it correctly. A consumer that owns the set should drive `checked` from its own state and treat `onChange` as the report.

Wiring has a prerequisite: the transform must know which prop holds the chosen state, and it never guesses one by name. That binding comes from the `checked` classification in the [`states` convention](/settings/states/). Without it the handler degrades to a stub and the transform warns.

### Grouping

A set of radios is mutually exclusive only when all of them are grouped, and a component spec describes **one** radio — it cannot see its siblings. So grouping comes from the [`group`](/roles/group/) that contains it, including when the radios arrive through a slot, which is the usual shape.

Each platform section below shows how. A radio that resolves no group and is given no explicit name **warns**, naming the component: the failure it prevents is quiet and severe, since two ungrouped sets on one page silently become one set, and choosing in the second clears the first.

### Accessible name

The name comes from the `label` part, emitted as a real label element associated to the control. Where the label is an `instance` of a label component — the usual shape — the part routes rather than emits, and the control's identifier is threaded into that instance.

A radio with no resolving `label` warns. An unnamed option is announced as "2 of 3" with nothing said about what choosing it means.

## Specs

```yaml
anatomy:
  root:
    type: container
  control:
    type: container
    role: radio
  selected:
    type: container
    role: indicator
  formLabel:
    type: instance
    instanceOf: formLabel
    role: [label]
```

## Figma

Annotate the layer that draws the control's box, the dot inside it, and the label:

```
role:radio
```
```
role:indicator
```
```
role:label
```

**Land `role:radio` on the layer that draws the control's box and nothing else** — not on the row that also holds the label. The label, description, and error layers are that container's **siblings**, each annotated with its own part. Where the layer tree offers no such container, restructure the layers; the alternative is a set of warnings and a control missing its chrome.

## React

### Authored as

```tsx
<FormGroup header={<Legend>Cabin class</Legend>} name="cabin-class">
  <Radio value="economy" label="Economy" />
  <Radio value="premium" label="Premium" defaultChecked />
</FormGroup>
```

A radio outside a group works too, by being told its name directly:

```tsx
<Radio name="cabin-class" value="economy" label="Economy"
       checked={choice === "economy"} onChange={() => setChoice("economy")} />
```

### Before / After

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

With the role:

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

and the dot the designer drew becomes a rule rather than an element:

```css
.radio__control { appearance: none; /* the drawn box: size, border, radius, fill */ }
.radio__control::before { /* the drawn dot, from the indicator element */ }
.radio__control:checked::before { opacity: 1 }
```

Three elements become one, `aria-selected` is gone, and `name` arrives from the group through context without the consumer touching anything.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — sets checked, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `name?` | `string` | SHOULD | Overrides the group's name |
| `value?` | `string` | MUST | — submitted value |
| `checked` | `boolean` | — | The existing variant prop |

`onBlur` is a stub — the transform calls the prop and nothing else, because what happens on blur is the consumer's decision.

Where an existing variant prop already supplies the chosen state, the role contributes only the change signal and emits no `default*` companion.

## Web Components

The same `<input type="radio">` inside the shadow root, styled the same way. Grouping resolves differently: there is no context, and none is needed. Slotted children are real descendants of the group's host, so the radio walks up on connect, finds its group, and reads its name. It re-resolves on reconnect, so re-slotting is safe.

One genuine limitation: an `id` reference does not cross a shadow boundary, so a label rendered by a *different* component cannot associate to this control by id. Accessible text recovers through the generated `partText()` convention described in the [roles overview](/roles/#parts-across-a-composed-component); what does not recover is click-the-label-to-choose across that boundary.

## iOS

**Nothing emits for iOS yet.** The intended binding is recorded here so a transform author has a specification rather than a guess.

A radio becomes an option within a `Picker`. This is the one concept whose native shape differs structurally from the web's: iOS has no free-standing radio control, and exclusivity comes from the options belonging to one picker rather than from a shared name. A transform therefore binds the `group` and its radios **together** — the group becomes the `Picker`, each radio becomes a tagged option — rather than binding each radio independently.

VoiceOver announces the option's label and whether it is selected; double-tap chooses it. The `indicator` is not consumed on iOS, because the platform draws its own selection mark and a design that overrides it is fighting the platform convention.

## Android

**Nothing emits for Android yet.** As above — intended binding, not shipped behavior.

A radio becomes `RadioButton` with `Role.RadioButton`, inside a container carrying `selectableGroup()` — that modifier is what supplies exclusivity and the single focus stop, and it is the group's job to emit it.

TalkBack announces "selected" or "not selected" and the option's label, and double-tap chooses it. `RadioButton` accepts `colors`, so the drawn box and dot **do** transfer, making the `indicator` consumption meaningful here in a way it is not on iOS.

## See also

- [group](/roles/group/) — what makes a set of radios exclusive
- [checkbox](/roles/checkbox/) — the proxy pattern, and when a drawn indicator needs it
- [indicator](/roles/indicator/) — the drawn dot, consumed into styling here
- [Precedence](/roles/precedence/) — how a role and a states classification resolve together
- [Roles overview](/roles/) — the vocabulary and how roles are authored
