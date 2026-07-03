---
title: "Details"
description: "Control the detail level for variant data"
---

Detail level for variant data.

## Options

- **Default**: `LAYERED`
- **Values**:
  - `FULL` - Complete data for all variants
  - `LAYERED` - Optimized layered format showing only differences from default

## Path

`config.processing.details`

### Example

```yaml
config:
  processing:
    details: LAYERED
```

## See Also

- [Variant Layering guide](/specs/guides/variant-layering/) - How layered format works
