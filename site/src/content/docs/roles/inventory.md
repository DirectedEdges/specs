---
title: "Inventory"
description: "Every role concept, what it declares, and whether anything emits for it yet"
tableOfContents: false
---

The vocabulary is larger than what emits. A concept with no implementation is inert:
an annotated spec carries the role and every transform ignores it, so nothing breaks
and nothing changes.

Three states, because a binary would be misleading:

| Status | Means |
|---|---|
| **Implemented** | Emitted by [`specs react`](/cli/commands/react/) and [`specs webcomponents`](/cli/commands/webcomponents/), built from its page |
| **Partial** | Something emits, but it was written before the page existed and has not been checked against it. Treat the page as the specification and the output as unverified |
| **Specified** | The page is the specification. Nothing emits yet |

## Control roles

Name an interactive or announced thing. A control role changes what element is
emitted and adds handlers to the contract.

| Role | Declares | Status |
|------|----------|--------|
| [`button`](/roles/button/) | An element that performs an action on activation | **Implemented** |
| [`togglebutton`](/roles/togglebutton/) | A button with a persistent pressed state | **Implemented** |
| `link` | An element that navigates on activation | Partial — no page |
| [`disclosure`](/roles/disclosure/) | A trigger that shows and hides a companion panel | Specified |
| [`textbox`](/roles/textbox/) | A single-line free-text control | Specified |
| `password` | A concealed-text control | — |
| `searchbox` | A search-text control | — |
| `textarea` | A multi-line text control | — |
| `spinbutton` | A numeric control with stepper affordances | — |
| `slider` | A control selecting a value from a range | — |
| [`checkbox`](/roles/checkbox/) | A binary (or indeterminate) selection control | Specified |
| `radio` | An exclusive-selection control within a group | — |
| `switch` | An on/off control with immediate effect | — |
| `group` | A fieldset grouping related controls | — |
| [`alert`](/roles/status/) | An assertive live region announcing interruptions | Partial |
| [`status`](/roles/status/) | A polite live region announcing transient updates | Partial |
| [`progressbar`](/roles/status/) | An element reporting progress toward completion | Partial |

## Part roles

Name a constituent of some control. Most add no handlers — their value is an id plus
an attribute on a different element. A part resolves to its control by component,
not by tree position; see [precedence](/roles/precedence/).

| Part | Declares | Status |
|------|----------|--------|
| [`label`](/roles/label/) | The control's visible label; wires `htmlFor`. On a `group` it emits `<legend>` | Partial |
| [`indicator`](/roles/indicator/) | Decorative state indicator (check glyph, switch thumb); `aria-hidden` | Partial |
| `description` | Supplementary text; wires `aria-describedby` | — |
| [`errormessage`](/roles/errormessage/) | Validation message; wires `aria-describedby` when it renders | Specified |
| [`value`](/roles/value/) | The element standing in for the control's value | Specified |
| `placeholder` | The element standing in for placeholder text | — |
| [`panel`](/roles/panel/) | The region a `disclosure` shows and hides | Specified |
| `increment` | Step-up affordance on a `spinbutton` | — |
| `decrement` | Step-down affordance on a `spinbutton` | — |

A dash means no page yet — the concept is in the vocabulary and nothing describes it
in detail.

## See also

- [Roles overview](/roles/) — what a role is, how one is authored, and the platform reach
- [Precedence](/roles/precedence/) — how a role, a states classification and an action resolve together
- [Actions](/actions/) — the second annotation key
