---
title: "Invalid Variants"
description: "Include invalid variant data in output"
---

Include invalid variant data in output. A run choice in `config/settings.yaml`.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, includes variants that don't match all property combinations

## Path

`spec.invalidVariants` in `config/settings.yaml`

### Example

```yaml
spec:
  invalidVariants: false  # Exclude invalid variants
```
