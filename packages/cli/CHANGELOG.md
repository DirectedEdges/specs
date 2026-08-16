# Changelog

All notable changes to `@directededges/specs-cli` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

Specs can now go back into Figma. `specs render` takes a spec you already have and builds
the component it describes in a connected Figma file — the reverse of `specs generate`, and
the other half of a round trip you can run and re-run as a spec changes.

### Added

- **`specs render` — build a component in Figma from a spec.** Point it at a spec file, a
  component folder, or a directory of them; with no argument it renders everything in your
  configured `outputDirectory`. Variants, styles, props, slots, subcomponents, and icons are
  all reconstructed, with tokens bound to the file's own variables and styles.
  - `--watch` re-renders on every save, so you can edit a spec and watch the component change.
  - `--overwrite` replaces a component of the same name. Without it, a name collision is an
    error rather than a silent deletion.
  - `--page <id>` renders onto a specific page instead of whichever one is open — worth using
    in any script, since the open page can move underneath you.
  - `--strict` fails the run when an element cannot be resolved, instead of producing a
    component with content missing.
  - `--timing` reports where the time went, phase by phase.
- **`specs bridge` — the connection render works over.** `start`, `stop`, and `status` for a
  local server the Figma plugin connects to. Figma cannot be reached from outside, so the
  plugin opens the connection and the CLI talks through it. Enable the CLI Bridge in the
  plugin, and `specs bridge status` will name the file it is connected to. Several Figma
  files can be connected at once; `--file <fileKey>` picks one, and in an interactive
  terminal you are offered a numbered list instead of an error.
- **`specs cache` — the lookup tables render needs.** Every component, icon, style, and
  variable name in your fetched data, resolved to what Figma needs to place it. Built from
  `specs fetch` output, refreshed with `--force`, or rebuilt in place with
  `specs render --refresh-cache`. A stale cache fails the render rather than rendering
  something subtly wrong.
- **`specs generate --from-bridge` — read a spec from what's selected in Figma.** A third
  source for `generate` alongside a fetched file and a manifest, with no REST fetch and no
  Figma token: select a component in a connected file and generate its spec directly. Your
  config governs the result, exactly as it does for a fetched generate, and the run leaves
  the Figma file untouched. Output follows the same `--output` / `--split-components` /
  `--split-concerns` resolution as every other source.
- **`specs fetch --only <name>` now narrows by data kind as well as by source.** `--only icons` re-downloads just the icon SVGs, deriving them from the file payload already on disk rather than pulling the whole file again; `--only variables,styles` skips the file entirely. A source alias still works as before, and the two combine (`--only library,icons`). A name that matches neither is an error listing both the configured aliases and the available kinds, rather than being quietly ignored.
- `format.figmaKeys` in the generated `specs.config.yaml` template — commented out at its `NONE` default, documenting the opt-in that enables the safe key grammar and Figma name preservation (ADR-066)
- `specs analyze keys` — reports Figma layer and property names a formatted key cannot reconstruct, written to `_analysis/keys.yaml`. Organized `byComponent` as a designer's checklist — each component splitting into `props` and `anatomy`, with an empty surface omitted — then `byCause` for systemic problems and `byName` for a name repeated across the library. Requires `format.figmaKeys` to declare a convention; empty under the `NONE` default (ADR-066)
- **`specs fetch` icons** — a fourth data kind alongside `file`, `variables`, and `styles`: fetch derives the library's icon glyphs from the downloaded file payload (no `scan` required) and downloads their SVG assets with stable kebab-case slugs.

### Changed

- CSS `overflow` output — keyed on the renamed `Styles.clipsContent`, so `overflow: hidden` / `overflow: visible` is emitted for the first time (ADR-069)


## [0.26.0] - 2026-08-07

Two new `specs analyze` reports help you understand a design system at scale. `specs analyze dependencies` maps how components compose one another — instances, slot constraints, and example compositions — so you can answer "what's the blast radius of changing this component?" and "which props does anyone actually use?" `specs analyze styling` now also flags tokens nobody references, surfacing dead variables and styles you can safely retire.

### Added

- **`specs analyze dependencies` — component dependency graph** — A new analyzer that builds a directed graph of how components compose one another from `instanceOf` references, answering "what is the blast radius of changing this component?" and "which of its props do consumers actually use?". Edges carry a kind — `instance` (placed instances), `slot` (`anyOf` constraints), `example` (`slotContentExamples` compositions) — and the blast-radius closure runs over `instance` edges only, with slot/example coupling reported separately as contract relations. Unmatched references become nodes flagged `external`; subcomponents collapse into their parent; split-concerns layouts (`variants.yaml`, `examples.yaml`) and `$nested` deep configurations are supported. Two aggregates land in `_analysis/` (extension follows `format.output`):
  - `dependencies.graph.{json|yaml}` — nodes with degrees, typed edges with element/slot/example labels, plus roots, leaves, cycles, and external counts.
  - `dependencies.byComponent.{json|yaml}` — per component: direct and transitive dependents/dependencies with min depth, contract relations, and `propUsage` — per prop: total configuration sites, per-consumer breakdown by section (`default`/`variants`/`examples`) with per-value site counts, and a value → consumers roll-up. Props no consumer configures appear with `configuredBy: 0`.
- **`specs analyze styling` now reports unused tokens** — A third aggregate report, `_analysis/styling.unused.{json|yaml}`, lists every token in the fetched foundations data (variables, color styles, text styles, effect styles) that no analyzed spec references, with a per-category `summary` of total/used/unused counts. Variables are matched by their collection-prefixed name (`Collection name/Variable name`), styles by name; grid styles are excluded. The report requires `{alias}.variables.json` / `{alias}.styles.json` in the data directory and is skipped when absent.

### Dependency updates

- **`@directededges/specs-schema` ^0.29.0** — Numeric properties can now be marked nullable (`NumberProp.nullable`), matching strings, slots, and images. Horizontal text alignment now uses logical inline-axis direction (`START`/`END`/`CENTER`/`JUSTIFY`) instead of physical `LEFT`/`RIGHT`/`JUSTIFIED`, so generated specs read correctly regardless of writing direction.
- **`@directededges/specs-from-figma` ^0.28.0** — Horizontal text alignment extraction now emits the new logical directions. Code-only text props whose default is only whitespace are recognized as empty placeholders instead of literal example content. Several extraction bugs are fixed: slot resolution for unpublished local components, gradient center coordinates, number-named layers, and anatomy/element ordering.

## [0.25.0] - 2026-07-16

Generated specs can now include the images your components actually use. Enable `processing.images` in config and image fills emit as typed `backgroundImage` values backed by a per-component `images` registry; then run `specs generate --get-images` to download each referenced image once into an `_images/` folder and point every registry entry at a real file. Text truncation (`textOverflow`, `maxLines`) is now captured on text elements, rotated elements keep their sub-degree precision, and `specs generate` output is quieter — per-file overwrite warnings collapse into a single summary line.

### Added

- **Image config surface (ADR-063)** — `processing.images` is validated when present (presence is the on-switch): `backgroundImage` coerces to a literal boolean, `sourceProps` must be a non-empty array of strings (trimmed), and `imageComponent` requires a non-empty `sourceProps` (its forwarding target is `sourceProps[0]`) — invalid members are dropped with warnings. The images registry joins the *examples* concern under `--split-concerns` (emitted in `examples.yaml`, counted toward whether that file is written).
- **`specs generate --get-images` (ADR-063 resolution phase)** — Resolves unresolved registry entries (Figma identity in `$extensions['com.figma'].imageHash`, no `src`) into real files. Calls Figma's Get Image Fills endpoint (requires `FIGMA_TOKEN` and a configured source key), downloads each distinct image once, writes `_images/<imageHash>.<ext>` inside the output directory (format detected from magic bytes: png/jpg/gif/webp), and adds `src` to each entry — a path relative to the referencing spec file (`_images/...`, or `../_images/...` in per-component-folder layouts). The Figma identity survives for reverse-direction tooling; `$image` pointers are untouched; temporary S3 URLs are never persisted; unresolvable hashes stay unresolved with a warning.

### Changed

- **`specs generate` write output simplified** — Per-file "Overwriting existing file" warnings now collapse into a single summary line instead of one per file, and the redundant "✓ Saved to"/"✓ Generated N files" success echo has been removed.

### Dependency updates

- **`@directededges/specs-schema` ^0.28.0** — Adds the image vocabulary generated specs now use: the `backgroundImage` style, the per-component `images` registry, image-typed props, image bindings for forwarding into nested instances, and the `Config.processing.images` block. Also adds `textOverflow`/`maxLines` for text elements, and fixes several false validation failures — color token references with resolved color values, subcomponent `source` identity, and collapsed-root `originalName` provenance now validate cleanly, while `$nested` configurations with an empty path are correctly rejected.
- **`@directededges/specs-from-figma` ^0.27.0** — Implements image detection: image fills on containers emit `backgroundImage` entries into the `images` registry instead of being silently dropped, image-source props re-type to image props, and a designated image component forwards images into the instances that render them. Text elements now carry `textOverflow` and `maxLines`, and rotated elements no longer lose sub-degree precision in CLI output (restoring parity with the plugin).

## [0.24.0] - 2026-07-04

`specs transform` gains two new transformers — `react` and `stories` — that scaffold a working React component and a matching Storybook page directly from the spec, plus a `--components` filter to scope a run to specific components. The `contract` and `css` transformers pick up complementary additions (slot visibility rules, structural CSS fixes) to support the new component scaffolding. Generated filenames are now prefixed with the component name for clarity outside the folder tree — a breaking change for any tooling that hardcodes the old unprefixed filenames.

### Added

- **`react` transformer** — Emits a working React component (`generated/react/{Component}.scaffold.tsx`) with BEM markup from the merged layout tree, `data-*` variant attributes, ARIA state attributes, and slot/element rendering gated on the visibility rules from `contract`. Also seeds a one-time authored copy into `src/react/{Component}.tsx` plus empty `{Component}.extensions.css` and `{Component}.proposed.css` files — created once, never overwritten on subsequent runs. Subcomponents get their own scaffold and seeded authored files under their own subfolder. Instance-typed elements render as a placeholder comment (not yet implemented). Requires `variants.yaml`; components without it are skipped with a warning.
- **`stories` transformer** — Emits a Storybook CSF page (`generated/react/{Component}.stories.tsx`) with a `Default` story plus one story per variant configuration expressible through props. Imports the **authored** component seeded by `react`, not the regenerated scaffold, so Storybook reflects implementation changes. Meta args combine the contract's `Defaults` with example values for string/slot props. Variants driven purely by browser-fired states (`:hover`, `:active`) are skipped, since they have no corresponding prop. Also requires `variants.yaml`. Subcomponents get their own stories file, importing their own authored component.
- **`contract` transformer emits `Slots` and `SlotRules`** — When `variants.yaml` is present, the contract now also emits a `{Component}Slots` interface and a `{Component}SlotRules` const describing which anatomy elements are content-injection points and when each renders (`always`, `whenTrue`, `whenNotNull`, `whenValue`). Consumed by the `react` transformer to gate element rendering. Slots come from anatomy `slot` elements (typed `unknown`) and bound `text` elements (typed `string`); a slot is required only when its rule is `always`.
- **`transform --components <keys...>`** — Scopes a `specs transform` run to specific component folders instead of every component discovered in the output directory. Unknown keys log a warning and are skipped.

### Changed

- **`css` transformer now handles structurally-absent elements and stacking/containing-block fixes** — Elements present in some variant layouts but absent from the default layout are now hidden at the base (`display: none`) and un-hidden only under the variant selectors that include them. Elements with `position: ABSOLUTE` now get their layout parent promoted to `position: relative` (establishing a containing block), and that parent's non-absolute siblings also get `position: relative` so DOM paint order matches Figma's layer order instead of the absolute element covering static siblings. Both derived automatically from comparing default vs. variant layouts — no configuration needed.
- **Generated transform output filenames are now prefixed with the component name** — `contract.ts` → `{Component}.contract.ts`, `styles.css` → `{Component}.styles.css`, and the new `react`/`stories` output follow the same convention (`{Component}.scaffold.tsx`, `{Component}.stories.tsx`). Subcomponent output is prefixed with just the subcomponent's own name (e.g. `Group.contract.ts`), not the parent's, since the subfolder already disambiguates it. This is a breaking rename for anything that reads the previous unprefixed filenames directly.
- **Clearer `transform` prerequisite guidance** — The "no specs directory" and "no component directories" error messages no longer suggest `--use-subfolders`, which has no effect once `--split-concerns` is set. The correct prerequisite is `specs generate --split-components --split-concerns`.

### Dependency updates

- **`@directededges/specs-from-figma` ^0.26.0** — Fixes a casing bug where variant `configuration` values, instance `propConfigurations`, and `invalidVariantCombinations` were being reformatted (e.g. `Error` → `error`) while enum values and defaults were not, causing per-variant style overrides and invalid-combination checks to silently fail to match. Also fixes default slot content being pruned away when the slot itself is hidden by a conditional visibility prop — generated specs no longer lose default content for these slots.


## [0.23.0] - 2026-07-01

Specs generated by the CLI now capture dashed stroke styling and record where each subcomponent lives back in the source Figma file — both come from upstream engine and schema updates, with no CLI-side changes required to pick them up.

### Changed

- **Generated specs now include dashed stroke data** — Any element with a dashed (not solid) stroke now emits `strokeDashPattern` in its styles, typed as `{ dash, gap }`. Previously dashed strokes fell through as unrecognized styling and were dropped from output.
- **Subcomponent entries now include their Figma source location** — Each entry under `subcomponents` in generated specs now carries a `source` field (`pageId`, `nodeId`, `nodeType`) pointing back to the originating Figma node.

### Dependency updates

- **`@directededges/specs-schema` bumped to `^0.27.0`** — Adds the `StrokeDashPattern` type backing dashed stroke output and `SubcomponentSource` backing the new subcomponent `source` field.
- **`@directededges/specs-from-figma` bumped to `^0.25.0`** — Implements dashed stroke extraction (ADR-059) and subcomponent source population (ADR-060). Also stops reformatting VARIANT enum values and defaults, so generated specs now match Figma's raw variant option strings exactly.


## [0.22.0] - 2026-06-22

Label and icon components can now produce cleaner specs when `collapsePrimitiveWrapper` is enabled — a plain frame wrapping a lone text or glyph element is stripped out and the primitive becomes the spec root. This release also fixes `specs fetch` crashing on large Figma files and adds clearer diagnostic output for 403 access errors.

### Added

- **`collapsePrimitiveWrapper` support wired into the CLI** — The config loader defaults `Config.processing.collapsePrimitiveWrapper` to `false` when absent, and the `init` template includes it as a commented-out option with a description of its behavior.

- **Improved 403 error guidance in `fetch`** — The access-denied error message now includes two additional diagnostic bullets: one for SAML/SSO-enforced orgs (personal access tokens are blocked; use OAuth or ask your admin to allow PATs — links to `https://www.figma.com/developers/api#oauth2`), and one clarifying that a 403 means the file exists but the account lacks access (e.g. file is in personal drafts or a restricted team). Running `specs fetch --verbose` now also prints the resolved file key in the error output.

### Fixed

- **`fetch` streams large Figma files to disk instead of buffering in memory** — Previously, `specs fetch` read the entire Figma API response into a JavaScript string before writing it. Files large enough to exceed Node's ~512 MB string limit crashed with `Cannot create a string longer than 0x1fffffe8 characters`. The response body is now streamed directly to a temporary file and renamed into place only on success, so arbitrarily large files are handled without memory pressure and a failed mid-download leaves no partial file behind.

### Dependency updates

- **`@directededges/specs-schema` bumped to `^0.26.0`** — Adds `Config.processing.collapsePrimitiveWrapper` (boolean, default `false`), enabling the new primitive wrapper collapse feature for label and icon components.
- **`@directededges/specs-from-figma` bumped to `^0.24.0`** — Implements wrapper collapse: strips plain container frames around a single text or glyph child and promotes the leaf to spec root. All-or-nothing per component — every variant must qualify.


## [0.21.0] - 2026-06-15

Two bugs in the `css` transformer and `analyze` command are fixed. The `css` transformer now correctly emits selectors for enum-valued state variants (previously silently skipped when no explicit `value` was set). The `analyze` command now respects `format.output` for the `props` and `styling` analyzers instead of hardcoding file formats. Upstream: `specs-schema` v0.25.0 renames `SlotProp.minItems`/`maxItems` to `minChildren`/`maxChildren` and `specs-from-figma` v0.23.0 reads slot constraints natively from Figma's `slotSettings` API.

### Fixed

- **CSS transform now emits styling for enum-valued state variants** — When a state in `config.processing.states` maps a prop without an explicit `value` (e.g. `selected: { prop: selected }`), variants whose enum value matches the concept name (case-insensitively, like `Selected=Selected`) now produce CSS selectors. Previously these variants were silently skipped, causing selected-state styling to be missing from `styles.css`.

- **`analyze` command respects `format.output` for props and styling (#151)** — `props` and `styling` analyzers now write `.json` or `.yaml` output files (and use the matching serializer) based on `config.format.output`. Previously both were hardcoded: `props` always wrote YAML, `styling` always wrote JSON.

### Dependency updates

- **`@directededges/specs-schema` bumped to `^0.25.0`** — `SlotProp.minItems`/`maxItems` renamed to `minChildren`/`maxChildren` (aligns with Figma's native `slotSettings` API). `Metadata.generator.version` corrected from `number` to `string`.
- **`@directededges/specs-from-figma` bumped to `^0.23.0`** — Slot constraints (`minChildren`, `maxChildren`, `anyOf`) now read from Figma's native `slotSettings` when present; libraries using Figma's built-in slot configuration no longer need code-only props for constraints. Legacy `{slot} minItems`/`maxItems` prop names still accepted.

## [0.20.0] - 2026-06-07

Introduces the `specs analyze` command with two analyzers: `props` (cross-library prop governance aggregate) and `styling` (token usage dictionary, moved from transforms). Extends the `css` and `contract` transformers with subcomponent support, a configurable CSS rule pipeline, and the `border-shift-inset-shadow` rule. Refines `css` output: boolean props emit presence selectors and disabled guards wrap hover/active.

### Added

- **`specs analyze` command** — New command for on-demand analysis passes over component specs. Accepts one or more analyzer names as positional arguments (`specs analyze props`, `specs analyze props styling`). Output goes to `_analysis/` by default; override with `--analysis <path>`. No config key — analyzers are run on demand, not as part of the regular transform pipeline.

- **`props` analyzer** — Reads every component's `api.yaml` and produces `_analysis/props.yaml`: a cross-library aggregate with six sections — summary counts, prop name frequency, enum discordance (same prop name, divergent value sets), boolean naming patterns, API surface per component, and a slot inventory. Designed as structured input for LLM-assisted API governance analysis.

- **`styling` analyzer** — Moved from the transform registry to the analyzer registry. Writes `_analysis/styling.byComponent.json` and `_analysis/styling.byToken.json` (previously written to `_dictionary/`). Invoke with `specs analyze styling`.

- **`css` transformer: subcomponent support** — For each entry in `variants.yaml`'s `subcomponents` map, emits a `styles.css` inside a dedicated subfolder named after the subcomponent key (e.g. `dsActionList/group/styles.css`). BEM selectors are scoped to the subcomponent's own kebab-case class name (e.g. `.group`, `.group__text`). Subcomponent subdirs are created automatically.

- **`contract` transformer: subcomponent support** — For each entry in `api.yaml`'s `subcomponents` map, emits a `contract.ts` inside a dedicated subfolder named after the subcomponent key (e.g. `dsActionList/group/contract.ts`). Interface and enum type names are prefixed with both the component and subcomponent name (e.g. `DsActionListGroupProps`). Subcomponent subdirs are created automatically.

- **`css` transformer: configurable rule pipeline** — The `css` transformer now accepts a `rules` list under its transformer options. Rules run as pre-passes on the structured variants data before CSS emission, enabling semantic rewrites that require cross-variant context. Configure per-component in `specs.config.yaml`:
  ```yaml
  transformers:
    - name: css
      rules:
        - border-shift-inset-shadow
  ```

- **`css` transformer: `border-shift-inset-shadow` rule** — Eliminates layout shift from border-width changes across variants. Detects elements whose `strokeWeight` or `strokes` change in any variant (INSIDE strokes only), rewrites the default block to reserve space with a transparent border (`border: Npx solid transparent`), and rewrites variant stroke changes to `box-shadow: inset 0 0 0 Npx <color>`. OUTSIDE and CENTER strokes are unaffected (they use `outline`, which is already layout-safe).

### Changed

- **`css` transformer: presence selectors for boolean props** — Data attribute selectors for variant props whose value is a JS boolean `true` now emit `[data-x]` (presence) instead of `[data-x="true"]` (value). String-valued props (e.g. `checked: "checked"`, `checked: "indeterminate"`) continue to emit value selectors. Matches the TSX idiom `data-x={value || undefined}`.

- **`css` transformer: `:not(:disabled)` guard on hover/active** — When the `disabled` concept is configured in `processing.states`, `:hover` and `:active` selectors (including compound variants like `[data-checked="checked"]:hover`) are automatically guarded with `:not(:disabled):not([aria-disabled="true"])` to prevent interaction styles from applying to disabled elements.

### Removed

### Dependency updates

- No upstream dependency changes since 0.19.0. Continues to reference `@directededges/specs-schema ^0.24.0` and `@directededges/specs-from-figma ^0.22.0`.

## [0.19.0] - 2026-06-05

Introduces the `specs transform` command and three transformers: `contract` (typed Props interface + Defaults), `css` (BEM stylesheet with token vars and concept-driven state selectors via `processing.states`), and `styling` (token usage dictionary). Specs generated by the CLI now correctly identify themselves in `metadata.generator` instead of reporting the Figma plugin. Upstream: `specs-from-figma` v0.22.0 adds `RestFoundations.generator` for caller identity and fixes `INSTANCE` width/height variable bindings; `specs-schema` v0.24.0 adds `Config.transformers`, `workspace.schema.json`, and `Config.processing.states`.

### Added

- **`specs transform` command** — Discovers component subfolders under the output directory (each must contain `api.yaml`) and runs one or more named transformers against every component. Transformer names resolve in priority order: positional arguments → `config.transformers` → CLI default (`contract`). Accepts `-o/--output`, `--config`, and `--verbose` options. Closes DirectedEdges/specs#137

- **`contract` transformer** — Emits `contract.ts` per component: a typed `Props` interface (enum union types, nullable types, slot props excluded) and a `Defaults` const (`satisfies Props`) for every prop with a declared default. Default transformer when none are specified. Closes DirectedEdges/specs#137

- **`css` transformer** — Emits `styles.css` per component from `variants.yaml`. Default element styles become root/BEM-child selectors; variant configurations become `[data-propName="value"]` attribute selectors (camelCase prop names kebabized); multi-prop configurations produce compound selectors. Token references resolve to `var(--)` based on `config.format.tokens`: path-derived kebab for `TOKEN`/`TOKEN_NAME`/`FIGMA_NAME`; verbatim for `FIGMA_SYNTAX_WEB` vars that already start with `--`; `$cssVar` field or path derivation for `CUSTOM`. Closes DirectedEdges/specs#139

- **`styling` transformer** — Emits `styling.json` per component: token/style usage grouped by category (`variables`, `colorStyles`, `textStyles`, `effectStyles`), each row recording `name`, `appliedAs`, and `appliedTo` (anatomy element → occurrence count). After all components run, `finalize()` writes two aggregate files to `_dictionary/`: `styling.byComponent.json` (all components combined) and `styling.byToken.json` (token-first index: token name → components/elements using it). Subcomponents appear as dot-separated keys. Closes DirectedEdges/specs#138

- **`config.transformers` block in `init` config template** — `specs init` now generates a commented-out `transformers:` block showing all three transformers, ready to uncomment.

- **`processing.states` support in `css` and `contract` transformers** — Both transformers now read `config.processing.states`, a concept-keyed map that classifies Figma variant props as semantic states. The `css` transformer emits real CSS pseudo-classes (`:hover`, `:active`, `:focus-within`) and ARIA attribute selectors (`[aria-disabled="true"]`, `[aria-invalid="true"]`) for classified props instead of `data-*` attribute selectors. The `contract` transformer omits browser-driven props from generated Props interfaces automatically — no additional config flag required. `prop` and `value` bridge any naming gap between library conventions (e.g. `isDisabled`, `pressed`) and canonical concept names. Absence of `processing.states` is backward-compatible: all props continue to emit as `data-*` selectors and appear in contracts unchanged.

### Fixed

- **`metadata.generator` now correctly identifies the CLI** — Previously, specs generated by the CLI reported the Figma plugin name, version, and URL in `metadata.generator`. The CLI now passes `{ name: '@directededges/specs-cli', version, url }` via `RestFoundations.generator`, and the version is stamped from `__SPECS_CLI_VERSION__` injected at build time. Closes DirectedEdges/specs#133

### Changed

### Removed

### Dependency updates

- **`@directededges/specs-schema` → `^0.24.0`** — adds `Config.transformers` (flat array, replaces `config.transform.transformers`), `workspace.schema.json` for IDE validation of `specs.config.yaml`, and `Config.processing.states` (`Record<string, VariantStateEntry>`) for concept-keyed variant state classification.
- **`@directededges/specs-from-figma` → `^0.22.0`** — `RestFoundations.generator` lets the CLI supply its own identity to `metadata.generator`; fixes `INSTANCE` width/height variable bindings; color `components` values rounded to 4dp.


## [0.18.0] - 2026-05-29

Hardens license-key validation to hard-fail on transient errors and improves actionable error messages for stale or inaccessible Figma file keys.

### Fixed

- **`generate` no longer silently produces free-tier output when a license key can't be validated (#119)** — if a key was supplied (via `-l`, `SPECS_LICENSE_KEY`, or `ANOVA_LICENSE_KEY`) but the license check could not be completed — a transient proxy/network failure or a rate-limit (e.g. the upstream validator returning 429) — the run previously fell back to FREE and wrote free-tier specs under a valid paid key, with only an easily-missed status line. `generate` now hard-fails on these transient states (`network-error`, `error`, and a future `rate-limited`) with an actionable message ("retry in a few seconds, or remove the key for free-tier output") and a retryable exit code (`NETWORK_ERROR`, or `RATE_LIMIT` once the validator distinguishes it). Definitive key rejections (`invalid`/`removed`/`expired`) still fall back to free-tier output as before.
- **Actionable `fetch`/`generate` error messages for stale or inaccessible Figma file keys (#125)** — a `fetch` that hit a 404 previously surfaced only `HTTP 404 while fetching <alias>.<kind>`, with no hint that the cause was the file key pinned in config. The 404 case now explains that the configured key is likely stale or out of reach (file moved/deleted/recreated, or the token can't open it) and points at `sources.<alias>.key` in the config file. Auth failures are split: 401 reports a missing/invalid/expired `FIGMA_TOKEN` and where to set it (`.env`), while 403 reports valid-but-no-access and points at the same config key. In `generate`, a missing source `.file.json` now tips the user to run `specs fetch` or check `sources.<alias>.key`.

### Dependency updates

- **`@directededges/specs-from-figma` ^0.20.0 → ^0.21.0** — SLOT elements now evaluate the same container-surface styles as frames: auto-layout config, strokes, padding, and corner-smoothing. Slot styling in generated specs is more complete.
- **`@directededges/specs-schema` ^0.22.0** — no version change.


## [0.17.0] - 2026-05-23

Surfaces the new composition/examples model to CLI users: config loading now accepts `include.defaultSlotContent` and the `processing.instanceExamples` block, so generated specs can include slot-content examples and pre-configured instance examples (both Pro-gated). `--split-concerns` gains a third `examples.yaml` output for these examples, and a fix ensures they're no longer silently dropped when splitting concerns.

### Added

- **Examples config (ADR-050)** — `ConfigLoader` now accepts the new `include.defaultSlotContent` flag (added to the include allowlist) and validates `processing.instanceExamples` (`scope` ∈ `PAGE`/`FILE` with `PAGE` fallback; `match` required; `exclude`/`parentNames` array-checked), passing them through to the engine. `instanceExamples` output is driven by the **presence** of `processing.instanceExamples` (no `include.instanceExamples` flag), mirroring `subcomponents`. Both example features are Pro-gated — silently omitted on the free tier. Surfaces `slotContentExamples`/`instanceExamples` generation to CLI users.

### Changed

- **`--split-concerns` now emits a third `examples.yaml`** — slot-content and instance examples are written to `examples.yaml` (per-concern mode) or `<component>/examples.yaml` (combined mode), alongside `api.yaml` and `variants.yaml`. The file is emitted only when at least one component has examples, and components without examples are omitted from it.

### Fixed

- **`--split-concerns` no longer drops examples** — `slotContentExamples` and `instanceExamples` (component- and subcomponent-level) were assigned to neither the `api` nor `variants` concern, so `--split-concerns` silently discarded them, leaving the `$slotContent` references in `default`/`variants` dangling. They are now routed into `examples.yaml`.

### Removed

### Dependency updates

- **`@directededges/specs-schema` ^0.21.0 → ^0.22.0** — adds the composition and slot-content model (ADR-042, 046–052): `Composition`, `SlotContent`, and the universal `SlotContentRef` (`{ $slotContent }`) pointer, plus `Component.slotContentExamples` and `Component.instanceExamples`. Specs can now carry named slot-content examples and documented instance examples, and `Config` gains `processing.instanceExamples` (example detection) and `include.defaultSlotContent` (output gate).
- **`@directededges/specs-from-figma` ^0.19.0 → ^0.20.0** — detects and emits slot-content examples (de-duplicated across variants and slots) and instance examples (pre-configured usages of a component), both Pro-gated. REST page/file-scoped discovery now correctly finds candidates under `CANVAS` nodes, and a plugin-only hashing bug that collapsed all slot fills into a single example is fixed.


## [0.16.0] - 2026-05-22

Adds the platform code-syntax token profiles (`FIGMA_SYNTAX_WEB/IOS/ANDROID`) to config loading and templates, so specs can emit each Figma variable's per-platform code syntax. Picks up upstream transformer improvements: conditional-visibility boolean prop exposure, detection of subcomponents nested inside sections/frames, and a fix for SLOT properties that previously leaked raw GUID objects into output.

### Added

- **Platform code-syntax token profiles (ADR-051, DirectedEdges/specs#103)** — `format.tokens` now accepts `FIGMA_SYNTAX_WEB`, `FIGMA_SYNTAX_IOS`, and `FIGMA_SYNTAX_ANDROID` in config loading and templates, surfacing the platform code-syntax profiles to CLI users. The transformer (specs-from-figma) emits each variable's Figma `codeSyntax` for the selected platform, falling back to the standard token output when a platform has no code syntax defined.

### Dependency updates

- **`@directededges/specs-schema` ^0.20.0 → ^0.21.0** — adds the `FIGMA_SYNTAX_WEB/IOS/ANDROID` `format.tokens` profiles.
- **`@directededges/specs-from-figma` ^0.18.0 → ^0.19.0** — serializes the new platform code-syntax profiles from Figma `codeSyntax`; specs now expose a boolean-prop reference for conditional visibility bindings; subcomponents nested inside sections/frames are now detected under `subcomponents.scope: PAGE`; SLOT properties no longer emit raw GUID objects into output.


## [0.15.1] - 2026-05-20

Patch release fixing the `scan` → `generate` round-trip. `generate` now accepts the v2 (markdown-table) manifests that `scan` has emitted since 0.15.0, restoring the documented workflow.

### Fixed

- **`generate` now accepts v2 (table) manifests** — `generate`'s source auto-detection only recognized the legacy v1 checkbox-list format (`- [`), so any manifest produced by `specs scan` in 0.15.0 failed with `Error: Unrecognized source format`, breaking the documented `scan && generate` round-trip. `generate` now detects v2 manifests via the `**Scan format version:**` header and dispatches to `ManifestParserV2`, while continuing to support v1 manifests and raw JSON files. ([#101](https://github.com/DirectedEdges/specs/issues/101))
- **Escaped pipes in component names round-trip** — `scan` escapes `|` as `\|` in manifest table cells; `ManifestParserV2` now unescapes them so names like `Toggle | On/Off` parse back to their literal form.

### Dependency updates

- No upstream dependency changes since 0.15.0. Continues to reference `@directededges/specs-schema ^0.20.0` and `@directededges/specs-from-figma ^0.18.0`.

## [0.15.0] - 2026-05-15

`scan` now drives curation from Figma's **Ready for Dev** signal and merges intelligently with prior manifests, preserving manual edits except where Figma's devStatus has changed. Introduces a new v2 manifest format with automatic migration from v1.

### Added

- **Ready-for-Dev curation in `scan`** — Components with `devStatus: READY_FOR_DEV` are now checked by default. Libraries with no devStatus signal anywhere fall back to the legacy heuristic.
- **Manifest merge on rescan** — Re-running `scan` preserves manual checkbox edits unless `devStatus` changed for a row (Figma wins on flips). `--keep-checks` locks manual edits regardless of devStatus changes; `--reset-checks` ignores the prior manifest entirely.
- **Glyphs section in scan manifest** — When `config.processing.glyphNamePattern` is set, top-level components matching the pattern are routed to a read-only `## Glyphs` section after `## Components`. Glyph rows have no checkboxes and are excluded from `specs generate`. The section is omitted when no matches are found. Pattern matching reuses the same `{i}`-placeholder semantics as the engine's glyph detection.
- **v2 manifest format** — New markdown-table format with a `Dev Status` column, `**Scan format version:**` header, and `**File last modified:**` metadata. Legacy v1 (checkbox-list) manifests are detected and migrated automatically.

### Changed

- **Docs updated** — `cli/commands/scan.md`, `cli/getting-started.md`, and `cli/workflows.md` reflect the new curation flow and manifest format.

### Dependency updates

- No upstream dependency changes since 0.14.0. Continues to reference `@directededges/specs-schema ^0.20.0` and `@directededges/specs-from-figma ^0.18.0`.


## [0.14.0] - 2026-05-15

Dependency-only release that picks up specs-from-figma 0.18.0. No CLI source changes.

### Dependency updates

- **@directededges/specs-from-figma 0.18.0** — Restores ~170 invalid variants previously dropped by the empty-variant filter, accounting for the bulk of test-round 0009 parity diffs. Fixes a `figma.mixed` Symbol crash on text nodes with mixed text styles. `TEXT` elements now emit explicit size styles (`width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`); `GLYPH` elements now emit shadow/blur effects and aspect-ratio constraints alongside their fill color.

## [0.13.1] - 2026-05-08

Patch fix for `--split-concerns` output shape.

### Fixed

- **`props` defaults to `{}` instead of `[]` when a component has no props (#84)** — `splitComponentByConcern` and `extractApiFromSubcomponents` were filling missing `props` with an empty array, producing output that violated the schema (`Props` is an object). Components with no props (e.g. a divider) now emit `props: {}`. The `ComponentApiData` and `SubcomponentApiData` interfaces are corrected to type `props` as `Record<string, any>`.


## [0.13.0] - 2026-05-06

Adds configurable color output format (`config.format.color`) with nine options from hex strings to structured DTCG Color objects. Fixes EISDIR crash when outputDirectory targets a directory, and corrects config template URLs.

### Added

- `config.format.color` — validates and normalizes the new `ColorFormat` option (`HEX`, `HEXA`, `RGB`, `RGBA`, `HSLA`, `HSB`, `OKLCH`, `OKLAB`, `OBJECT`); defaults to `HEX`. Config template updated with inline docs. (ADR 043)

### Fixed

- **EISDIR when outputDirectory is a directory in single-file mode (#34)** — When `outputDirectory` pointed to an existing directory (e.g. from a prior `--split-components` run), `specs generate` without split flags crashed with EISDIR. Now appends `library.{format}` as the default filename.
- Config template URLs now point to the doc site (`directededges.github.io/specs/config/...`) instead of 404ing GitHub raw paths (#43)

### Dependency updates

- **@directededges/specs-schema 0.20.0** — New `Config.format.color` option typed as `ColorFormat`. `ColorValue` renamed to `ColorObject`. `ColorStyle`, `Shadow.color`, and `GradientStop.color` widened to accept formatted color strings alongside structured objects and token references.
- **@directededges/specs-from-figma 0.17.0** — Ten bug fixes: INSTANCE_SWAP prop resolution now correctly resolves names, strips glyph patterns, and formats keys; `visible: true` no longer leaks into default variant output; auto-layout fallback elements emit correct width/height; glyph fill colors on nested instances now resolve to token references instead of raw hex. RAW colors emit structured `ColorValue` objects per ADR-009.


## [0.12.2] - 2026-04-28

Dependency update: picks up constraint-based layout positioning from specs-schema 0.19.0 and specs-from-figma 0.16.0. Also fixes glyph `instanceOf` leaking into variant output.

### Dependency updates

- **@directededges/specs-schema 0.19.0** — Positioning properties `x`, `y`, and `layoutPositioning` are replaced by constraint-based equivalents: `position` (`'AUTO' | 'ABSOLUTE'`), `top`, `bottom`, `start`, `end`, `centerHorizontalOffset`, and `centerVerticalOffset`. Offset values are pixel numbers for MIN/MAX/CENTER/STRETCH constraints and percentage strings (e.g. `"25%"`) for SCALE constraints.
- **@directededges/specs-from-figma 0.16.0** — Specs now emit constraint-based positioning instead of raw pixel coordinates. A new `postEvaluate` pipeline step ensures positioning values are computed before variant differencing, so variant diffs correctly capture position changes. Fixes glyph elements incorrectly emitting `instanceOf` in variant output, and SCALE constraints now emit both start and end percentages.

---

## [0.12.1] - 2026-04-24

Dependency patch: picks up specs-from-figma 0.15.1 subcomponent indexer propagation fix.

### Dependency updates

- **@directededges/specs-from-figma 0.15.1** — Fixed subcomponent indexer propagation: `getMainComponentAsync()` now correctly sets the indexer on parent COMPONENT_SET nodes, eliminating "[RestInstanceNode] No indexer set" warnings during subcomponent discovery.

---

## [0.12.0] - 2026-04-24

Dependency update: picks up specs-schema 0.18.0 layout property renames and specs-from-figma 0.15.0 bi-axial spacing model.

### Dependency updates

- **@directededges/specs-schema 0.18.0** — Layout alignment properties renamed from Figma axis terminology to platform-neutral names: `primaryAxisAlignItems` → `mainAxisAlignment`, `counterAxisAlignItems` → `crossAxisAlignment`, `counterAxisAlignContent` → `wrapAlignment`, `layoutWrap` → `wrap`. `counterAxisSpacing` consolidated into a bi-axial `itemSpacing` model. `layoutMode` narrowed from generic style to strict `'NONE' | 'HORIZONTAL' | 'VERTICAL'` enum.
- **@directededges/specs-from-figma 0.15.0** — Wrap-enabled auto-layout frames now emit bi-axial `itemSpacing` with `horizontal`/`vertical` fields instead of separate `itemSpacing`/`counterAxisSpacing` keys. Alignment values remapped from Figma terminology (`MIN` → `START`, `MAX` → `END`). `wrapAlignment` is only emitted when `wrap: true`, stripped as dead otherwise.

## [0.11.0] - 2026-04-16

Fix: config file split options (`splitComponents`, `splitConcerns`, `useSubfolders`) were ignored because Commander's explicit `false` default shadowed the config values. Also makes `generate` and `scan` runnable with zero arguments using a default file path derived from config.

### Added

- **`generate` now runs without arguments.** When no source argument is provided, `generate` resolves the manifest path to `{dataDirectory}/{alias}.manifest.md` using the source alias from `specs.config.yaml` (prefers `library`, otherwise the first source alias whose `data` includes `file`). Running `specs generate` with no flags now uses this default manifest plus `outputDirectory` from config — matching the zero-arg ergonomics of `scan` and `fetch`. If no source alias has `data: [file]`, an error suggests running `specs scan` first.
- **`scan` now runs without arguments.** The `<file>` positional argument is now optional. With one source configured in `specs.config.yaml` (whose `data` includes `file`), `specs scan` auto-resolves `{dataDirectory}/{alias}.file.json`. An explicit file path still works and takes precedence.
- **`scan --source <alias>` flag.** When two or more sources in `specs.config.yaml` have `data: [file, ...]`, `scan` fails loudly with the list of available aliases and requires `--source <alias>` to disambiguate. Passing both `[file]` and `--source` is rejected as a conflict. This stricter convention (vs. `generate`'s preference-based fallback) prevents silent behavior changes when a second source is added to config.

### Fixed

- **Config file split options now take effect.** Commander boolean flags (`--split-components`, `--split-concerns`, `--use-subfolders`) previously defaulted to `false`, which caused the nullish coalescing chain (`options.flag ?? config.value ?? false`) to short-circuit before consulting `specs.config.yaml`. Removed the Commander defaults so the flags are `undefined` when absent, allowing config values to flow through.

### Docs

- Updated `docs/cli/` (index, getting-started, claude-onboarding, examples, commands/generate, commands/scan, commands/index, commands/apply-custom-tokens) to document and demonstrate the zero-arg `specs generate` workflow. Existing `specs generate components.md` examples are preserved where they document explicit-argument option behavior.

### Dependency updates

- No upstream package changes. Continues to target `@directededges/specs-schema ^0.17.0` and `@directededges/specs-from-figma ^0.14.2`.

## [0.10.2] - 2026-04-14

Dependency patch: picks up the DTCG-compliant token path separator fix from specs-from-figma.

### Changed

- **Bump `@directededges/specs-from-figma` to ^0.14.2** — Picks up the fix for `$token` path separators violating DTCG character restrictions.

### Dependency updates

- **@directededges/specs-from-figma 0.14.2** — Token references (`$token` values) in TOKEN, TOKEN_NAME, TOKEN_FIGMA_EXTENSIONS, and CUSTOM profiles now use `/` as the path separator instead of `.` (period). The DTCG spec (§5.1.1) prohibits `.` in token and group names, and this aligns all profiles with the existing FIGMA_NAME behavior.

## [0.10.1] - 2026-04-14

Dependency patch: picks up a fix from specs-from-figma for empty variant filtering in LAYERED mode.

### Changed

- **Bump `@directededges/specs-from-figma` to ^0.14.1** — Picks up the fix for empty variant filtering in LAYERED mode, where variants with configuration but no element or layout differences were not being excluded when `emptyVariants: false`.

### Dependency updates

- **@directededges/specs-from-figma 0.14.1** — Fixes the `emptyVariants: false` filter in LAYERED mode. Previously, variants that had a configuration object but no `elements` array (e.g., variants with only layout differences removed) were incorrectly retained in output. The filter now correctly excludes variants that lack both element and layout differences from their layered baseline.

## [0.10.0] - 2026-04-13

Renames `audit` → `scan`, `sourceDirectory` → `dataDirectory`, and the config file from `.specs.config.yaml` to `specs.config.yaml`. Adds a `--data-dir` flag and makes config format values case-insensitive. Config types now use `ResolvedConfig` for full default guarantees.

### Added

- **`--data-dir` flag on `fetch`, `scan`, and `generate`** — Override the config `dataDirectory` per run from the command line. On `fetch`, `--outDir` is retained as a deprecated alias.

### Changed

- **Config file renamed from `.specs.config.yaml` to `specs.config.yaml`** — The config file is no longer a hidden dotfile. Specs config is actively edited (Figma file keys, output directories, format options), so it belongs visible in the filesystem — consistent with `vite.config.ts`, `tailwind.config.js`, and other tools where config is a first-class part of the workflow. The JSON variant is also renamed from `.specs.config.json` to `specs.config.json`. The global config path (`~/.specs/config.yaml`) is unchanged since home-directory configs are conventionally hidden.
- **`audit` command renamed to `scan`** — Better describes the command's purpose: scan a file and produce a manifest for component curation. `specs audit` still works as a deprecated alias with a stderr warning.
- **`sourceDirectory` config field renamed to `dataDirectory`** — Aligns the field name with its default value (`./data`) and removes confusion with the `sources` config block. `sourceDirectory` still works as a deprecated alias with a stderr warning.
- **`generate` manifest mode falls back to `config.outputDirectory`** — `--output` is no longer required when `outputDirectory` is set in the config file, fixing the main flag/config inconsistency reported by users.
- Config types now distinguish partial input from resolved output — `CLIConfig.config` and `ConfigLoader.mergeConfig` use `ResolvedConfig` (all defaults guaranteed) instead of `Config` (which now permits omitted fields)
- **`init` template annotates license-gated configs** — The YAML config template generated by `specs init` now notes that `format.tokens` and `include.invalidCombinations` require a license key to produce output.

### Fixed

- **Config format values are now case-insensitive** — Lowercase values like `yaml`, `camel`, or `layout` in config files were silently rejected by validation and reset to defaults (e.g., `output: yaml` always produced JSON). All `format.*` values are now normalized to uppercase before validation, matching how the CLI flag already works.
- **YAML options type annotation includes `CreateNodeOptions`** — `FileWriter.YAML_OPTIONS` was typed without `ParseOptions & CreateNodeOptions`, causing a compile error for `aliasDuplicateObjects`
- **Config merge test references legacy `subcomponentNamePattern`** — Updated to use `subcomponents` (the current property shape) with `toEqual` instead of `toBe`
- **Vitest mock type mismatch in `GenerateCommand` tests** — Replaced `ReturnType<typeof vi.spyOn>` with `MockInstance` for vitest 3.x compatibility

### Deprecated

- **`sourceDirectory` config field** — Use `dataDirectory` instead. Will be removed in a future release.
- **`specs audit` command** — Use `specs scan` instead. Will be removed in a future release.
- **`fetch --outDir` flag** — Use `--data-dir` instead. Will be removed in a future release.

### Dependency updates

- **@directededges/specs-schema v0.17.0** — Introduces `ResolvedConfig` (fully-resolved config with all defaults guaranteed) alongside the now-more-permissive `Config` (optional fields with defaults). Removes unused `Variant.name` and `Variant.baseline` fields from output.
- **@directededges/specs-from-figma v0.14.0** — Fixes `format.keys` not applying when config values are lowercase and not formatting `invalidVariantCombinations` dimension names. Internal types updated to `ResolvedConfig`.

## [0.9.0] - 2026-04-09

Adds complete config template generation, better Figma rate-limit error messages, and fixes for YAML-only-comments config crashes, output format not being respected, and stale command references.

### Changed

- **`init` config template includes all settings** — The YAML template generated by `specs init` now includes every `Config` field and `output` section option: `codeOnlyPropsPattern`, `slotConstraints`, `inferNumberProps`, `emptyVariants`, `splitComponents`, `splitConcerns`, and `useSubfolders`. All new entries are commented out with their defaults. ([#16](https://github.com/DirectedEdges/specs/issues/16))
- **`fetch` rate-limit errors surface Figma response headers** — When Figma returns HTTP 429, the error message now includes the `Retry-After` duration (formatted as seconds, minutes, hours, or days), seat tier (`Viewer/Collab` or `Dev/Full`), plan tier, and a link to Figma's [rate limit documentation](https://developers.figma.com/docs/rest-api/rate-limits/).

### Fixed

- **Config validation crashes on YAML sections with only comments** — When `specs.config.yaml` contains sections like `include:` with only commented-out fields, the YAML parser produces `null` instead of an empty object. The config validator's `deepMerge` and `validateAndCorrectConfig` methods now guard against null values, preventing `TypeError: Cannot convert undefined or null to object` crashes. Null values from YAML parsing no longer overwrite defaults. ([spec-demo](https://github.com/DirectedEdges/spec-demo))
- **File output ignores `config.format.output`** — The `generate` command always wrote YAML files regardless of the `format.output` config setting. The `OutputFormat` type, `FileManifest` extensions, and all writers now respect the configured format (JSON or YAML). The `DEFAULT_OUTPUT_CONFIG.defaultFormat` is aligned with specs-schema's `DEFAULT_CONFIG.format.output` (JSON). ([#14](https://github.com/DirectedEdges/specs/issues/14))
- **`audit` and `init` terminal output references defunct `batch` command** — Post-run help text in `audit` and `init` told users to run `specs batch …`. The `batch` command was consolidated into `generate`; all references now point to `specs generate`.
- **`audit --variables` flag not writing to manifest header** — The `-v`/`--variables` flag was parsed but never passed to the manifest generator. The `**Variables:**` metadata line is now written when the flag is provided, and `ManifestParser` extracts it back into metadata. ([#18](https://github.com/DirectedEdges/specs/issues/18))

### Dependency updates

- **@directededges/specs-from-figma v0.13.0** — Slot `anyOf` values now respect the configured key format instead of using raw Figma component names. Width/height fallback warnings for rotated nodes are more informative when geometry data is absent.

## [0.8.0] - 2026-04-07

Adds fetch UX improvements (animated spinner, elapsed time, `--no-geometry`), renames the config key from `model` to `config`, and fixes style reconciliation and large-file fetch crashes.

### Added

- **`fetch` animated spinner with elapsed time** — The `fetch` command now displays an animated braille spinner with a live elapsed-time counter while downloading each payload. The final success line includes the total duration per request (e.g., `✓ Downloaded: kds file (14s)`). Non-TTY environments fall back to a static log line.
- **`fetch --no-geometry` flag** — Omits `?geometry=paths` from Figma file requests, reducing payload size by roughly half. Vector path data (`fillGeometry`, `strokeGeometry`, `size`, `relativeTransform`) is excluded; width/height fall back to `absoluteBoundingBox` during processing.
- **`audit` default output path** — `-o` is now optional. When omitted, the manifest writes to `{sourceDirectory}/{alias}.manifest.md` using the config's `sourceDirectory` and the input filename. Added `--config` flag for config file resolution.

### Changed

- **Config key rename: `model` → `config`** — The YAML key `model:` and internal property `CLIConfig.model` are renamed to `config:` / `CLIConfig.config` to align with the upstream `Config` type from @directededges/specs-schema. Updates source, tests, and all documentation.

### Refactored

- **Remove dead styles payload shapes from `loadFoundations`** — Removed two unused code paths: the `all_styles` simplified format and the `styles` object-map format. Only the Figma REST API format (`meta.styles`) is retained. Updated JSDoc to describe the two actual data sources (file seed + styles endpoint).
- **Comment out false-defaulting include fields in config template** — `invalidVariants` and `invalidCombinations` now have schema-level defaults and no longer need explicit values in the generated config template.

### Fixed

- **Style `$custom` reconciliation in `loadFoundations`** — Published Figma styles referenced by components use file-local IDs (e.g., `19108:2530`) that differ from the styles endpoint's `node_id` (e.g., `5115:6703`). The shared `key` hash now bridges these two sources, ensuring `$custom` token objects from the styles endpoint are available when resolving style references during spec generation.
- **`generate -c` uses component ID as output key** — In file mode (`generate <file> -c <id>`), the component's Figma node ID was used as the output key instead of its name. Now resolves the display name from the file's `componentSets` or `components` metadata.
- **`fetch` writes raw response directly to disk** — Previously, fetch parsed the Figma response into JSON and re-serialized it with pretty-printing before writing. This caused `Invalid string length` crashes on large files (400MB+). Now writes the raw response body straight to disk, eliminating unnecessary memory overhead.

### Dependency updates

- **@directededges/specs-from-figma v0.12.0** — When the REST API response lacks geometry data (e.g., when using `--no-geometry`), width and height fall back to `absoluteBoundingBox`. A console warning now surfaces when this fallback is used on a rotated node, where bounding box dimensions may be inflated.

## [0.7.0] - 2026-04-05

Rebrands from `anova-cli` to `specs-cli` and publishes to npmjs.org. Updates all dependencies to published npm packages. Removes the deprecated `variantNames` config field per specs-schema v0.16.0.

### Changed

- **Package rename** — `@directededges/anova-cli` → `@directededges/specs-cli`
- **Config file names** — `.anova.config.yaml` → `specs.config.yaml` (and `.json` variant)
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
