---
title: "component-md"
description: "Emit a deterministic single-file markdown reference for each component"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits `component.md` — a single-file markdown reference for each component, projected deterministically from `api.yaml` and `variants.yaml`. Every value is verbatim from the spec: no inference, no LLM calls, byte-identical output for identical input.

## Use When

- You want a readable component reference for humans and coding agents without loading the full spec YAML.
- You want an agent-retrieval doc — props, anatomy, layout, tokens, states, and variant behavior in one file that fits a single tool call.
- You want documentation that regenerates in seconds when the design changes, instead of being re-derived by hand or by agent interpretation.

## Invocation

```bash
specs transform component-md
```

## Output

Each component subfolder receives a `component.md`. When subcomponents are present, each also receives a `component.md` inside its own named subfolder, linked from the parent's **Subcomponents** section.

## Sections

| Section | Source | Contents |
|---------|--------|----------|
| Overview | `api.yaml` + `variants.yaml` | Counts, variant-axes one-liner with values and defaults (axes with no recorded style impact are flagged), and a contents manifest — delta count, layout trees, invalid combinations, configuration-space size |
| Props | `api.yaml` | Full prop table — type, default, enum values, nullability, slot constraints (`min`/`max`/`anyOf`), code-only markers, example values, binding notes, contract omissions |
| Bindings | `api.yaml` + `variants.yaml` | Element properties bound to props (`visible`, `content`, `instanceOf`, `children`), including conditional and variant-scoped bindings with a When column |
| States | `config.processing.states` | Semantic state classification — prop, activating value, web selector(s), contract inclusion; unmapped enum values surface as `unclassified` |
| Anatomy | `api.yaml` + `variants.yaml` | Element table with types, instance references, and a Presence column (default / all variants / specific configurations) |
| Layout | `variants.yaml` | Default layout tree plus variant layout changes, deduplicated by identical shape, each with a `+ added − removed` diff against the default |
| Element styles (default) | `variants.yaml` | Per-element default style tables including `content`, with verbatim token paths |
| Typography | `variants.yaml` | Text style properties per element with variant overrides |
| Color | `variants.yaml` | Element × property color map — default token plus every variant override |
| Variant deltas | `variants.yaml` | Numbered per-configuration changes — styles, `content`, `instanceOf` swaps, prop configurations — with layout diffs and cross-references to hoisted Color rows |
| Invalid combinations | `variants.yaml` | Minimal invalid patterns — spec entries are exact-cover minimized so cross-product expansions collapse to their rule |
| Subcomponents | `api.yaml` | Summary table linking each subcomponent's own `component.md` |
| Examples | `examples.yaml` | Instance examples with their non-default prop configurations; slot-content example names |
| Provenance | `api.yaml` metadata | Author, timestamp, generator, schema version, source node |

Sections without data are omitted.

## Resolution Rule

The header states the delta composition contract: start from Element styles (default), then apply every variant delta whose configuration matches, in the order listed — later values win per property. `unset` removes a default value.

## Token References

Token references render verbatim — `` `DS Color/Action/Hover` (color) `` — never renamed or converted. When the spec carries resolved raw values (`TOKEN_FIGMA_EXTENSIONS` format), they are appended: `` `Color/Outline` (color, #818494) ``, `` `Constants/Spacing/1x` (dimension, 4) ``. For per-variant styling detail and anything not carried in the markdown, the spec YAML remains canonical.

## States Classification

When [`processing.states`](/specs/config/states/) is configured, the **States** section documents which variant props are browser-driven (omitted from the generated contract) versus consumer-controlled (bridged to HTML/ARIA attributes), with the canonical web selector for each. Concepts whose activating value cannot match the prop's enum values are excluded.

## See Also

- [`contract` transformer](/specs/cli/transforms/contract/) — TypeScript Props interface affected by the same states classification
- [`css` transformer](/specs/cli/transforms/css/) — stylesheet output using the same selector strategy
- [`states` config](/specs/config/states/) — the classification that drives the States section
