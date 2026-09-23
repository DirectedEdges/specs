---
title: "Figma Premerge Check"
description: "Grade the impact of a Figma branch before it is merged, from nothing but the branch URL."
---

A Figma branch is merged by a designer, in Figma, and the people it affects are not in the room. The premerge check closes that gap: it takes the branch's URL and produces a graded report of what merging it would do to every spec in the library.

```bash
specs version figmapremerge "https://www.figma.com/design/<mainKey>/branch/<branchKey>/..."
```

Keep the quotes. A copied Figma URL carries `&` characters, and an unquoted shell command splits on them into separate background jobs.

## What it does

The URL is the only input. Everything else is derived.

| Step | What happens |
|---|---|
| 1. Derive | The branch URL names both files — the branch key and the main file it branched from. Nothing to look up, nothing to configure |
| 2. Fetch | Both files download in parallel, using `FIGMA_TOKEN` from the environment or `.env` |
| 3. Generate | Specs are generated from each side, in parallel, with the workspace's own `config/` — so both sides are read by the conventions the library actually uses |
| 4. Diff | The two spec trees are compared directly, component by component |
| 5. Grade | Every difference is classified by the [same rules](/versioning/change-classification/) that `specs version cut` applies |
| 6. Report | The graded result is written into the run folder |

## No history required

This is the one versioning command that needs nothing recorded. It compares two live files rather than a version against a ledger, so it works on day one — before a first version is cut, before `versions/` exists, on a library that has never been versioned at all.

That makes it the usual way in. A team can run premerge checks on every branch for months, see what the grading says about their own changes, and adopt the rest of versioning when they are ready.

## The run folder

Each run lands in its own dated folder under `versions/diffs/`:

```
versions/diffs/
└── 2026-09-23-add-compact-density/
    ├── report.md
    ├── diff.json
    └── branch/specs/        ← only the components that changed
```

The folder is named `<YYYY-MM-DD>-<branch name>`, with a number appended for repeat runs on the same day (` 2`, ` 3`). A run is never overwritten, because an earlier one may already have been shared.

| | Kept by default | With `--keep-data` |
|---|---|---|
| `report.md` | ✓ | ✓ |
| `diff.json` — the change data the report was rendered from | ✓ | ✓ |
| Changed components' specs | ✓ | ✓ |
| Full `main/` and `branch/` spec trees | — | ✓ |
| Fetched Figma payloads | — | ✓ |

The default keeps what someone would want to read or re-render, and discards what can be fetched again.

When past runs already sit in `versions/diffs/`, the command asks before starting — keep them or remove them, with the count and total size shown. Keeping is the default, and the only answer a non-interactive run is given. There is no flag for it.

## While it runs

Progress is phase-level, not per-file: a loading state while both fetches resolve to a single ✓, the same for both generates, then the report. Two files' worth of per-component chatter would say nothing about whether the run is healthy.

The report is written to the folder rather than printed. It is long, it is a document someone else will read, and a terminal is the wrong place to meet it for the first time.

## What the report says

The header carries the date, the two sides as `target ← source`, and `settings.author` from the workspace config. Below that, the same structure every report uses — impact table, graded sections, renames, and how the run was produced. [Reports & Changelogs](/versioning/reports/) covers the format in full.

Because the grading rules are shared with `specs version cut`, the report read before merging and the version cut afterwards cannot disagree.

## Flags

| Flag | Description |
|---|---|
| `--workspace <dir>` | Workspace directory. Needs `config/`, since the command fetches and generates |
| `--keep-data` | Keep the full spec trees and fetched payloads in the run folder |
| `--rules <path>` | A custom grading rule set |

## See Also

- [Reports & Changelogs](/versioning/reports/) — the report format, and the release outputs
- [Change Classification](/versioning/change-classification/) — the rules behind every grade
- [`version`](/cli/commands/version/) — every subcommand in one place
- [`skills`](/cli/commands/skills/) — install the premerge orchestration skill
