---
title: "group"
description: "Declare that a set of controls is answered together, so it is announced as one thing and can be disabled as one thing"
---

## About

The `group` role declares that an element gathers several related controls that are answered together — a set of radio buttons, a row of checkboxes, an address block.

Without it, a set of controls is a container with a heading above it. Each control announces its own label and nothing more, so someone navigating by assistive technology reaches the second of three options and hears the option — but never the question it answers. The heading that would answer it is visually adjacent and programmatically unconnected. A `disabled` variant on the set styles every control and disables none of them, because nothing in the markup says the set exists.

That is true on every platform. What differs is only the mechanism each one provides, and all three provide one.

`group` is the only control concept that is not value-bearing and has no single control beneath it — that is what makes it a group rather than a control. It accepts the same plumbing parts a control does.

### Roles

| | |
|---|---|
| Concept | `group` |
| Accepted element types | `container` |
| Accepted parts | `label`, `description`, `errormessage` |
| Value-bearing | No |

**The `label` part behaves differently here than anywhere else in the vocabulary.** Everywhere else it names one control by pointing at it. On a group there is no control to point at, so the association is structural — the part becomes the group's own name.

`description` and `errormessage` wire to the group by id, exactly as they do on a control.

### The heading is usually a slot

The common shape puts the group's heading in a `slot` rather than in a text layer the component owns:

```yaml
root:     { type: container }
header:   { type: slot }
children: { type: slot }
```

A slot is runtime content the spec cannot see inside, so there is no text element to convert. `label` is accepted on a slot anyway, and means **"whatever is slotted here is this group's name"** — the transform wraps the slot in the naming element rather than replacing anything inside it. The same holds for `description`.

This is the normal case, not an edge case. A group that owns its heading text outright works too, and is simpler; both are supported.

### States

| State | What the group does | Classify in `states`? |
|-------|---------------------|----------------------------------|
| `disabled` | Disables every control inside it, enforced by the platform | Recommended |
| `required` | Announced as required | Recommended |
| `invalid` | Announced as invalid | Recommended |

`disabled` is the state most worth classifying, because it is the one a plain container could never express: one declaration on the group disables everything inside it without the transform touching a single child.

There is no `readonly` — no platform offers a group-level equivalent, and a set that models one needs it on each control.

### Naming the controls inside it

A set of radios is mutually exclusive only when every radio shares one grouping name, and the group is the only element that knows the set exists. So the group supplies it.

The hard part is that the controls usually arrive through a **slot**, which no prop can be threaded into by the spec. Each platform section below shows how that platform reaches them; the shared rule is that the group generates the name, publishes it, and every [`radio`](/roles/radio/) inside prefers its own `name` prop if it has one.

**The name is never derived from the label text.** It is tempting — "Cabin class" is right there — and it is wrong three times over: the form key would change when copy is edited or localized, two groups sharing a label on one page would collide, and identical input would stop producing identical output. A generated identifier is stable per instance and collision-free, which is what makes exclusivity work with no consumer effort.

What a generated identifier is *not* is a meaningful submission key. **Anything that actually submits wants the consumer to pass `name`**, and the generated one is the floor that keeps the control correct until they do.

### Accessible name

The name comes from the `label` part. Where no `label` resolves, the group still emits, and **warns** — an unnamed group is announced as a group with nothing said about what it groups, which is close to no improvement on the container it replaced.

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

Annotate the component node, and the layer holding the heading:

```
role:group
```
```
role:label
```

**Put the heading layer first, above the controls.** Where the design puts it elsewhere the transform still lifts it into naming position and the output is still correct — but the rendered order then stops matching the layer order, and positional CSS written against that subtree is what breaks. Authoring the heading first is the cheaper half of the bargain.

## React

### Authored as

```tsx
<FormGroup header={<Legend>Cabin class</Legend>} name="cabin-class">
  <Radio value="economy" label="Economy" />
  <Radio value="premium" label="Premium" />
  <Radio value="business" label="Business" />
</FormGroup>
```

The consumer passes `name` because this set submits. Omitting it still yields three mutually exclusive radios — the group generates an identifier and the options group correctly — it just submits under a generated key.

### Before / After

Without the role:

```tsx
<div className="form-group" data-element="root">
  <div className="form-group__header" data-element="header">{p.header}</div>
  <div className="form-group__children" data-element="children">{p.children}</div>
</div>
```

With the role:

```tsx
const groupName = p.name ?? React.useId();

<RadioGroupContext.Provider value={{ name: groupName }}>
  <fieldset className="form-group" data-element="root" disabled={p.disabled}>
    <legend className="form-group__header" data-element="header">{p.header}</legend>
    <div className="form-group__children" data-element="children">{p.children}</div>
  </fieldset>
</RadioGroupContext.Provider>
```

`<fieldset>` is what makes `disabled` real: one attribute disables every control inside, enforced by the browser rather than by generated code. `<legend>` is announced when focus enters the set. HTML requires the legend to be the **first child**, so a heading authored elsewhere in the layer order moves here.

The name reaches slotted radios through context because nothing else can reach them — the children are opaque to the component that renders them. This is the first runtime coupling the transforms emit between two components, and it is deliberate: the alternative is a prop the consumer threads identically through every option, where one miss produces two sets that silently behave as one.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `name?` | `string` | SHOULD | Overrides the generated group name |

`group` adds no event handler. A group does not respond to anything; the controls inside it do.

## Web Components

The same `<fieldset>` and `<legend>` inside the shadow root, with one difference: there is no context, and none is needed. Slotted children are real descendants of the group's host element, so each radio walks up on connect and reads the group's name directly. No provider, no event protocol, and it re-resolves on reconnect.

The host carries a plain `[disabled]` attribute alongside the inner fieldset's, so the stylesheet — which is written against the host — can still address the state. That is [precedence rule 1](/roles/precedence/#1-a-role-and-a-states-classification-emitted-once) doing its usual job, not a group-specific exception.

## iOS

**Nothing emits for iOS yet.** The intended binding is recorded here so a transform author has a specification rather than a guess.

`group` becomes a `Section` with a header, its descendants' accessibility merged beneath it. VoiceOver announces the group name before the first control in the set. `disabled` binds to `.disabled(_:)` on the section, which propagates to its content the way `<fieldset disabled>` does.

There is no separate grouping name on iOS: a `Picker` owns its options directly, so the exclusivity the web gets from a shared `name` is structural instead.

## Android

**Nothing emits for Android yet.** As above — intended binding, not shipped behavior.

`group` becomes a container with `Modifier.semantics(mergeDescendants = true)` and a content description drawn from the `label` part. TalkBack announces the group name before the first control. `disabled` propagates through `LocalContentColor` and each control's own `enabled` parameter rather than through a single container attribute, so the transform sets it per control — the one place this concept costs more on Android than elsewhere.

Exclusivity comes from `selectableGroup()` on the container, which is the Compose counterpart to a shared name.

## See also

- [radio](/roles/radio/) — the control this role most often gathers, and the one that needs its name
- [label](/roles/label/) — the part that names the group, and names a control everywhere else
- [errormessage](/roles/errormessage/) — group-level validation text
- [Precedence](/roles/precedence/) — how a role and a states classification resolve together
- [Roles overview](/roles/) — the vocabulary and how roles are authored
