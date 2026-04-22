---
title: "CLI Overview"
---
The Specs command-line interface (CLI) enables automated generation of design system specifications from Figma REST API data without requiring the Figma Plugin UI.

## Overview

The CLI provides five commands for processing Figma design data:
- **`init`** - Create a default `specs.config.yaml`
- **`fetch`** - Download raw REST payloads (file, variables, styles) for one or more Figma files
- **`generate`** - Generate specifications from a manifest or single component
- **`scan`** - Scan a Figma file and create a manifest of all components
- **`applyCustomTokens`** - Inject custom token objects into fetched variables/styles data

These tools enable automation, batch processing, and integration into CI/CD pipelines.

## Free vs. Pro

Specs CLI works without a license key. At the **free tier**, specs include full component structure: anatomy, props, variants, and raw style values.

With a **Pro license**, specs also include design token references, variable bindings, and visibility bindings — connecting your specs directly to your design token system.

| Feature | Free | Pro |
|---------|------|-----|
| Anatomy, props, variants | Yes | Yes |
| Layout and raw style values | Yes | Yes |
| Design token references | — | Yes |
| Variable and visibility bindings | — | Yes |

Set up your license key in your environment to unlock Pro features. See [Getting Started — License](/specs/cli/getting-started.md/#step-3-set-your-license-key-optional).

## Key Features

### Multiple Output Modes
Generate specs as single files, per-component files, or split by concern (API vs variants) to fit your workflow. See [generate command](/specs/cli/commands/generate/) for details.

### Manifest-Based Generation
Process entire design systems at once using a curated manifest:
```bash
# 0. Fetch raw payloads
specs fetch --verbose

# 1. Create manifest (auto-resolves configured source; writes to data/library.manifest.md by default)
specs scan

# 2. Curate manifest (edit data/library.manifest.md)

# 3. Generate all specs
# Zero-config — uses default manifest and outputDirectory from config
specs generate

# Or override paths per-run:
specs generate components.md -o specs/all.yaml

# Per-component files
specs generate -o specs/ --split-components

# Separate API from variants
specs generate -o specs/ --split-concerns
```

### Single Component Generation
Quickly generate a spec for one component when setting up or iterating:
```bash
specs fetch --verbose
specs generate data/library.file.json -c "Button" -o specs/button.yaml
```

### Flexible Configuration
Configure behavior via `specs.config.yaml`:
```yaml
dataDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
  foundations:
    key: REPLACE_WITH_FOUNDATIONS_FILE_KEY
    data: ['variables','styles']

config:
  processing:
    variantDepth: 2
    details: FULL
  format:
    output: YAML
    keys: CAMEL
```

### CI/CD Integration
Automate spec generation in your build pipeline with GitHub Actions, GitLab CI, or other automation tools.

## Documentation

### [Getting Started](/specs/cli/getting-started/)
Installation, prerequisites, license setup, and quick start guide

### [Claude Code Onboarding](/specs/cli/claude-onboarding/)
Interactive setup driven by Claude Code — handles install, config decisions, token setup, and your first generate

### [Configuration](/specs/cli/configuration/)
Configure processing behavior and data sources with `specs.config.yaml`

### [Commands Reference](/specs/cli/commands/)
Complete command reference for `init`, `fetch`, `generate`, and `scan`

### [Examples](/specs/cli/examples/)
Real-world usage examples and workflows

## Quick Example

```bash
# Fetch raw payloads (writes into dataDirectory)
specs fetch --verbose

# Scan to build a manifest (auto-resolves configured source; writes to data/library.manifest.md by default)
specs scan

# Generate all selected components — uses default manifest + outputDirectory
specs generate

# Or generate a single component spec on demand
specs generate data/library.file.json \
  -c "DS Button" \
  --output specs/button.yaml
```

## Output Format

The CLI generates the same specification format as the Figma Plugin:

```yaml
components:
  dsButton:
    title: DS Button
    props:
      size:
        type: variant
        values: [small, medium, large]
      variant:
        type: variant
        values: [primary, secondary]
    anatomy:
      - id: container
        name: Container
        type: FRAME
      - id: label
        name: Label
        type: TEXT
    variants:
      - props:
          size: small
          variant: primary
        anatomy:
          container:
            styles:
              paddingLeft: { value: 12, type: ABSOLUTE }
```

## Requirements

- **Node.js** 18 or higher
- **Figma access token** (for `fetch`) via `FIGMA_TOKEN`
- **Figma REST API data** (JSON files from Figma API endpoints, produced by `fetch`)
- **License key** (optional) via `SPECS_LICENSE_KEY` for Pro features

See [Getting Started](/specs/cli/getting-started/) for installation instructions.

## See Also

- [Getting Started](/specs/cli/getting-started/) - Installation, license, and quick start
- [Claude Code Onboarding](/specs/cli/claude-onboarding/) - Interactive setup via Claude Code
- [Configuration](/specs/cli/configuration/) - Config file reference
- [Commands Reference](/specs/cli/commands/) - Detailed command docs
- [Examples](/specs/cli/examples/) - Real-world usage patterns

---

**Last Updated**: April 2026
