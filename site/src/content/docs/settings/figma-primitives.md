---
title: "Promotion table"
description: "Which design system component a raw layer stands for, and how its styles become that component's props"
---

`config/conventions/figma.primitives.yaml` is the promotion table: it decides which
design system component a raw `text`, `glyph` or `container` layer in composed example
content stands for.

A component's props are the same whichever platform renders it, so the table is stated
once rather than per platform. It carries the `figma.` qualifier because what it *reads*
is Figma — its `source` keys name Figma style properties and its `values` keys name
Figma tokens (ADR-073 Decision 5). A file named `primitives.yaml` is refused with the
rename that fixes it.

`specs init` does not seed this file. A workspace adds it when it turns
[`promotePrimitives`](/settings/promote-primitives/) on; until then the table is inert.

## Shape

```yaml
text:
  elementType: text
  map:
    - source: typography
      values:
        'Type/Heading/Large': { size: L, weight: bold }
        'Type/Body': { size: M }
    - source: textColor
      prop: color
    - source: content
      prop: text
```

Each entry names the `elementType` it promotes *from* — one of `text`, `glyph` or
`container` — and a `map` of rules, in precedence order.

A rule names one `source` and then either:

- **`prop`** — the source's value is written to that prop as-is
- **`values`** — a literal lookup from what the source carries to the props it produces,
  so one source may write several props at once, and may reach a prop whose meaning
  differs from its own

A key in `values` is a full token path or a raw scalar. It is never matched partially.

## What a source can be

The honoured set is closed per kind:

| Kind | Sources |
|---|---|
| `text` | `typography`, `typography.fontSize`, `typography.fontFamily`, `typography.fontStyle`, `textColor`, `content` |
| `glyph` | `width`, `height`, `fillColor`, `content` |
| `container` | `layoutMode` |

A source outside the set, or one the element does not carry, simply does not resolve —
its value stays in `styles` and reaches output as passed styling.

`typography` and `typography.*` can never both resolve: a layer wearing a text style
carries the token, and a layer styled ad hoc carries the composite. Declaring both is
how one entry serves either authoring style.

## Selecting between entries

Several entries may share an `elementType`. A design system with a text, a heading and a
body component is three entries, and the one selected is the one with the most rules
resolving against the element. At least one rule must resolve, so `elementType` alone
never promotes.

The target need not itself be a primitive: `elementType` describes the layer shape a
promotion starts from, not the component it lands on.

## See Also

- [Promote Primitives](/settings/promote-primitives/) — the setting that turns this on
- [React](/settings/react/) and [Web Components](/settings/web-components/) — what each platform calls the components named here
- [Conventions schema reference](/schema/conventions/) — the full shape
