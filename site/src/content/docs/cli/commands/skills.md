---
title: "skills"
description: "Install the orchestration skills distributed with the CLI."
---
Install the AI orchestration skills that ship with the CLI. The skills sequence the [versioning](/versioning/) workflows — run the commands in order, stop at the human review gates — and never generate report or changelog content themselves; the [`version`](/cli/commands/version/) commands produce all content.

## Usage

```bash
specs skills install [--dir <path>]
```

| Flag | Description |
|------|-------------|
| `--dir <path>` | Skill directory to emit into (default: `.claude/skills`) |

Two skills are emitted:

| Skill | Orchestrates |
|-------|--------------|
| `specs-cli.premerge` | [`specs version figmapremerge`](/cli/commands/version/#specs-version-figmapremerge) fetches, generates, and reports → human reviews the report → merge proceeds or not |
| `specs-cli.release` | [`specs version report`](/cli/commands/version/#specs-version-report) → human review → [`specs version cut`](/cli/commands/version/#specs-version-cut) → [`specs version tag`](/cli/commands/version/#specs-version-tag) → publish |

The emitted files are **canonical and overwritten on every install** — re-running after a CLI upgrade refreshes them to match the commands they orchestrate. Keep local customization in your own separate skills rather than editing the emitted ones.

## See Also

- [version](/cli/commands/version/) — the commands these skills orchestrate
- [Reports & Changelogs](/versioning/reports/) — the outputs the human gates review
