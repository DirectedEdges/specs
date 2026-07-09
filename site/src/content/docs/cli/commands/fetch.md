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
- Fetching `variables` or `styles` requires your Figma organization to be on an **Enterprise** plan — Figma restricts those REST endpoints regardless of your Specs license. `file` data works on any plan. See [CLI Requirements](/cli/#requirements).

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
