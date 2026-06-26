# ADR Index

## Draft

| # | Title | Highlights |
|---|-------|------------|
| 058 | Wrapper Collapse Config Flag — `processing.wrapperCollapse` | |
| 057 | Fix `Metadata.generator.version` type: `number` → `string` | |
| 056 | Rename `SlotProp.minItems`/`maxItems` → `minChildren`/`maxChildren` | Align with Figma-native `slotSettings` field names; `anyOf` populated from `preferredValues` when `allowPreferredValuesOnly` is true |
| 055 | Variant State Classification via `processing.states` | |
| 054 | Workspace Schema File | |
| 053 | Transform Command and Configuration | |
| 052 | Deeply-Nested Slot Content — Path-Anchored Overrides Across Non-Slot Instance Boundaries | |
| 051 | Platform Code-Syntax Token Profiles | |
| 050 | Examples Config | Add `include.defaultSlotContent` (default false); add `processing.instanceExamples` with scope, match, exclude, parentNames — instance-example output is presence-driven (no `include.instanceExamples` flag), mirroring `subcomponents` |
| 049 | Nested Slot Compositions | Recursion follow-on to ADR-047: fill nested instances' slots from a parent context (reserved, draft on `042-composition-type` branch) |
| 048 | PropConfigurations PropBinding | Widen `PropConfigurations` value union to add `PropBinding` (reserved, draft on `042-composition-type` branch) |
| 047 | Slot Content — Component.slotContentExamples and SlotBinding | Add `Component.slotContentExamples: Record<string, SlotContent>` + `SlotBinding` extending `PropBinding` with optional `examples?: SlotContentRef[]` (Figma authoring default at index 0); widens `Children` to `string[] \| SlotBinding` (reserved, draft on `042-composition-type` branch) |
| 046 | Component Instance Examples — InstanceExample and Component.instanceExamples | Add `InstanceExample` and `InstanceExamples`; add `Component.instanceExamples?` named record (reserved, draft on `042-composition-type` branch) |
| 045 | Processing Provenance Signals | (reserved, draft in PR #60) |
| 044 | Duplicate Layer Name Disambiguation | (reserved, draft in PR #60) |
| 043 | Custom Color Format Configuration | |
| 042 | Composition as a First-Class Type | |
| 041 | Layout Positioning — Constraint-Based Naming | |
| 035 | Make Config Properties with Defaults Optional | |
| 034 | Remove variantNames, add emptyVariants, make Config.include fields optional | Remove unused `variantNames` (breaking); add `emptyVariants` for filtering; make remaining fields optional |
| 025 | Flowing Content into a Nested Instance's Slot | Model parent components that flow defined content into a nested child instance's slot _(branch)_ |
| 024 | Component Extends Relationship | Add `extends` field to express base/derived component relationships and prop/variant inheritance _(branch)_ |
| 022 | Add Nullable Support to SlotProp | Fix type-schema drift: add `nullable?: boolean` and widen `default` to `string \| null` on SlotProp |
| 021 | Rename `invalidVariantCombinations` to `invalidPropConfigurations` | Shorten verbose field name and fix misleading "Variant" terminology — it describes prop configs, not variants _(branch)_ |
| 020 | Classify Props by External vs Internal Ownership | Add ownership metadata to props distinguishing public API, dual-purpose, and interaction-driven properties _(branch)_ |

## Accepted

| # | Title | Highlights |
|---|-------|------------|
| 059 | Stroke Dash Pattern — `strokeDashPattern` on `Styles` | Add `StrokeDashPattern { dash, gap }` structural type; presence = dashed stroke, null/absent = solid; not token-bindable |
| 058 | Collapsing Wrapped Primitives — `processing.collapsePrimitiveWrapper` | Add optional boolean to `Config.processing` (default false); strips plain container wrappers around a single text/glyph child and promotes the leaf to spec root |
| 057 | Fix `Metadata.generator.version` type: `number` → `string` | Corrects type mismatch — field holds semver strings (e.g. `"1.10.0"`) in all producers; was incorrectly typed as `number` |
| 055 | Variant State Classification via `processing.states` | Add `VariantStateEntry` type; add `Config.processing.states` — classifies Figma variant props as browser-driven or consumer-controlled for CSS selector and contract output |
| 051 | Platform Code-Syntax Token Profiles | Add `FIGMA_SYNTAX_WEB`/`_IOS`/`_ANDROID` to `Config.format.tokens`, emitting per-platform Figma code syntax with fallback to `TOKEN` |
| 043 | Custom Color Format Configuration | Add `Config.format.color` with 9-format enum (HEX default); rename `ColorValue` → `ColorObject`; widen color types with `string` arm |
| 041 | Layout Positioning — Constraint-Based Naming | Replace `x`/`y`/`layoutPositioning` with constraint-based `position`, `start`, `end`, `top`, `bottom`, center offsets |
| 040 | Replace `primaryAxisAlignItems` and `counterAxisAlignItems` with `mainAxisAlignment` and `crossAxisAlignment` | Rename to platform-neutral names; add `MainAxisAlignment` and `CrossAxisAlignment` enums; not token-bindable |
| 039 | Replace `layoutWrap` and `counterAxisAlignContent` with `wrap` and `wrapAlignment` | Rename to platform-neutral names; add `WrapAlignment` enum (`START \| SPACE_BETWEEN`); not token-bindable |
| 038 | Tighten layoutMode to String Literal Enum | Narrow `layoutMode` from `Style` to `LayoutMode \| null` (`'NONE' \| 'HORIZONTAL' \| 'VERTICAL'`); exclude TokenReference |
| 037 | Consolidate Item Spacing into a Bi-Axial Model | Replace `itemSpacing` + `counterAxisSpacing` with single `itemSpacing: Style \| ItemSpacing` using `{ horizontal, vertical }` |
| 036 | Remove `name` and `baseline` from `Variant` | Remove unused `name` and `baseline` optional fields from `Variant` type and schema (breaking) |
| 035 | Make Config Properties with Defaults Optional | Make 5 required Config properties optional with defaults; add `ResolvedConfig` type for fully-resolved shape |
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
