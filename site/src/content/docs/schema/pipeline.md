---
title: "Pipeline"
description: "Work a workspace runs over its specs"
---

Declares the transformers and analyses a workspace runs. Authored in `config/pipeline.yaml`.

Separate from [Settings](/schema/settings/) because these name *work* rather than how work behaves, and separate from [Conventions](/schema/conventions/) because running a different set produces different output rather than incorrect output.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `transformers` | `TransformEntry[]` | `[]` | Transformers to run via `specs transform` |
| `analyses` | `AnalysisEntry[]` | `[]` | Analyses to run via `specs analyze` |

## `TransformEntry` / `AnalysisEntry`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | *(required)* | Transformer or analysis name (e.g. `react`, `css`, `dependencies`) |
| *(other)* | `unknown` | — | Entry-specific options sit inline alongside `name` |

Entries carry no output paths. Transformers write into the spec structure — `contract`, `css`, and `react` output land beside each other under a component's generated folder — and analyses write beside the specs they analyze. Where an assembled library and its storybook live is owned by the package that produces them, not by this schema.

```yaml
transformers:
  - name: react
  - name: css
  - name: contract
analyses:
  - name: dependencies
```
