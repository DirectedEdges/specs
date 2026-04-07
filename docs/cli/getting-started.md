# Getting Started with Specs CLI

Specs CLI generates component specifications from your Figma design system. This guide walks you through setup and your first spec generation.

**Quick nav:**
- [Step 1: Install Node.js](#step-1-install-nodejs)
- [Step 2: Set Your Figma Token](#step-2-set-your-figma-token)
- [Step 3: Set Your License Key (optional)](#step-3-set-your-license-key-optional)
- [Step 4: Install Specs CLI](#step-4-install-specs-cli)
- [Configuration](#configuration)
- [Workflows](#workflows)
- [Commands Reference](./commands/)

---

## Step 1: Install Node.js

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

## Step 2: Set Your Figma Token

Specs CLI uses the [Figma REST API](https://www.figma.com/developers/api) to read your design files. You need an access token to authenticate.

### Create a Personal Access Token

1. Go to [Figma Settings → Tokens](https://www.figma.com/settings/tokens)
2. Click **Create a new token**
3. Choose a name (e.g., "Specs CLI")
4. Select scopes:
  - `file_metadata:read` (file metadata)
  - `file_content:read` (file contents, nodes)
  - `library_assets:read` (published components and styles)
  - `file_variables:read` (variables in files, Enterprise plan only)
5. Click **Create token** and copy it

### Save Your Token to `.env`

Create a `.env` file in your project directory:

```
FIGMA_TOKEN=your_token_here
```

Add `.env` to your `.gitignore` so the token isn't committed:

```
.env
```

Specs CLI automatically loads `.env` from your current directory when you run commands.

> **Alternative:** You can also export the token in your shell: `export FIGMA_TOKEN="your_token_here"`.

## Step 3: Set Your License Key (optional)

Specs CLI works at a **free tier** without a license key. Free-tier specs include full component structure — anatomy, props, variants, layout, and raw style values.

With a **Pro license key**, specs also include design token references, variable bindings, and visibility bindings that connect your component specs to your design token system.

### Save Your License Key

Add your license key to your `.env` file alongside your Figma token:

```
FIGMA_TOKEN=your_figma_token_here
SPECS_LICENSE_KEY=your_license_key_here
```

The CLI loads this automatically. You can also pass it per-command with the `-l` flag:

```bash
specs generate components.md -o specs/all.yaml -l "your-license-key"
```

### License Status

When a license key is set, the CLI displays its status:

```
License: PRO (active)
```

If the key is invalid or expired, the CLI falls back to the free tier and shows the reason:

```
License: FREE (invalid — key not recognized)
```

## Step 4: Install Specs CLI

Choose one installation method:

### Option A: Global Install (Recommended)

Install once, use everywhere:

```bash
npm install -g @directededges/specs-cli
```

Then run commands from anywhere:

```bash
specs --version
specs init
```

### Option B: Use Without Installing (npx)

Run on-the-fly without installing globally:

```bash
npx @directededges/specs-cli --version
npx @directededges/specs-cli init
```

> **What's npx?** It downloads and runs the tool temporarily. Useful if you only use Specs CLI occasionally.

---

## Configuration

### Initialize Project Configuration

Create a `.specs.config.yaml` file with defaults:

```bash
specs init
```

Edit `.specs.config.yaml` to add your Figma file keys:

```yaml
sourceDirectory: ./data        # Where fetch writes payloads
outputDirectory: ./specs       # Default output for generated specs

sources:
  library:
    key: YOUR_FIGMA_FILE_KEY
    data: [file, variables, styles]
  foundations:
    key: YOUR_FIGMA_FILE_KEY
    data: [variables, styles]

model:
  processing:
    subcomponents:
      match:
        - '{C} / _ / {S}'
    variantDepth: 2
  format:
    output: YAML
    keys: CAMEL

output:
  splitComponents: false  # true = separate file per component
  splitConcerns: false    # true = separate API from variants
  useSubfolders: false    # true = component subdirectories
```

See [Configuration Reference](./configuration.md) for all options.

## Workflows

Commands vary depending on your workflow and include:

- [`init`](./commands/init.md) - Scaffold config file
- [`fetch`](./commands/fetch.md) - Download Figma data
- [`audit`](./commands/audit.md) - Create component manifest for generate
- [`generate`](./commands/generate.md) - Generate specs from a manifest or single component

Additional helpful references are:

- [Commands](./commands/) - Detailed command documentation
- [Examples](./examples.md) - Real-world usage patterns

### 1: Generate from Manifest (recommended)

Generate specs for multiple components at once:

```bash
# Fetch Figma data
specs fetch

# Create manifest of all components
specs audit data/library.file.json -o components.md

# Edit components.md: mark [x] to include, [ ] to exclude

# Generate specs for selected components
# Single file (default)
specs generate components.md -o specs/design-system.yaml

# Or use per-component files for easier collaboration
specs generate components.md -o specs/ --split-components
```

### 2: Single Component

Generate a spec for one component — useful when setting up or iterating:

```bash
# Fetch Figma data
specs fetch

# Generate component spec
specs generate data/library.file.json \
  -c "Button" \
  -o specs/button.yaml
```

### 3: CI/CD Pipeline

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
