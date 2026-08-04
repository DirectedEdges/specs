---
title: "fetch"
---
Fetch raw Figma REST API payloads for configured sources.

## Usage

```bash
specs fetch [options]
```

## Requirements

- `FIGMA_TOKEN` must be set in your environment.
- `specs.config.yaml` must include `dataDirectory` (or deprecated `sourceDirectory`) and `sources`.
- Fetching `variables` or `styles` requires your Figma organization to be on an **Enterprise** plan — Figma restricts those REST endpoints regardless of your Specs license. `file` and `icons` data work on any plan. See [CLI Requirements](/cli/#requirements).
- Fetching `icons` additionally requires:
  - `config.processing.glyphNamePattern` set in your config (see [Glyph Name Pattern](/guides/glyph-name-pattern/))
  - the source's `file` payload — listed before `icons` in the same `data` array, or fetched in a previous run

## Options

### `--config <path>`
Use a specific config file.

### `--data-dir <dir>`
Override output directory for fetched payloads. Defaults to `dataDirectory` from config, or `./data` if not configured.

```bash
specs fetch --data-dir ./custom-data
```

> **Deprecated alias**: `--outDir` still works but will emit a deprecation warning. Prefer `--data-dir`.

### `--only <alias[,alias...]>`
Fetch only specific aliases from `sources`.

### `--no-geometry`
Omit geometry data from file payloads. By default, `fetch` requests `?geometry=paths` from the Figma API, which includes `fillGeometry`, `strokeGeometry`, `size`, and `relativeTransform` on every node. This roughly doubles the payload size.

Use `--no-geometry` when you don't need vector path data. Width and height will fall back to `absoluteBoundingBox` during processing, which is accurate for non-rotated nodes.

```bash
specs fetch --no-geometry --verbose
```

### `--verbose`
Show request URLs and write locations.

## Examples

```bash
export FIGMA_TOKEN="YOUR_TOKEN"
specs fetch --verbose

# Only refresh foundations payloads
specs fetch --only foundations --verbose
```

## Fetching Icon Assets

Add `icons` to a source's `data` array to download the library's icon glyphs as SVG files:

```yaml
sources:
  library:
    key: YOUR_FILE_KEY
    data: ['file', 'variables', 'styles', 'icons']
```

How it works:

- Glyph components are **derived from the file payload** — every `COMPONENT` node whose name matches `config.processing.glyphNamePattern` (with `{i}` capturing the icon name). No `scan` step is involved.
- SVGs are exported through the Figma images API in batches and written to `<dataDirectory>/icons/`.
- Filenames are stable kebab-case slugs of the captured icon name, including camelCase splitting: `expandMore` → `expand-more.svg`, `Arrow Left` → `arrow-left.svg`.
- Two icons that slug identically keep the first as-is; later duplicates are suffixed with their node id so nothing is silently dropped.

### What gets exported

Each glyph is exported through Figma's images API, which renders the component **as it currently appears**:

- Only layers visible in the component's saved state are included — hidden layers are omitted from the SVG.
- Variables resolve to their default modes; the export does not enumerate other modes or variable states.
- One component exports one SVG. If a glyph component packs multiple icons toggled by boolean variables, only the default-visible icon is exported — that authoring pattern is not supported. Use one component per icon for complete asset coverage.

Because glyphs come from the saved file payload, `icons` runs after the other kinds. If the payload is missing, fetch exits with an error telling you to fetch `file` first.

```bash
# Refresh just the icon assets (file payload already on disk)
specs fetch --only library --verbose
```

The downloaded assets match the slugs referenced by generated component output (masked glyph spans resolve `/assets/icons/<slug>.svg`), so serving `<dataDirectory>/icons/` as a static assets directory — for example in Storybook — makes icons render without further mapping.

## Fetching Figma Branches

You can fetch data from a Figma branch instead of the main file by using the branch's file key in your `sources` config. Every Figma branch has its own unique key, which works anywhere a main file key does.

```yaml
sources:
  library:
    key: BRANCH_FILE_KEY   # branch key instead of main file key
    data: ['file', 'variables', 'styles']
```

### How to find a branch key

Open the branch in Figma — the URL contains the key: `figma.com/design/<KEY>/...`

### Data implications

- **File JSON** — Returns the branch's current state, including any unpublished component changes.
- **Variables** (`/variables/local`) — Returns **all** variables in the branch, including unpublished drafts not yet merged to main. This is what `fetch` uses.
- **Styles** — Returns the branch's current styles metadata, which may include unpublished changes.

> **Note:** The `/variables/published` endpoint (not used by `fetch`) only works with the main file key. Branches always return local/draft state.

### Custom tokens on branches

If you use `applyCustomTokens` with branch-fetched data, be aware that Figma variable and style IDs may differ between main and a branch. Your mapping file IDs must match the IDs in the branch's data files, not main's.

---

**See Also:**
- [Configuration Reference](/settings/) - dataDirectory and sources setup
- [Generate Command](/cli/commands/generate/) - Processing fetched data
