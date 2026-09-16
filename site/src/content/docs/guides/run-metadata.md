---
title: "Run Metadata"
description: "A catalogue run states its author, generator, schema and settings once, in latest.metadata.yaml"
---

Every spec carries a `metadata` block. Exactly one key in it describes the component: `source`, the Figma node the spec was captured from. The other six describe the **run** that produced the spec — who generated it, when, with which tool, against which schema version, under which conventions and settings.

Those six are the same on every component a single run produces. When you generate a whole library from a manifest, a run states them once in `latest.metadata.yaml`, and each spec keeps `source` alone.

## The Problem

A run's facts do not vary by component, but the spec had nowhere else to put them, so every file repeated the lot:

```yaml
# button/api.yaml — before
title: Button
anatomy: { ... }
props: { ... }
metadata:
  author: Design Systems Team
  lastUpdated: "2026-09-16T01:55:47.197Z"
  generator: { name: "@directededges/specs-cli", version: 0.30.0, url: ... }
  schema: { url: ..., version: 0.33.0, latest: ... }
  source: { pageId: "12622:6", nodeId: "21757:2758", nodeType: COMPONENT_SET }
  conventions: { ... }   # the full platform conventions entry
  settings: { ... }      # the full resolved settings tree
```

`conventions` and `settings` are the bulk of it. The repetition multiplies three ways:

- Once per component
- Again per concern file, since the default layout writes `api`, `variants` and `examples` separately — [`--combine-concerns`](/cli/commands/generate/#--combine-concerns) turns that off
- Again for every subcomponent nested inside each of those

A library of 60 components split across three files each carries 180 copies of two objects that never differ.

## What You Get Instead

A manifest run writes one `latest.metadata.yaml` at the root of the output directory:

```yaml
# specs/latest.metadata.yaml
author: Design Systems Team
lastUpdated: "2026-09-16T01:55:47.197Z"
generator:
  name: "@directededges/specs-cli"
  version: 0.30.0
  url: https://www.npmjs.com/package/@directededges/specs-cli
  license: { status: active, level: PARTNER }
schema:
  url: https://raw.githubusercontent.com/.../specs-schema@0.33.0/.../component.schema.json
  version: 0.33.0
conventions:
  platforms:
    figma: { naming: SENTENCE, ... }
settings:
  spec: { ... }
```

And each spec keeps only what is its own:

```yaml
# specs/button/api.yaml — after
title: Button
anatomy: { ... }
props: { ... }
metadata:
  source:
    pageId: "12622:6"
    nodeId: "21757:2758"
    nodeType: COMPONENT_SET
```

The output directory looks like this:

```
specs/
├── latest.metadata.yaml
├── button/
│   ├── api.yaml
│   ├── variants.yaml
│   └── examples.yaml
└── card/
    ├── api.yaml
    └── variants.yaml
```

On two real components, a small `api.yaml` roughly halves — 3,274 bytes to 1,643, and 2,584 to 953. Six files gave back 9,786 bytes of repeated metadata in exchange for one 1,513-byte document.

The file is named for the format the run wrote its specs in, so a JSON run produces `latest.metadata.json`.

## When It Applies

| Mode | Behavior |
|------|----------|
| [Manifest](/cli/commands/generate/#manifest-mode) | Writes `latest.metadata.yaml`; specs carry `metadata.source` |
| [Single component](/cli/commands/generate/#single-component-mode) | Unchanged — full `metadata` block in the spec |
| [Bridge](/cli/commands/generate/#bridge-mode) | Unchanged — full `metadata` block in the spec |

A single-component run produces one document. There is nothing to factor out of, and a second file would split what already reads in one place.

There is no flag. A manifest run reduces; the other modes do not.

### When a run keeps the full blocks

If the specs in a run disagree about the run's facts — different generator versions, different settings — no `latest.metadata.yaml` is written and every spec keeps its own block. Specs that disagree did not come from one run, so no single document can speak for them. You will see:

```
Note: specs record no shared run metadata, or disagree on it — each keeps its own metadata block
```

This happens when an output directory mixes results from separate runs. Regenerating the whole catalogue in one pass resolves it.

## Rendering a Reduced Spec

[`render`](/cli/commands/render/) reverses the record a spec was generated under — it needs the conventions and settings to reverse key formatting, find code-only props, and resolve image source props.

A reduced spec did not lose that record; it moved next door. `render` reads `latest.metadata.yaml` back automatically, looking in the spec's own directory and then one level up, so a component folder finds the document at the root of the output directory beside it:

```bash
specs render specs/button/        # finds specs/latest.metadata.yaml
```

You do not need to pass anything. Two things to know:

- **A spec that carries its own record keeps it.** The document's own metadata is the more specific statement and wins over the run document.
- **Keep the document with the specs.** Copying a reduced spec somewhere else without `latest.metadata.yaml` leaves `render` falling back to your current workspace config — which answers what the workspace is set to now, not what produced the spec.

## Validating the Document

`latest.metadata.yaml` is a schema type in its own right, `RunMetadata` — see [Metadata](/schema/metadata/). It validates against `metadata.schema.json`, published as `@directededges/specs-schema/schema/metadata` and reachable from the package's root schema alongside a component and a component set.

A reduced spec still validates against the component schema: `source` is the only required key in a `metadata` block.

## Further Reading

- [Metadata](/schema/metadata/) — the full property reference for both `Metadata` and `RunMetadata`
- [generate](/cli/commands/generate/) — manifest mode and the output layout flags
- [render](/cli/commands/render/) — reversing a spec back onto the Figma canvas
