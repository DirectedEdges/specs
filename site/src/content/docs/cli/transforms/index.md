---
title: "Transforms"
description: "Project component spec files into derived artifacts using specs transform"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Transforms project a component specification into artifacts your codebase can consume: a TypeScript contract, a baseline stylesheet, a token inventory. Instead of writing those by hand, you derive them from the spec and keep them in sync as the design evolves. This concept is described in [RFC 001: Component Dictionary](https://github.com/DirectedEdges/specs/blob/main/rfc/001-component-dictionary/README.md).

Transforms take spec data as far as it deterministically goes — every prop, token, and style Figma captured — before inference enters the picture. Structured spec data is stable, regeneratable, and cheap to re-read; it's the right foundation for agents and tooling to build on, not a replacement for them. What the spec can't know — behavior, interaction states, accessibility semantics — belongs to agentically-extended specs and the authored files that live alongside.

#### Spec output

```
output/
  _dictionary/
    styling.byComponent.json   # token usage indexed by component
    styling.byToken.json       # token usage indexed by token name across components

  ds-alert/
    api.yaml            # spec
    variants.yaml       # variant data
    contract.ts         # generated — props interface and defaults
    styles.css          # generated — baseline token rules
    styling.json        # generated — token inventory
```

#### React component or prototyping kit

```
src/components/DsAlert/
  generated/
    contract.ts         # from specs transform
    styles.css          # from specs transform
  DsAlert.tsx           # implementation
  extensions.css        # overrides, states, and behavior not regenerated
  DsAlert.test.tsx
  index.ts
```

## How It Works

`specs transform` discovers component subfolders under the output directory (each must contain an `api.yaml`), then runs one or more named transformers against every component.

```bash
specs transform [transformers...] [options]
```

Transformer names can be passed as positional arguments, configured in `specs.config.yaml`, or left absent to use the CLI default (`contract`).

## Transformer Resolution Order

1. Positional arguments — `specs transform css styling`
2. `config.transform.transformers` in `specs.config.yaml`
3. CLI default: `contract`

## Available Transformers

| Transformer | Output file | What it produces |
|-------------|-------------|-----------------|
| [`contract`](/specs/cli/transforms/contract/) | `contract.ts` | TypeScript Props interface and defaults constant |
| [`css`](/specs/cli/transforms/css/) | `styles.css` | CSS rules per anatomy element, with token vars and variant selectors |
| [`component-md`](/specs/cli/transforms/component-md/) | `component.md` | Single-file markdown reference — props, anatomy, layout, tokens, states, variant deltas |

## Running All Transformers

```bash
specs transform contract css
```

Or configure them in `specs.config.yaml` so `specs transform` alone is enough:

```yaml
config:
  transformers:
    - name: contract
    - name: css
```

## See Also

- [`transform` command](/specs/cli/commands/transform/) — full CLI reference
- [transform config](/specs/config/transform/) — configure default transformers
