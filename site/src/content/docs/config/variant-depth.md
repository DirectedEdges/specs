---
title: "Variant Depth"
description: "Control how many variant property dimensions are expanded"
---

**Config path:** `config.processing.variantDepth`

Maximum variant property depth to process.

## Options

- **Default**: `9999` (unlimited)
- **Values**: `1`, `2`, `3`, or `9999` (unlimited)

## Example

```yaml
config:
  processing:
    variantDepth: 3  # Process up to 3 levels of variant properties
```

## See Also

- [Variant Depth guide](/specs/guides/variant-depth/) - How depth affects variant expansion
- [Variant Layering guide](/specs/guides/variant-layering/) - How properties accumulate across variants
