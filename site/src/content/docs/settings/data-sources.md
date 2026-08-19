---
title: "sources"
description: "Configure which Figma files to fetch and process"
---

`data.sources` in `config/settings.yaml` tells the CLI which Figma files to fetch data from and what to download from each one. A run choice — which files a workspace reads is this workspace's business, which is why sources sit in `settings.yaml` while the conventions describing the library live in `conventions.yaml`. Each entry is a named alias you choose, mapped to a Figma file key and a `fetch` list of artifact kinds:

- `file` — the full Figma document (components, frames, nodes). This is typically your component library file. Required for `generate`.
- `variables` — Figma variable collections and their values. Used for token resolution during `generate`.
- `styles` — Figma styles (color, text, effect). Used for style resolution during `generate`.
- `icons` — the glyph assets matched by [`figma.glyphs.match`](/settings/glyph-name-pattern/), extracted as SVG files. Requires that convention to be declared and the `file` payload to be fetched.

Most projects have one source. You'd add a second when your design system spans more than one Figma file:

- A shared foundations or tokens file holds the variable collections that your component library references — variables won't resolve without it.
- Your components are split across multiple Figma library files, and you want to generate specs from more than one in the same run.
- A separate file owns the styles (color palettes, typography) used by components in another file.

The `generate` command resolves variables and styles across all configured sources.

## Example

```yaml
data:
  sources:
    library:
      key: vtOioqf0hbfCzjj5iRgG3p
      fetch: ['file','variables','styles']
    foundations:
      key: n488on7ZWi67JDiFwoNul2
      fetch: ['variables','styles']
```

## Alias

The alias (e.g. `library`, `foundations`) is a name you assign to each source. It determines the filenames the CLI writes to `data.directory`:

- `${alias}.file.json` (only if `fetch` includes `file`)
- `${alias}.variables.json` (only if `fetch` includes `variables`)
- `${alias}.styles.json` (only if `fetch` includes `styles`)

## `key`

The Figma file key for this source. Found in the file URL: `figma.com/design/<KEY>/...`.

- **Type**: string
- **Required**: yes

## `fetch`

Which artifact kinds to fetch from this file.

- **Type**: array
- **Required**: yes
- **Options**: `file`, `variables`, `styles`, `icons`

**Legacy name**: in the pre-split `specs.config.yaml`, sources lived at the root as `sources`, and this list was named `data`. The legacy file still loads, migrating each source to `data.sources.<name>` and renaming its list to `fetch` in memory.

## Branch Keys

The `key` field accepts either a main file key or a **branch file key**. To fetch from a Figma branch, replace the key with the branch's key (found in the branch URL: `figma.com/design/<KEY>/...`).

```yaml
data:
  sources:
    library:
      key: BRANCH_FILE_KEY   # fetches from the branch, not main
      fetch: ['file', 'variables', 'styles']
```

Branch data includes unpublished changes — variables, styles, and components that haven't been merged or published to main. See [Fetching Figma Branches](/cli/commands/fetch/#fetching-figma-branches) for implications.
