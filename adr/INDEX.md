# ADR Index

## Draft

| # | Title | Highlights |
|---|-------|------------|
| 034 | Remove variantNames, add emptyVariants, make Config.include fields optional | Remove unused `variantNames` (breaking); add `emptyVariants` for filtering; make remaining fields optional |
| 025 | Flowing Content into a Nested Instance's Slot | Model parent components that flow defined content into a nested child instance's slot _(branch)_ |
| 024 | Component Extends Relationship | Add `extends` field to express base/derived component relationships and prop/variant inheritance _(branch)_ |
| 022 | Add Nullable Support to SlotProp | Fix type-schema drift: add `nullable?: boolean` and widen `default` to `string \| null` on SlotProp |
| 021 | Rename `invalidVariantCombinations` to `invalidPropConfigurations` | Shorten verbose field name and fix misleading "Variant" terminology — it describes prop configs, not variants _(branch)_ |
| 020 | Classify Props by External vs Internal Ownership | Add ownership metadata to props distinguishing public API, dual-purpose, and interaction-driven properties _(branch)_ |

## Accepted

| # | Title | Highlights |
|---|-------|------------|
| 033 | Typography fontFamily/fontStyle — Remove Number, Add TokenReference | Fix font fields: remove impossible `number` branch, add `TokenReference` for variable-bound font properties |
| 032 | Typography leadingTrim — Correct to String Enum | Fix `leadingTrim` from incorrect `number \| "mixed"` to correct `"NONE" \| "CAP_HEIGHT" \| "mixed"` string enum |
| 031 | Subcomponent Search Scope Config | Replace `subcomponentNamePattern` with structured `processing.subcomponents` object (`scope`, `match[]`, `exclude[]`) |
| 030 | Subcomponent `$ref` for `instanceOf` | Add `SubcomponentRef` (`{ $ref: "#/subcomponents/{key}" }`) to `instanceOf` on AnatomyElement and Element |
| 029 | NumberProp — Numeric Property Type | Add `NumberProp` (`type: "number"`) to `AnyProp` union with opt-in `inferNumberProps` config for numeric props |
| 028 | Slot Quantity and Content Constraints | Add optional `minItems`, `maxItems`, `anyOf` fields to `SlotProp` for slot quantity and permitted content types |
| 027 | Code-Only Props | Surface Figma code-only props (a11y, semantics) in `props` with `$extensions` source kind `codeOnlyProp` |
| 026 | Unify Platform-Specific Properties Under `$extensions` | Standardize on DTCG `$extensions` with reverse-domain keys for all platform metadata; remove `x-platform` |
| 023 | Fix Schema Compliance Gaps | Fix 58 schema violations: optional SlotProp.default, `$`-prefix patternProperties, hex in ColorStyleValue, schema URL |
| 019 | Allow null in StringProp.default | Widen `StringProp.default` from `string` to `string \| null` so nullable props can express `null` as their default |
| 018 | Conditional Visible Binding | Add `Conditional` type with `if`/`condition`/`then`/`else` for declarative visibility derived from nullable props |
| 017 | Rename `icon` Element Type to `glyph` | Rename `icon` to `glyph` in ElementType, `IconProp` to `GlyphProp`, `iconNamePattern` to `glyphNamePattern` |
| 016 | Element Content Identification | Replace `Element.text` with unified `Element.content` field for text strings and icon glyph names |
| 015 | Resolve `AnyProp` `oneOf` Schema Violation | Merge identical `TextProp`/`IconProp` into single `StringProp` to fix `oneOf` schema validation failure |
| 014 | Add `examples` to TextProp and IconProp | Add optional `examples: string[]` to TextProp/IconProp; make `default` optional. Demo content is not a default |
| 013 | Add `fillColor` Style Property for Icon Elements | Add optional `fillColor: ColorStyle` to `Styles` for dedicated icon glyph fill color, distinct from background |
| 012 | Element Type References | Widen `AnatomyElement.type` to `string \| ElementTypeRef` for `$ref`-based external element type definitions |
| 011 | Icon Element Type Support and Detection Config | Add `iconNamePattern` config and constrain `AnatomyElement.type` to `ElementType` enum. Activates `icon` detection |
| 010 | Sides and Corners Composite Types | Replace 13 flat padding/stroke/corner fields with `Sides`/`Corners` composites using logical directions |
| 009 | Replace Hex String with DTCG Color Object | Replace bare hex string in `ColorStyle` with `ColorValue` object (`colorSpace`, `components`, `alpha?`, `hex?`) |
| 008 | Introduce `PropBinding` to Replace `ReferenceValue` | Replace `ReferenceValue` (`$ref`) with `PropBinding` (`$binding`) to avoid JSON Schema key collision |
| 007 | Consolidate Token Format Configuration into `tokens` | Replace `variables`/`simplifyVariables`/`simplifyStyles` config fields with single `format.tokens` enum |
| 006 | Unified Token Reference Type | Replace `VariableStyle`/`FigmaStyle` with DTCG-aligned `TokenReference` (`$token`, `$type`, `$extensions`) |
| 005 | Replace Typography Flat Properties with Composite | Consolidate 14 flat typography keys into single `typography?: FigmaStyle \| Typography` composite |
| 004 | Add `aspectRatio` to Styles | Add optional `aspectRatio` as `{ x, y }` object to Styles for locked ratio constraints |
| 003 | Gradient Support for Color Style Properties | Add `GradientValue` (LINEAR/RADIAL/ANGULAR) discriminated union and `ColorStyle` type for gradient fills |
| 002 | Replace `effectStyleId` with `effects` | Remove `effectStyleId`; add grouped `effects` key with `Shadow`, `Blur`, `Effects` types |
| 001 | Surface License State in Component Output | Add optional `generator.license` (`status`, `level`) to Metadata for downstream entitlement gating |
