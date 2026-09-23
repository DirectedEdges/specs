---
title: "Reports & Changelogs"
description: "The pre-merge report, pre-release report, and itemized changelog — all generated from change data, never hand-written."
---

Versioning produces three human-readable outputs. All of them are **fully generated** from change data: no hand-drafting, no AI polish, no prose that can drift from the facts. A report states what changed — values included — and never what anyone should do about it.

## Two reports, one changelog

| Output | Compares | Question it answers |
|--------|----------|---------------------|
| **Pre-merge report** — [`figmapremerge`](/versioning/figma-premerge/) | A Figma branch against main, right now | "What impact does merging this feature have?" |
| **Pre-release report** — `specs version report` | This release against the last one, over time | "What does this release change, at a glance?" |
| **Release changelog** — same command | Same as pre-release | "Every change, itemized, with migrations" |

What differs between them is only the input. The pre-merge report diffs two live Figma files and needs no history at all — see [Figma premerge check](/versioning/figma-premerge/) for how it derives both sides from one URL and where it writes. The pre-release report and changelog read accumulated [ledger](/versioning/history/) entries instead.

Everything downstream of that input — the diff engine, the [grading rules](/versioning/change-classification/), the renderer — is identical, so a change is described the same way wherever it appears.

The pre-release report and the changelog are two renderings of **one change dataset**: the report is the glance layer, the changelog is the itemized layer. Generated from the same data, they cannot disagree.

## Anatomy of a report

Reports follow one format:

1. **Header** — the date, then what is being compared: `target ← source`.
2. **Impact table first** — a totals row, then one row per component; counts only, `·` for zero; sorted most-severe-first. No prose summary — the table *is* the summary.
3. **Graded sections** — Breaking, Minor, Patch, Examples — one factual sentence per change, carrying **values, not just paths**. A line that says "cornerRadius changed" and makes you open the YAML has not reported anything: tokens print by name, raw values as themselves, composites like padding unpacked into their parts. A finding with many values nests them as sub-bullets, capped with "…and N more".
4. **Conditional sections** — *Reordered* (position shifts among items present on both sides) and *Needs review* (changes no rule covers, surfaced for a human read rather than silently graded).
5. **Renames** — reported with provenance: recorded in [`renames.yaml`](/versioning/identity/), or inferred with a stated confidence.
6. **How this was produced** — closes every report: sources and dates, rules applied, exclusions, and paths to the underlying change data, enough to regenerate or audit the run.

## The changelog

Per release, per component, from ledger diffs:

```markdown
## 2.4.0

### dsButton (1.5.0 → 1.6.0)

#### Added
- `props.startIconVisible` — boolean, default false

### dsAlert (2.0.0 → 3.0.0) — BREAKING

#### Breaking
- `props.size` → `props.scale` — renamed; update call sites

#### Migration
- `props.size` → `props.scale`
```

Rename entries come from the rename ledger, so a recorded rename produces one migration line rather than a removal and an addition.

## One rule set, three consumers

The grading rules ship as data inside the CLI, and three things read them: `specs version cut`, the pre-merge report, and the pre-release report. A given change is graded identically by all three — the report you read before merging and the version you cut after are guaranteed to agree.

## See Also

- [Figma premerge check](/versioning/figma-premerge/) — the pre-merge report end to end
- [Change Classification](/versioning/change-classification/) — the rules behind every grade
- [Version History](/versioning/history/) — the ledger the release outputs read from
- [Versioning Overview](/versioning/) — where reports fit in the workflow
