---
title: "Analysis"
description: "One page per analysis in your workspace, with the data viewable today and dashboards to come."
---

The section appears when your workspace has analyses — run any `specs analyze`
command and its output lands in `specs/_analysis/`; the next `specs storybook`
adds an **Analysis** section with one page per analysis found there. No
analyses, no section.

Each page has two tabs:

| Tab | Shows |
|---|---|
| **Specs** | The analysis's own YAML, one sub-tab per file (`byComponent`, `graph`, …), readable in place — the landing tab for now |
| **Report** | The dashboard summarizing the analysis — *not built yet*; each report is its own piece of work, and becomes the landing tab when it lands |

The files stay the durable record: diffable, readable in CI, greppable without
a browser. The page never computes anything — re-running the analysis and
re-publishing refreshes what it shows.
