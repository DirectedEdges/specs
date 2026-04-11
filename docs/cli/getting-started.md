# Getting Started with Specs CLI

Specs CLI generates component specifications from your Figma design system. This guide walks you through setup and your first spec generation.

**Quick nav:**
- [Prerequisite: Node.js](#prerequisite-nodejs)
- [Step 1: Install Specs CLI](#step-1-install-specs-cli)
- [Step 2: Initialize configuration](#step-2-initialize-configuration)
- [Step 3: Edit configuration](#step-3-edit-configuration)
- [Step 4: Set up environment variables](#step-4-set-up-environment-variables)
- [Step 5: Fetch Figma data](#step-5-fetch-figma-data)
- [Step 6: Audit components](#step-6-audit-components)
- [Step 7: Select components](#step-7-select-components)
- [Step 8: Generate specs](#step-8-generate-specs)
- [Alternative approaches to generate](#alternative-approaches-to-generate)
- [Commands Reference](./commands/)

---

## Prerequisite: Node.js

Specs CLI is a command-line tool that runs on **Node.js** — a runtime that lets you execute JavaScript tools from your terminal. If you don't have Node.js installed, download it:

- **[Download Node.js 18+](https://nodejs.org/)**
- Choose the LTS (Long Term Support) version

Verify it installed correctly:

```bash
node --version
npm --version
```

Both commands should show version numbers (e.g., `v20.10.0`).

> **What's npm?** npm is Node's package manager — it downloads and installs command-line tools like Specs CLI.

## Step 1: Install Specs CLI

Install globally so you can run it with the `specs` command:

```bash
npm install -g @directededges/specs-cli
```

Verify the installation:

```bash
specs --version
```

> **Alternative: use without installing.** Run on-the-fly with `npx @directededges/specs-cli <command>`. Useful if you only use Specs CLI occasionally.

## Step 2: Initialize configuration

Create a `.specs.config.yaml` file with production-ready defaults:

```bash
specs init
```

This generates a config file in your current directory with inline documentation and sensible defaults. The next step walks through the sections you'll want to customize.

## Step 3: Edit configuration

Open `.specs.config.yaml` in your editor. The file has four main sections to configure.

### Figma file key

Each source needs a Figma file key. To find it, copy the link to your Figma file — the key is the string between `/design/` (or `/file/`) and the file name:

```
https://www.figma.com/design/AbCdEfGhIjKlMnOpQr/My-Design-System
                             ^^^^^^^^^^^^^^^^^^
                             This is your file key
```

Add and name (such as `library`) one or more sources with keys and types of data to download from each:

```yaml
sources:
  library:
    key: AbCdEfGhIjKlMnOpQr
    data: [file, variables, styles]
  foundations:
    key: StUvWxYz1234567890
    data: [variables, styles]
```

Each source has a name (e.g., `library`), a `key`, and a `data` array specifying which Figma payloads to fetch. Sources that contain components typically need `file`, while token-only sources may only need `variables` and `styles`.

### Source and output directories

```yaml
sourceDirectory: ./data        # Where fetch writes Figma payloads
outputDirectory: ./specs       # Default location for generated specs
```

- **`sourceDirectory`** is where `specs fetch` saves raw Figma data (JSON files). Other commands like `audit` and `generate` read from here.
- **`outputDirectory`** is the default destination for generated spec files. You can override it per-command with the `-o` flag.

### Config

The `config` section controls how Specs processes components and formats output. These settings are shared with the Figma plugin:

```yaml
config:
  format:
    output: JSON
    keys: SAFE
    layout: LAYOUT
    tokens: TOKEN

  processing:
    variantDepth: 9999
    details: LAYERED

  include:
    invalidVariants: false
    invalidCombinations: true
```

- **`format`** — output shape (JSON/YAML, key casing, layout representation, token format)
- **`processing`** — how components are analyzed (variant depth, detail level, subcomponent detection)
- **`include`** — what to include in output (invalid variants, invalid combinations)

Optional features like `subcomponents`, `glyphNamePattern`, and `codeOnlyPropsPattern` are off by default. Add them to `processing` when needed — see [Configuration Reference](./configuration.md).

See [Configuration Reference](./configuration.md) for all options and allowed values.

### Output

The `output` section controls how generated files are organized:

```yaml
output:
  splitComponents: false  # true = separate file per component
  splitConcerns: false    # true = separate API from variants
  useSubfolders: false    # true = component subdirectories
```

These default to `false`. You can also control these per-command with flags like `--split-components`.

## Step 4: Set up environment variables

Create a `.env` file in your project directory for your Figma token and (optionally) your license key:

```
FIGMA_TOKEN=your_figma_token_here
SPECS_LICENSE_KEY=your_license_key_here
```

Add `.env` to your `.gitignore` so credentials aren't committed:

```
.env
```

Specs CLI automatically loads `.env` from your current directory when you run commands.

### Figma Personal Access Token

You need a [Figma REST API](https://www.figma.com/developers/api) token to authenticate.

1. Go to [Figma Settings → Tokens](https://www.figma.com/settings/tokens)
2. Click **Create a new token**
3. Choose a name (e.g., "Specs CLI")
4. Select scopes:
  - `file_metadata:read` (file metadata)
  - `file_content:read` (file contents, nodes)
  - `library_assets:read` (published components and styles)
  - `library_content:read` (published styles of files)
  - `file_variables:read` (variables in files, Enterprise plan only)
5. Click **Create token** and copy it

> **Alternative:** You can also export the token in your shell: `export FIGMA_TOKEN="your_token_here"`.

### License key (optional)

Specs CLI works at a **free tier** without a license key. Free-tier specs include full component structure — anatomy, props, default variant, layout, and raw style values.

With a **Pro license key**, specs also include all non-default variants, design token references, named style references, prop bindings, and invalid variant combination analysis. See [Licensing](../licensing.md) for full details.

Add `SPECS_LICENSE_KEY` to your `.env` file as shown above. You can also pass it per-command with the `-l` flag:

```bash
specs generate components.md -o specs/all.yaml -l "your-license-key"
```

## Step 5: Fetch Figma data

Download raw data from your configured Figma sources:

```bash
specs fetch
```

This writes JSON data downloaded from the Figma REST API to your `sourceDirectory` (e.g., `./data/library.file.json`, `./data/library.variables.json`).

## Step 6: Audit components

Discover components in a fetched file and build a manifest of components to potentially generate specs. By default, all components are checked.

```bash
specs audit data/library.file.json -o components.md
```

## Step 7: Select components

Open `components.md` and select components to generate specs for. Check `[x]` to include, uncheck `[ ]` to exclude.

```md
- [ ] _random Test experiment component
- [x] Button
- [x] Card
- [ ] InternalHelper
- [ ] Slot utility
```

## Step 8: Generate specs

Generate specs for the selected components:

```bash
specs generate components.md -o specs/design-system.yaml
```

This reads the manifest, processes each selected component, and writes the output to the specified file (or directory, if using `--split-components`).

---

## Alternative approaches to generate

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

### CI/CD pipeline

Automate spec generation in your build:

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

      - run: specs generate components.md -o specs/design-system.yaml
        env:
          SPECS_LICENSE_KEY: ${{ secrets.SPECS_LICENSE_KEY }}

      - run: |
          git config user.name "GitHub Actions"
          git add specs/
          git commit -m "Update specs" || true
          git push
```
