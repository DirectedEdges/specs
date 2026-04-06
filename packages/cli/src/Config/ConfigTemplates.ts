/**
 * Configuration Templates
 * 
 * Generates configuration templates with production-ready defaults
 * and inline documentation for the init command.
 */

import { CONFIG_DEFAULTS } from './ConfigDefaults.js';
import { DEFAULT_CONFIG as DEFAULT_MODEL_CONFIG } from '@directededges/specs-schema';

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
# See: https://docs.specs.dev/cli/configuration#sourceDirectory
sourceDirectory: ${CONFIG_DEFAULTS.sourceDirectory}

# Default location for generated spec files (can override with -o flag).
# See: https://docs.specs.dev/cli/configuration#outputDirectory
outputDirectory: ${CONFIG_DEFAULTS.outputDirectory}

# Author name for generated specs (optional, defaults to "Unknown")
# See: https://docs.specs.dev/cli/configuration#author
# author: Your Name

# Figma file sources to fetch and process.
# Example:
# sources:
#   library:
#     key: YOUR_FIGMA_FILE_KEY
#     data: [file, variables, styles]
# See: https://docs.specs.dev/cli/configuration#sources
sources: {}

# Model processing and output configuration.
# See: https://docs.specs.dev/cli/configuration#model
model:
  processing:
    # Subcomponent discovery configuration.
    # Presence of this block enables subcomponent detection; remove to disable.
    # See: https://docs.specs.dev/cli/configuration#subcomponents
    subcomponents:
      # Where to search: NESTED (component anatomy only) or PAGE (also search Figma page)
      # scope: NESTED

      # Template patterns defining which assets are subcomponents.
      # Uses {C} (component name) and {S} (subcomponent name) placeholders.
      match:
        - '${DEFAULT_MODEL_CONFIG.processing.subcomponents?.match[0] || '{C} / _ / {S}'}'

      # Template patterns to exclude from matches (optional).
      # exclude:
      #   - '{C} / Examples / {S}'

    # Naming pattern to detect icon glyph instances (e.g. 'DS Icon Glyph /')
    # See: https://docs.specs.dev/cli/configuration#glyphNamePattern
    # glyphNamePattern: 'DS Icon Glyph /'

    # Maximum variant property depth to process: 1, 2, 3, or 9999 (unlimited)
    # See: https://docs.specs.dev/cli/configuration#variantDepth
    variantDepth: ${DEFAULT_MODEL_CONFIG.processing?.variantDepth || 9999}

    # Detail level for variant data: FULL or LAYERED
    # See: https://docs.specs.dev/cli/configuration#details
    details: ${DEFAULT_MODEL_CONFIG.processing?.details || 'LAYERED'}

  format:
    # Output format: JSON or YAML
    # See: https://docs.specs.dev/cli/configuration#output
    output: ${DEFAULT_MODEL_CONFIG.format?.output || 'JSON'}

    # Key name transformation: SAFE, CAMEL, SNAKE, KEBAB, PASCAL, TRAIN
    # See: https://docs.specs.dev/cli/configuration#keys
    keys: ${DEFAULT_MODEL_CONFIG.format?.keys || 'CAMEL'}

    # Layout representation: LAYOUT, PARENT_CHILDREN, or BOTH
    # See: https://docs.specs.dev/cli/configuration#layout
    layout: ${DEFAULT_MODEL_CONFIG.format?.layout || 'LAYOUT'}

    # Token reference format: TOKEN, TOKEN_NAME, TOKEN_FIGMA_EXTENSIONS, FIGMA_NAME, or CUSTOM
    # See: https://docs.specs.dev/cli/configuration#tokens
    tokens: ${DEFAULT_MODEL_CONFIG.format?.tokens || 'TOKEN'}

  include:
    # Subcomponent inclusion is controlled by processing.subcomponents above.
    # If the subcomponents block is present, subcomponents are included.

    # Include invalid variant data in output
    # See: https://docs.specs.dev/cli/configuration#invalidVariants
    invalidVariants: ${DEFAULT_MODEL_CONFIG.include?.invalidVariants === true ? 'true' : 'false'}

    # Calculate and include invalid property combinations
    # See: https://docs.specs.dev/cli/configuration#invalidCombinations
    invalidCombinations: ${DEFAULT_MODEL_CONFIG.include?.invalidCombinations === true ? 'true' : 'false'}
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
    model: DEFAULT_MODEL_CONFIG,
  };
  return JSON.stringify(config, null, 2);
}
