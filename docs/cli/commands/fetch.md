# `fetch` Command

Fetch raw Figma REST API payloads for configured sources.

## Usage

```bash
specs fetch [options]
```

## Requirements

- `FIGMA_TOKEN` must be set in your environment.
- `.specs.config.yaml` must include `sourceDirectory` and `sources`.

## Options

### `--config <path>`
Use a specific config file.

### `--outDir <dir>`
Override output directory for fetched payloads. Defaults to `sourceDirectory` from config, or `./data` if not configured.

```bash
specs fetch --outDir ./custom-data
```

### `--only <alias[,alias...]>`
Fetch only specific aliases from `sources`.

### `--verbose`
Show request URLs and write locations.

## Examples

```bash
export FIGMA_TOKEN="YOUR_TOKEN"
specs fetch --verbose

# Only refresh foundations payloads
specs fetch --only foundations --verbose
```

---

**See Also:**
- [Configuration Reference](../configuration.md) - sourceDirectory and sources setup
- [Generate Command](./generate.md) - Processing fetched data
