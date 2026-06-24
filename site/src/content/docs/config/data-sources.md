---
title: "Data Sources"
description: "Configure which Figma files to fetch and process"
---

## `sources`

Map of aliases to Figma file keys and which data to fetch/load.

```yaml
sources:
  library:
    key: vtOioqf0hbfCzjj5iRgG3p
    data: ['file','variables','styles']
  foundations:
    key: n488on7ZWi67JDiFwoNul2
    data: ['variables','styles']
```

Most projects need only one source. A second source is useful when relevant Figma variables live in a separate file — for example, a shared foundations or tokens library that isn't part of the main component file. The `generate` command resolves variables across all configured sources, so any variables defined in `foundations` are available when generating specs from `library`.

For each alias, the CLI uses deterministic filenames in `dataDirectory`:

- `${alias}.file.json` (only if `data` includes `file`)
- `${alias}.variables.json` (only if `data` includes `variables`)
- `${alias}.styles.json` (only if `data` includes `styles`)

### Branch Keys

The `key` field accepts either a main file key or a **branch file key**. To fetch from a Figma branch, replace the key with the branch's key (found in the branch URL: `figma.com/design/<KEY>/...`).

```yaml
sources:
  library:
    key: BRANCH_FILE_KEY   # fetches from the branch, not main
    data: ['file', 'variables', 'styles']
```

Branch data includes unpublished changes — variables, styles, and components that haven't been merged or published to main. See [Fetching Figma Branches](/specs/cli/commands/fetch/#fetching-figma-branches) for implications.
