# Specs Schema Types

TypeScript type definitions for the Specs component specification format.

## Overview

This package provides TypeScript types that match the Specs JSON schema. These types represent the serialized output format produced by `@directededges/specs-from-figma` and consumed by tools like MCP servers, validators, and documentation generators.

## Installation

```bash
npm install @directededges/specs-schema
```

## Usage

```typescript
import type { Component, Variant, Anatomy, Conventions, Settings } from '@directededges/specs-schema';
import { DEFAULT_SETTINGS } from '@directededges/specs-schema';

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

// Facts about the Figma library — every consumer of that library declares the
// same values. There is no defaults constant: a convention's absence means the
// library declares none, and nothing can supply that.
const conventions: Conventions = {
  figma: {
    naming: 'SENTENCE',
    glyphs: { match: 'DS Icon Glyph / {i}' }
  }
};

// Choices about this run — start from the defaults and override.
const settings: Settings = {
  ...DEFAULT_SETTINGS,
  spec: {
    ...DEFAULT_SETTINGS.spec,
    format: 'YAML'
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
- **`Conventions`** - Facts about the Figma library a spec came from
- **`Settings`** - Choices about the run that produced it
- **`Pipeline`** - Transformers and analyses a workspace runs

### Configuration
- **`DEFAULT_CONVENTIONS`** - The three convention members that have a default; no blocks
- **`DEFAULT_SETTINGS`** - Resolved defaults for the settings half
- **`DEFAULT_PIPELINE`** - An empty pipeline: no transformers, no analyses

### Supporting Types
- **`Element`** - Individual component element
- **`Styles`** - Style properties and values
- **`Layout`** - Hierarchical layout structure
- **`PropConfigurations`** - Property value mappings
- **`ReferenceValue`** - JSON pointer references

## Relationship to Other Packages

```
┌──────────────────────────────────────────────────┐
│ @directededges/specs-schema (this package)       │
│ - JSON Schema definitions                        │
│ - TypeScript type definitions                    │
│ - Default configuration constants                │
│ Exports: Component, Conventions, Settings,       │
│          Pipeline, DEFAULT_* constants           │
└──────────────────────────────────────────────────┘
                    ▲
                    │ imports types & config
    ┌───────────────┴──────────────┐
    │                               │
┌───────────────────────┐   ┌──────────────────────┐
│ specs-from-figma        │   │ specs-plugin (MCP)   │
│ - Produces data       │   │ - Consumes data      │
│                       │   │ - Validates schema   │
└───────────────────────┘   └──────────────────────┘
```

### Why Simple Names?

Types use simple names (`Component`, `Variant`) instead of suffixed names (`ComponentData`, `VariantData`) because:

1. **Package namespacing**: `import { Component } from '@directededges/specs-schema'` provides clear context
2. **Industry standard**: Similar to `@types/*` packages
3. **Schema alignment**: Types directly represent the schema structure

The `Data` suffix was historically used when these types lived alongside Model classes in a single codebase. Now that they're in a dedicated schema package, the suffix is no longer needed.

## Schema Validation

These types are hand-written to match the JSON schema definitions in `/schema`. For runtime validation, use a JSON schema validator with the schema files.

```typescript
import Ajv from 'ajv';
import componentSchema from '@directededges/specs-schema/schema/component.schema.json';

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
