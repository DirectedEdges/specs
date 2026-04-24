---
title: "Empty Variants"
description: "Include layered variants that contain no element overrides"
---

**Config path:** `config.include.emptyVariants`

Include layered variants that contain no element overrides.

## Options

- **Type**: boolean
- **Default**: `false`
- **Effect**: When `true`, includes all variants regardless of element presence. When `false`, excludes semantically empty layered variants from output.

## Example

```yaml
config:
  include:
    emptyVariants: false  # Exclude empty variants (default)
```
