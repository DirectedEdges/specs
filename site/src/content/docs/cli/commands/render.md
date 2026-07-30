---
title: "render"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Sends a spec (or a batch of specs) to a running CLI bridge, which renders the matching component live in a Figma file — creating or updating it.

This is the reverse of the rest of the CLI: instead of reading Figma and producing a spec, `render` reads a spec and renders it in Figma. It requires a local CLI bridge session — see the [Render to Figma guide](/guides/render-to-figma/) for full setup before running this command for the first time.

## Usage

```bash
specs render [specPath] [options]
```

## Arguments

### `[specPath]`

Path to a single spec YAML file to render. Optional — when omitted, `render` looks for `--manifest`, then falls back to a default render manifest at `{dataDirectory}/{alias}.render-manifest.md` (same source-alias resolution as [`generate`](/cli/commands/generate/) and [`scan`](/cli/commands/scan/)).

```bash
specs render specs/deButton.yaml
```

## Options

### `-m, --manifest <path>`

Render every spec listed in a render manifest — a plain text file, one relative spec path per line, `#`-prefixed lines ignored. Specs render sequentially, in file order, so later entries in the same batch can reference components rendered earlier in it.

```bash
specs render --manifest data/library.render-manifest.md
```

### `--config <path>`

Use a specific config file instead of the default `specs.config.yaml`.

### `--no-return-spec`

By default, `render` asks the bridge to generate a fresh spec from the newly rendered Figma node and prints a confirmation that it received it — useful for spot-checking that the render landed as expected. Pass `--no-return-spec` to skip this and only get the node ID back.

```bash
specs render specs/deButton.yaml --no-return-spec
```

## Examples

```bash
# Render one component
specs render specs/deButton.yaml

# Render a curated batch
specs render --manifest data/library.render-manifest.md

# Render without the round-trip spec check
specs render specs/deButton.yaml --no-return-spec
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (bridge unreachable, render failed) |
| `2` | Invalid arguments — no spec path resolvable and no default render manifest found |
| `7` | CLI bridge not available in this install (see below) |

## Availability

`render` only works against a local, file-linked checkout of `@directededges/specs-from-figma` on its writer branch — it is not available in a published `specs-cli` install from npm. Running it in an unsupported environment exits immediately with code `7` and a message pointing at this limitation.

---

**See Also:**

- [Render to Figma](/guides/render-to-figma/) — bridge architecture, setup, and prerequisites
- [`scan`](/cli/commands/scan/) — refreshes the manifest data `render` uses to bind styles, variables, and glyphs
- [`generate`](/cli/commands/generate/) — produces the specs that `render` consumes
