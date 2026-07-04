---
title: "Output Format"
description: "Control the serialization format for generated specs"
---

Output serialization format.

## Options

- **Default**: `JSON`
- **Values**:
  - `JSON` - JavaScript Object Notation
  - `YAML` - Human-readable YAML format

**Note**: The CLI `--format` flag overrides this setting for individual commands.

## Path

`config.format.output`

### Example

```yaml
config:
  format:
    output: YAML  # Generate YAML by default
```
