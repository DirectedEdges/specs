# specs

Specs is a fast, deterministic ecosystem for defining and generating production-ready component specifications across platforms. Available as a Figma plugin and a command-line interface, Specs produces compact, schema-valid specs — sidestepping the cost and errors of agentic Figma extraction.

## Get started

### Plugin

- Visualize specs on-canvas in incomparable detail
- Copy and paste compact spec data into LLMs
- Customize output for styling and layout
- Configure advanced data settings in the UI

[Open the plugin →](https://www.figma.com/community/plugin/1549454283615386215/specs-2-formerly-anova)

### CLI

- Quickly initialize an environment and fetch data
- Generate 50 component specs in a minute
- Set up for continuous integration
- Configure the files, formats, and data you need

[Set up the CLI →](https://www.specsplugin.com/cli/getting-started/)

Both the plugin and CLI generate specs consistent with the [Specs schema](https://www.specsplugin.com/schema/), a specifications model architected to unify component definitions for implementation across web, iOS, Android, and Figma.

## Repeatable, production-grade specs in seconds

Evaluating and differencing Figma styles and layers across variants is mechanical and predictable — and with Specs, incredibly fast and efficient.

> Update Figma → Generate specs → Agents refine → Update component

The result is a spec that's compact yet complete — not noisy like Figma's REST API data — and built on a schema that agents and engineers can extend. Leave inference about behavior, accessibility, motion, and nuanced customization downstream, where AI agents excel.

|  | Specs ecosystem | Agentic Figma extraction |
|---|---|---|
| **Speed** | ~1 sec (CLI) / ~10 sec (Plugin) per component | ~5–10 minutes per component |
| **AI cost** | Scripted — 0 AI tokens per component | 25/50/100,000+ AI tokens per component |
| **Consistency** | Deterministic and repeatable | Inference errors, gaps, and overconfidence |
| **Output** | Schema-valid YAML/MD, ideal for testing and versioning | Unstructured Markdown that complicates repeatable verification |
| **Platforms** | Tuned for cross-platform output and configurable Figma intents | Interprets and infers intents |

## Packages

### `@directededges/specs-cli`

Command-line interface (CLI) for generating component specifications from Figma design files.

```sh
# 1. Install cli globally to run with the command `specs`
npm install -g @directededges/specs-cli
# 2. Initialize the config/ directory (conventions.yaml, settings.yaml, pipeline.yaml)
specs init
# 3. Edit config/settings.yaml for your Figma file key and preferred settings 
# 4. Set up an .env file with a Figma PAT and – if subscribed - license key
# 5. Fetch raw Figma data (file, variables, styles)
specs fetch
# 6. Scan the file to discover components and build a manifest
specs scan
# 7. Select components in the manifest to be generated
# 8. Generate specs from the manifest
specs generate
```

Helpful documentation includes:
- [Overview](https://www.specsplugin.com/cli/)
- [Getting started](https://www.specsplugin.com/cli/getting-started/)
- [Configuration reference](https://www.specsplugin.com/settings/) for conventions and settings
- Per [command](https://www.specsplugin.com/cli/commands/) instructions and flags


### `@directededges/specs-schema`

The shared type system and JSON schema that defines the structure of UI component specifications is a dependency of `specs-cli` and installed when you install the command line interface as above. However, it is also available as a standalone package.

```sh
npm install @directededges/specs-schema
```

Exports include:

- [JSON Schema](packages/schema/schema/root.schema.json) — the canonical schema for component spec output
- [TypeScript types](packages/schema/types/) — complete type definitions for all schema entities (`Component`, `Conventions`, `Settings`, `Pipeline`, `Styles`, `Element`, `AnyProp`, etc.)
- `DEFAULT_CONVENTIONS`, `DEFAULT_SETTINGS`, `DEFAULT_PIPELINE` — runtime default objects: a library declaring no conventions, run settings controlling output shape (format, token resolution, variant depth, etc.), and an empty pipeline

Learn more in the [Schema docs](https://www.specsplugin.com/schema/), including details on each property including component, variants, styles, props and more.

### `@directededges/specs-from-figma`

The `specs-from-figma` package is the engine that converts Figma assets into specs and is used for both the command line interface and the associated Figma plugin. It is developed in a private repository and its published package is installed as a dependency of the command line interface.

## Architectural Decision Records

Schema changes are proposed and tracked through ADRs in the [`adr/`](adr/) directory. Each ADR documents the context, options considered, and decision for a type or schema modification.

## Contributing

Contributions are welcome. Clone the repo, run `npm install` at the root, and use `npm run build` and `npm test` to validate changes. All packages use Vitest with globals enabled.

### Agents

This repo includes Claude Code agent skills for the full ADR lifecycle:

| Skill | Purpose |
|-------|---------|
| `/specs.adr.create` | Draft a new ADR, claim the next number, and reserve it in the index |
| `/specs.adr.implement` | Apply the type and schema changes described in an ADR to types, schema, tests, and changelog |
| `/specs.adr.accept` | Validate the implementation is clean, mark the ADR as ACCEPTED, and update the index |

## Issues

Found a bug or have a feature request? Please check if it already exists in our [Issues](../../issues) before creating a new one.

**For bug reports**, include:
- Figma version and operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

**For feature requests**, include:
- Clear description of the feature
- Use case and benefits
- Any relevant mockups or examples

**Questions?** Visit our [Slack community](https://join.slack.com/t/directededges-plugins/shared_invite/zt-3e3nhx1zp-4uUjRCA7y2QAEPZdVNJi6A).

## Licensing

This repository contains packages with different licenses:

- **`packages/schema/`** — [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **`packages/cli/`** — [MIT](packages/cli/LICENSE)

### Attribution (Schema)

When extending or reusing the specs schema, you must:

- Credit **Nathan Curtis** as the author
- Provide a link to this repository: https://github.com/DirectedEdges/specs
- Provide a link to the license: https://creativecommons.org/licenses/by/4.0/
- Indicate if you made any modifications to the schema

Example attribution:

> "This project uses the [Specs UI Component Schema](https://github.com/DirectedEdges/specs) by Nathan Curtis of Directed Edges, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)."

---

**Disclaimer**: This is an independent project and is not officially affiliated with Figma Inc.
