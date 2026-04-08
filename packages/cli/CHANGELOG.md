# Changelog

All notable changes to `@directededges/specs-cli` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - Unreleased

### Added

- **`fetch --no-geometry` flag** — Omits `?geometry=paths` from Figma file requests, reducing payload size by roughly half. Vector path data (`fillGeometry`, `strokeGeometry`, `size`, `relativeTransform`) is excluded; width/height fall back to `absoluteBoundingBox` during processing.

### Fixed

- **`fetch` writes raw response directly to disk** — Previously, fetch parsed the Figma response into JSON and re-serialized it with pretty-printing before writing. This caused `Invalid string length` crashes on large files (400MB+). Now writes the raw response body straight to disk, eliminating unnecessary memory overhead.

## [0.7.0] - 2026-04-05

Rebrands from `anova-cli` to `specs-cli` and publishes to npmjs.org. Updates all dependencies to published npm packages. Removes the deprecated `variantNames` config field per specs-schema v0.16.0.

### Changed

- **Package rename** — `@directededges/anova-cli` → `@directededges/specs-cli`
- **Config file names** — `.anova.config.yaml` → `.specs.config.yaml` (and `.json` variant)
- **Config search path** — `~/.anova/config.yaml` → `~/.specs/config.yaml`
- **Dependencies** — switched from local `file:` references to published npm packages: `@directededges/specs-schema@^0.16.0`, `@directededges/specs-from-figma@^0.11.0`
- **Publishing target** — npm registry (was GitHub Packages)

### Removed

- **`Config.include.variantNames`** — removed from config template, validation, and documentation per specs-schema v0.16.0 (ADR 034). Added `emptyVariants` to valid config include keys.

### Dependency updates

- **@directededges/specs-schema v0.16.0** — removes `variantNames`, adds optional `emptyVariants`, makes `invalidVariants` and `invalidCombinations` optional with defaults
- **@directededges/specs-from-figma v0.11.0** — renames from `anova-transformer`, adds pageId resolution, empty variant filtering, stroke align fix, license metadata in output

## [0.6.0] - 2026-03-25

Adds a new `applyCustomTokens` CLI command for injecting custom token objects into fetched foundation data, enabling the CUSTOM token profile in the transformer. Implements anova v0.15.0 schema with restructured subcomponent configuration and corrected typography types, and anova-transformer v0.10.0 with expanded subcomponent discovery and custom token support.

### Added

- **License key support** — `-l, --license <key>` flag and `ANOVA_LICENSE_KEY` environment variable for Pro features (token references, variable bindings, visibility bindings)
- **License status display** — shows `License: PRO (active)` or fallback reason (e.g., `License: FREE (invalid — key not recognized)`) when a key is provided
- **Manifest mode for `generate`** — `generate` now accepts markdown manifests directly, replacing the separate `batch` command; processes all `[x]` marked components in a single pass
- **`applyCustomTokens` command** — New CLI command that injects `$custom` token objects from a JSON mapping file into fetched variables and styles JSON files. Config-aware with `-v`/`-s` override flags. Supports idempotent re-application, status summary, and validation of mapping entries.
- **`$custom` passthrough in `loadFoundations`** — Variables and styles map entries now preserve `$custom` properties when loading from JSON files, enabling the transformer to read custom token objects.

### Changed

- **`generate` command unified** — accepts both JSON files (with `-c` for single component) and markdown manifests (for multiple components); all split flags (`--split-components`, `--split-concerns`, `--use-subfolders`) work in both modes
- **ManifestParser** — fixed regex to correctly parse component entries from manifest markdown
- **Documentation** — updated all docs to reflect unified `generate` command, removed `batch` references, added license setup guide and Free vs. Pro feature comparison

### Dependency updates

- **@directededges/anova v0.15.0** — Subcomponent configuration moves from a flat `subcomponentNamePattern` string to a structured `subcomponents` object supporting multiple match patterns, an exclude list, and a page-level search scope. Subcomponent references in anatomy and element output now use `$ref` pointers. Typography fields `leadingTrim`, `fontFamily`, and `fontStyle` are corrected to match actual Figma API values.
- **@directededges/anova-transformer v0.10.0** — Specs now support page-level subcomponent discovery (scanning beyond the component tree), multiple and excludable match patterns for subcomponent detection, and alphabetically ordered subcomponent output. Subcomponent references in `instanceOf` fields emit as `$ref` pointers. The new CUSTOM token profile uses `$custom` objects from variables and styles as style property values. Fixes detection of subcomponents nested as instances and inconsistent slash spacing in Figma component names.

### Removed

- **`batch` command** — consolidated into `generate`; use `anova generate manifest.md` instead of `anova batch manifest.md`

## [0.5.0] - 2026-03-18

Supports code-only props extraction: the transformer now detects a configurable container layer, excludes it from anatomy, and surfaces its children as props with `$extensions` provenance metadata. Slot constraint code-only props are promoted to `SlotProp.minItems`, `maxItems`, and `anyOf` fields. Also introduces `NumberProp` inference from text-based code-only props when enabled.

### Added

- `ConfigLoader` validation for new processing config fields: `codeOnlyPropsPattern` (string), `slotConstraints` (boolean), and `inferNumberProps` (boolean)

### Changed

- Compatible with `@directededges/anova` v0.14.0 and `@directededges/anova-transformer` v0.9.0

### Fixed

- `ConfigLoader` was validating `iconNamePattern` instead of `glyphNamePattern`, the field name used in `Config.processing` since v0.3.0. The validator now correctly references `glyphNamePattern`
- `BatchCommand` manifest parser regex now handles component names containing parentheses

## [0.4.0] - 2026-03-13

### Changed

- Compatible with `@directededges/anova` v0.13.0 and `@directededges/anova-transformer` v0.8.0

## [0.3.0] - 2026-03-08

### Added

- `iconNamePattern` config support for detecting icon content assets

### Changed

- Compatible with `@directededges/anova` v0.12.0 and `@directededges/anova-transformer` v0.7.1

## [0.2.0] - 2026-03-04

### Changed

- Updated for `@directededges/anova` v0.11.0 compatibility
- Config defect fix

## [0.1.0] - 2026-02-10

### Added

- Initial CLI and MCP server for design system operations
- `Component.fromRestApi` integration with anova-transformer
