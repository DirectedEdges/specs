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
specs analyze props styling
specs analyze props --analysis ./reports
```

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Path to the specs directory (input). Defaults to config `outputDirectory` or cwd. |
| `--analysis <path>` | Where to write analysis output. Defaults to `<specs-dir>/_analysis/`. |
| `--config <path>` | Path to `specs.config.yaml`. |
| `--verbose` | Log each component as it is processed. |

## Available Analyzers

| Analyzer | Output | What it produces |
|----------|--------|-----------------|
| [`props`](/specs/cli/analyze/props/) | `_analysis/props.yaml` | Cross-library prop inventory — frequency, enum discordance, API surface, slots |
| [`styling`](/specs/cli/analyze/styling/) | `_analysis/styling.byComponent.json`, `_analysis/styling.byToken.json`, `_analysis/styling.unused.json` | Token usage indexed by component and by token name, plus tokens no spec references |

## Output Directory

```
specs/
  _analysis/
    props.yaml                    # from specs analyze props
    styling.byComponent.json      # from specs analyze styling
    styling.byToken.json          # from specs analyze styling
    styling.unused.json           # from specs analyze styling
  ds-button/
    api.yaml
    contract.ts
    styles.css
```

## See Also

- [`analyze` command](/specs/cli/commands/analyze/) — full CLI reference
- [Transforms overview](/specs/cli/transforms/) — build artifacts (contract, css)
