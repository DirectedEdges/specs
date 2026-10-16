---
name: specs-cli.guidelines.propose
description: Synthesize or revise a per-system guidelines topic from the analysis reports and caches — guidelines/<area>/<topic>/rules.yaml (modality-keyed rules with a structured meta header) and report.md (brief synthesis notes for the ratifier). Diff-aware against existing guidelines. Args: <area>/<topic>, e.g. foundations/color, components/props.
---
<!--
  Canonical skill emitted by `specs skills install` — overwritten on every
  refresh; do not edit in place. Local customizations belong in your own
  separate skill.
-->

# Propose a guidelines topic

**Prerequisites:** `specs-cli.primer`, `specs-cli.author.primer`. Run `specs analyze` first if `analysis/` is missing or stale.

Per-system rules are the second rules layer. The shipped `rules/*.yaml` beside the author primer argue from the **contract** — the schema and its ADRs, identical in every workspace. Guidelines argue from the **catalog** — this library's own tokens, styles, and usage — so they live in the workspace, under `guidelines/<area>/<topic>/`: `rules.yaml` for agents, `report.md` as brief synthesis notes for the human ratifier.

## rules.yaml format

Every file opens with a structured `meta` header:

```yaml
meta:
  topic: <area>/<topic>
  status: proposed        # the ratifier removes this line (or sets ratified)
  author: <current user>
  updated: <date>
  sources:
    - analysis/<report>.yaml
```

Below `meta`, top-level keys are concept groups. Inside a group, `selection` is a reserved key (an ordered mapping, first match wins); every other key is a rule id whose value is a map of **modality → statement**:

| Modality | Weight |
|---|---|
| `must` / `never` | hard — violating it is a defect |
| `should` / `avoid` | strong convention — deviation needs a stated reason |
| `could` / `warn` | option or caution — judgment applies |

A rule id may pair a positive with its counter-balancing negative — the do/don't form with calibrated weights:

```yaml
naming:
  state-props:
    never: "prefix `is`, `has`, `show`, `can`, or another verb before a state name (`isSelected`)"
    should: "name boolean states bare (`selected`, `disabled`)"
```

Statement style: one line; terms, tokens, and props in backticks; a very brief example in parentheses at the end. **No computed data** — never counts, totals, or percentages; they go stale the day the library changes. Compute numbers to *decide* a rule, then publish only the rule.

## report.md format

Brief. A status line (`**Status: proposed** · author · date · sources`), one paragraph of what the synthesis found as statements, and a **For the ratifier** list naming the judgment calls and ambiguities that need a human decision. No evidence tables, no rationale essays — the rules speak; the report flags what the rules could not decide.

## Evidence sources by topic

| Topic | Read |
|---|---|
| `foundations/color` | `analysis/styling.byToken.yaml`, `data/cache/variables.yaml`, `config/conventions/<platform>.primitives.yaml` |
| `foundations/typography` | `styling.byToken.yaml` textStyles, `data/cache/styles.yaml`, the primitives map |
| `foundations/spacing` | `styling.byToken.yaml` Spacing/Sizing variables, `styling.byComponent.yaml` |
| `components/props` | `analysis/props.yaml` |
| `components/anatomy` | `analysis/roles.yaml`, `analysis/dependencies.byComponent.yaml`, the primitives map |

A topic not in the table follows the same pattern: name the reports that evidence it, read only those.

## Procedure

1. **Read what exists.** If `guidelines/<area>/<topic>/` already has a `rules.yaml`, this run is a revision: existing rules are the baseline, not under re-validation.
2. **Gather** the topic's evidence sources and compute what you need to decide — a rule you cannot support from the data does not go in.
3. **Propose as a diff.** New rules, changed rules (with what changes and why the data moved), and **removals** — rules the current catalog contradicts or no longer evidences. Check only new and changed rules for inconsistency with the existing set; never re-litigate untouched rules.
4. **Write the files.** A first proposal writes `rules.yaml` + `report.md` directly, `status: proposed`. A revision against a *ratified* file never overwrites it — write `rules.proposed.yaml` beside it and say so.
5. **Report** the location and, for a revision, the add/change/remove table; lead with removals and changes, since additions are the easy part.

## Rules

- Statistics are not semantics: usage supports a rule, it does not decide one. A low-evidence judgment is a `could`/`warn`, not a `should` with false confidence.
- Never fabricate vocabulary — every token, style, or prop cited must exist in the cache or report you read.
- A rule true in every workspace because the schema says so belongs in the shipped rules files, not here; a rule true only of this library belongs here, never there.
