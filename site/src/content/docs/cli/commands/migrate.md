---
title: "migrate"
---
Run a versioned migration over the workspace — converting artifacts written for an older version of Specs into the current layout.

## Usage

```bash
specs migrate <subject> [options]
```

## Purpose

Migrations are named by *subject* — what they convert — and registered per source version, so `migrate` stays meaningful as new migrations arrive. One migration is registered today:

- **`specs migrate config`** (v1 → v2) — converts a pre-split `specs.config.yaml` / `specs.config.json` into the split `config/` directory introduced by ADR-071.

Migrations write to the workspace, which is why they are a command you run deliberately rather than something the config loader does on your behalf: config loading happens inside read-only commands and in CI, and a read path must not mutate a checkout.

## `specs migrate config`

Converts the pre-split single file into the current three-file layout. The CLI no longer reads `specs.config.yaml` — every command stops with an error until the file is converted:

```
specs.config.yaml is no longer read (ADR-071).
  Run `specs migrate config` to write config/conventions.yaml, config/settings.yaml and config/pipeline.yaml from it.
  Docs: https://specs.directededges.com/settings/
```

Running the migration:

1. Reads `specs.config.yaml` (or `specs.config.json`) from the current directory.
2. Writes each shape the file declares to its home: `config/conventions.yaml`, `config/settings.yaml`, `config/pipeline.yaml`. A shape the file never configured is skipped rather than written empty.
3. Renames the source to `specs.config.yaml.migrated` so config discovery stops finding it. The rename preserves the only record of what the workspace declared — the file is safe to delete once you have reviewed the generated files.

```bash
specs migrate config

# Output:
# config v1 → v2
#   Wrote: config/conventions.yaml
#   Wrote: config/settings.yaml
#   Wrote: config/pipeline.yaml
#   Renamed: specs.config.yaml → specs.config.yaml.migrated  (safe to delete once you have reviewed the new files)
#
# Review the generated files before committing.
```

### When it refuses

If `config/` already contains any of `conventions`, `settings`, or `pipeline` (`.yaml` or `.json`), the migration refuses rather than overwrite authored files:

```
Error: config/ already contains settings.yaml — migrating would overwrite authored files. Move or delete them first.
```

If no pre-split file exists in the current directory, there is nothing to do:

```
Nothing to migrate — no v1 config found in this directory.
```

## Options

### `--dry-run`
Report what the migration would write and rename, without touching any file.

```bash
specs migrate config --dry-run

# Output:
# config v1 → v2
#   Would write: config/conventions.yaml
#   Would write: config/settings.yaml
#   Would write: config/pipeline.yaml
#   Would rename: specs.config.yaml → specs.config.yaml.migrated
```

### `--from <version>`
Choose the source version to migrate from. By default, `migrate` picks the registered migration whose source it detects in the current directory. Only one `config` migration exists today (`--from v1`), so the flag matters only once multiple versions are registered.

### `--list`
List every registered migration and exit.

```bash
specs migrate --list

# Output:
# Available migrations:
#
#   specs migrate config --from v1
#       v1 → v2: single specs.config.yaml → config/{conventions,settings,pipeline}.yaml (ADR-071)
```

## Examples

### Example 1: Upgrade a pre-split workspace

```bash
cd my-design-system
specs migrate config
# Review config/*.yaml, then:
rm specs.config.yaml.migrated
```

### Example 2: Preview before converting

```bash
specs migrate config --dry-run
```

---

**See Also:**
- [Configuration Reference](/settings/) - The split `config/` layout and every option
- [init Command](/cli/commands/init/) - Scaffolding `config/` in a workspace with no existing configuration
