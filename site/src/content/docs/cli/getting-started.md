---
title: "Getting Started"
---
Specs CLI generates component specifications from your Figma design system. This guide walks you through setup and your first spec generation.

:::tip[Using Claude Code?]
Skip the manual walkthrough. Paste this into Claude Code:

```
Onboard me to Specs CLI following the ONBOARDING.md instructions in this repo.
```

Claude will handle install, config, token setup, fetch, and your first generate — asking only the decisions that actually need you. See [`ONBOARDING.md`](https://github.com/DirectedEdges/specs/blob/main/ONBOARDING.md) in the repo root.
:::

**Quick nav:**
- [Step 1: Install](#step-1-install)
- [Step 2: Set up your environment](#step-2-set-up-your-environment)
- [Step 3: Fetch the Figma file](#step-3-fetch-the-figma-file)
- [Step 4: Scan and select components](#step-4-scan-and-select-components)
- [Step 5: Generate specs](#step-5-generate-specs)

---

## Step 1: Install

Specs CLI requires **[Node.js 18+](https://nodejs.org/)** (LTS recommended). Install it if you haven't already, then install Specs CLI globally:

```bash
npm install -g @directededges/specs-cli
specs --version
```

## Step 2: Set up your environment

Three things to configure: config files, your Figma file key, and a Figma access token.

### Initialize config

Scaffold the `config/` directory with sensible defaults:

```bash
specs init
```

This creates three files, each answering one question:

- **`config/conventions.yaml`** — facts about the Figma library: naming patterns, state classification, how images are expressed. See [Conventions](/schema/conventions/).
- **`config/settings.yaml`** — choices about the run: sources, spec output, assets. See [Settings](/schema/settings/).
- **`config/pipeline.yaml`** — transformers and analyses to run. See [Pipeline](/schema/pipeline/).

### Add your Figma file key

Open `config/settings.yaml` and add your Figma file key. Find it by copying your Figma file's URL — the key is the string between `/design/` (or `/file/`) and the file name:

```
https://www.figma.com/design/AbCdEfGhIjKlMnOpQr/My-Design-System
                             ^^^^^^^^^^^^^^^^^^
                             This is your file key
```

Add it under `data.sources`, which should be uncommented:

```yaml
data:
  directory: ./data
  sources:
    library:
      key: AbCdEfGhIjKlMnOpQr
      fetch: [file, variables, styles]
```

### Add your Figma access token

Create a `.env` file in your project directory (and add it to `.gitignore`):

```
FIGMA_TOKEN=your_figma_token_here
```

To create a token, go to [Figma Settings → Tokens](https://www.figma.com/settings/tokens), click **Create a new token**, and select these scopes: `file_metadata:read`, `file_content:read`, `library_assets:read`, `library_content:read`, and `file_variables:read`.

A **license key** is optional — Specs CLI works at a free tier without one. To unlock Pro features, add `SPECS_LICENSE_KEY` to your `.env` file. See [Licensing](/overview/licensing/) for details.

### Other configuration (optional)

The defaults from `specs init` work well for most setups. When you're ready to customize:

- **`data.directory` / `spec.directory`** in `config/settings.yaml` — where fetched data is stored and specs are written. Defaults: `./data` and `./specs`.
- **`spec.splitComponents` / `spec.splitConcerns` / `spec.useSubfolders`** in `config/settings.yaml` — controls file organization: split per component, split by concern, use subfolders. All default to `true`, which is the layout `transform` and `analyze` read.
- **`config/conventions.yaml`** — declare how your library names glyphs, subcomponents, and images, and classify variant props as [states](/settings/states/). See [Conventions](/schema/conventions/).
- **`config/pipeline.yaml`** — the transformers and analyses to run. See [Pipeline](/schema/pipeline/).

:::note[Upgrading from a single config file?]
A pre-split `specs.config.yaml` is no longer read — every command stops with an error until it's converted, and `specs init` refuses to scaffold over it. Run one command to convert it:

```bash
specs migrate config
```

It writes `config/conventions.yaml`, `config/settings.yaml`, and `config/pipeline.yaml` from your file, then renames the original to `specs.config.yaml.migrated`. See [`migrate`](/cli/commands/migrate/).
:::

## Step 3: Fetch the Figma file

Download raw data from your configured Figma sources:

```bash
specs fetch
```

## Step 4: Scan and select components

Scan your fetched data to build a manifest of available components:

```bash
specs scan
```

Then open the generated manifest (e.g., `data/library.manifest.md`) and adjust the `✓` column for the components you want:

```md
| ✓ | Name | ID | Type | Dev Status |
|------|------|------|------|------------|
| [ ] | _random Test experiment | 12:1 | COMPONENT | NONE |
| [x] | Button | 12:2 | COMPONENT_SET | READY_FOR_DEV |
| [x] | Card | 12:3 | COMPONENT_SET | READY_FOR_DEV |
| [ ] | InternalHelper | 12:4 | COMPONENT | NONE |
| [ ] | Slot utility | 12:5 | COMPONENT | NONE |
```

By default, `scan` checks only components marked **Ready for Dev** in Figma. If your file has no Dev Mode status set anywhere, it falls back to including every `COMPONENT_SET` and standalone `COMPONENT`. Re-running `scan` preserves your manual edits and only flips checkboxes when a component's `Dev Status` actually changes — pass `--keep-checks` to preserve them even then. See the [`scan`](/cli/commands/scan/) reference for full merge behavior.

## Step 5: Generate specs

By default, the `generate` command creates specs for all selected components.

```bash
specs generate
```

Once generated, open the specs file to review the results!

Alternatively, you can generate specs for one or some components.

### Single component

Generate a spec for one component directly from fetched data — useful when setting up or iterating:

```bash
specs generate data/library.file.json \
  -c "Button" \
  -o specs/button.yaml
```

### Subset of components

Generate specs for a few components without creating a manifest:

```bash
specs generate data/library.file.json \
  -c "Button" -c "Card" -c "Checkbox" \
  -o specs/subset.yaml
```

##  Operationalize: CI/CD pipeline

To operationalize spec generation, teams use a github action script that runs at a specific cadence.

```yaml
# .github/workflows/generate-specs.yml
name: Generate Component Specs
on:
  schedule:
    - cron: '0 0 * * *'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install -g @directededges/specs-cli

      - run: specs fetch
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}

      - run: specs generate
        env:
          SPECS_LICENSE_KEY: ${{ secrets.SPECS_LICENSE_KEY }}

      - run: |
          git config user.name "GitHub Actions"
          git add specs/
          git commit -m "Update specs" || true
          git push
```
