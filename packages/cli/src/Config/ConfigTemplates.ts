/**
 * Configuration Templates
 *
 * Generates the split-configuration templates (ADR-071) with
 * production-ready defaults and inline documentation for the init command:
 * `config/conventions/<platform>.yaml` and `config/settings.yaml`.
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
# Every commented line is the opposite of the default: uncomment it to change
# behaviour. A commented block is off until uncommented.
# Reference: https://www.specsplugin.com/schema/conventions/

# Layer and property naming the library follows, and the target a spec reverses
# into: NONE, SENTENCE, or TITLE (default: NONE, no convention declared)
# https://www.specsplugin.com/settings/figma-keys/
# naming: SENTENCE

# Icon glyph components, by name pattern ({i} is the glyph name) and/or by
# child structure for libraries whose glyphs are plainly named (ADR-103)
# https://www.specsplugin.com/settings/glyphs/
# glyphs:
#   match: 'DS Icon Glyph / {i}'
#   structure:
#     name: '{i}'          # naming rule over the component name (default '{i}')
#     fill: ['#161616']    # accepted leaf fills (optional)
#     children:
#       - type: VECTOR
#         name: 'Vector'

# Layer holding code-only props — https://www.specsplugin.com/settings/code-only-props-pattern/
# codeOnlyProps:
#   match: 'Code only props'

# Subcomponents; the block's presence is the on-switch
# https://www.specsplugin.com/guides/subcomponent-scoping/
subcomponents:
  # Also search the Figma page, not component anatomy alone (default: NESTED)
  # scope: PAGE

  # Which assets are subcomponents; {C} = component, {S} = subcomponent
  match:
    - '{C} / _ / {S}'

  # Patterns to exclude from those matches
  # exclude:
  #   - '{C} / Examples / {S}'

# Instance examples (Pro); the block's presence is the on-switch
# https://www.specsplugin.com/guides/instance-examples/
# instanceExamples:
#   # PAGE (default) or FILE, which searches every page
#   scope: PAGE
#   # Name filter; omit to match every in-scope instance
#   match:
#     - '{C} Example'
#   # A candidate's immediate parent frame or section must match one of these
#   parentNames:
#     - Examples

# How the library expresses images; each member is an independent trigger
# https://www.specsplugin.com/guides/images/
# images:
#   # Container fills emit as backgroundImage
#   backgroundImage: true
#   # The library's image component; requires sourceProps
#   match: DS Image
#   # Image-typed code-only props; the first is the image component's own
#   sourceProps:
#     - imageSource

# Slot constraints authored as code-only props (requires codeOnlyProps)
# https://www.specsplugin.com/settings/slot-constraints/
# slotConstraints: true

# TEXT props whose values parse as numbers emit as NumberProp
# https://www.specsplugin.com/settings/infer-number-props/
# inferNumberProps: true
`;
}

/**
 * Generate the `config/conventions/specs.yaml` template with inline comments.
 *
 * Conventions about the spec itself rather than any platform (ADR-073 Decision 4):
 * every member names props the spec declares, so a transform reading only the spec
 * can apply them. A reserved basename beside the platform files, like
 * `figma.primitives.yaml`.
 */
export function generateSpecsConventionsTemplate(): string {
  return `# Conventions about the spec itself — not about Figma or any code platform.
# Every member here names a prop (or an enum value) the spec declares, so a
# transform reading only the spec can apply it.
# Each block is off until uncommented.
# Reference: https://www.specsplugin.com/schema/conventions/

# Variant props that are state concepts; absence emits them as data-* selectors
# https://www.specsplugin.com/settings/states/
# states:
#   hover:
#     prop: state
#     value: hover
#   disabled:
#     prop: disabled   # boolean prop — value defaults to "true"

# The prop naming a control with no text of its own; an element carrying the
# name wins over the prop — https://www.specsplugin.com/settings/accessibility/
# accessibility:
#   label:
#     prop: a11yLabel

# The prop carrying a control's value where no element represents it
# https://www.specsplugin.com/settings/value/
# value:
#   prop: progress
#   # Boolean prop forcing the indeterminate presentation
#   indeterminate: isLoading
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
  return `# Choices about this run — curation, sources, spec output, assets.
# A different team reading the same library could set any of these differently
# and still be correct. Every commented line is the opposite of the default:
# uncomment it to change behaviour.
# Reference: https://www.specsplugin.com/schema/settings/

author: <Your Name Here>

# Which components get a spec — https://www.specsplugin.com/settings/curation/
curation:
  # Spec every component, not only those marked Ready for dev
  # defaultSelection: ALL

  # Hand-edited selections survive a changed Figma signal
  # preserveManualSelections: true

  # Do not follow what selected components are built from
  # includeDependencies: false

# What to fetch, and where it lands — https://www.specsplugin.com/settings/data-sources/
data:
  directory: ${CONFIG_DEFAULTS.dataDirectory}
  sources:
    library:
      key: YOUR_FIGMA_FILE_KEY
      fetch: [file, variables, styles, icons]

# Icons, images, generated CSS, fonts — https://www.specsplugin.com/settings/folders/
assets:
  directory: ./assets

spec:
  # Overridable with -o — https://www.specsplugin.com/settings/folders/
  directory: ${CONFIG_DEFAULTS.outputDirectory}

  # JSON or YAML — https://www.specsplugin.com/settings/output-format/
  format: YAML

  # SAFE, CAMEL, SNAKE, KEBAB, PASCAL, TRAIN — https://www.specsplugin.com/settings/keys/
  keys: CAMEL

  # LAYOUT, PARENT_CHILDREN, BOTH — https://www.specsplugin.com/settings/layout/
  layout: LAYOUT

  # TOKEN, TOKEN_NAME, TOKEN_FIGMA_EXTENSIONS, FIGMA_NAME, CUSTOM,
  # FIGMA_SYNTAX_WEB, FIGMA_SYNTAX_IOS, FIGMA_SYNTAX_ANDROID
  # Pro — https://www.specsplugin.com/settings/tokens/
  tokens: TOKEN

  # HEX, HEXA, RGB, RGBA, HSLA, HSB, OKLCH, OKLAB, OBJECT
  # https://www.specsplugin.com/settings/color/
  color: HEXA

  # 1, 2, 3, or 9999 — https://www.specsplugin.com/settings/variant-depth/
  variantDepth: 9999

  # FULL or LAYERED — https://www.specsplugin.com/settings/details/
  details: LAYERED

  # Read Dev Mode annotations into anatomy roles — https://www.specsplugin.com/roles/
  # roles: true

  # Fail rather than warn on an unmet role obligation (needs roles: true)
  # roleValidation: error

  # Strip a root container that only wraps one child
  # https://www.specsplugin.com/settings/collapse-primitive-wrapper/
  # collapsePrimitiveWrapper: true

  # Promote primitive layers in composed examples to component instances
  # https://www.specsplugin.com/settings/promote-primitives/
  # promotePrimitives: true

  # Include variants marked invalid — https://www.specsplugin.com/settings/invalid-variants/
  # invalidVariants: true

  # Omit the invalid-combinations list (Pro)
  # https://www.specsplugin.com/settings/invalid-combinations/
  # invalidCombinations: false

  # Include layered variants with no elements — https://www.specsplugin.com/settings/empty-variants/
  # emptyVariants: true

  # Emit default slot content as examples (Pro)
  # https://www.specsplugin.com/settings/default-slot-content/
  # defaultSlotContent: true

  # File layout — https://www.specsplugin.com/settings/output/
  # One library file instead of a file per component
  # splitComponents: false

  # One file per component instead of a file per concern
  # splitConcerns: false

  # Component files side by side instead of each in its own subfolder
  # useSubfolders: false
`;
}


/**
 * The split-configuration templates, keyed by their file path relative
 * to the workspace root.
 */
export function generateConfigTemplates(): Record<string, string> {
  return {
    'config/conventions/figma.yaml': generateFigmaConventionsTemplate(),
    'config/conventions/specs.yaml': generateSpecsConventionsTemplate(),
    'config/conventions/react.yaml': generateReactConventionsTemplate(),
    'config/conventions/web-components.yaml': generateWebComponentsConventionsTemplate(),
    'config/settings.yaml': generateSettingsTemplate(),
  };
}
