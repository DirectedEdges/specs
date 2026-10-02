---
title: "Analysis"
description: "Where the analysis reports will render. A placeholder today."
---

:::note[Placeholder]
The section exists in your Storybook today with a single page saying what will
live there. The real pages land once the reports convention is settled.
:::

`specs analyze` already writes durable report files — props across the
catalogue, styling, naming, dependencies. Those files stay the source of truth:
diffable, readable in CI, greppable without a browser.

This section is where they will **render**: one generated page per analysis,
reading the report file live, so the results surface in the tool you are
already looking at instead of in terminal output. Regenerating a report
refreshes its page; the page never computes anything of its own.
