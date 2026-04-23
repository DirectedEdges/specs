---
title: "applyCustomTokens"
---
Inject `$custom` token objects from a mapping file into fetched variables and styles JSON files.

## Usage

```bash
specs applyCustomTokens <mapping> [options]
```

## Arguments

### `<mapping>`
Path to a JSON mapping file. Each key is a Figma variable or style ID, and the value must contain a `$custom` property (a non-null object). Other properties in the mapping entries are ignored.

**Mapping file format:**
```json
{
  "VariableID:4350:72": {
    "$custom": {
      "$token": "tokens/$brand#/color/$theme/outline",
      "$type": { "$ref": "foundations#/definitions/color" }
    },
    "figmaVariable": "Color.Outline"
  }
}
```

## Options

### `-v, --variables <path>`
Path to a variables JSON file. Overrides config-based file discovery.

### `-s, --styles <path>`
Path to a styles JSON file. Overrides config-based file discovery.

### `--config <path>`
Use a specific config file instead of auto-discovery.

## Config Integration

When `-v` and `-s` are not provided, the command auto-discovers data files using `specs.config.yaml`:

1. Reads `dataDirectory` for the data folder path
2. Reads `sources` entries to locate `{alias}.variables.json` and `{alias}.styles.json` files

## Behavior

- Reads the mapping file and extracts entries with `$custom` properties
- For each variables/styles file, matches Figma IDs and injects the `$custom` object
- Files are modified in place (overwritten with augmented data)
- Running twice is idempotent: existing `$custom` values are overwritten with the latest mapping
- Last occurrence wins if a mapping ID appears in multiple entries

> **Important:** Injecting `$custom` tokens only augments the raw data files. To include custom tokens in `generate` output, you must set `format.tokens` to `CUSTOM` in your `specs.config.yaml`:
>
> ```yaml
> format:
>   tokens: CUSTOM
> ```
>
> Without this setting, `generate` will use the default token format and the injected `$custom` objects will be ignored.

## Status Summary

- **Empty mapping** (no `$custom` entries): `No custom tokens found in mapping file. No files were modified.`
- **Successful augmentation**: Reports count of matched variables and styles
- **Unmatched IDs**: Reports count of mapping entries that didn't match any variable or style

## Error Scenarios

- **Mapping file not found**: Error with file path
- **Malformed JSON**: Error identifying the file
- **Invalid `$custom` value** (not a non-null object): Error identifying the specific entry
- **No data files found**: Error suggesting `-v`/`-s` flags or config setup

## Examples

```bash
# Using explicit file paths
specs applyCustomTokens data/token-mappings.json \
  -v data/library.variables.json \
  -s data/library.styles.json

# Using config-based discovery (reads specs.config.yaml)
specs applyCustomTokens data/token-mappings.json

# Full pipeline: fetch, augment, then generate specs
# Requires format.tokens: CUSTOM in specs.config.yaml
specs fetch
specs applyCustomTokens data/token-mappings.json
specs generate
```

## Branch-Fetched Data

If your data files were fetched from a Figma branch (using a branch file key in `sources`), variable and style IDs in those files may differ from the IDs on main. Your mapping file must use the IDs that appear in the branch data — not the main file's IDs.

To verify which IDs are present, inspect the fetched `*.variables.json` or `*.styles.json` files directly. If you maintain separate mapping files per branch, keep them alongside the branch data.

See [Fetching Figma Branches](/specs/cli/commands/fetch.md/#fetching-figma-branches) for more details.

---

**See Also:**
- [Configuration Reference](/specs/config/) - dataDirectory and sources setup
- [Generate Command](/specs/cli/commands/generate/) - Processing augmented data with `format.tokens: CUSTOM`
- [Fetch Command](/specs/cli/commands/fetch/) - Fetching raw data before augmentation
