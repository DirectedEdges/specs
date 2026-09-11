---
title: "Web Components"
description: "What the Web Components platform calls the elements a promoted primitive becomes, and which attribute receives unmapped styling"
---

`config/conventions/web-components.yaml` states facts about the Web Components platform.
It carries the same three keys as [React](/settings/react/) — what differs is only what
genuinely differs between the platforms.

The two are separate platform files rather than one shared `web` key precisely because
of that difference: a custom element has a tag name where React has a component name,
and an attribute where React has a prop.

## `stylesProp`

```yaml
stylesProp: style
```

A custom element has no `sx` prop; it is styled as an element, so the `style` attribute
is the channel a caller already has.

## `primitives`

```yaml
primitives:

  text:
    component: ds-text
    props:
      content: text
      color: color

  glyph:
    component: ds-icon
    props:
      content: name
      color: appearance

  container:
    component: ds-box
    props:
      direction: direction
```

`component` is the tag name. Attribute names frequently match React's prop names,
because both are generated from one contract — but they are stated here rather than
derived, since a hand-written element library has no such guarantee.

## `defaultFillWidth`

Identical in meaning to [React's](/settings/react/#defaultfillwidth): the container
width used when a root resizes to fill its parent, and nothing at all when the root
states its own width.

## See Also

- [React](/settings/react/) — the peer platform
- [`specs webcomponents`](/cli/commands/webcomponents/) — the command that reads this
- [Conventions schema reference](/schema/conventions/) — the full shape
