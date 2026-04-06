# CLI Usage Examples

Real-world examples and workflows for the Specs command-line interface.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Configuration Examples](#configuration-examples)
- [Manifest Processing](#manifest-processing)
- [Advanced Workflows](#advanced-workflows)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Basic Examples

### Example 1: Single Component Generation

Generate a spec for one component.

**Input Files:**
```
project/
├── data/
│   ├── library.file.json
│   ├── library.variables.json
│   ├── library.styles.json
│   ├── foundations.variables.json
│   └── foundations.styles.json
```

**Command:**
```bash
specs fetch --verbose

specs generate data/library.file.json \
  -c "DS Alert" \
  -o specs/alert.yaml \
  --verbose
```

**Output (example):**
```
[CLI] Loading file: data/library.file.json
[CLI] File loaded: DE Library
[CLI] Total nodes: 5247, Components: 164
[CLI] Loaded variables from data/library.variables.json
[CLI] Loaded styles from data/library.styles.json
[CLI] Found component: DS Alert (5507:26)
[CLI] Generating specification...
[CLI] Specification generated successfully
[CLI] Output written to: specs/alert.yaml
```

**Generated File:** `specs/alert.yaml`

```yaml
title: DS Alert
props:
  variant:
    type: variant
    values: [info, warning, error, success]
  size:
    type: variant
    values: [small, medium, large]
anatomy:
  - id: container
    name: Container
    type: FRAME
  - id: icon
    name: Icon
    type: INSTANCE
  - id: message
    name: Message
    type: TEXT
variants:
  - props:
      variant: info
      size: medium
    anatomy:
      container:
        styles:
          backgroundColor:
            value: { r: 0.9, g: 0.95, b: 1 }
            type: ABSOLUTE
```

---

### Example 2: Using Node IDs

If component names have special characters or duplicates, use node IDs.

**Find Node ID:**
```bash
# List all components with IDs
specs audit data/library.file.json -o manifest.md

# Look in manifest.md:
# - [x] DS Button/Icon (5507:123, COMPONENT_SET)
```

**Generate by ID:**
```bash
specs generate data/library.file.json \
  -c "5507:123" \
  -o specs/button-icon.yaml
```

---

### Example 3: JSON Output Format

Generate output in JSON instead of YAML.

**Single Component:**
```bash
specs generate data/library.file.json \
  -c "DS Button" \
  --format json \
  -o specs/button.json
```

**From Manifest:**
```bash
specs generate components.md \
  --format json \
  -o specs/all-components.json
```

**Result:** Valid JSON file with same structure as YAML.

---

### Example 4: With License Key

Generate Pro-tier specs that include token references and variable bindings.

```bash
# Set license key in environment
export SPECS_LICENSE_KEY="your-license-key"

# Single component
specs generate data/library.file.json -c "DS Button" -o specs/button.yaml

# From manifest
specs generate components.md -o specs/all.yaml
```

Output includes license status:
```
License: PRO (active)
✓ Saved to specs/button.yaml
```

---

## Configuration Examples

### Example 5: Using Config File

Create `.specs.config.yaml` for consistent settings:

**Config File:**
```yaml
# .specs.config.yaml

sourceDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
  foundations:
    key: REPLACE_WITH_FOUNDATIONS_FILE_KEY
    data: ['variables','styles']

model:
  processing:
    subcomponents:
      match:
        - '{C} / _ / {S}'
    variantDepth: 2
    details: FULL

  format:
    output: YAML
    keys: CAMEL
    layout: LAYOUT
    tokens: TOKEN

  include:
    invalidVariants: false
    invalidCombinations: false
```

**Command (uses config automatically):**
```bash
specs fetch
specs generate data/library.file.json -c "DS Button" -o specs/button.yaml
```

**Result:** All settings from config file are applied automatically.

---

### Example 6: Override Config with Flags

Mix config file with CLI overrides.

**Config File:**
```yaml
# .specs.config.yaml
model:
  format:
    output: YAML
    keys: SAFE

sources:
  variables: ./data/vars.json
```

**Command (override format and variables):**
```bash
specs generate data/library.json \
  -c "DS Button" \
  --format json \
  --variables ./custom/vars.json \
  -o specs/button.json
```

**Result:**
- Output format: `JSON` (from CLI flag, overrides config)
- Variables: `./custom/vars.json` (from CLI flag, overrides config)
- Keys format: `SAFE` (from config, no CLI override)

---

### Example 7: Environment-Specific Configs

Use different configs for different environments.

**Directory Structure:**
```
project/
├── .specs.config.yaml           # Default (development)
├── .specs.production.yaml       # Production
├── .specs.staging.yaml          # Staging
```

**Development (uses default):**
```bash
specs generate data/library.json -c "Button" -o dev/button.yaml
```

**Production:**
```bash
specs generate data/library.json \
  -c "Button" \
  --config .specs.production.yaml \
  -o prod/button.yaml
```

---

## Manifest Processing

### Example 8: Complete Manifest Workflow

Process multiple components from a design system.

**Step 1: Create Manifest**
```bash
specs audit data/design-system.json -o components.md
```

**Output:**
```
✓ Scanned design-system.json
✓ Found 164 components
✓ Saved to components.md
```

**Step 2: Review & Edit Manifest**

Open `components.md`:

```markdown
# Component Manifest

**Generated:** 2026-01-17T20:45:00.000Z
**File:** data/design-system.json
**Variables:** data/design-system-variables.json

## Components

- [x] DS Accordion (5507:24, COMPONENT_SET)
- [x] DS Alert (5507:26, COMPONENT_SET)
- [x] DS Avatar (5507:30, COMPONENT_SET)
- [x] DS Badge (5507:32, COMPONENT_SET)
- [ ] DS Divider OLD (5507:44, COMPONENT_SET)  # Exclude deprecated
- [x] DS Dropdown (5507:46, COMPONENT_SET)
...
```

**Edit:** Change `[x]` to `[ ]` for components to exclude.

**Step 3: Generate Specs**
```bash
specs generate components.md \
  -o specs/design-system.yaml \
  --verbose
```

**Output:**
```
✓ Loaded manifest: 164 components (18 selected)
⏳ Processing 18 components...

[1/18] DS Accordion... ✓
[2/18] DS Alert... ✓
...
[18/18] DS Toggle... ✓

✓ Generated specs
  - 18 components successful
✓ Saved to specs/design-system.yaml
```

---

### Example 9: Output Mode Variations

**Per-component files (flat):**
```bash
specs generate components.md -o specs/ --split-components
```

**Per-component files with subfolders:**
```bash
specs generate components.md -o specs/ --split-components --use-subfolders
```

**Split API from variants:**
```bash
specs generate components.md -o specs/ --split-concerns
```

**Maximum organization — component dirs with concern files:**
```bash
specs generate components.md -o specs/ --split-components --split-concerns
```

---

### Example 10: Category-Based Processing

Organize components by category.

**Create Category Manifests:**

```bash
# Generate full manifest
specs audit data/library.json -o all-components.md

# Create atoms manifest (manually or with script)
grep "Button\|Input\|Icon" all-components.md > atoms.md

# Add required header
cat > manifests/atoms.md << EOF
# Component Manifest

**File:** data/library.json
**Variables:** data/library-variables.json

## Components

EOF
grep "\[x\]" atoms.md >> manifests/atoms.md

# Repeat for molecules, organisms...
```

**Generate Specs by Category:**
```bash
specs generate manifests/atoms.md -o specs/atoms.yaml
specs generate manifests/molecules.md -o specs/molecules.yaml
specs generate manifests/organisms.md -o specs/organisms.yaml
```

---

## Advanced Workflows

### Example 11: Pipe to Other Tools

Use CLI output with other command-line tools.

**Extract Props Only:**
```bash
specs generate lib.json -c "Button" | yq '.props'
```

**Format and Validate:**
```bash
specs generate lib.json -c "Button" --format yaml | yamllint -
```

**Convert YAML to JSON:**
```bash
specs generate lib.json -c "Button" --format yaml | yq -o json > button.json
```

**Check Component Metadata:**
```bash
specs generate lib.json -c "Button" | yq '.metadata'
```

---

### Example 12: Verbose Logging for Debugging

Enable detailed logging for troubleshooting.

**Command:**
```bash
specs generate data/library.json \
  -c "DS Button" \
  --verbose \
  -o specs/button.yaml 2>&1 | tee debug.log
```

**Output includes:**
- File loading details
- Node count statistics
- Variables loaded (count and collections)
- Component processing steps
- Style resolution details
- Timing information

**Example Output:**
```
[CLI] Loading file: data/library.json
[CLI] File loaded: library.json
[CLI] Total nodes: 5247, Components: 164
[CLI] Found variables: data/library-variables.json
[CLI] Loaded 215 variables from 12 collections
[CLI] Found component: DS Button (5507:36)
[CLI] Generating specification...
[CLI] Using config:
{
  "processing": {
    "subcomponents": {
      "match": ["{C} / _ / {S}"]
    },
    "variantDepth": 2,
    "details": "FULL"
  },
  "format": {
    "output": "YAML",
    "keys": "SAFE",
    "layout": "LAYOUT"
  },
  "include": {
    "invalidVariants": false,
    "invalidCombinations": false
  }
}
[CLI] Specification generated successfully
[CLI] Output written to: specs/button.yaml
```


---

## Integration Examples

### Example 13: GitHub Actions CI/CD

Automate spec generation in GitHub Actions.

**Workflow File:** `.github/workflows/generate-specs.yml`

```yaml
name: Generate Component Specs

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:  # Manual trigger
  push:
    paths:
      - 'manifests/**'
      - '.specs.config.yaml'

jobs:
  generate-specs:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Specs CLI
        run: npm install -g @directededges/specs-cli

      - name: Fetch Figma data
        run: specs fetch
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}

      - name: Generate component specs
        run: specs generate manifests/components.md -o specs/design-system.yaml
        env:
          SPECS_LICENSE_KEY: ${{ secrets.SPECS_LICENSE_KEY }}

      - name: Commit updated specs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add specs/ data/
          git diff --staged --quiet || git commit -m "chore: update component specs"
          git push
```

**Secrets Required:**
- `FIGMA_TOKEN` - Figma Personal Access Token
- `SPECS_LICENSE_KEY` - Specs license key (optional, for Pro features)

---

### Example 14: Shell Script for Daily Sync

Automated script to sync Figma data and generate specs.

**Script:** `scripts/sync-specs.sh`

```bash
#!/bin/bash
set -e

echo "Fetching Figma data..."
specs fetch

echo "Generating component specs..."
specs generate manifests/components.md \
  --output specs/design-system.yaml \
  --verbose

echo "Sync complete!"
```

**Make Executable:**
```bash
chmod +x scripts/sync-specs.sh
```

**Run:**
```bash
./scripts/sync-specs.sh
```

---

## Best Practices

### Practice 1: Version Control Manifests

Keep manifests in version control to track component selection:

```bash
# Add manifest
git add manifests/components.md
git commit -m "feat: add Modal to component manifest"

# Review changes
git diff manifests/components.md
```

**Benefits:**
- Track which components are included over time
- Review changes in pull requests
- Rollback to previous component sets

---

### Practice 2: Document Manifest Curation

Add comments explaining why components are included/excluded:

```markdown
## Components

<!-- Core navigation components -->
- [x] DS Button (1234:1, COMPONENT_SET)
- [x] DS Link (1234:2, COMPONENT_SET)

<!-- Exclude deprecated components -->
- [ ] DS Button OLD (1234:3, COMPONENT_SET)

<!-- Icons documented separately -->
- [ ] Icon / Menu (1234:4, COMPONENT)

<!-- Work in progress - not ready for docs -->
- [ ] DS Tooltip NEW (1234:5, COMPONENT_SET)
```

---

### Practice 3: Use Config for Team Consistency

Share `.specs.config.yaml` across team for consistent output:

```yaml
# .specs.config.yaml - Team standards

model:
  format:
    output: YAML        # Human-readable for reviews
    keys: CAMEL         # Consistent with codebase
  include:
    invalidVariants: false  # Clean output
```

**Commit to repo:**
```bash
git add .specs.config.yaml
git commit -m "docs: add Specs CLI configuration"
```

---

### Practice 4: Store License Key in CI Secrets

Never commit license keys to your repository. Use environment variables or CI secrets:

```bash
# Local development
echo 'SPECS_LICENSE_KEY=your-key' >> .env

# CI/CD
# Add SPECS_LICENSE_KEY as a secret in your CI provider
```

---

## Custom Token Names

### Full Pipeline: Fetch, Augment, Generate

Use `applyCustomTokens` to inject custom token objects into fetched data before generating specs with the `CUSTOM` token format.

**1. Configure `format.tokens: CUSTOM` in `.specs.config.yaml`:**

```yaml
model:
  format:
    tokens: CUSTOM
```

**2. Create a mapping file (`data/token-mappings.json`):**

```json
{
  "VariableID:4350:72": {
    "$custom": {
      "$token": "tokens/$brand#/color/$theme/outline",
      "$type": { "$ref": "foundations#/definitions/color" }
    }
  }
}
```

**3. Run the pipeline:**

```bash
# Fetch latest data from Figma
specs fetch

# Inject custom token objects into variables and styles
specs applyCustomTokens data/token-mappings.json

# Generate specs — matched variables use $custom verbatim,
# unmatched fall back to TOKEN_FIGMA_EXTENSIONS format
specs generate components.md -o specs/
```

**4. Verify output:**

Matched variables produce:
```yaml
backgroundColor:
  $token: tokens/$brand#/color/$theme/outline
  $type:
    $ref: foundations#/definitions/color
```

Unmatched variables fall back to:
```yaml
backgroundColor:
  $token: Color.Primary
  $type: color
  $extensions:
    com.figma:
      id: VariableID:1:11
      rawValue: "#1669E3"
      name: Text/Primary
      collectionName: DS Color
```

---

## See Also

- [Getting Started](./getting-started.md) - Installation and setup
- [Configuration](./configuration.md) - Config file reference
- [Commands Reference](./commands/) - Detailed command docs

---

**Last Updated**: March 2026
