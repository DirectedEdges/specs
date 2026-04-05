# Anova Schema Types

TypeScript type definitions for the Anova component specification format.

## Overview

This package provides TypeScript types that match the Anova JSON schema. These types represent the serialized output format produced by `@directededges/anova-transformer` and consumed by tools like MCP servers, validators, and documentation generators.

## Installation

```bash
npm install @directededges/anova
```

## Usage

```typescript
import type { Component, Variant, Anatomy, Config } from '@directededges/anova';
import { DEFAULT_CONFIG } from '@directededges/anova';

// Type-safe component data
const component: Component = {
  title: 'Button',
  anatomy: {
    root: { type: 'container' },
    label: { type: 'text' }
  },
  default: {
    elements: {
      root: {
        styles: {
          backgroundColor: '#0066FF',
          padding: '8px 16px'
        }
      }
    }
  }
};

// Use default config or customize
const config: Config = {
  ...DEFAULT_CONFIG,
  format: {
    ...DEFAULT_CONFIG.format,
    output: 'YAML'
  }
};
```

## Type Hierarchy

### Core Types
- **`Component`** - Top-level component specification
- **`Anatomy`** - Structural elements of the component
- **`Props`** - Configurable component properties
- **`Variant`** - Component state/configuration
- **`Metadata`** - Generation metadata
- **`Config`** - Transformer configuration type

### Configuration
- **`DEFAULT_CONFIG`** - Default configuration constant for transformer setup

### Supporting Types
- **`Element`** - Individual component element
- **`Styles`** - Style properties and values
- **`Layout`** - Hierarchical layout structure
- **`PropConfigurations`** - Property value mappings
- **`ReferenceValue`** - JSON pointer references

## Relationship to Other Packages

```
┌─────────────────────────────────────────────┐
│ @directededges/anova (this package)         │
│ - JSON Schema definitions                   │
│ - TypeScript type definitions               │
│ - Default configuration constants           │
│ Exports: Component, Config, DEFAULT_CONFIG  │
└─────────────────────────────────────────────┘
                    ▲
                    │ imports types & config
    ┌───────────────┴──────────────┐
    │                               │
┌───────────────────┐   ┌──────────────────────┐
│ anova-transformer │   │ anova-plugin (MCP)   │
│ - Produces data   │   │ - Consumes data      │
│                   │   │ - Validates schema   │
└───────────────────┘   └──────────────────────┘
```

### Why Simple Names?

Types use simple names (`Component`, `Variant`) instead of suffixed names (`ComponentData`, `VariantData`) because:

1. **Package namespacing**: `import { Component } from '@directededges/anova'` provides clear context
2. **Industry standard**: Similar to `@types/*` packages
3. **Schema alignment**: Types directly represent the schema structure

The `Data` suffix was historically used when these types lived alongside Model classes in a single codebase. Now that they're in a dedicated schema package, the suffix is no longer needed.

## Schema Validation

These types are hand-written to match the JSON schema definitions in `/schema`. For runtime validation, use a JSON schema validator with the schema files.

```typescript
import Ajv from 'ajv';
import componentSchema from '@directededges/anova/schema/component.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(componentSchema);

if (validate(component)) {
  // Valid component
} else {
  console.error(validate.errors);
}
```

## Contributing

When updating the JSON schema, ensure corresponding TypeScript types are updated to match. Run type checks against example data to verify alignment.

## License

MIT
