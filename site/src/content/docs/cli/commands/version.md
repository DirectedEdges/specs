---
title: "version"
description: "Spec workspace versioning: diffs, semver cuts, ledgers, reports, and changelogs."
---
Version the spec workspace — compare versions, classify changes as MAJOR/MINOR/PATCH, record history, and generate reports and changelogs. Concepts are covered in the [Versioning](/versioning/) section; this page is the command reference.

## Usage

```bash
specs version <subcommand> [options]
```

| Subcommand | Purpose |
|------------|---------|
| [`diff`](#specs-version-diff) | What changed for a component between two versions |
| [`history`](#specs-version-history) | Every ledgered version of a component |
| [`cut`](#specs-version-cut) | Classify workspace changes, write the new version |
| [`tag`](#specs-version-tag) | Create the git tag for a cut version |
| [`restore`](#specs-version-restore) | Read a component's spec back at an older version |
| [`figmapremerge`](#specs-version-figmapremerge) | Pre-merge report for a Figma branch, from its URL |
| [`report`](#specs-version-report) | Pre-release report + itemized changelog |

Shared conventions:

- **`--workspace <dir>`** — the workspace containing `specs/` and `versions/`; defaults to the current directory.
- **`--rules <path>`** — override the built-in [severity rules](/versioning/change-classification/) with an external YAML file (on every subcommand that classifies).
- Component arguments accept the spec folder name or the component title; versions accept `1.2.0` or `v1.2.0`.
- Versioning is free tier — no license key required.

## `specs version diff`

Jump comparison: what changed for one component between two versions.

```bash
specs version diff dsButton --from 0.1.0              # against the current working spec
specs version diff dsButton --from 0.1.0 --to 1.0.0   # between two ledgered versions
```

| Flag | Description |
|------|-------------|
| `--from <version>` | Base component version, from the ledger (required) |
| `--to <version>` | Target version; defaults to `current` — the live working spec |
| `--workspace <dir>`, `--rules <path>` | As above |

Output is the classified change list: every change with its path, old and new values, and grade.

## `specs version history`

Layered listing: every ledgered version of a component, with grades, reasons, and any recorded overrides.

```bash
specs version history dsButton
specs version history dsButton 0.1.0..1.0.0    # inclusive range
```

## `specs version cut`

Cuts the next version: compares the workspace against its last recorded version, grades every change, appends ledger entries, and writes the new version folder — `versions/<libraryVersion>/` with the full `specs/` tree plus that version's `report.md` and `changelog.md`, then refreshes `versions/latest/` (which also carries `assets/`). See [Version History](/versioning/history/) for the layout.

```bash
specs version cut
specs version cut --force-minor "visual break: brand background sweep"
```

| Flag | Description |
|------|-------------|
| `--force-major <reason>` / `--force-minor <reason>` / `--force-patch <reason>` | Override the computed class; mutually exclusive, reason required and recorded in the ledger |
| `--workspace <dir>`, `--rules <path>` | As above |

Behavior worth knowing:

- The **first cut** on an unversioned workspace initializes every component and the library at 0.1.0 as a baseline.
- An **untracked likely rename** (title changed, Figma node matches an existing ledger) stops the cut with nothing written — record the rename in [`renames.yaml`](/versioning/identity/) and re-run.
- An **asset removed while specs still reference it** also stops the cut — a broken reference is a defect, not a version. A `--force-*` flag proceeds anyway, downgrading these stops to recorded warnings.
- Components with no changes never move, even under `--force-*`.

## `specs version tag`

Creates the annotated library git tag `v<version>` for a cut version, with the per-component roll-up as the tag message — from the ledger's recorded data, so it works at cut time or any time after, without re-running `cut`. Never pushed; pushing the tag is always your call.

```bash
specs version tag           # tag the newest cut version
specs version tag 1.2.0     # tag an earlier cut version
```

## `specs version restore`

Reads a component's spec back at an older version — resolved through the ledger to the release that shipped it, then read from that version folder.

```bash
specs version restore dsButton 0.3.0                 # concern files to stdout
specs version restore dsButton 0.3.0 --out ./tmp     # concern files into a directory
```

`restore` refuses to write into the live spec directory — it never overwrites your working specs.

## `specs version figmapremerge`

Pre-merge impact report for a Figma branch, from just its URL: the command derives the main file from the branch, downloads both sides, generates specs from each, and grades the differences. No version history involved, so it works before anything is versioned. Report anatomy is covered in [Reports & Changelogs](/versioning/reports/).

```bash
specs version figmapremerge "https://www.figma.com/design/<mainKey>/branch/<branchKey>/..."
```

| Flag | Description |
|------|-------------|
| `--workspace <dir>` | Workspace directory — needs `config/` (and your `FIGMA_TOKEN` in the environment or `.env`), since the command fetches and generates |
| `--keep-payloads` | Keep the fetched Figma JSON in the run folder; by default it is deleted once specs are generated |
| `--rules <path>` | As above |

Each run writes its artifacts under `versions/diffs/<branch>/` — the generated `base/` (main side) and `current/` (branch side) spec trees, `report.md`, and the underlying change data — and prints the report to stdout. Re-running against the same branch overwrites that run's own folder.

## `specs version report`

Pre-release report and itemized changelog, built from ledger diffs accumulated since the last release. The same two files are also written into each version folder when the version is cut.

```bash
specs version report                     # since the previous library version, to stdout
specs version report --since 1.0.0 --out ./release-docs
```

| Flag | Description |
|------|-------------|
| `--since <version>` | Report library versions strictly after this one; defaults to the previous library version |
| `--out <dir>` | Write `report.md` and `changelog.md` into a directory instead of stdout |
| `--workspace <dir>`, `--rules <path>` | As above |

## See Also

- [Versioning Overview](/versioning/) — concepts, workflow, and where files live
- [Change Classification](/versioning/change-classification/) — the rules behind every grade
- [skills](/cli/commands/skills/) — install the premerge and release orchestration skills
