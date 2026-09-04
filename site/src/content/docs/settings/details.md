---
title: "Details"
description: "Control the detail level for variant data"
---

Detail level for variant data. A run choice in `config/settings.yaml` — both levels describe the same component; they differ only in how much they repeat.

## Options

- **Default**: `LAYERED`
- **Values**:
  - `FULL` - Complete data for all variants
  - `LAYERED` - Optimized layered format showing only differences from default

## Path

`spec.details` in `config/settings.yaml`

### Example

```yaml
spec:
  details: LAYERED
```

## See Also

- [Variant Layering guide](/guides/variant-layering/) - How layered format works
