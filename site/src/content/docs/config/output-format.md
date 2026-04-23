---
title: "Output Format"
description: "Control the serialization format for generated specs"
---

**Config path:** `config.format.output`

Output serialization format.

## Options

- **Default**: `JSON`
- **Values**:
  - `JSON` - JavaScript Object Notation
  - `YAML` - Human-readable YAML format

## Example

```yaml
config:
  format:
    output: YAML  # Generate YAML by default
```

**Note**: The CLI `--format` flag overrides this setting for individual commands.
