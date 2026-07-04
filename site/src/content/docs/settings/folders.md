---
title: "Folders"
description: "Configure input and output directories for fetched data and generated specs"
---

## `dataDirectory`

Directory where `fetch` writes downloaded payloads, and where `generate` loads them from.

- **Default**: `./data`
- **CLI override**: `--data-dir` flag on `fetch`, `scan`, and `generate` commands

```yaml
dataDirectory: ./data
```

> **Backward compatibility**: The deprecated `sourceDirectory` field still works as an alias for `dataDirectory`. If both are present, `dataDirectory` takes precedence. Using `sourceDirectory` will emit a deprecation warning.

## `outputDirectory`

Default directory where `generate` commands write their output files.

- **Default**: `./specs`
- **Override**: `-o` flag on individual commands
- **Note**: The `generate` command's `--format` flag still controls output format (YAML vs JSON); this controls the directory only.

```yaml
outputDirectory: ./specs
```
