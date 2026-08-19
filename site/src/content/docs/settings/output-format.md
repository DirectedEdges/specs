---
title: "format"
description: "Control the serialization format for generated specs"
---

Output serialization format. A run choice in `config/settings.yaml` — a different team could pick the other format and still be correct.

## Options

- **Default**: `JSON`
- **Values**:
  - `JSON` - JavaScript Object Notation
  - `YAML` - Human-readable YAML format

**Note**: The CLI `--format` flag overrides this setting for individual commands.

## Path

`spec.format` in `config/settings.yaml`

### Example

```yaml
spec:
  format: YAML  # Generate YAML by default
```
