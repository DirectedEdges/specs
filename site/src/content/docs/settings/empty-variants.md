---
title: "Empty Variants"
description: "Include layered variants that contain no element overrides"
---

Include layered variants that contain no element overrides. A run choice in `config/settings.yaml`.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, includes all variants regardless of element presence. When `false`, excludes semantically empty layered variants from output.

## Path

`spec.emptyVariants` in `config/settings.yaml`

### Example

```yaml
spec:
  emptyVariants: false  # Exclude empty variants (default)
```
