---
title: "Variant Depth"
description: "Control how many variant property dimensions are expanded"
---

Maximum variant property depth to process. A run choice in `config/settings.yaml` — deeper depth means more thorough (and slower) variant analysis, not more correct output.

## Options

- **Default**: `9999` (unlimited)
- **Values**: `1`, `2`, `3`, or `9999` (unlimited)

## Path

`spec.variantDepth` in `config/settings.yaml`

### Example

```yaml
spec:
  variantDepth: 3  # Process up to 3 levels of variant properties
```

## See Also

- [Variant Depth guide](/guides/variant-depth/) - How depth affects variant expansion
- [Variant Layering guide](/guides/variant-layering/) - How properties accumulate across variants
