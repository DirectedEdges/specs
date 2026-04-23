---
title: "Examples"
description: "Real-world configuration examples for different environments and workflows"
---

## Development Config

Optimized for fast iteration:

```yaml
# specs.config.yaml (development)

config:
  processing:
    variantDepth: 1  # Faster processing
    details: FULL    # Complete data for debugging
  format:
    output: YAML  # Human-readable
    keys: SAFE    # Preserve Figma names
  include:
    invalidVariants: true  # Show issues
    invalidCombinations: true

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

## Production Config

Optimized for production output:

```yaml
# specs.config.yaml (production)

config:
  processing:
    variantDepth: 2
    details: LAYERED  # Compact output
  format:
    output: JSON  # Machine-readable
    keys: CAMEL   # Consistent naming
  include:
    invalidVariants: false  # Clean output
    invalidCombinations: false  # Omit combination analysis

dataDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

## Custom Config Location

Use project-specific config:

```bash
# Use custom config for this project
specs generate data/library.file.json \
  -c "Button" \
  --config ./configs/mobile.config.yaml \
  -o specs/mobile/button.yaml
```

## Override Config with Flags

Mix config file with CLI overrides:

```yaml
# specs.config.yaml
config:
  format:
    output: YAML
    keys: SAFE

dataDirectory: ./data
outputDirectory: ./specs

sources:
  library:
    key: REPLACE_WITH_LIBRARY_FILE_KEY
    data: ['file','variables','styles']
```

```bash
# Override format and variables for this command
specs generate data/library.file.json \
  -c "Button" \
  --format json \
  --variables ./custom/vars.json
```

**Result**: Uses `json` format and `./custom/vars.json`, but other config settings (keys, etc.) from config file.

## See Also

- [Configuration Overview](/specs/config/) - Priority system and best practices
- [CLI Workflows](/specs/cli/workflows/) - Command-line workflow examples
