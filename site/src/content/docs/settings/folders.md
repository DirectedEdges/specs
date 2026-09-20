---
title: "Folders"
description: "Configure input and output directories for fetched data and generated specs"
---

Each concern in `config/settings.yaml` — `data`, `spec`, and `assets` — carries its own `directory`. All are run choices: a different team could point them anywhere and still be correct.

## `data.directory`

Directory where `fetch` writes downloaded payloads, and where `generate` loads them from.

- **Default**: `./data`
- **CLI override**: `--data-dir` flag on `fetch`, `scan`, and `generate` commands

```yaml
data:
  directory: ./data
```

## `spec.directory`

Default directory where `generate` commands write their output files.

- **Default**: `./specs`
- **Override**: `-o` flag on individual commands
- **Note**: The `generate` command's `--format` flag still controls output format (YAML vs JSON); this controls the directory only.

```yaml
spec:
  directory: ./specs
```

## `assets.directory`

Directory holding shared resources every code output points at, whatever the platform — icons, images, generated CSS, fonts.

```yaml
assets:
  directory: ./assets
```

## Legacy names

In the pre-split `specs.config.yaml`, these were the root-level `dataDirectory` and `outputDirectory` members (and, before that, `sourceDirectory` as a deprecated alias for `dataDirectory`). That file is no longer read — [`specs migrate config`](/cli/commands/migrate/) converts it, moving both to `data.directory` and `spec.directory`.
