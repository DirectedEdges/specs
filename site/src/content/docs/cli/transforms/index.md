---
title: "Transforms"
description: "Project component spec files into derived artifacts using specs transform"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The `transform` command fans a component specification out into artifacts your codebase can consume: a TypeScript contract, a baseline stylesheet, a working component, a token inventory. Instead of writing those by hand, you derive them from the spec and keep them in sync as the design evolves. This concept is described in [RFC 001: Component Dictionary](https://github.com/DirectedEdges/specs/blob/main/rfc/001-component-dictionary/README.md).

Transforms take spec data as far as it deterministically goes — every prop, token, and style Figma captured — before inference enters the picture. Structured spec data is stable, regeneratable, and cheap to re-read; it's the right foundation for agents and tooling to build on, not a replacement for them. What the spec can't know — behavior, interaction states, accessibility semantics — belongs to agentically-extended specs and the authored files that live alongside.

## Output

```
output/
  _dictionary/
    styling.byComponent.json   # token usage indexed by component (specs analyze)
    styling.byToken.json       # token usage indexed by token name across components

  dsAlert/
    api.yaml            # spec
    variants.yaml       # variant data
    generated/
      DsAlert.contract.ts     # from specs transform contract
      DsAlert.styles.css      # from specs transform css
      react/
        DsAlert.scaffold.tsx  # from specs transform react — always current, do not edit
        DsAlert.stories.tsx   # from specs transform stories
    src/
      react/
        DsAlert.tsx             # seeded once by react transformer, then human-owned
        DsAlert.extensions.css  # authored — styling the spec can't express
        DsAlert.proposed.css    # authored — styling proposed for promotion into the spec
```

Every transform output file — generated and authored — is PascalCase-prefixed with the component name (`DsAlert.*`), even though the folder itself already scopes it to that component; this keeps filenames self-describing when opened outside the tree (an editor tab, a diff view, a search result). All generated output for a component lives under its `generated/` subfolder, keeping it clearly separated from the source `api.yaml`/`variants.yaml` and from anything you author. The `react` transformer is the one exception that writes outside `generated/`: it seeds a one-time authored copy under `src/react/`, described in [Authored vs. Generated](#authored-vs-generated) below.

#### Authored vs. Generated

`contract`, `css`, `react`, and `stories` all regenerate their `generated/` output on every run — never edit those files directly, since the next `specs transform` overwrites them.

The `react` transformer additionally seeds `src/react/{Component}.tsx` plus `.extensions.css` and `.proposed.css` the first time it runs for a component. Those three files are created once and never touched again, even on subsequent runs — they're yours to implement against. The `stories` transformer imports this authored component, not the regenerated scaffold, so Storybook always reflects what you've built.

## How It Works

### Prerequisites

`specs transform` discovers components by scanning the output directory for subfolders that each contain an `api.yaml`. That exact shape — a per-component subfolder with `api.yaml` and `variants.yaml` inside it — is what `generate` writes by default:

```bash
specs generate
```

A workspace that has turned the split off (`--combine-as-library` or `--combine-concerns`, or the equivalent `spec` settings) will not produce it, and `transform` will find nothing to discover.

If you only see a single `library.yaml`, or `{Component}.yaml` files with no `api.yaml` inside, re-run `generate` with both flags above before transforming.

### Processing

`specs transform` discovers component subfolders under the output directory (each must contain an `api.yaml`), then runs one or more named transformers against every component.

```bash
specs transform [transformers...] [options]
```

Transformer names can be passed as positional arguments, configured in `config/pipeline.yaml`, or left absent to use the CLI default (`contract`).

#### Resolution Order

1. Positional arguments — `specs transform css react`
2. `transformers` in `config/pipeline.yaml`
3. CLI default: `contract`

## Types

| Transformer | Output file | What it produces |
|-------------|-------------|-----------------|
| [`contract`](/cli/transforms/contract/) | `generated/{Component}.contract.ts` | TypeScript Props interface and defaults constant, plus Slots/SlotRules when `variants.yaml` is present |
| [`css`](/cli/transforms/css/) | `generated/{Component}.styles.css` | CSS rules per anatomy element, with token vars, variant selectors, and structural presence/stacking fixes |
| [`react`](/cli/transforms/react/) | `generated/react/{Component}.scaffold.tsx` + seeded `src/react/{Component}.tsx` | A working React component wired to the contract and stylesheet, seeded once into an authored file you own |
| [`stories`](/cli/transforms/stories/) | `generated/react/{Component}.stories.tsx` | A Storybook CSF page with a story per prop-expressible variant, importing the authored component |

`react` and `stories` both require `variants.yaml` — components without it are skipped with a warning.

### Filtering by Component

By default `specs transform` runs against every component subfolder in the output directory. Use `--components` to scope a run to specific components:

```bash
specs transform react stories --components dsAlert dsBadge
```

## Running All Transformers

```bash
specs transform contract css react stories
```

Or configure them in `config/pipeline.yaml` so `specs transform` alone is enough:

```yaml
transformers:
  - name: contract
  - name: css
  - name: react
  - name: stories
```

`react` and `stories` both assume `contract` and `css` have already produced `generated/{Component}.contract.ts` and `generated/{Component}.styles.css` for the component — list them in this order.

## See Also

- [`transform` command](/cli/commands/transform/) — full CLI reference
- [Pipeline](/schema/pipeline/) — configure default transformers in `config/pipeline.yaml`
