---
title: "Layout"
description: "Choose how element hierarchy is represented in the spec output"
---

Layout representation format.

## Options

- **Default**: `LAYOUT`
- **Values**:
  - `LAYOUT` - Tree structure with layout properties
  - `PARENT_CHILDREN` - Parent-child relationships only
  - `BOTH` - Include both representations

## Path

`config.format.layout`

### Example

```yaml
config:
  format:
    layout: LAYOUT
```

## See Also

- [Data Layout guide](/specs/guides/data-layout/) - Comparison of layout representations
