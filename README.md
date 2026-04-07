# specs

Schema, types, and command-line tools to record and manage UI component specifications.

## About Specs

Specs is a deterministic system for auditing UI component composition, visual styling, and property configurations drawn from Figma components. It produces structured, machine-readable specifications that capture the full anatomy of a design system component.

The project evolved from [Anova](https://github.com/DirectedEdges/anova) ("Analysis of Variants"). To learn more about the concept, read the [Analysis of Variants](https://nathanacurtis.substack.com/p/analysis-of-variants-9e440c30b93e) blog post.

## Packages

### `@directededges/specs-schema`

The shared type system and JSON schema that defines the structure of UI component specifications. Exports include:

- [JSON Schema](packages/schema/schema/root.schema.json) — the canonical schema for component spec output
- [TypeScript types](packages/schema/types/) — complete type definitions for all schema entities (`Component`, `Config`, `Styles`, `Element`, `AnyProp`, etc.)
- `DEFAULT_CONFIG` — a runtime configuration object controlling output shape (format, token resolution, variant depth, etc.)

```sh
npm install @directededges/specs-schema
```

### `@directededges/specs-cli`

Command-line interface for generating component specifications from Figma design files.

```sh
# Install cli globally to run with the command `specs`
npm install -g @directededges/specs-cli
```

A typical workflow:

```sh
# 1. Initialize a .specs.config.yaml file
specs init
# 2. Edit the config to your preferred settings
# 3. Set up your .env file with a Figma personal access token and – if relevant - a license key
# 4. Fetch raw Figma data (file, variables, styles)
specs fetch
# 5. Audit the file to discover components and build a manifest
specs audit <figma-file-id>
# 6. Edit generated manifest to select components to generate
# 7. Generate specs from the manifest
specs generate <source>
```

**License upgrate:** The CLI is free to use. A **PRO** license unlocks additional output features including token resolution, subcomponent references, slot constraints, and platform extensions. For a **PRO** license, contact nathan@directededges.com.

## Documentation

The `docs/` folder contains detailed documentation on:

- [Schema](docs/schema/), such as component, variants, styles, props and more
- [CLI](docs/cli/) for getting started and details on commands like `init`, `fetch`, `audit` and `generate`
- Special feature [Guides](docs/guides/) for special features like code-only props, inferred numbers, layout, and more.

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
