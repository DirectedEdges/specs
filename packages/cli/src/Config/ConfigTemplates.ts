/**
 * Configuration Templates
 *
 * Generates the split-configuration templates (ADR-071) with
 * production-ready defaults and inline documentation for the init command:
 * `config/conventions/<platform>.yaml`, `config/settings.yaml`, `config/pipeline.yaml`.
 */

import { CONFIG_DEFAULTS } from './ConfigDefaults.js';

/**
 * Generate the `config/conventions/figma.yaml` template with inline comments.
 *
 * The filename is the platform id (ADR-078), so the body sits at the root rather
 * than under a `figma:` key.
 */
export function generateFigmaConventionsTemplate(): string {
  return `# Facts about the Figma library — every consumer of that library declares the same
# values. A wrong value here produces incorrect output, not merely different output.
# Absence of a block means the library has no such convention.
#
# One file per platform: this file's name IS the platform id, so its contents start
# at the entry body with no wrapping key.
# See: https://www.specsplugin.com/settings/

# Naming convention your Figma file uses for layer and property names, and the
# target a spec reverses into when rendered back to Figma: NONE, SENTENCE, or TITLE.
# NONE declares no convention — names are not checked and none are preserved.
# Declaring one records the Figma name wherever a key cannot reconstruct it.
# See: https://www.specsplugin.com/settings/figma-keys/
# naming: NONE

# Naming pattern identifying icon glyph instances. Use {i} as the placeholder
# for the glyph name (e.g. 'DS Icon Glyph / {i}' matches
# 'DS Icon Glyph / arrow-down' and extracts 'arrow-down').
# glyphs:
#   match: 'DS Icon Glyph / {i}'

# Literal layer name of the code-only props container layer.
# Presence enables code-only prop extraction from matching layers.
# codeOnlyProps:
#   match: 'Code only props'

# Subcomponent organization and naming.
# Presence of this block enables subcomponent detection; remove to disable.
# See: https://www.specsplugin.com/guides/subcomponent-scoping/
subcomponents:
  # Where the library keeps subcomponents: NESTED (component anatomy only)
  # or PAGE (also search the Figma page)
  # scope: NESTED

  # Template patterns defining which assets are subcomponents.
  # Uses {C} (component name) and {S} (subcomponent name) placeholders.
  match:
    - '{C} / _ / {S}'

  # Template patterns to exclude from matches (optional).
  # exclude:
  #   - '{C} / Examples / {S}'

# Instance example organization and naming (Pro). Presence of this block is
# the on-switch.
# See: https://www.specsplugin.com/guides/instance-examples/
# instanceExamples:
#   # Where the library keeps instance examples: PAGE or FILE (default: PAGE)
#   scope: PAGE
#   # Optional name filter; {C} = component name. Omit to match every
#   # in-scope instance of the component.
#   match:
#     - '{C} Example'
#   # A candidate's immediate parent frame or section must match one of these.
#   parentNames:
#     - Examples

# How the library expresses images: presence of this block is the on-switch;
# each member is an independent representation trigger.
# See: https://www.specsplugin.com/guides/images/
# images:
#   # The library expresses images as container fills, emitted as
#   # backgroundImage; also the fallback for fills outside the designated
#   # component.
#   backgroundImage: true
#   # The library's designated image component; instances route their image
#   # through the first source prop below. Requires sourceProps.
#   match: DS Image
#   # Code-only prop names (exact Figma names) typed as images; the first
#   # is the image component's own source prop.
#   sourceProps:
#     - imageSource

# The library authors slot constraints (anyOf, minItems, maxItems) as
# code-only props, consolidated into the slot property.
# Requires codeOnlyProps to be set. (default: false)
slotConstraints: false

# The library authors numeric props as TEXT code-only props whose values
# parse as valid numbers, emitted as NumberProp instead of StringProp.
# (default: false)
# inferNumberProps: false

# Semantic states: classify Figma variant props as state concepts, keyed by
# concept name. Absence means all variant props emit as data-* selectors.
# See: https://www.specsplugin.com/settings/states/
# states:
#   hover:
#     prop: state
#     value: hover
#   disabled:
#     prop: disabled   # boolean prop — value defaults to "true"
`;
}

/**
 * Commented stub for a code platform's conventions.
 *
 * Written alongside `figma.yaml` so the shape is discoverable without reading the
 * docs, and inert until someone uncomments it: a file of pure comments parses to
 * nothing, which is the same as declaring no conventions for that platform.
 *
 * `tag` distinguishes the two flavours — a React component is a PascalCase symbol
 * imported by name, a custom element is a kebab tag registered by a side-effect
 * import. That difference is why they are separate platform keys rather than one
 * shared `web`.
 */
function conventionsStub(opts: {
  platform: string;
  text: string;
  glyph: string;
  container: string;
  stylesProp: string;
  stylesNote: string;
}): string {
  return `# What ${opts.platform} calls each thing the spec models.
#
# Absence means this platform declares no conventions, and generators emit their
# host elements as before. Uncomment to bind a primitive to one of your components.
# See: https://www.specsplugin.com/schema/conventions/

# Prop that receives styling no concept maps to.
# ${opts.stylesNote}
# stylesProp: ${opts.stylesProp}

# Which of your components implements each spec primitive.
# primitives:
#   text:
#     component: ${opts.text}
#     props:
#       # color defaults to 'color'; content has no default, and absent means the
#       # component takes its text as children rather than as a prop.
#       color: color
#       content: text
#       typography: typography
#   glyph:
#     component: ${opts.glyph}
#     props:
#       # color and content both default to their own names.
#       color: color
#       content: content
#   container:
#     component: ${opts.container}
#     props:
#       # Only set where the component takes a direction; a container with no auto
#       # layout is a positioning box and is left unbound.
#       direction: direction

# Width of the container this platform places a fill-width root in.
# defaultFillWidth: 375
`;
}

/** Generate the `config/conventions/react.yaml` stub. */
export function generateReactConventionsTemplate(): string {
  return conventionsStub({
    platform: 'React',
    text: 'DsText',
    glyph: 'DsIcon',
    container: 'DsBox',
    stylesProp: 'sx',
    stylesNote: 'A React component usually takes an object prop such as sx or style.',
  });
}

/** Generate the `config/conventions/web-components.yaml` stub. */
export function generateWebComponentsConventionsTemplate(): string {
  return conventionsStub({
    platform: 'Web Components',
    text: 'ds-text',
    glyph: 'ds-icon',
    container: 'ds-box',
    stylesProp: 'style',
    stylesNote: 'A custom element has no sx prop; the style attribute is the channel a caller has.',
  });
}

/**
 * Generate the `config/settings.yaml` template with inline comments.
 */
export function generateSettingsTemplate(): string {
  return `# Choices about this run — sources, spec output, assets.
# A different team reading the same library could set any of these differently
# and still be correct.
# See: https://www.specsplugin.com/settings/

# Author name for generated specs (optional, defaults to "Unknown").
author: <Your Name Here>

# Source acquisition: what to fetch, and where fetched artifacts land.
data:
  # Where fetch writes payloads, and where generate/scan read from.
  directory: ${CONFIG_DEFAULTS.dataDirectory}

  # Figma file sources to fetch and process, keyed by source name.
  # Example:
  # sources:
  #   library:
  #     key: YOUR_FIGMA_FILE_KEY
  #     fetch: [file, variables, styles]
  sources: {}

# The generated spec: where it lands, how it is split, what it contains,
# and how values are serialized.
spec:
  # Default location for generated spec files (can override with -o flag).
  directory: ${CONFIG_DEFAULTS.outputDirectory}

  # Serialization format: JSON or YAML
  format: JSON

  # Key name transformation: SAFE, CAMEL, SNAKE, KEBAB, PASCAL, TRAIN
  # See: https://www.specsplugin.com/guides/key-formatting/
  keys: SAFE

  # Layout representation: LAYOUT, PARENT_CHILDREN, or BOTH
  # See: https://www.specsplugin.com/guides/data-layout/
  layout: LAYOUT

  # Token reference format: TOKEN, TOKEN_NAME, TOKEN_FIGMA_EXTENSIONS, FIGMA_NAME, CUSTOM,
  # FIGMA_SYNTAX_WEB, FIGMA_SYNTAX_IOS, or FIGMA_SYNTAX_ANDROID
  # See: https://www.specsplugin.com/settings/tokens/
  # Requires a license key to resolve token references in output.
  tokens: TOKEN

  # Color value format: HEX, HEXA, RGB, RGBA, HSLA, HSB, OKLCH, OKLAB, or OBJECT
  # See: https://www.specsplugin.com/settings/color/
  color: HEX

  # Maximum variant property depth to process: 1, 2, 3, or 9999 (unlimited)
  # See: https://www.specsplugin.com/guides/variant-depth/
  variantDepth: 9999

  # Detail level for variant data: FULL or LAYERED
  # See: https://www.specsplugin.com/guides/variant-layering/
  details: LAYERED

  # Collapse primitive wrappers: when true, a component whose root is a plain
  # container wrapping a single text or glyph element (no meaningful container
  # styles, no slot bindings) is collapsed — the wrapper is stripped and the
  # leaf becomes the spec root. All-or-nothing across variants. (default: false)
  # collapsePrimitiveWrapper: false

  # Include invalid variant data in output (default: false)
  # invalidVariants: false

  # Calculate and include invalid property combinations (default: true)
  # Requires a license key to compute combinations in output.
  # invalidCombinations: true

  # Include layered variants that contain no elements (default: false)
  # emptyVariants: false

  # Emit the component's default slot content as examples (Pro; default: false)
  # See: https://www.specsplugin.com/guides/default-slot-content/
  # defaultSlotContent: false

  # Write one file per component instead of a single library file (default: true)
  # splitComponents: true

  # Split output into separate api, variants, and examples files (default: true)
  # splitConcerns: true

  # When splitComponents is true, nest each file in a subfolder (default: true)
  # useSubfolders: true

# Shared resources every code output points at: icons, images, generated CSS, fonts.
# assets:
#   directory: ./assets
`;
}

/**
 * Generate the `config/pipeline.yaml` template with inline comments.
 */
export function generatePipelineTemplate(): string {
  return `# Work this workspace runs: transformers and analyses.
# Absence means CLI defaults apply.

# Transformers to run with \`specs transform\` (default: contract).
# transformers:
#   - name: contract
#   - name: css
#   - name: react

# Analyses to run with \`specs analyze\`.
# analyses:
#   - name: dependencies
`;
}

/**
 * The three split-configuration templates, keyed by their file path relative
 * to the workspace root.
 */
export function generateConfigTemplates(): Record<string, string> {
  return {
    'config/conventions/figma.yaml': generateFigmaConventionsTemplate(),
    'config/conventions/react.yaml': generateReactConventionsTemplate(),
    'config/conventions/web-components.yaml': generateWebComponentsConventionsTemplate(),
    'config/settings.yaml': generateSettingsTemplate(),
    'config/pipeline.yaml': generatePipelineTemplate(),
  };
}
