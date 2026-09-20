/**
 * SemVer rules as data — the authored tables of semver-rules.md compiled to YAML.
 *
 * This module is the packaged form of the rules file. The CLI ships as a single
 * esbuild bundle with no asset-copy step, so the YAML travels as a string constant
 * and is parsed at load time; the classifier engine (rules.ts) reads it and knows
 * nothing about what any rule means — the premerge-rules.yaml division of labor.
 * An external rules file can override this via --rules on any version subcommand.
 *
 * Match fields, all optional — a rule with none matches everything:
 *   concern    api | variants | examples | assets | run | component  (string or list)
 *   operation  added | removed | modified | renamed | reordered      (string or list)
 *   path       regular expression tested against the entry path
 *   flag       semantic fact(s) the diff engine stamped on the entry; every listed
 *              flag must be present
 *
 * Grades: major (BREAKING) | minor (ADDITIVE) | patch (PATCH) | ignore (IGNORE).
 * First match wins, so order is the whole design: specific paths come before the
 * broad ones that would swallow them. An entry no rule matches is `unclassified`
 * and surfaces in the report's Needs-review section, never silently graded.
 *
 * `(?:subcomponents\\.[^.\\[]+\\.)*` lets one rule serve a component and its
 * subcomponents, which mirror the parent's shape exactly.
 */

export const SEMVER_RULES_YAML = String.raw`
rules:
  # ---- whole components ---------------------------------------------------
  - id: component-removed
    concern: component
    operation: removed
    grade: major
    why: The component no longer exists in the library.

  - id: component-added
    concern: component
    operation: added
    grade: minor
    why: A new component is available.

  - id: component-renamed
    concern: component
    operation: renamed
    grade: major
    why: The component was renamed; the mapping is recorded in the rename ledger.

  # ---- per-concern metadata blocks (ignore/patch before anything broad) ------
  # Every concern file carries a metadata block; none of it is contract.
  - id: metadata-last-updated
    concern: [api, variants, examples]
    path: '(^|\.)metadata\.lastUpdated$'
    grade: ignore
    why: Always changes; never meaningful.

  - id: metadata-source-node-id
    concern: [api, variants, examples]
    path: '(^|\.)metadata\.source\.nodeId$'
    grade: ignore
    why: Origin update - the component was regenerated or moved in Figma; the spec is the source of truth.

  - id: metadata-source-provenance
    concern: [api, variants, examples]
    path: '(^|\.)metadata\.source\.(pageId|nodeType)$'
    grade: patch
    why: Provenance housekeeping.

  - id: metadata-other
    concern: [api, variants, examples]
    path: '(^|\.)metadata(\.|$)'
    grade: ignore
    why: Document metadata, not contract.

  # ---- api: title -----------------------------------------------------------
  - id: title-renamed
    concern: api
    operation: renamed
    path: '(^|\.)title$'
    grade: major
    why: The component title changed - a rename event recorded in the rename ledger.

  - id: title-changed
    concern: api
    path: '(^|\.)title$'
    grade: major
    why: The component title changed - a rename event; it must also be recorded in versions/renames.yaml.

  # ---- api: anatomy ----------------------------------------------------------
  - id: anatomy-type-changed
    concern: api
    path: '(^|\.)anatomy\.[^.\[]+\.type$'
    grade: major
    why: The element type changed; expected structure changes.

  - id: anatomy-instanceof-changed
    concern: api
    path: '(^|\.)anatomy\.[^.\[]+\.instanceOf$'
    grade: major
    why: The element is an instance of a different subcomponent, a different surface.

  - id: anatomy-role-added
    concern: api
    operation: added
    path: '(^|\.)anatomy\.[^.\[]+\.role$'
    grade: minor
    why: A new behavior contract, additive.

  - id: anatomy-role-changed
    concern: api
    path: '(^|\.)anatomy\.[^.\[]+\.role$'
    grade: major
    why: The behavior/a11y contract changed or was withdrawn.

  - id: anatomy-actions-added
    concern: api
    operation: added
    path: '(^|\.)anatomy\.[^.\[]+\.actions$'
    grade: minor
    why: Additive behavior.

  - id: anatomy-actions-removed
    concern: api
    operation: removed
    path: '(^|\.)anatomy\.[^.\[]+\.actions$'
    grade: major
    why: Consumers wiring the action break.

  - id: anatomy-detected-in
    concern: api
    path: '(^|\.)anatomy\.[^.\[]+\.detectedIn$'
    grade: patch
    why: Informational annotation.

  - id: anatomy-extensions
    concern: api
    path: '(^|\.)anatomy\.[^.\[]+\.\$extensions'
    grade: patch
    why: Tool provenance, not contract.

  - id: anatomy-element-added
    concern: api
    operation: added
    path: '(^|\.)anatomy\.[^.\[]+$'
    grade: minor
    why: A named part was added; consumers may ignore it.

  - id: anatomy-element-removed
    concern: api
    operation: removed
    path: '(^|\.)anatomy\.[^.\[]+$'
    grade: major
    why: Code targeting the element breaks.

  # ---- api: props -------------------------------------------------------------
  - id: prop-added-optional
    concern: api
    operation: added
    flag: optional
    path: '(^|\.)props\.[^.\[]+$'
    grade: minor
    why: An optional property was added; consumers can ignore it.

  - id: prop-added-required
    concern: api
    operation: added
    flag: required
    path: '(^|\.)props\.[^.\[]+$'
    grade: major
    why: A required property was added; consumers must supply it.

  - id: prop-removed
    concern: api
    operation: removed
    path: '(^|\.)props\.[^.\[]+$'
    grade: major
    why: A property was removed.

  - id: prop-renamed
    concern: api
    operation: renamed
    path: '(^|\.)props\.[^.\[]+$'
    grade: major
    why: The property was renamed; the mapping is recorded in the rename ledger.

  - id: prop-type-changed
    concern: api
    path: '(^|\.)props\.[^.\[]+\.type$'
    grade: major
    why: Type expectations break.

  - id: prop-default-added
    concern: api
    operation: added
    path: '(^|\.)props\.[^.\[]+\.default$'
    grade: minor
    why: The property gained a default and became optional; the contract loosened.

  - id: prop-default-removed
    concern: api
    operation: removed
    path: '(^|\.)props\.[^.\[]+\.default$'
    grade: major
    why: The property lost its default and became required; the contract tightened.

  - id: prop-default-changed
    concern: api
    path: '(^|\.)props\.[^.\[]+\.default$'
    grade: major
    why: The default changed - a silent behavior change.

  - id: prop-nullable-loosened
    concern: api
    flag: loosened
    path: '(^|\.)props\.[^.\[]+\.nullable$'
    grade: minor
    why: The property became nullable; the contract loosened.

  - id: prop-nullable-tightened
    concern: api
    flag: tightened
    path: '(^|\.)props\.[^.\[]+\.nullable$'
    grade: major
    why: The property is no longer nullable; the contract tightened.

  # nullable stated explicitly where it was implicit (or dropped while false) -
  # the semantics did not move.
  - id: prop-nullable-annotation
    concern: api
    path: '(^|\.)props\.[^.\[]+\.nullable$'
    grade: patch
    why: The nullable annotation changed form without changing the contract.

  - id: enum-value-renamed
    concern: api
    operation: renamed
    path: '(^|\.)props\.[^.\[]+\.enum$'
    grade: major
    why: The enum value was renamed; the mapping is recorded in the rename ledger.

  - id: enum-value-added
    concern: api
    operation: added
    path: '(^|\.)props\.[^.\[]+\.enum$'
    grade: minor
    why: A new accepted value; existing code is unaffected.

  - id: enum-value-removed
    concern: api
    operation: removed
    path: '(^|\.)props\.[^.\[]+\.enum$'
    grade: major
    why: Code using the value breaks.

  - id: enum-reordered
    concern: api
    operation: reordered
    path: '(^|\.)props\.[^.\[]+\.enum$'
    grade: patch
    why: Order is presentational.

  - id: prop-examples
    concern: api
    path: '(^|\.)props\.[^.\[]+\.examples'
    grade: patch
    why: Documentation, not contract.

  - id: prop-extensions
    concern: api
    path: '(^|\.)props\.[^.\[]+\.\$extensions'
    grade: patch
    why: Figma provenance; consumers never see it.

  # ---- api: subcomponents (whole-subcomponent add/remove) ---------------------
  - id: subcomponent-added
    concern: api
    operation: added
    path: '(^|\.)subcomponents\.[^.\[]+$'
    grade: minor
    why: Additive surface.

  - id: subcomponent-removed
    concern: api
    operation: removed
    path: '(^|\.)subcomponents\.[^.\[]+$'
    grade: major
    why: Anything referencing it breaks.

  # ---- api: invalid prop combinations -----------------------------------------
  - id: combination-disallowed
    concern: api
    operation: added
    path: '(^|\.)invalidPropCombinations$'
    grade: major
    why: A previously valid combination is now invalid; existing legal usage is restricted.

  - id: combination-allowed
    concern: api
    operation: removed
    path: '(^|\.)invalidPropCombinations$'
    grade: minor
    why: The combination is now valid; the contract loosened.

  # ---- run metadata (latest.metadata.yaml, diffed once per run) ----------------
  - id: schema-version-major
    concern: run
    flag: schemaMajor
    path: '(^|\.)schema\.version$'
    grade: major
    why: The spec now speaks a different schema dialect; consumers' parsers may break.

  - id: schema-version
    concern: run
    path: '(^|\.)schema\.version$'
    grade: patch
    why: Backward-compatible schema upgrade.

  - id: generator-version
    concern: run
    path: '(^|\.)generator\.version$'
    grade: patch
    why: Tooling upgrade, not a component change.

  - id: run-other
    concern: run
    grade: ignore
    why: Conventions and settings effects surface as spec diffs and are classified there; diffing them directly double-counts.

  # ---- variants: everything PATCH, reorders surfaced separately ---------------
  - id: variant-reordered
    concern: variants
    operation: reordered
    grade: ignore
    why: The variant changed position relative to the variants around it; nothing else moved.

  - id: variants-all
    concern: variants
    grade: patch
    why: Manifestation, not contract - styling, layout, and bindings are PATCH by design.

  # ---- examples and images concerns: PATCH at every path -----------------------
  - id: examples-all
    concern: examples
    grade: patch
    why: Illustrations of the contract, not the contract.

  # ---- assets -------------------------------------------------------------------
  - id: asset-added
    concern: assets
    operation: added
    grade: minor
    why: New referenceable content.

  - id: asset-removed-referenced
    concern: assets
    operation: removed
    flag: referenced
    grade: major
    why: A spec still references this asset - a broken reference; the run should fail rather than merely bump.

  - id: asset-removed
    concern: assets
    operation: removed
    grade: patch
    why: Unreferenced cleanup.

  - id: asset-changed
    concern: assets
    grade: patch
    why: Manifestation - same name, new content.
`;
