---
name: specs-cli.guidelines.propose
description: Synthesize a per-system guidelines topic from the analysis reports and caches — propose guidelines/<area>/<topic>/rules.yaml (machine-facing, evidence-cited) and report.md (human-facing synthesis) for the workspace's own design system. Args: <area>/<topic>, e.g. foundations/color, components/props.
---
<!--
  Canonical skill emitted by `specs skills install` — overwritten on every
  refresh; do not edit in place. Local customizations belong in your own
  separate skill.
-->

# Propose a guidelines topic

**Prerequisites:** `specs-cli.primer`, `specs-cli.author.primer`. Run `specs analyze` first if `analysis/` is missing or stale.

Per-system rules are the second rules layer. The shipped `rules/*.yaml` beside the author primer argue from the **contract** — the schema and its ADRs, identical in every workspace. Guidelines argue from the **catalog** — this library's own tokens, styles, and usage — so they live in the workspace, under `guidelines/<area>/<topic>/`:

| File | Audience | Is |
|---|---|---|
| `rules.yaml` | agents | The ruleset, in the same node grammar as the shipped rules files (`selection` / `when` / `rules`), with `evidence:` where the shipped layer has `adr:` |
| `report.md` | humans | The synthesis behind it — evidence tables, counts, observed conventions, gaps and anomalies |

Both start **proposed**. The design system owner ratifies by removing the `status: proposed` marker; until then an authoring agent may follow the rules but must treat conflicts with ratified material as decided against the proposal.

## Evidence sources by topic

| Topic | Read |
|---|---|
| `foundations/color` | `analysis/styling.byToken.yaml` (usage by property and element), `data/cache/variables.yaml` (the full vocabulary), `config/conventions/<platform>.primitives.yaml` (color enums promoted components expose) |
| `foundations/typography` | `styling.byToken.yaml` textStyles, `data/cache/styles.yaml`, the primitives map's typography promotions |
| `foundations/spacing` | `styling.byToken.yaml` Spacing/Sizing variables, `styling.byComponent.yaml` |
| `components/props` | `analysis/props.yaml` (vocabulary, frequency, type conflicts, boolean naming patterns, slots) |
| `components/anatomy` | `analysis/roles.yaml`, `analysis/dependencies.byComponent.yaml`, the primitives map |

A topic not in the table follows the same pattern: name the reports that evidence it, read only those.

## Procedure

1. **Gather** the topic's evidence sources. Compute the numbers you will cite — usage counts, co-occurrence (e.g. which background tokens appear with which content tokens), vocabulary not used at all. Never cite a number you did not compute.
2. **Synthesize `report.md`.** Lead with a one-paragraph summary, then evidence tables, then observed conventions as statements, then gaps/anomalies (tokens with no apparent role, naming inconsistencies, vocabulary the catalog never uses). Mark the header `Status: proposed`.
3. **Distill `rules.yaml`.** Only judgments an authoring agent acts on: role→token selections, pairing rules, prohibitions, scale semantics. Every rule carries `evidence:` (the computed fact that supports it, with counts). A rule you cannot evidence does not go in.
4. **Keep the layers apart.** A rule that is true in every workspace because the schema says so belongs in the shipped rules files, not here; a rule true only of this library belongs here, never there.
5. **Report** the proposal's location and the judgment calls a ratifier should look at first.

## Rules

- Statistics are not semantics: co-occurrence supports a rule, it does not decide one. Flag low-evidence rules explicitly rather than stating them with false confidence.
- Never fabricate vocabulary — every token, style, or prop name cited must exist in the cache or report you read.
- Proposals never overwrite a ratified `rules.yaml`; write `rules.proposed.yaml` beside it instead and say so.
