---
title: "format"
description: "Control the serialization format for generated specs"
---

Output serialization format. A different team could pick the other format and still be correct, and the CLI `--format` flag overrides this setting for individual commands.

| | |
|---|---|
| **File** | `config/settings.yaml` |
| **Path** | `spec.format` |
| **Type** | enum |
| **Default** | `JSON` |

## Options

| Value | Description |
|---|---|
| `JSON` | JavaScript Object Notation |
| `YAML` | Human-readable YAML format |

## Example

```yaml
spec:
  format: YAML  # Generate YAML by default
```
