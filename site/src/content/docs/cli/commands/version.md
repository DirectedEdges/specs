---
title: "version"
description: "Spec workspace versioning: diffs, semver bumps, ledgers, reports, and changelogs."
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
| [`bump`](#specs-version-bump) | Classify workspace changes, write the new version |
| [`restore`](#specs-version-restore) | Read a component's spec back at an older version |
| [`premerge`](#specs-version-premerge) | Pre-merge report from two spec trees |
| [`report`](#specs-version-report) | Pre-release report + itemized changelog |

Shared conventions:

- **`--workspace <dir>`** — the workspace containing `specs/` and `versions/`; defaults to the current directory.
- **`--rules <path>`** — override the built-in [severity rules](/versioning/change-classification/) with an external YAML file (on every subcommand that classifies).
- Component arguments accept the spec folder name or the component title; versions accept `1.2.0` or `v1.2.0`.
- Versioning is free tier — no license key required.

## `specs version diff`

Jump comparison: what changed for one component between two versions.

```bash
specs version diff dsButton --from 1.0.0              # against the current working spec
specs version diff dsButton --from 1.0.0 --to 2.0.0   # between two ledgered versions
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
specs version history dsButton 1.0.0..2.0.0    # inclusive range
```

## `specs version bump`

Compares the workspace against its last recorded version, grades every change, appends ledger entries, and writes the new version folder — `versions/<libraryVersion>/` with the full `specs/` tree plus that version's `report.md` and `changelog.md`, then refreshes `versions/latest/` (which also carries `assets/`). See [Version History](/versioning/history/) for the layout.

```bash
specs version bump
specs version bump --tag
specs version bump --force-minor "visual break: brand background sweep"
```

| Flag | Description |
|------|-------------|
| `--force-major <reason>` / `--force-minor <reason>` / `--force-patch <reason>` | Override the computed class; mutually exclusive, reason required and recorded in the ledger |
| `--tag` | Create the annotated library git tag `v<version>` with the per-component roll-up in its message — never pushed |
| `--workspace <dir>`, `--rules <path>` | As above |

Behavior worth knowing:

- The **first bump** on an unversioned workspace initializes every component and the library at 1.0.0 as a baseline.
- An **untracked likely rename** (title changed, Figma node matches an existing ledger) stops the bump with nothing written — record the rename in [`renames.yaml`](/versioning/identity/) and re-run.
- An **asset removed while specs still reference it** also stops the bump — a broken reference is a defect, not a version. A `--force-*` flag proceeds anyway, downgrading these stops to recorded warnings.
- Components with no changes never bump, even under `--force-*`.

## `specs version restore`

Reads a component's spec back at an older version — resolved through the ledger to the release that shipped it, then read from that version folder.

```bash
specs version restore dsButton 1.5.0                 # concern files to stdout
specs version restore dsButton 1.5.0 --out ./tmp     # concern files into a directory
```

`restore` refuses to write into the live spec directory — it never overwrites your working specs.

## `specs version premerge`

Pre-merge impact report from two spec trees supplied as paths — typically specs generated from a Figma branch and from main. No ledger involved, so it works before anything is versioned. Report anatomy is covered in [Reports & Changelogs](/versioning/reports/).

```bash
specs version premerge --base ./main-specs --current ./branch-specs \
  --target-label "main" --source-label "feature/compact-density" --out premerge.md
```

| Flag | Description |
|------|-------------|
| `--base <specs-dir>` | The merge target's spec tree — what is being merged into (required) |
| `--current <specs-dir>` | The arriving spec tree — the feature branch (required) |
| `--target-label <label>` / `--source-label <label>` | Names for the two sides in the report header |
| `--out <file>` | Write the report to a file instead of stdout |
| `--rules <path>` | As above |

## `specs version report`

Pre-release report and itemized changelog, built from ledger diffs accumulated since the last release. The same two files are also written into each version folder at bump time.

```bash
specs version report                     # since the previous library version, to stdout
specs version report --since 2.0.0 --out ./release-docs
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
