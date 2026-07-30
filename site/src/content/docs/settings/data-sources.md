---
title: "sources"
description: "Configure which Figma files to fetch and process"
---

`sources` tells the CLI which Figma files to fetch data from and what to download from each one. Each entry is a named alias you choose, mapped to a Figma file key and a list of data types:

- `file` — the full Figma document (components, frames, nodes). This is typically your component library file. Required for `generate`.
- `variables` — Figma variable collections and their values. Used for token resolution during `generate`.
- `styles` — Figma styles (color, text, effect). Used for style resolution during `generate`.

Most projects have one source. You'd add a second when your design system spans more than one Figma file:

- A shared foundations or tokens file holds the variable collections that your component library references — variables won't resolve without it.
- Your components are split across multiple Figma library files, and you want to generate specs from more than one in the same run.
- A separate file owns the styles (color palettes, typography) used by components in another file.

The `generate` command resolves variables and styles across all configured sources.

## Example

```yaml
sources:
  library:
    key: vtOioqf0hbfCzjj5iRgG3p
    data: ['file','variables','styles']
  foundations:
    key: n488on7ZWi67JDiFwoNul2
    data: ['variables','styles']
```

## Alias

The alias (e.g. `library`, `foundations`) is a name you assign to each source. It determines the filenames the CLI writes to `dataDirectory`:

- `${alias}.file.json` (only if `data` includes `file`)
- `${alias}.variables.json` (only if `data` includes `variables`)
- `${alias}.styles.json` (only if `data` includes `styles`)

## `key`

The Figma file key for this source. Found in the file URL: `figma.com/design/<KEY>/...`.

- **Type**: string
- **Required**: yes

## `data`

Which data types to fetch from this file.

- **Type**: array
- **Required**: yes
- **Options**: `file`, `variables`, `styles`

## Branch Keys

The `key` field accepts either a main file key or a **branch file key**. To fetch from a Figma branch, replace the key with the branch's key (found in the branch URL: `figma.com/design/<KEY>/...`).

```yaml
sources:
  library:
    key: BRANCH_FILE_KEY   # fetches from the branch, not main
    data: ['file', 'variables', 'styles']
```

Branch data includes unpublished changes — variables, styles, and components that haven't been merged or published to main. See [Fetching Figma Branches](/cli/commands/fetch/#fetching-figma-branches) for implications.
