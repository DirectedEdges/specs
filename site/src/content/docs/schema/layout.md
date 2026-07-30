---
title: "Layout"
description: "Recursive tree representation of element nesting"
---

The `Layout` type provides a recursive tree representation of element nesting. It's an alternative to `parent`/`children` on [`Element`](/schema/elements/) for expressing hierarchy.

```ts
type LayoutNode = string | { [nodeName: string]: LayoutNode[] };
type Layout = LayoutNode[];
```

A leaf is a plain string (element name). A branch is an object mapping a parent element name to its children:

```yaml
- root:
    - labelContainer:
        - label
        - hint
    - control
```

The [`format.layout`](/schema/config.md/#format) config option controls which representation appears in the output: `LAYOUT` (tree only), `PARENT_CHILDREN` (flat parent/children on each element), or `BOTH`.

## Example

A text input component with a label area and a control:

```yaml
layout:
  - root:
      - labelContainer:
          - label
          - hint
      - control
      - helperText
```