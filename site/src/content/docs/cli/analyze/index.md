---
title: "Analyze"
description: "Run analysis passes over component specs and write aggregate reports to _analysis/"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Analyzers read component specs and produce aggregate snapshots for governance, auditing, and LLM-assisted analysis. Unlike transforms — which produce build artifacts your codebase consumes — analyzers produce one-time snapshots you read, diff, or hand to a language model.

Output lands in `_analysis/` alongside your component subfolders, or in a custom path via `--analysis`.

## Invocation

```bash
specs analyze [analyzers...] [options]
```

Analyzer names are passed as positional arguments. There is no config key — analyzers are run on demand.

```bash
specs analyze props
specs analyze styling
specs analyze dependencies
specs analyze keys
specs analyze props styling dependencies
specs analyze props --analysis ./reports
```

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Path to the specs directory (input). Defaults to `spec.directory` from `config/settings.yaml` or cwd. |
| `--analysis <path>` | Where to write analysis output. Defaults to `<specs-dir>/_analysis/`. |
| `--config <path>` | Path to the `config/` directory (or a legacy `specs.config.yaml` file). |
| `--verbose` | Log each component as it is processed. |

## Available Analyzers

| Analyzer | Output | What it produces |
|----------|--------|-----------------|
| [`props`](/cli/analyze/props/) | `_analysis/props.yaml` | Cross-library prop inventory — frequency, enum discordance, API surface, slots |
| [`styling`](/cli/analyze/styling/) | `_analysis/styling.byComponent.json`, `_analysis/styling.byToken.json`, `_analysis/styling.unused.json` | Token usage indexed by component and by token name, plus tokens no spec references |
| [`dependencies`](/cli/analyze/dependencies/) | `_analysis/dependencies.graph.json`, `_analysis/dependencies.byComponent.json` | Component dependency graph — blast radius of a change, and which props consumers configure |
| [`keys`](/cli/analyze/keys/) | `_analysis/keys.yaml` | Figma names a formatted key cannot reconstruct, as a per-component checklist. Requires `figma.naming` |

## Output Directory

```
specs/
  _analysis/
    props.yaml                    # from specs analyze props
    styling.byComponent.json      # from specs analyze styling
    styling.byToken.json          # from specs analyze styling
    styling.unused.json           # from specs analyze styling
    dependencies.graph.json       # from specs analyze dependencies
    dependencies.byComponent.json # from specs analyze dependencies
    keys.yaml                     # from specs analyze keys
  ds-button/
    api.yaml
    contract.ts
    styles.css
```

## See Also

- [`transform` command](/cli/commands/transform/) — the sibling command that emits code artifacts
- [Transforms overview](/cli/transforms/) — build artifacts (contract, css)
