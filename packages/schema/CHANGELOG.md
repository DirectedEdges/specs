# Changelog

All notable changes to the Specs schema will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.21.0] - 2026-05-22

Extends `Config.format.tokens` with per-platform Figma code syntax profiles. The new `FIGMA_SYNTAX_WEB`, `FIGMA_SYNTAX_IOS`, and `FIGMA_SYNTAX_ANDROID` options emit the platform-specific code syntax authored on Figma variables, falling back to the resolved `TOKEN` reference when no syntax is defined.

### Added

- `Config.format.tokens` — adds `FIGMA_SYNTAX_WEB`, `FIGMA_SYNTAX_IOS`, `FIGMA_SYNTAX_ANDROID` profiles emitting per-platform Figma code syntax, falling back to `TOKEN`


## [0.20.0] - 2026-05-06

Adds configurable color output format (`Config.format.color`) supporting nine format options from hex strings to structured DTCG Color objects. Renames `ColorValue` to `ColorObject` for specificity and widens `ColorStyle`, `Shadow.color`, and `GradientStop.color` to accept formatted color strings alongside structured objects and token references.

### Added

- `Config.format.color` — typed as `ColorFormat` (`'HEX' | 'HEXA' | 'RGB' | 'RGBA' | 'HSLA' | 'HSB' | 'OKLCH' | 'OKLAB' | 'OBJECT'`); controls color value output format; defaults to `HEX`

### Changed

- `ColorObject` — renamed from `ColorValue` for specificity; the type represents a DTCG Color §4.1 structured object, not a generic "color value"
- `ColorStyle` — widened to `string | ColorObject | TokenReference | GradientValue | null`; the `string` arm supports formatted color strings when `Config.format.color` is non-`OBJECT`
- `Shadow.color` — widened to `string | ColorObject | TokenReference`; same `string` arm rationale as `ColorStyle`
- `GradientStop.color` — widened to `string | ColorObject | TokenReference`; same `string` arm rationale as `ColorStyle`


## [0.19.0] - 2026-04-28

Replaces Figma-raw `x`, `y`, and `layoutPositioning` with constraint-based positioning properties. `position` replaces `layoutPositioning` as a strict `Position` enum. Directional offsets (`top`, `bottom`, `start`, `end`, `centerHorizontalOffset`, `centerVerticalOffset`) replace `x`/`y` with anchor semantics derived from Figma constraints. See the [Layout Positioning guide](/specs/guides/layout-positioning/) for constraint mapping rules and platform usage examples.

### Added

- `Styles.position` — typed as `Position` (`'AUTO' | 'ABSOLUTE'`) or `null`; structural property, not token-bindable (replaces `layoutPositioning`)
- `Styles.top` — typed as `PositionOffset` (`number | string | null`); block-start offset from vertical MIN, STRETCH, or SCALE constraint
- `Styles.bottom` — typed as `PositionOffset`; block-end offset from vertical MAX or STRETCH constraint
- `Styles.start` — typed as `PositionOffset`; inline-start offset from horizontal MIN, STRETCH, or SCALE constraint
- `Styles.end` — typed as `PositionOffset`; inline-end offset from horizontal MAX or STRETCH constraint
- `Styles.centerHorizontalOffset` — typed as `PositionOffset`; horizontal offset from center (CENTER constraint)
- `Styles.centerVerticalOffset` — typed as `PositionOffset`; vertical offset from center (CENTER constraint)

### Removed

- `Styles.x` — replaced by `Styles.start`, `Styles.end`, or `Styles.centerHorizontalOffset` depending on constraint
- `Styles.y` — replaced by `Styles.top`, `Styles.bottom`, or `Styles.centerVerticalOffset` depending on constraint
- `Styles.layoutPositioning` — replaced by `Styles.position`

### Migration

- `Styles.x` → `Styles.start` / `Styles.end` / `Styles.centerHorizontalOffset`: determine which property to read based on the node's horizontal constraint; SCALE values are percentage strings (e.g. `"25%"`)
- `Styles.y` → `Styles.top` / `Styles.bottom` / `Styles.centerVerticalOffset`: same constraint-based mapping for the vertical axis
- `Styles.layoutPositioning` → `Styles.position`: rename and narrow type — replace generic `Style` handling with exhaustive match on `'AUTO' | 'ABSOLUTE'`


## [0.18.0] - 2026-04-24

Replaces Figma-native layout property names with semantic equivalents for auto-layout alignment and wrapping. Introduces a bi-axial `itemSpacing` model that consolidates `counterAxisSpacing` into a single property, and narrows `layoutMode` from a generic `Style` to a strict enum. Five renamed alignment/wrap fields use plain-language names (`mainAxisAlignment`, `crossAxisAlignment`, `wrapAlignment`, `wrap`) instead of Figma axis terminology. The documentation site was considerably rearchitected with updated content and navigation.

### Added

- `Styles.itemSpacing` — widened from `Style` to `Style | ItemSpacing` (scalar when uniform, `ItemSpacing` object with `horizontal`/`vertical` when axes differ)
- `Styles.wrap` — boolean toggle for auto-layout wrapping (replaces `layoutWrap`)
- `Styles.wrapAlignment` — typed as `WrapAlignment` (`'START' | 'SPACE_BETWEEN'`) or `null`; structural property, not token-bindable (replaces `counterAxisAlignContent`)
- `Styles.mainAxisAlignment` — typed as `MainAxisAlignment` (`'START' | 'END' | 'CENTER' | 'SPACE_BETWEEN'`) or `null`; structural property, not token-bindable (replaces `primaryAxisAlignItems`)
- `Styles.crossAxisAlignment` — typed as `CrossAxisAlignment` (`'START' | 'END' | 'CENTER' | 'STRETCH' | 'BASELINE'`) or `null`; structural property, not token-bindable (replaces `counterAxisAlignItems`)

### Changed

- `Styles.layoutMode` — narrowed from `Style` to `LayoutMode` (`'NONE' | 'HORIZONTAL' | 'VERTICAL'`) or `null`; enum constraint, no TokenReference

### Removed

- `Styles.counterAxisSpacing` — consolidated into `Styles.itemSpacing` bi-axial model
- `Styles.layoutWrap` — replaced by `Styles.wrap`
- `Styles.counterAxisAlignContent` — replaced by `Styles.wrapAlignment`
- `Styles.primaryAxisAlignItems` — replaced by `Styles.mainAxisAlignment`
- `Styles.counterAxisAlignItems` — replaced by `Styles.crossAxisAlignment`

### Migration

- `Styles.counterAxisSpacing` → `Styles.itemSpacing.vertical`: read the `vertical` sub-field of the `ItemSpacing` object when axes differ; scalar `itemSpacing` applies uniformly
- `Styles.layoutMode` → `LayoutMode | null`: replace generic `Style` handling with exhaustive match on `'NONE' | 'HORIZONTAL' | 'VERTICAL'`
- `Styles.layoutWrap` → `Styles.wrap`: rename only; same boolean semantics
- `Styles.counterAxisAlignContent` → `Styles.wrapAlignment`: rename and remap values — `'AUTO'` → `'START'`, `'SPACE_BETWEEN'` → `'SPACE_BETWEEN'`
- `Styles.primaryAxisAlignItems` → `Styles.mainAxisAlignment`: rename and narrow type — replace generic `Style` handling with exhaustive match on `'START' | 'END' | 'CENTER' | 'SPACE_BETWEEN'`; remap Figma values `'MIN'` → `'START'`, `'MAX'` → `'END'`
- `Styles.counterAxisAlignItems` → `Styles.crossAxisAlignment`: rename and narrow type — replace generic `Style` handling with exhaustive match on `'START' | 'END' | 'CENTER' | 'STRETCH' | 'BASELINE'`; remap Figma values `'MIN'` → `'START'`, `'MAX'` → `'END'`


## [0.17.0] - 2026-04-13

Introduces `ResolvedConfig` as the fully-resolved counterpart to `Config`, where every property with a default is guaranteed present. `Config` properties with defaults are now optional, making input configs more tolerant of omissions. Removes the unused `Variant.name` and `Variant.baseline` fields.

### Added

- `ResolvedConfig` — fully-resolved config type where every property with a default is required; only true feature toggles (`subcomponents`, `glyphNamePattern`, `codeOnlyPropsPattern`) remain optional

### Changed

- `Config` — all properties with defaults are now optional (input type tolerant of omissions):
  - `processing.variantDepth` — optional; defaults to 9999
  - `processing.details` — optional; defaults to LAYERED
  - `format.output` — optional; defaults to JSON
  - `format.keys` — optional; defaults to SAFE
  - `format.layout` — optional; defaults to LAYOUT
- `ResolvedConfig` — all properties with defaults are required (post-merge guarantee):
  - `processing.slotConstraints` — required (default `false`)
  - `processing.inferNumberProps` — required (default `false`)
  - `format.tokens` — required (default `TOKEN`)
  - `include.invalidVariants` — required (default `false`)
  - `include.invalidCombinations` — required (default `true`)
  - `include.emptyVariants` — required (default `false`)
  - `subcomponents.scope` — required when subcomponents is present (default `NESTED`)
- `DEFAULT_CONFIG` — typed as `ResolvedConfig`; now explicitly includes `slotConstraints: false`, `inferNumberProps: false`; removed `subcomponents` (feature toggle — off by default, matching the Figma plugin)

### Removed

- `Variant.name` — unused optional label; variant identity is fully described by `configuration`
- `Variant.baseline` — never populated in output; baseline determination is an internal processing concern

### Migration

- `Variant.name` → removed: delete any references; use `Variant.configuration` to identify variants
- `Variant.baseline` → removed: delete any references; no replacement needed (field was never populated)


## [0.16.0] - 2026-04-05

Adds `Config.include.emptyVariants` for controlling inclusion of layered variants with no elements. Makes `invalidVariants` and `invalidCombinations` optional with sensible defaults, and removes the unused `variantNames` field.

### Added

- `Config.include.emptyVariants` — optional boolean to control inclusion of layered variants that contain no elements; defaults to false

### Changed

- `Config.include.invalidVariants` — now optional; defaults to false when absent
- `Config.include.invalidCombinations` — now optional; defaults to true when absent

### Removed

- `Config.include.variantNames` — unused field removed from the API

### Migration

- `Config.include.variantNames` → removed: delete any references to this field from config construction code; regenerate cached specs to remove the field from serialized output


## [0.15.0] - 2026-03-25

Adds structured subcomponent discovery via a new `Config.processing.subcomponents` object with `scope`, `match`, and `exclude` settings, replacing the flat `subcomponentNamePattern` string. Introduces `SubcomponentRef` for referencing subcomponent definitions and widens `instanceOf` on both `AnatomyElement` and `Element` to accept it. Corrects `Typography` field types for `leadingTrim`, `fontFamily`, and `fontStyle` to match actual Figma API values.

### Added

- `SubcomponentRef` — reference to a subcomponent definition via `{ $ref: "#/subcomponents/{key}" }`
- `AnatomyElement.instanceOf` — widened to accept `string | SubcomponentRef`
- `Element.instanceOf` — widened to accept `string | PropBinding | SubcomponentRef`
- `Config.processing.subcomponents` — optional nested object grouping subcomponent discovery settings: `scope`, `match`, and `exclude`. Absence means no subcomponent detection
- `Config.processing.subcomponents.scope` — optional enum (`NESTED` | `PAGE`) controlling where the transformer searches for subcomponents
- `Config.processing.subcomponents.match` — required array of `{C}`/`{S}` template patterns defining which assets are subcomponents
- `Config.processing.subcomponents.exclude` — optional array of `{C}`/`{S}` template patterns defining which matched assets to exclude

### Changed

- `Typography.leadingTrim` — corrected from `number | 'mixed' | TokenReference` to `'NONE' | 'CAP_HEIGHT' | 'mixed'` per Figma API
- `Typography.fontFamily` — corrected from `string | number | 'mixed'` to `string | 'mixed' | TokenReference`; removed impossible `number`, added `TokenReference` for variable-bound fonts
- `Typography.fontStyle` — corrected from `string | number | 'mixed'` to `string | 'mixed' | TokenReference`; removed impossible `number`, added `TokenReference` for variable-bound fonts

### Removed

- `Config.processing.subcomponentNamePattern` — replaced by `Config.processing.subcomponents.match`
- `Config.include.subcomponents` — subcomponent inclusion is now implied by the presence of `match` patterns

### Migration

- `Config.processing.subcomponentNamePattern` → `Config.processing.subcomponents.match`: wrap the single pattern string in a one-element array
- `Config.include.subcomponents` → removed: remove the field; subcomponents are included when `processing.subcomponents` is defined with `match` patterns. Omit `processing.subcomponents` entirely to disable detection


## [0.14.0] - 2026-03-18

Introduces code-only props support with `FigmaCodeOnlySource` provenance metadata and a configurable container-layer naming pattern, plus a new `NumberProp` type for numeric property values. Adds DTCG-aligned `$extensions` for platform-specific metadata across all prop types, replacing the prior `x-platform` convention on `BooleanProp`. Expands `SlotProp` with `minItems`, `maxItems`, and `anyOf` constraints consolidatable via the new `slotConstraints` processing flag.

### Added

- `FigmaCodeOnlySource` — provenance metadata for props extracted from a Figma code-only container layer (`kind`, `layer`, `instanceOf?`)
- `FigmaPropExtension.source` — optional `FigmaCodeOnlySource` on the Figma extension, present only for code-only props
- `Config.processing.codeOnlyPropsPattern` — optional naming pattern for detecting the code-only props container layer
- `Config.processing.inferNumberProps` — opt-in flag to infer `NumberProp` from TEXT code-only props
- `NumberProp` — numeric property type for number-valued component props
- `AnyProp` — `NumberProp` added as a fifth union member (`type: 'number'`)
- `FigmaPropExtension` — Figma-specific metadata for prop definitions (native prop type)
- `PropExtensions` — DTCG §5.2.3 platform-specific extensions container, keyed by reverse-domain notation
- `BooleanProp.$extensions` — optional platform metadata on boolean props
- `StringProp.$extensions` — optional platform metadata on string props
- `EnumProp.$extensions` — optional platform metadata on enum props
- `SlotProp.$extensions` — optional platform metadata on slot props
- `SlotProp.minItems` — minimum number of items the slot accepts
- `SlotProp.maxItems` — maximum number of items the slot accepts
- `SlotProp.anyOf` — component type names permitted in the slot
- `Config.processing.slotConstraints` — opt-in flag to consolidate slot constraint code-only props into slot properties

### Changed

- `BooleanProp` — `x-platform` replaced by `$extensions` to align with DTCG convention used on `TokenReference`


## [0.13.0] - 2026-03-13

### Added

- `Metadata.schema.latest` — optional stable URL pointing to the latest schema on main for discovery
- `Metadata.generator.license` — optional resolved license state: `status` and `level` nested inside generator
- `Styles.fillColor` — glyph fill color for GLYPH element type
- `StringProp.examples` — sample values demonstrating typical content for string props
- `Element.content` — unified content for text strings and glyph names
- `SlotProp.nullable` — optional flag indicating the slot prop accepts null
- `Conditional` — conditional binding with `if`/`condition`/`then`/`else` for derived values
- `ConditionExpression` — declarative condition pairing an `operation` (string) with `args`
- `ConditionArgs` — condition arguments: `value` (PropBinding) and optional `compareTo`

### Changed

- `SlotProp.default` — now optional; omitted when no meaningful default exists
- `ColorStyleValue` — accepts bare hex strings (e.g. `#666E74`) matching the existing `ColorStyle` type
- `BooleanProp`, `StringProp`, `EnumProp`, `SlotProp` — allow `$`-prefixed metadata fields via `patternProperties`
- `Metadata.schema.url` — clarified as versioned schema URL pinned to a git tag
- `ElementType` — `'icon'` renamed to `'glyph'` to distinguish raw visual assets from composed Icon components
- `Config.processing.iconNamePattern` → `Config.processing.glyphNamePattern` — glyph detection pattern
- `StringProp.default` — now optional; use `examples` for demo content
- `StringProp.default` — widened to `string | null` for nullable props
- `SlotProp.default` — widened to `string | null` for nullable slot props
- `BindingKey` — `'text'` replaced by `'content'`

### Removed

- `TextProp` — merged into `StringProp`
- `IconProp` — merged into `StringProp`
- `Element.text` — use `Element.content` instead

### Migration

- `TextProp` / `IconProp` → `StringProp`: replace all type imports and references with `StringProp`; the shape is identical
- `Element.text` → `Element.content`: read element content from `content` instead of `text`; applies to both text strings and glyph names
- `ElementType` `'icon'` → `'glyph'`: update all references to the `'icon'` literal in element type checks
- `Config.processing.iconNamePattern` → `Config.processing.glyphNamePattern`: update config objects and any code referencing this field

## [0.12.0] - 2026-03-05

### Added

- `ElementTypeRef` — reference to an external element type definition via `$ref` URI
- `Config.processing.iconNamePattern` — optional naming pattern for detecting icon content assets
- `Sides` — per-side composite object with logical directions: `top`, `end`, `bottom`, `start`
- `Corners` — per-corner composite object with logical directions: `topStart`, `topEnd`, `bottomEnd`, `bottomStart`
- `Styles.padding` — scalar when uniform, `Sides` object when per-side values differ

### Changed

- `AnatomyElement.type` — widened from `string` to `string | ElementTypeRef`
- `Styles.strokeWeight` — accepts `Style | Sides` instead of `Style`; scalar when uniform, `Sides` object when per-side values differ
- `Styles.cornerRadius` — accepts `Style | Corners` instead of `Style`; scalar when uniform, `Corners` object when per-corner values differ

### Removed

- `Styles.paddingLeft` — use `Styles.padding` with `Sides.start` instead
- `Styles.paddingRight` — use `Styles.padding` with `Sides.end` instead
- `Styles.paddingTop` — use `Styles.padding` with `Sides.top` instead
- `Styles.paddingBottom` — use `Styles.padding` with `Sides.bottom` instead
- `Styles.strokeTopWeight` — use `Styles.strokeWeight` with `Sides.top` instead
- `Styles.strokeBottomWeight` — use `Styles.strokeWeight` with `Sides.bottom` instead
- `Styles.strokeLeftWeight` — use `Styles.strokeWeight` with `Sides.start` instead
- `Styles.strokeRightWeight` — use `Styles.strokeWeight` with `Sides.end` instead
- `Styles.topLeftRadius` — use `Styles.cornerRadius` with `Corners.topStart` instead
- `Styles.topRightRadius` — use `Styles.cornerRadius` with `Corners.topEnd` instead
- `Styles.bottomLeftRadius` — use `Styles.cornerRadius` with `Corners.bottomStart` instead
- `Styles.bottomRightRadius` — use `Styles.cornerRadius` with `Corners.bottomEnd` instead

### Migration

- `Styles.paddingLeft` / `paddingRight` / `paddingTop` / `paddingBottom` → `Styles.padding`: when all sides are equal, read `padding` as a number; when sides differ, read `padding` as a `Sides` object with `top`, `end`, `bottom`, `start` using logical directions (`start` = left in LTR)
- `Styles.strokeTopWeight` / `strokeBottomWeight` / `strokeLeftWeight` / `strokeRightWeight` → `Styles.strokeWeight`: same scalar-or-`Sides` pattern; individual per-side stroke weights now live under `Sides.top`, `Sides.end`, `Sides.bottom`, `Sides.start`
- `Styles.topLeftRadius` / `topRightRadius` / `bottomLeftRadius` / `bottomRightRadius` → `Styles.cornerRadius`: same scalar-or-`Corners` pattern; per-corner values use `Corners.topStart`, `Corners.topEnd`, `Corners.bottomEnd`, `Corners.bottomStart`

## [0.11.0] - 2026-03-04

### Added

- `PropBinding` — component-prop binding type; discriminated by `$binding` key; replaces `ReferenceValue`
- `TokenReference` — unified DTCG-aligned token reference; replaces `VariableStyle` and `FigmaStyle`; `$token` and `$type` are the complete platform-facing API
- `TokenReference.$token` — DTCG dot-separated token path, usable directly as a DTCG alias
- `TokenReference.$type` — DTCG token type discriminator: `color`, `dimension`, `string`, `number`, `boolean`, `shadow`, `gradient`, `typography`, `effects`
- `TokenReference.$extensions["com.figma"]` — optional Figma extraction metadata: `id`, `name`, `collectionName`, `rawValue`
- `Styles.typography` — composite typography; value is `TokenReference`, `Typography`, or omitted
- `Typography` — 13 optional inline text properties: `fontSize`, `fontFamily`, `fontStyle`, `lineHeight`, `letterSpacing`, `textCase`, `textDecoration`, `paragraphIndent`, `paragraphSpacing`, `leadingTrim`, `listSpacing`, `hangingPunctuation`, `hangingList`
- `Styles.aspectRatio` — aspect ratio constraint; `AspectRatioValue` pair or `null` when unconstrained
- `AspectRatioValue` — required `x` (numerator) and `y` (denominator) number fields
- `AspectRatioStyle` — type alias `AspectRatioValue | null`
- `Config.format.tokens` — token reference serialization profile; five options: `TOKEN` (default, `$token` + `$type`), `TOKEN_NAME` (dot-delimited path string only), `TOKEN_FIGMA_EXTENSIONS` (`$token` + `$type` + `$extensions["com.figma"]`), `FIGMA_NAME` (slash-delimited path string only), `CUSTOM` (same as `TOKEN`, signals custom post-processing)
- `Metadata.license?` — optional `{ status: string; description: string }` field
- `styles.textColor` — style key for text colour
- `styles.cornerSmoothing` — style key for corner smoothing (Figma squircle factor)
- `styles.effects` — style key replacing `effectStyleId`; `TokenReference` or inline `Effects`
- `Shadow` — fields: `visible`, `inset?`, `offsetX`, `offsetY`, `blur`, `spread`, `color`
- `Blur` — fields: `visible`, `radius`
- `Effects` — fields: `shadows?`, `layerBlur?`, `backgroundBlur?`
- `GradientStop` — fields: `position` (0–1), `color`
- `GradientCenter` — fields: `x`, `y` (0–1)
- `LinearGradient` — discriminated by `type: 'LINEAR'`; fields: `angle`, `stops`
- `RadialGradient` — discriminated by `type: 'RADIAL'`; fields: `center`, `stops`
- `AngularGradient` — discriminated by `type: 'ANGULAR'`; fields: `center`, `stops`
- `GradientValue` — discriminated union `LinearGradient | RadialGradient | AngularGradient`

### Changed

- `Element.instanceOf` — accepts `string | PropBinding`; bound form is `{ $binding: "#/props/..." }`
- `Element.text` — accepts `string | PropBinding`; bound form is `{ $binding: "#/props/..." }`
- `Style` — `PropBinding` replaces `ReferenceValue`; `TokenReference` replaces `VariableStyle` and `FigmaStyle`
- `Config.format` — `variables`, `simplifyVariables`, and `simplifyStyles` replaced by single `tokens` field; token output shape is now controlled entirely by the `tokens` profile
- `Styles.backgroundColor` — narrowed to `ColorStyle`; inline gradients representable
- `Styles.textColor` — narrowed to `ColorStyle`; inline gradients representable
- `Styles.strokes` — narrowed to `ColorStyle`; inline gradients representable
- `styles.fills` renamed to `styles.backgroundColor`

### Removed

- `Config.format.variables` — removed; use `Config.format.tokens` instead
- `Config.format.simplifyVariables` — removed; use `Config.format.tokens` profile instead
- `Config.format.simplifyStyles` — removed; use `Config.format.tokens` profile instead
- `ReferenceValue` — removed; use `PropBinding` instead
- `isReferenceValue` — removed; no replacement; prop-binding guards are upstream consumer responsibility
- `VariableStyle` — removed; use `TokenReference` instead
- `FigmaStyle` — removed; use `TokenReference` instead
- `Styles.fontSize` — removed; use `typography.fontSize` instead
- `Styles.fontFamily` — removed; use `typography.fontFamily` instead
- `Styles.fontStyle` — removed; use `typography.fontStyle` instead
- `Styles.lineHeight` — removed; use `typography.lineHeight` instead
- `Styles.letterSpacing` — removed; use `typography.letterSpacing` instead
- `Styles.textCase` — removed; use `typography.textCase` instead
- `Styles.textDecoration` — removed; use `typography.textDecoration` instead
- `Styles.paragraphIndent` — removed; use `typography.paragraphIndent` instead
- `Styles.paragraphSpacing` — removed; use `typography.paragraphSpacing` instead
- `Styles.leadingTrim` — removed; use `typography.leadingTrim` instead
- `Styles.listSpacing` — removed; use `typography.listSpacing` instead
- `Styles.hangingPunctuation` — removed; use `typography.hangingPunctuation` instead
- `Styles.hangingList` — removed; use `typography.hangingList` instead
- `Styles.textStyleId` — removed; use `typography` with a `TokenReference` instead
- `styles.effectStyleId` — removed with no deprecation period; consumers must migrate to `styles.effects`

### Migration

- `config.format.variables` / `simplifyVariables` / `simplifyStyles` → `config.format.tokens`: set `tokens` to a profile — `TOKEN` (default) for `$token` + `$type`; `TOKEN_NAME` for dot-delimited string; `TOKEN_FIGMA_EXTENSIONS` for full object with Figma metadata; `FIGMA_NAME` for slash-delimited string; `CUSTOM` for custom post-processing
- `Element.instanceOf` → `Element.instanceOf`: replace `{ $ref: "#/props/..." }` with `{ $binding: "#/props/..." }`; update any `isReferenceValue` guards to narrow against `$binding` directly
- `Element.text` → `Element.text`: same key rename from `$ref` to `$binding`
- `Styles.visible` → `Styles.visible`: same key rename from `$ref` to `$binding`
- `VariableStyle` → `TokenReference`: replace `{ id, variableName, collectionName }` with `{ $token: "<Collection>.<name>", $type: "<type>", $extensions: { "com.figma": { id, name, collectionName } } }`; read token path from `$token` and token category from `$type`
- `FigmaStyle` → `TokenReference`: replace `{ id, name }` with `{ $token: "<dot.path>", $type: "typography" | "effects" | ... }` and move the Figma UUID to `$extensions["com.figma"].id`
- `Styles.<typographyProperty>` → `Styles.typography.<property>`: all 14 flat typography properties replaced with single composite `typography` field; when `typography` is a `TokenReference`, read `$token` for the style path; when `typography` is a `Typography` object, read individual fields
- `fills` → `backgroundColor`: any consumer reading `component.styles.fills` must update to `component.styles.backgroundColor`
- `effectStyleId` → `effects`: any consumer reading `styles.effectStyleId` must update to `styles.effects`; when `effects` is a `TokenReference`, read `$token` and `$type`; when `effects` is an `Effects`, read from `shadows`, `layerBlur`, or `backgroundBlur` by role

## [0.9.0] - 2026-02-12

### Added

- **DEFAULT_CONFIG** - Default configuration constant for transformer setup
  - Provides sensible defaults for all Config fields
  - Ensures consistent behavior across CLI, MCP, and Plugin environments
  - Co-located with Config type definition for easy maintenance

## [0.10.0] - 2026-02-16

### Added

- **Runtime JS build** - Compile TypeScript types to `dist/index.js` for ESM consumers
  - Enables ESM runtime imports without loading `.ts` files
  - Keeps type definitions in `types/` for TypeScript tooling

## [0.8.0] - 2026-02-10

### Added

- **TypeScript type definitions** (`types/` package): Complete type definitions for all schema entities
  - Core types: Component, Anatomy, Props, Variant, Metadata, Config, Styles, Element, Layout
  - Property types with proper discriminators: BooleanProp, TextProp, IconProp, EnumProp, SlotProp
  - Style types supporting all 59 properties with specific value types
  - Reference value types for prop bindings and style references

### Changed

- **Component.metadata** - Now optional to support components without full metadata
- **Variant.layout** - Changed from single LayoutNode to array of LayoutNode for proper hierarchical representation
- **Props type values** - TextProp, IconProp, and EnumProp now use `type: 'string'` with discriminators (matching schema)
- **Style properties** - Changed from generic `Record<string, Style>` to specific Partial interface with all 59 style properties
- **VariableStyle** - Now includes all properties from schema: id (required), rawValue, name, variableName, collectionName, collectionId (all optional)
- **FigmaStyle** - Simplified to match schema: id (required), name (optional)

### Fixed

- **SlotProp.default** - Now accepts both `null` and `string` types
- **TextProp/IconProp nullable** - Made nullable field optional (was incorrectly required)
- **Metadata.source** - Added missing nodeType field with enum: COMPONENT | COMPONENT_SET | FRAME
- **Metadata.config** - Added complete Config definition with processing, format, and include options
- **StyleKey type** - Expanded from incomplete list to all 59 valid style properties matching schema

## [0.7.0]

### Changed

- Added distinct `anatomy` types for line, ellipse, star, polygon and rectange, all which were previously vector
- Removed autodetecion of icon assets based on `isAsset` plugin since this function is unavailable in the REST API

## [0.6.0] - 2026-01-27

### Added

- **Styles schema**: New `styles.schema.json` providing complete validation for style properties
  - Defines 60+ style properties (fills, opacity, cornerRadius, fontSize, etc.)
  - Type-specific validation for each property based on Style processor classes
  - Supports all style value types: primitives, variables, Figma styles, and prop bindings
  - Documents which value shapes depend on config.format settings (simplifyVariables, simplifyStyles)
  
- **Style value types**: Precise type definitions for style property values
  - `NumberStyleValue`: number | VariableStyle | null
  - `BooleanStyleValue`: boolean | VariableStyle | null
  - `BooleanBindableStyleValue`: boolean | VariableStyle | ReferenceValue | null (for `visible` only)
  - `ColorStyleValue`: string | VariableStyle | FigmaStyle | null
  - `StringStyleValue`: string | VariableStyle | null
  - `MixedNumberStyleValue`: number | "mixed" | VariableStyle | null
  - `MixedStringStyleValue`: string | VariableStyle | null
  - `StrokeStyleValue`: number | "mixed" | VariableStyle | null
  - `CornerStyleValue`: number | "mixed" | VariableStyle | null
  - `FontStyleValue`: string | number | "mixed" | null
  - `LineHeightStyleValue`: string | number | VariableStyle | null
  - `StyleIdValue`: string | FigmaStyle | null

- **Styles reference documentation**: New `reference/styles.yaml` providing human-readable documentation
  - Maps style properties to their applicable element types (COMPONENT, FRAME, TEXT, etc.)
  - Documents style processing categories from RAW_STYLES_LOOKUP
  - Lists all 60+ style properties with descriptions and value types
  - Generated from StyleKeys.ts and RawStyles.ts constants

### Changed

- **VariableStyle definition**: Removed internal-only `rawValue` property
  - Only includes properties emitted by Style.data(): id, name, variableName, collectionName, collectionId
  - `rawValue` is used internally for rendering but never serialized

- **FigmaStyle definition**: Improved descriptions
  - Documents simplified vs full object output based on config.format.simplifyStyles

- **Styles property**: Now references `styles.schema.json#/definitions/Styles`
  - Replaces generic `additionalProperties: Style` with precise property-level validation
  - Each style property validates against its specific value type union

## [0.5.0] - 2025-12-29

### Added

- **Instance of attribute**: Added optional `instanceOf` property to element definitions
  - Indicates the component or component set name that an instance element references
  - Only present for instance elements (Figma INSTANCE nodes)
  - Shows ComponentSet name for variant instances, or Component name for standalone instances
  - Also added to anatomy element definitions

- **Text property**: Added optional `text` property to element definitions
  - Contains the text content for text elements
  - Can be a string value or a `ReferenceValue` when bound to a text prop

- **Unified property bindings**: Property bindings now appear as `$ref` values on their natural properties
  - `children` can now be a `ReferenceValue` (for slot content bindings)
  - `instanceOf` can now be a `ReferenceValue` (for instance swap bindings)
  - `visible` style can now be a `ReferenceValue` (for boolean prop bindings)
  - `text` can be a `ReferenceValue` (for text prop bindings)
  - Added `ReferenceValue` definition with `$ref` JSON pointer to props

### Removed

- **propBindings section**: Removed separate `propBindings` property from elements
  - Bindings are now represented directly on their target properties using `$ref`

## [0.4.0] - 2025-12-27

### Added

- **Layout structure**: Added optional `layout` property to variant definitions that provides hierarchical element structure as a nested tree
  - Layout represents element nesting relationships in a recursive format
  - Leaf nodes are strings (element names)
  - Parent nodes are objects with element name as key and children array as value
  - Example: `{ "parentElement": ["childA", { "childB": ["grandchild"] }] }`
  
### Changed

- Schema now supports both structure representations:
  - New: `layout` at variant level (hierarchical tree)
  - Existing: `parent` and `children` properties in each element (maintained for backward compatibility)
  
### Deprecated

- `included` property has been removed from element definitions
  - Element inclusion is now determined by presence in the `layout` tree
  - Elements not present in `layout` are considered excluded from that variant

## [0.3.0] - Previous release