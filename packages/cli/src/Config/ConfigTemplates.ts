/**
 * Configuration Templates
 * 
 * Generates configuration templates with production-ready defaults
 * and inline documentation for the init command.
 */

import { CONFIG_DEFAULTS } from './ConfigDefaults.js';

/**
 * Generate a YAML configuration template with inline comments
 * Uses production-ready defaults.
 */
export function generateConfigTemplate(): string {
  return `# Specs CLI Configuration
#
# This file configures how Specs fetches and processes Figma component data.
# See: https://directededges.github.io/specs/config/

# ─── 'fetch'ed Sources (CLI only) ─────────────────────────────────────────────
# Where Figma data is fetched from and stored locally.

# Where fetch writes payloads, and where generate/scan read from.
dataDirectory: ${CONFIG_DEFAULTS.dataDirectory}

# Figma file sources to fetch and process.
# Example:
# sources:
#   library:
#     key: YOUR_FIGMA_FILE_KEY
#     data: [file, variables, styles]
sources: {}

# ─── 'generated' Output (CLI only) ──────────────────────────────────────────────
# Where spec files are written and how they are organized on disk.

# Default location for generated spec files (can override with -o flag).
outputDirectory: ${CONFIG_DEFAULTS.outputDirectory}

# Author name for generated specs (optional, defaults to "Unknown").
author: <Your Name Here>

# File structure options.
output:
  # Write one file per component instead of a single library file (default: false)
  splitComponents: false
  # Split output into separate api, variants, and examples files (default: false)
  splitConcerns: false
  # When splitComponents is true, nest each file in a subfolder (default: false)
  useSubfolders: false

# ─── Configuration options (same as the Figma plugin) ──────────────────────────────
# See: https://directededges.github.io/specs/config/

config:

  format:
    # Output format: JSON or YAML
    output: JSON

    # Key name transformation: SAFE, CAMEL, SNAKE, KEBAB, PASCAL, TRAIN
    # See: https://directededges.github.io/specs/config/keys/
    keys: SAFE

    # Layout representation: LAYOUT, PARENT_CHILDREN, or BOTH
    # See: https://directededges.github.io/specs/config/layout/
    layout: LAYOUT

    # Token reference format: TOKEN, TOKEN_NAME, TOKEN_FIGMA_EXTENSIONS, FIGMA_NAME, CUSTOM,
    # FIGMA_SYNTAX_WEB, FIGMA_SYNTAX_IOS, or FIGMA_SYNTAX_ANDROID
    # See: https://directededges.github.io/specs/config/tokens/
    # Requires a license key to resolve token references in output.
    tokens: TOKEN

    # Color value format: HEX, HEXA, RGB, RGBA, HSLA, HSB, OKLCH, OKLAB, or OBJECT
    # See: https://directededges.github.io/specs/config/color/
    color: HEX

  processing:
    # Subcomponent discovery configuration.
    # Presence of this block enables subcomponent detection; remove to disable.
    # See: https://directededges.github.io/specs/config/subcomponents/
    subcomponents:
      # Where to search: NESTED (component anatomy only) or PAGE (also search Figma page)
      # scope: NESTED

      # Template patterns defining which assets are subcomponents.
      # Uses {C} (component name) and {S} (subcomponent name) placeholders.
      match:
        - '{C} / _ / {S}'

      # Template patterns to exclude from matches (optional).
      # exclude:
      #   - '{C} / Examples / {S}'

    # Naming pattern to detect icon glyph instances. Use {i} as the placeholder
    # for the glyph name (e.g. 'DS Icon Glyph / {i}' matches
    # 'DS Icon Glyph / arrow-down' and extracts 'arrow-down').
    # glyphNamePattern: 'DS Icon Glyph / {i}'

    # Naming pattern for the code-only props container layer (e.g. 'Code only props')
    # Presence enables code-only prop extraction from matching layers.
    # codeOnlyPropsPattern: 'Code only props'

    # Consolidate slot constraints (anyOf, minItems, maxItems) from code-only props
    # into the slot property. Requires codeOnlyPropsPattern to be set. (default: false)
    slotConstraints: false

    # Maximum variant property depth to process: 1, 2, 3, or 9999 (unlimited)
    # See: https://directededges.github.io/specs/config/variant-depth/
    variantDepth: 9999

    # Detail level for variant data: FULL or LAYERED
    # See: https://directededges.github.io/specs/config/details/
    details: LAYERED

    # Infer number props: when true, TEXT code-only props whose values parse as
    # valid numbers are emitted as NumberProp instead of StringProp. (default: false)
    # inferNumberProps: false

    # Collapse primitive wrappers: when true, a component whose root is a plain
    # container wrapping a single text or glyph element (no meaningful container
    # styles, no slot bindings) is collapsed — the wrapper is stripped and the
    # leaf becomes the spec root. All-or-nothing across variants. (default: false)
    # collapsePrimitiveWrapper: false

  include:
    # Subcomponent inclusion is controlled by processing.subcomponents above.
    # If the subcomponents block is present, subcomponents are included.

    # Include invalid variant data in output (default: false)
    # invalidVariants: false

    # Calculate and include invalid property combinations (default: true)
    # Requires a license key to compute combinations in output.
    # invalidCombinations: true

    # Include layered variants that contain no elements (default: false)
    # emptyVariants: false

  # ─── Transform configuration ─────────────────────────────────────────────────
  # Transformers to run with \`specs transform\`. Absence means CLI defaults apply (contract).
  # transformers:
  #   - name: contract
  #   - name: css
  #   - name: styling
`;
}
