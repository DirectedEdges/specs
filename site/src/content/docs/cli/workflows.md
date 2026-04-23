---
title: "Workflows"
description: "Real-world usage patterns for single components, batch processing, and CI/CD integration"
---

Three ways to generate specs, depending on how many components you need:

- [**Single Component**](#single-component) — fetch and generate one component at a time
- [**Many Components**](#many-components) — curate a manifest and generate in batch
- [**CI/CD Integration**](#cicd-integration) — automate generation in a pipeline

## Single Component

Generate a spec for one component:

```bash
specs fetch --verbose

specs generate data/library.file.json \
  -c "DS Alert" \
  -o specs/alert.yaml \
  --verbose
```

### Using Node IDs

If component names have special characters or duplicates, use node IDs:

```bash
# Find the node ID from a manifest
specs scan -o manifest.md
# Look for: - [x] DS Button/Icon (5507:123, COMPONENT_SET)

# Generate by ID
specs generate data/library.file.json \
  -c "5507:123" \
  -o specs/button-icon.yaml
```

Use `--format json` to output JSON instead of YAML. See [Output configuration](/specs/config/output/) for all output modes and format options.

---

## Many Components

Process multiple components from a design system using a curated manifest.

### Step 1: Create Manifest

```bash
# Auto-resolves configured source; writes to data/{alias}.manifest.md by default
specs scan

# Or pass an explicit path:
specs scan data/design-system.file.json
```

### Step 2: Review and Edit

Open `data/design-system.manifest.md`:

```markdown
# Component Manifest

**Generated:** 2026-01-17T20:45:00.000Z
**File:** data/design-system.file.json
**Variables:** data/design-system.variables.json

## Components

- [x] DS Accordion (5507:24, COMPONENT_SET)
- [x] DS Alert (5507:26, COMPONENT_SET)
- [x] DS Avatar (5507:30, COMPONENT_SET)
- [x] DS Badge (5507:32, COMPONENT_SET)
- [ ] DS Divider OLD (5507:44, COMPONENT_SET)  # Exclude deprecated
- [x] DS Dropdown (5507:46, COMPONENT_SET)
...
```

Change `[x]` to `[ ]` for components to exclude.

### Step 3: Generate

```bash
# Zero-config: reads default manifest and writes to outputDirectory
specs generate --verbose

# Or with explicit paths:
specs generate components.md \
  -o specs/design-system.yaml \
  --verbose
```

Split output into per-component files, subfolders, or separate API and variant files using [output mode flags](/specs/config/output/).

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/generate-specs.yml
name: Generate Component Specs

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:  # Manual trigger
  push:
    paths:
      - 'manifests/**'
      - 'specs.config.yaml'

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
        run: specs generate
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

### Shell Script for Daily Sync

```bash
#!/bin/bash
set -e

echo "Fetching Figma data..."
specs fetch

echo "Generating component specs..."
specs generate --verbose

echo "Sync complete!"
```

---

## Tips

### Pipe to Other Tools

```bash
# Extract just props
specs generate lib.json -c "Button" | yq '.props'

# Format and validate
specs generate lib.json -c "Button" --format yaml | yamllint -

# Convert YAML to JSON
specs generate lib.json -c "Button" --format yaml | yq -o json > button.json

# Check component metadata
specs generate lib.json -c "Button" | yq '.metadata'
```

### Verbose Mode for Debugging

```bash
specs generate data/library.json \
  -c "DS Button" \
  --verbose \
  -o specs/button.yaml 2>&1 | tee debug.log
```

### Check Manifest Before Generating

```bash
# Count selected components
grep "^\- \[x\]" data/library.manifest.md | wc -l

# List selected component names
grep "^\- \[x\]" data/library.manifest.md | sed 's/- \[x\] \(.*\) (.*/\1/'
```

---

## Best Practices

### Version Control Manifests

Keep manifests in version control to track component selection:

```bash
git add data/library.manifest.md
git commit -m "feat: add Modal to component manifest"
```

### Document Manifest Curation

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

## See Also

- [CLI Overview](/specs/cli/) - Commands, Free vs Pro, output format
- [Configuration](/specs/config/) - Config file reference
- [Configuration Examples](/specs/config/examples/) - Dev, prod, and override configs
