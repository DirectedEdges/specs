---
title: "radio"
description: "Declare that an element is one option in a mutually exclusive set, so the platform supplies selection, roving focus, and grouping"
---

## About

`radio` declares that an element is one option in a mutually exclusive set. Without it the option cannot be focused, chosen, submitted, or validated, its label is an unassociated sibling, and nothing makes it exclusive with its siblings — a set behaves as unrelated toggles.

| React | Web Components | iOS | Android |
|---|---|---|---|
| Specified | Specified | Not yet planned | Not yet planned |

Behavior the platform supplies for a grouped set, none of which is markup:

- choosing one option clears the others
- arrow keys move between options and wrap at the ends
- the whole set is one stop in the focus order
- the chosen value participates in submission and validation

### Roles

| Role | Type | Element | Parts |
|---|---|---|---|
| `radio` | Control | `container` | `label`, `description`, `errormessage`, `indicator` |

The role element **becomes** the control. Everything else is declared or dropped:

| Descendant | Result |
|---|---|
| `label`, `description`, `errormessage` | Lifted out, emitted as siblings, wired by id |
| `indicator` | Consumed into styling — see below |
| Bare wrapper | Dropped silently |
| Anything with content of its own | Dropped, named in one warning |
| A role this control does not accept | Dropped, named in a warning |

### The indicator is consumed, not rendered

The inner dot's drawn appearance moves onto the control itself, keyed off the chosen state.

| Indicator type | Result |
|---|---|
| `container` | Fill, size, and radius transfer cleanly |
| `glyph` | **Cannot be consumed** — warns, emits the control without it. Use [checkbox](/roles/checkbox/)'s pattern instead |

### Why this differs from checkbox

| | Emits | Because its indicator is |
|---|---|---|
| [`checkbox`](/roles/checkbox/) | Hidden control + proxy label | A drawn glyph — a vector needing an element to render into |
| `radio` | The control itself, styled | A filled circle, drawable from the control's own box |

One element instead of three, and the platform's focus indicator lands on the visible thing with no assistance.

### States

| State | Effect | Classify in `states`? |
|---|---|---|
| `checked` | Natively chosen; draws the indicator | Recommended |
| `disabled` | Natively disabled, enforced by the platform | Recommended |
| `required` | Announced as required | Recommended |
| `invalid` | Announced as invalid | Recommended |
| `hover` / `active` | Native, on the control itself | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native, on the control itself | **Optional — prefer the platform default** |

- All of these land on the element the stylesheet already targets — no focus indicator to re-draw, no state to mirror onto a wrapper.
- No `indeterminate` — that belongs to `checkbox`. Classifying it here warns.
- A library spelling the chosen state `selected` classifies it as `checked`. The prop keeps its name; the concept decides the mechanism.

### Wired state

`onChange` follows [the wired state model](/roles/#the-wired-state-model): uncontrolled between prop changes, prop wins on change.

It matters more here than anywhere else, because **a radio cannot un-choose itself** — only a sibling becoming chosen clears it, and that sibling is a different component instance. A consumer owning the set should drive `checked` from its own state and treat `onChange` as the report.

Prerequisite: a `checked` classification in the [`states` convention](/settings/states/) naming the prop. Without it the handler degrades to a stub and warns.

### Grouping

A spec describes one radio and cannot see its siblings, so grouping comes from the containing [`group`](/roles/group/) — including through a slot, the usual shape. Per-platform mechanism is in the sections below.

No group and no explicit name **warns**. Two ungrouped sets on one page silently become one set, and choosing in the second clears the first.

### Accessible name

| Source | Result |
|---|---|
| `label` part on an element the component owns | Emits a label element wired to the control |
| `label` on an `instance` | Routes — the control's id is threaded into the instance |
| No `label` | **Warns** — announced as "2 of 3" with nothing about what choosing it means |

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

- `control` as `role:radio` — on the layer drawing the control's box **and nothing else**
- `selected` as `role:indicator` on the dot `container` inside it
- `label` as `role:label` on a `text` element or through a nested instance

The label, description, and error layers are **siblings** of the control container, not descendants. Where the layer tree offers no box-only container, restructure the layers — the alternative is warnings and a control missing its chrome.

## React

### Authored as

```tsx
<FormGroup header={<Legend>Cabin class</Legend>} name="cabin-class">
  <Radio value="economy" label="Economy" />
  <Radio value="premium" label="Premium" defaultChecked />
</FormGroup>
```

Outside a group, name it directly:

```tsx
<Radio name="cabin-class" value="economy" label="Economy"
       checked={choice === "economy"} onChange={() => setChoice("economy")} />
```

### Before / After

```tsx
// before
<div className="radio" data-element="root"
  aria-disabled={p.disabled ? 'true' : undefined}
  aria-selected={p.selected ? 'true' : undefined}>
  <div className="radio__control" data-element="control">
    <div className="radio__selected" data-element="selected" />
  </div>
  <FormLabel {...defaults} data-element="formLabel" />
</div>

// after
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

The drawn dot becomes a rule rather than an element:

```css
.radio__control { appearance: none; /* the drawn box: size, border, radius, fill */ }
.radio__control::before { /* the drawn dot, from the indicator element */ }
.radio__control:checked::before { opacity: 1 }
```

Three elements become one, `aria-selected` is gone, and `name` arrives from the group through context.

### Contract

| Prop | Type | Tier | Generated body |
|---|---|---|---|
| `onChange?` | `(e: ChangeEvent<HTMLInputElement>) => void` | MUST | **Wired** — sets checked, then calls the prop |
| `onBlur?` | `(e: FocusEvent) => void` | SHOULD | Stub |
| `name?` | `string` | SHOULD | Overrides the group's name |
| `value?` | `string` | MUST | — submitted value |
| `checked` | `boolean` | — | The existing variant prop |

Where an existing variant prop supplies the chosen state, the role contributes only the change signal and emits no `default*` companion.

## Web Components

Same `<input type="radio">` in the shadow root, styled the same way. Two differences:

- **Grouping needs no context.** Slotted children are real descendants of the group's host, so the radio walks up on connect and reads its name. Re-resolves on reconnect.
- **An id reference does not cross a shadow boundary.** A label rendered by a *different* component cannot associate by id. Accessible text recovers through [`partText()`](/roles/#parts-across-a-composed-component); click-the-label-to-choose does not.

## iOS

Not yet planned. Intended binding:

| | |
|---|---|
| Type | An option within a `Picker` |
| Grouping | **Structural** — no free-standing radio control exists, so `group` and its radios bind together as a picker and its options |
| Announced | Label and selected state; double-tap chooses |
| `indicator` | **Not consumed** — the platform draws its own selection mark |

## Android

Not yet planned. Intended binding:

| | |
|---|---|
| Type | `RadioButton` with `Role.RadioButton` |
| Grouping | `selectableGroup()` on the containing group |
| Announced | "Selected" / "not selected" and the label; double-tap chooses |
| `indicator` | **Consumed** — `RadioButton` accepts `colors`, so box and dot transfer |

## See also

- [group](/roles/group/) — what makes a set of radios exclusive
- [checkbox](/roles/checkbox/) — the proxy pattern, and when a drawn indicator needs it
- [indicator](/roles/indicator/) — the drawn dot, consumed into styling here
- [Precedence](/roles/precedence/) — role and states resolving together
- [Roles overview](/roles/) — the vocabulary and how roles are authored
