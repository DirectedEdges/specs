# specs

Specs is a deterministic system for generating and managing UI component composition, visual styling, and configuration specs independent of and drawn from Figma components as human- and machine-readable specifications. The product suite includes a Figma plugin (currently, Anova) and three packages available on npm:

* `@directededges/specs-cli`, a command line tool to generate specs from Figma files
* `@directededges/specs-schema`, a JSON specification
* `@directededges/specs-from-figma`, the engine used by the cli and plugin to convert Figma assets to specs (public package developed in a private repository)

The project evolved from [Anova](https://github.com/DirectedEdges/anova) ("Analysis of Variants"). To learn more about the concept, read the [Analysis of Variants](https://nathanacurtis.substack.com/p/analysis-of-variants-9e440c30b93e) blog post.

## Pro Licensing

Specs is free to use at both the CLI and Figma plugin. The free tier generates complete component structures — anatomy, props, layout, and default-variant styles — giving you a full picture of every component.

A **Pro** license unlocks additional `generate` features including design token references, named style references, prop bindings, non-default variants, and invalid variant combinations. Pro licenses are available for both the Figma plugin and the CLI.

[Purchase Now](https://buy.polar.sh/polar_cl_xnq7zeKLXunrhOIpfNwA56F4wIq2Y0lLNCKmb0hhYJH) | [Learn More](https://directededges.github.io/specs/overview/licensing/)

## Packages

### `@directededges/specs-cli`

Command-line interface (CLI) for generating component specifications from Figma design files.

```sh
# 1. Install cli globally to run with the command `specs`
npm install -g @directededges/specs-cli
# 2. Initialize a specs.config.yaml file
specs init
# 3. Edit the config for your Figma file key and preferred settings 
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
- [Overview](https://directededges.github.io/specs/cli/)
- [Getting started](https://directededges.github.io/specs/cli/getting-started/)
- [Configuration file](https://directededges.github.io/specs/cli/configuration/) details
- Per [command](https://directededges.github.io/specs/cli/commands/) instructions and flags


### `@directededges/specs-schema`

The shared type system and JSON schema that defines the structure of UI component specifications is a dependency of `specs-cli` and installed when you install the command line interface as above. However, it is also available as a standalone package.

```sh
npm install @directededges/specs-schema
```

Exports include:

- [JSON Schema](packages/schema/schema/root.schema.json) — the canonical schema for component spec output
- [TypeScript types](packages/schema/types/) — complete type definitions for all schema entities (`Component`, `Config`, `Styles`, `Element`, `AnyProp`, etc.)
- `DEFAULT_CONFIG` — a runtime configuration object controlling output shape (format, token resolution, variant depth, etc.)

Learn more in the [Schema docs](https://directededges.github.io/specs/schema/), including details on each property including component, variants, styles, props and more.

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
| `/anova.adr.create` | Draft a new ADR, claim the next number, and reserve it in the index |
| `/anova.adr.implement` | Apply the type and schema changes described in an ADR to types, schema, tests, and changelog |
| `/anova.adr.accept` | Validate the implementation is clean, mark the ADR as ACCEPTED, and update the index |

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
