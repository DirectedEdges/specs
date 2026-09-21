---
title: "Version History"
description: "The ledger: where version history is stored, how snapshots work, and how to compare, replay, and restore old versions."
---

Version history lives in your workspace's `versions/` folder, next to `specs/`. It has two layers: a **folder per version** holding that version's specs and release outputs in full, and **ledgers** — append-only, machine-managed files recording every change and grade. History travels with the workspace and lands in the same git repository, so it needs no external service and survives moves between machines.

## Layout

```
workspace/
├── specs/                      # live generated specs
├── assets/
└── versions/
    ├── latest/                 # copy of the most recent version
    │   ├── report.md
    │   ├── changelog.md
    │   ├── specs/
    │   └── assets/             # icons + images — kept only in latest/
    ├── 0.1.0/
    │   ├── report.md           # the release report for this version
    │   ├── changelog.md        # the itemized changelog for this version
    │   └── specs/              # the specs exactly as versioned
    ├── 0.2.0/
    ├── diffs/                  # dated pre-merge runs — see Reports & Changelogs
    ├── ledgers/
    │   ├── library.ledger.json # library versions, per-release component roll-up
    │   └── dsButton.ledger.json# one per component, named by spec folder
    └── renames.yaml            # identity events — see Renames & Identity
```

Each version folder is named by the library version and holds the full spec tree at that version plus the [report and changelog](/versioning/reports/) generated when it shipped. `latest/` is always a copy of the newest version folder — a stable path for tooling — and additionally carries `assets/` (icons, images), which are kept only there because storing binaries per version costs too much for what it buys.

Two file formats, matched to who touches each:

| File | Format | Touched by |
|------|--------|-----------|
| `ledgers/*.ledger.json` | JSON | Machine only — never hand-edited |
| `renames.yaml` | YAML | Humans — every entry is a confirmed [identity event](/versioning/identity/) |

## What a ledger entry records

Every cut appends one entry per changed component:

| Field | What it holds |
|-------|---------------|
| `version` / `libraryVersion` | The component's new version, and the library version it shipped under |
| `timestamp`, `author` | When and who |
| `git` | Commit, branch, and tag when the version was cut |
| `run` | Generator and schema versions, captured from [`latest.metadata.yaml`](/guides/run-metadata/) |
| `diff` | The graded changes since the component's previous version |
| `changeType`, `reason` | The grade (`major`/`minor`/`patch`) and the generated reason line |
| `override` | Present only when a `--force-*` flag was used, with the stated reason |

The live specs themselves are never touched — no version field is written into `specs/`, so regenerating from the same input always produces identical output.

## Folders store versions; ledgers store changes

The two layers answer different questions. Each **version folder** holds the specs in full, so recovering any version is a direct read — no reconstruction. The **ledgers** record what changed between versions and how each change was graded, which is what history queries, reports, and changelogs are built from.

Versioning is **library-level**: version folders are named by library version, one per release, and components inside carry their own version numbers only in the ledgers. (Per-component version folders, like `versions/dsButton/`, would be a different layout — deliberately not part of the current design.)

## Asking questions of history

Three question shapes, three commands:

| Question | Shape | Command |
|----------|-------|---------|
| "What's different between 1.0.0 and 2.0.0?" | **Jump** — compare two points directly | `specs version diff dsButton --from 1.0.0 --to 2.0.0` |
| "How did we get from 1.0.0 to 2.0.0?" | **Layer** — walk the versions in between | `specs version history dsButton 1.0.0..2.0.0` |
| "What did dsButton look like at 1.5.0?" | **Restore** — read the spec back at that version | `specs version restore dsButton 1.5.0` |

`restore` resolves a component version to the release that shipped it and reads the spec from that version folder, writing it to output — it never overwrites the live spec in place.

## Git tags

Releases are marked with **library-level annotated tags** (`v2.4.0`); the tag message carries the per-component change roll-up, so `git show v2.4.0` summarizes the release without any other tooling. Components are not tagged individually — their history is in the ledgers.

- Ledger entries record the commit, branch, and tag at cut time, so every version is traceable to exact repository state.
- Tags are created by `specs version tag` — at cut time or any time after, from the ledger's recorded data — and **pushed manually**; the tool never pushes for you.
- A deleted or force-moved tag is a process error, not a versioning feature; the ledger's recorded commit lets you recreate a lost tag.

## See Also

- [Change Classification](/versioning/change-classification/) — how each entry's grade was decided
- [Renames & Identity](/versioning/identity/) — how history survives renames
- [Reports & Changelogs](/versioning/reports/) — reading accumulated history as a release report
