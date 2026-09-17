---
title: "group"
description: "Declare that a set of controls is answered together, so it is announced as one thing and disabled as one thing"
---

## About

`group` declares that an element gathers several related controls answered together — a set of radio buttons, a row of checkboxes, an address block. Without it each control announces its own label and nothing more, the heading that says what is being chosen is programmatically unconnected, and a `disabled` variant styles every control while disabling none.

**Status** — React: Specified • Web Components: Specified • iOS: Not yet planned • Android: Not yet planned

### Roles

| Role | Type | Element |
|---|---|---|
| `group` | Control | `root` of `type: container` |
| `label` | Part | Element of `type: text` or `type: slot`, or nested instance prop of `type: string` |
| `description` | Part | Element of `type: text` or `type: slot`, or nested instance prop of `type: string` |
| `errormessage` | Part | Element of `type: text` or `type: slot`, or nested instance prop of `type: string` |

`group` is the only control concept that is not value-bearing — there is no single control beneath it to point at, which is what makes it a group.

Consequences:

- `label` names the group itself. It emits the naming element rather than a reference to a control, and must render first.
- `description` and `errormessage` wire to the group by id, as on any control.
- The heading is usually a `slot`, not a text element the component owns. `label` on a slot means *whatever is slotted here names this group* — the naming element wraps the slot.

### States

| State | Effect | Classify in `states`? |
|---|---|---|
| `disabled` | Disables every control inside, enforced by the platform | Recommended |
| `required` | Announced as required | Recommended |
| `invalid` | Announced as invalid | Recommended |

No `readonly` — no platform has a group-level equivalent. Set it per control.

`disabled` is the one worth classifying: one declaration disables the whole set without the transform touching a child.

### Naming the controls inside it

Radios are exclusive only when grouped, and only the group knows the set exists — so the group generates a name and publishes it. Each [`radio`](/roles/radio/) prefers its own `name` prop if given one. Per-platform mechanism is in the sections below.

Two rules:

- **Never derived from the label text.** It would change with copy edits and localization, collide when two groups share a label, and break deterministic output.
- **A generated name is the floor, not the answer.** It guarantees exclusivity; it is a meaningless submission key. Anything that submits wants the consumer to pass `name`.

### Accessible name

| Source | Result |
|---|---|
| `label` part resolves | Announced when focus enters the set |
| No `label` | Emits anyway, and **warns** — an unnamed group says nothing about what it groups |

## Specs

```yaml
anatomy:
  root:
    type: container
    role: group
  header:
    type: slot
    role: label
  children:
    type: slot
```

## Figma

- `root` as `role:group` — on the component node
- `label` as `role:label` on the heading `text` element, its `slot`, or a nested instance
- `description` / `errormessage` as their own parts, where the group owns them

Author the heading **first**, above the controls. The transform lifts it into naming position either way, but a lift means rendered order stops matching layer order, and positional CSS in that subtree breaks.

## React

### Authored as

```tsx
<FormGroup header={<Legend>Cabin class</Legend>} name="cabin-class">
  <Radio value="economy" label="Economy" />
  <Radio value="premium" label="Premium" />
</FormGroup>
```

Omitting `name` still yields exclusive radios — it just submits under a generated key.

### Before / After

```tsx
// before
<div className="form-group" data-element="root">
  <div className="form-group__header" data-element="header">{p.header}</div>
  <div className="form-group__children" data-element="children">{p.children}</div>
</div>

// after
const groupName = p.name ?? React.useId();

<RadioGroupContext.Provider value={{ name: groupName }}>
  <fieldset className="form-group" data-element="root" disabled={p.disabled}>
    <legend className="form-group__header" data-element="header">{p.header}</legend>
    <div className="form-group__children" data-element="children">{p.children}</div>
  </fieldset>
</RadioGroupContext.Provider>
```

- `<fieldset disabled>` disables every control inside, enforced by the browser
- `<legend>` is announced on focus entry, and HTML requires it to be the first child
- Context is the only way to reach slotted radios — children are opaque to the component rendering them. This is the first runtime coupling the transforms emit between two components

### Contract

| Prop | Type | Tier | Generated body |
|---|---|---|---|
| `name?` | `string` | SHOULD | Overrides the generated group name |

No event handler. A group does not respond; the controls inside it do.

## Web Components

Same `<fieldset>` and `<legend>` in the shadow root. Two differences:

- **No context needed.** Slotted children are real descendants of the host, so each radio walks up on connect and reads the group's name. Re-resolves on reconnect.
- **The host carries `[disabled]`** alongside the inner fieldset, so the stylesheet — written against the host — can still address the state. That is [precedence rule 1](/roles/precedence/#1-a-role-and-a-states-classification-emitted-once), not an exception.

## iOS

Not yet planned. Intended binding:

| | |
|---|---|
| Type | `Section` with a header, descendants' accessibility merged |
| Announced | Group name before the first control |
| `disabled` | `.disabled(_:)` on the section, propagates to content |
| Grouping | Structural — a `Picker` owns its options, so no shared name exists |

## Android

Not yet planned. Intended binding:

| | |
|---|---|
| Type | Container with `Modifier.semantics(mergeDescendants = true)` |
| Announced | Content description from the `label` part, before the first control |
| `disabled` | **Set per control** — does not propagate from a container |
| Grouping | `selectableGroup()` on the container |

## See also

- [radio](/roles/radio/) — the control this role most often gathers
- [label](/roles/label/) — names the group here, names a control everywhere else
- [Precedence](/roles/precedence/) — role and states resolving together
- [Roles overview](/roles/) — the vocabulary and how roles are authored
