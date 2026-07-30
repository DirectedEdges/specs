---
title: "CLI Overview"
---

The Specs command-line interface (CLI) generates design system specifications from Figma REST API data without requiring the Figma Plugin UI. It enables automation, batch processing, and CI/CD integration.

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| [`init`](/cli/commands/init/) | Initialize config file with defaults | `specs.config.yaml` |
| [`fetch`](/cli/commands/fetch/) | Download raw REST payloads from Figma | JSON files in `dataDirectory` |
| [`scan`](/cli/commands/scan/) | List all components in file | Markdown manifest |
| [`generate`](/cli/commands/generate/) | Generate specs from a manifest or single component | YAML/JSON spec file(s) |
| [`applyCustomTokens`](/cli/commands/apply-custom-tokens/) | Inject `$custom` objects into fetched data | Modified variables/styles JSON |
| [`render`](/cli/commands/render/) *(experimental)* | Send a spec to the CLI bridge to render it live in Figma | Live Figma component |
| [`bridge`](/cli/commands/bridge/) *(experimental)* | Start/stop/check the local bridge `render` talks to | Background process |

### Global Options

These options work with all commands:

- `--verbose` - Enable detailed logging
- `--help` - Show command help
- `--version` - Show CLI version

## Free vs. Pro

Specs CLI works without a license key. At the **free tier**, specs include full component structure: anatomy, props, variants, and raw style values.

With a **Pro license**, specs also include design token references, variable bindings, and visibility bindings — connecting your specs directly to your design token system.

| Feature | Free | Pro |
|---------|------|-----|
| Anatomy, props, variants | Yes | Yes |
| Layout and raw style values | Yes | Yes |
| Design token references | — | Yes |
| Variable and visibility bindings | — | Yes |

Set up your license key in your environment to unlock Pro features. See [Getting Started — License](/cli/getting-started/#step-3-set-your-license-key-optional).

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

## File Outputs

`specs fetch` writes deterministic filenames based on your config aliases.

Example (with `dataDirectory: ./data`):

```
data/
├── library.file.json
├── library.variables.json
├── library.styles.json
├── foundations.variables.json
└── foundations.styles.json
```

`generate` uses these files by default when your `specs.config.yaml` declares the corresponding aliases and data types.

## Requirements

- **Node.js** 18 or higher
- **Figma access token** (for `fetch`) via `FIGMA_TOKEN`
- **Figma REST API data** (JSON files from Figma API endpoints, produced by `fetch`):
  - `file` — any Figma plan with REST API access
  - `variables` / `styles` — Figma restricts these REST endpoints to organizations on an **Enterprise** plan, regardless of your Specs license
- **License key** (optional) via `SPECS_LICENSE_KEY` for Pro features
- **A running CLI bridge and open Figma session** (for `render` only) — see the [Render to Figma guide](/guides/render-to-figma/)

See [Getting Started](/cli/getting-started/) for installation instructions.

## See Also

- [Getting Started](/cli/getting-started/) - Installation, license, and quick start
- [Workflows](/cli/workflows/) - Real-world usage patterns and CI/CD
- [Configuration](/settings/) - Config file reference
