---
title: "Default Example Width"
description: "The width a library's components and examples are authored at, and render at by default"
---

Anything that renders a spec has to pick a width first — a Figma frame written back from a spec, a generated story canvas, a screenshot harness. Without a declared one, each tool picks its own, and a library authored at a mobile width renders wrong: a root container set to fill stretches across a desktop canvas, and text that wraps to two lines in the design renders on one.

`defaultExampleWidth` is a library fact, declared in `config/conventions.yaml`. Every consumer of the library reads the same number, so the same spec lays out the same way wherever it is rendered.

## Configuration

```yaml
figma:
  defaultExampleWidth: 375  # Render components and examples 375px wide
```

## Result

The value travels with the spec's conventions, and consumers use it as the width for rendered output:

```yaml
conventions:
  figma:
    defaultExampleWidth: 375
```

A renderer writing a component back to Figma creates its frame 375 wide. A generated story sets its canvas to 375. Both show the component at the width it was designed at.

Omit the key and the library declares no width — each consumer falls back to its own default, which is the behavior before this convention existed.

## Options

- **Type**: number (pixels)
- **Default**: *(absent — the library declares no width)*
- **Effect**: When set to a positive number, rendered components and examples default to that width. When absent, each consumer uses its own default.

A declared width is a default, not a constraint. A consumer given an explicit width for a particular render uses that instead.

## Path

`figma.defaultExampleWidth` in `config/conventions.yaml`
