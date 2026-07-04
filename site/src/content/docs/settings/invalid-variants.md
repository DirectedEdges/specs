---
title: "Invalid Variants"
description: "Include invalid variant data in output"
---

Include invalid variant data in output.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, includes variants that don't match all property combinations

## Path

`config.include.invalidVariants`

### Example

```yaml
config:
  include:
    invalidVariants: false  # Exclude invalid variants
```
