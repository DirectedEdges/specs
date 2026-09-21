---
title: "Versioning Overview"
description: "Track how your component specs change over time, with automatic version numbers, change history, and reports."
---

Every time you regenerate specs, something may have changed — a prop added, a color rebound, an element removed. Versioning answers the questions that follow: **what changed, how much does it matter, and who needs to know?** It gives each component and the library a version number that moves automatically when specs change, keeps a permanent history of every change, and produces reports and changelogs you can hand to anyone consuming your design system.

## When to use it

Versioning earns its place the moment anything downstream depends on your specs — generated code, documentation, another team's build. Three moments in particular:

| Moment | Question | Versioning command(s) |
|--------|----------|-----------------------|
| Before merging a Figma branch | "What impact does merging this feature have?" | `figmapremerge` — a [pre-merge report](/versioning/reports/) from just the branch URL |
| Before shipping a release | "What does this release change, at a glance?" | `report` — a [pre-release report](/versioning/reports/) covering everything since the last release |
| Shipping a release | "How do I record this as the next version?" | `cut` — grades every change, decides the version, and stores the release in full; `tag` marks it in git |
| After shipping | "What exactly changed, and how do I migrate?" | `report` — the final release report paired with an itemized [changelog](/versioning/reports/) carrying rename migrations, both also stored in the version's folder |
| Anytime after | "What changed between two versions — and what did this look like back then?" | `diff`, `history`, `restore` — queries over the recorded [history](/versioning/history/) |

If you generate specs for yourself and nothing consumes them yet, you can adopt versioning later — it starts from whatever state your specs are in.

## How version numbers work

Versions use **semantic versioning** ("semver"): three numbers, `MAJOR.MINOR.PATCH`, like `2.4.0`. Each number answers a different question for the people using your components:

| Number | Moves when | What it tells consumers |
|--------|-----------|------------------------|
| **MAJOR** (2.x.x) | Something was removed or changed in a breaking way | "Your code may break — read the changelog before upgrading" |
| **MINOR** (x.4.x) | Something new was added | "There's new capability; existing code is unaffected" |
| **PATCH** (x.x.0) | Details changed, contract intact | "Safe to take — styling, examples, or annotations changed" |

The core idea: a component spec has two kinds of content. Its **API** — the props, anatomy, and subcomponents that code is written against — and its **presentation** — the styling and layout of its variants. Changes to the API can be breaking (MAJOR) or additive (MINOR). Changes confined to variants are always PATCH, no matter how dramatic they look. [Change Classification](/versioning/change-classification/) covers the full rules.

Each component carries its own version, and the **library version** rolls them up — it moves by the most severe change in the release. The library version is what gets tagged in git and what a release ships under.

## Where things live

Versioning adds one folder to your workspace, next to your generated specs. Each released version gets its own subfolder holding that version's specs, report, and changelog, and `latest/` always mirrors the most recent one:

```
workspace/
├── specs/                      # your live generated specs (unchanged — no version fields added)
├── assets/
└── versions/
    ├── latest/                 # copy of the most recent version…
    │   ├── report.md
    │   ├── changelog.md
    │   ├── specs/
    │   └── assets/             # …plus icons and images (kept only here, not per version)
    ├── 0.1.0/
    │   ├── report.md
    │   ├── changelog.md
    │   └── specs/
    ├── 0.2.0/
    ├── diffs/                  # pre-merge comparison runs, one dated folder per run
    ├── ledgers/                # machine-managed history, one file per component
    └── renames.yaml            # renames you've recorded, so history survives them
```

The `versions/` folder travels with your workspace and lands in the same git repository. Your live specs are never modified: no version field is written into them, so generation stays deterministic. See [Version History](/versioning/history/).

## How it works

```
specs generate            produce specs as usual
       ↓
specs version cut         compare against the last recorded version
       ↓
   diff → classify        every change graded MAJOR / MINOR / PATCH by rule
       ↓
   ledger + git tag       history recorded; release tagged
       ↓
   reports & changelog    generated from the same change data
```

The comparison is structural, not textual — the tool understands specs, so it reports "prop `size` removed from `dsButton`" rather than a wall of changed lines. Every report and changelog is fully generated from that change data: nothing is hand-written, so the outputs can never disagree with each other.

## What it costs

Nothing — versioning, reports, and changelogs are all part of the **free tier**.

## Learn more

- [Change Classification](/versioning/change-classification/) — the rules that grade each change
- [Version History](/versioning/history/) — the ledger, snapshots, and restoring old versions
- [Renames & Identity](/versioning/identity/) — keeping history intact when things get renamed
- [Reports & Changelogs](/versioning/reports/) — the pre-merge report, pre-release report, and changelog
