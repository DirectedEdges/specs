/**
 * Configuration Templates
 * 
 * Generates configuration templates with production-ready defaults
 * and inline documentation for the init command.
 */

import { CONFIG_DEFAULTS } from './ConfigDefaults.js';
import { DEFAULT_CONFIG } from '@directededges/specs-schema';

/**
 * Generate a YAML configuration template with inline comments
 * Uses production-ready defaults.
 */
export function generateConfigTemplate(): string {
  return `# Specs CLI Configuration (production-ready defaults)
#
# This file configures how Specs fetches and processes Figma component data.
# See: docs/cli/configuration.md for complete documentation.

# Where fetch writes payloads, and where generate/batch read from.
sourceDirectory: ${CONFIG_DEFAULTS.sourceDirectory}

# Default location for generated spec files (can override with -o flag).
outputDirectory: ${CONFIG_DEFAULTS.outputDirectory}

# Author name for generated specs (optional, defaults to "Unknown")
# author: Your Name

# Figma file sources to fetch and process.
# Example:
# sources:
#   library:
#     key: YOUR_FIGMA_FILE_KEY
#     data: [file, variables, styles]
sources: {}

# Processing and output configuration.
# See: https://github.com/DirectedEdges/specs/blob/main/docs/cli/configuration.md
config:
  processing:
    # Subcomponent discovery configuration.
    # Presence of this block enables subcomponent detection; remove to disable.
    # See: https://github.com/DirectedEdges/specs/blob/main/docs/guides/subcomponent-scoping.md
    subcomponents:
      # Where to search: NESTED (component anatomy only) or PAGE (also search Figma page)
      # scope: NESTED

      # Template patterns defining which assets are subcomponents.
      # Uses {C} (component name) and {S} (subcomponent name) placeholders.
      match:
        - '${DEFAULT_CONFIG.processing.subcomponents?.match[0] || '{C} / _ / {S}'}'

      # Template patterns to exclude from matches (optional).
      # exclude:
      #   - '{C} / Examples / {S}'

    # Naming pattern to detect icon glyph instances (e.g. 'DS Icon Glyph /')
    # glyphNamePattern: 'DS Icon Glyph /'

    # Maximum variant property depth to process: 1, 2, 3, or 9999 (unlimited)
    # See: https://github.com/DirectedEdges/specs/blob/main/docs/guides/variant-depth.md
    variantDepth: ${DEFAULT_CONFIG.processing?.variantDepth || 9999}

    # Detail level for variant data: FULL or LAYERED
    # See: https://github.com/DirectedEdges/specs/blob/main/docs/cli/configuration.md#details
    details: ${DEFAULT_CONFIG.processing?.details || 'LAYERED'}

  format:
    # Output format: JSON or YAML
    output: ${DEFAULT_CONFIG.format?.output || 'JSON'}

    # Key name transformation: SAFE, CAMEL, SNAKE, KEBAB, PASCAL, TRAIN
    # See: https://github.com/DirectedEdges/specs/blob/main/docs/guides/key-formatting.md
    keys: ${DEFAULT_CONFIG.format?.keys || 'CAMEL'}

    # Layout representation: LAYOUT, PARENT_CHILDREN, or BOTH
    # See: https://github.com/DirectedEdges/specs/blob/main/docs/guides/data-layout.md
    layout: ${DEFAULT_CONFIG.format?.layout || 'LAYOUT'}

    # Token reference format: TOKEN, TOKEN_NAME, TOKEN_FIGMA_EXTENSIONS, FIGMA_NAME, or CUSTOM
    # See: https://github.com/DirectedEdges/specs/blob/main/docs/guides/token-format.md
    tokens: ${DEFAULT_CONFIG.format?.tokens || 'TOKEN'}

  include:
    # Subcomponent inclusion is controlled by processing.subcomponents above.
    # If the subcomponents block is present, subcomponents are included.

    # Include invalid variant data in output (default: false)
    # invalidVariants: false

    # Calculate and include invalid property combinations (default: false)
    # invalidCombinations: false
`;
}

/**
 * Generate a JSON configuration template
 */
export function generateConfigTemplateJson(): string {
  const config = {
    sourceDirectory: CONFIG_DEFAULTS.sourceDirectory,
    outputDirectory: CONFIG_DEFAULTS.outputDirectory,
    sources: {},
    config: DEFAULT_CONFIG,
  };
  return JSON.stringify(config, null, 2);
}
