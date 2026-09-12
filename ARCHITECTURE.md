# Repository Architecture

The home of the Specs model: the schema package (types + JSON Schema — the
contract every other repo consumes), the CLI that operates on it, the ADRs
that govern its evolution, and the docs site that publishes it. Operating
rules live in `CLAUDE.md`; this file is the structural map, weighted toward
`packages/schema`. The CLI has its own map at `packages/cli/ARCHITECTURE.md`;
the site at `site/ARCHITECTURE.md`.

## Repo map

| Node | Role |
|---|---|
| `packages/schema/` | `@directededges/specs-schema` — the contract (detail below) |
| `packages/cli/` | `@directededges/specs-cli` — see its own ARCHITECTURE.md |
| `adr/` | 81 numbered decision records + `INDEX.md`; the only front door for schema changes |
| `rfc/` | Broader-than-ADR proposals (one so far) |
| `site/` | Astro docs site, port 4323 — own package, **not** a workspace member |
| `scripts/validate-schema.sh` | JSON-parse gate over `schema/*.schema.json` (metaschema pass only if `check-jsonschema` is installed — full validation is optional in practice) |
| `vitest.config.ts` | Single root config for all package tests — run from repo root |

## Schema package invariants (Constitution digest)

`packages/schema/CONSTITUTION.md` is authoritative; the load-bearing rules:

1. **Types ↔ schema parity is non-negotiable** — `types/` and `schema/`
   describe the same structure at all times; drift is a bug. No automated
   parity test exists: enforcement is review + `/specs.consistency-check`.
2. **No logic.** Type declarations and static JSON only. The sole runtime
   exports are `DEFAULT_CONVENTIONS`, `DEFAULT_SETTINGS`, `DEFAULT_PIPELINE`;
   adding a fourth requires constitutional amendment.
3. **`types/index.ts` is the entire public API.** Removing or renaming an
   exported type *or field* is breaking. Naming: code platforms outrank Figma;
   no downstream package's internals may drive an ADR decision.
4. Every change arrives via ADR → `/specs.adr.implement` → `/specs.adr.accept`
   (6-gate Constitution Check), with semver class and CHANGELOG entry.

Conceptual split (ADR-071): **Conventions** = facts about the Figma library (a
wrong value → *incorrect* output) · **Settings** = choices about output shape
(a different value → *different* output) · **Pipeline** = declared work.
There is no `Config.ts` anymore — older links to "Config" mean these three.

## Key nodes — schema

| Node | Role |
|---|---|
| `packages/schema/types/index.ts` | Barrel; the public API surface |
| `packages/schema/types/Component.ts` | Top-level spec shape |
| `packages/schema/types/Conventions.ts` | Largest type file; platform-keyed library facts + `DEFAULT_CONVENTIONS` |
| `packages/schema/types/Styles.ts` | Style values, token/prop/conditional binding, style enums |
| `packages/schema/types/Settings.ts` | Run choices + `DEFAULT_SETTINGS` |
| `packages/schema/types/Anatomy.ts` | Element tree; `role`/`action` concepts (open string sets, docs-governed) |
| `packages/schema/types/Props.ts` | `AnyProp` union |
| `packages/schema/schema/component.schema.json` | Primary JSON Schema — must mirror the `Component` tree |
| `packages/schema/schema/styles.schema.json` | Pairs with `types/Styles.ts` |
| `packages/schema/CONSTITUTION.md` | Governance: semver policy, 6-gate check |
| `packages/schema/CHANGELOG.md` | Mandatory per publish; bullets cite ADRs |
| `packages/schema/tests/` | 14 type-level `*.test-d.ts` + 1 runtime test |

Enums have no separate file: closed sets are string-literal unions inside the
owning type file, mirrored as `enum` arrays in the matching `*.schema.json`.
Structural closed enums are named union types — `Style` is only for values
that can be token-bound, prop-bound, or conditional. SCREAMING_CASE for style
enum values except external standards (DTCG, CSS Color 4).

## The sync set

One schema change fans out across five surfaces, all manually synchronized —
the reason `/specs.consistency-check` exists:

- `types/*.ts` ↔ `schema/*.schema.json`
- `tests/*.test-d.ts`
- `CHANGELOG.md`
- `adr/NNN-*.md` + `adr/INDEX.md`
- `site/src/content/docs/schema/*.md` (hand-written; `docs/adr/` mirrors
  automatically at site build)

## Consumers

`specs-schema → specs-from-figma (engine) → specs-cli / specs-plugin-2`, with
the emitter packages (`react-from-specs`, `webcomponents-from-specs`,
`figma-from-specs`) consuming the schema alongside the engine. Local dev
resolves through workspace/sibling symlinks; the `set-references-*` skills
swap `file:` ↔ versioned refs around releases, so mixed reference styles in
package.json files usually mean mid-release-cycle, not breakage.

## Verification

- `npm test` from repo root (root `vitest.config.ts` — package-local runs
  don't work).
- `bash scripts/validate-schema.sh` for the JSON Schemas.
- `/specs.consistency-check` before merging schema-touching branches.

## Known drift (as of 2026-09-05)

- `root.schema.json` / `components.schema.json` carry a non-standard
  `"version": "0.12.0"` while the package is at 0.31.0 — unmaintained key.
- Constitution cites `reference/styles.yaml`, which doesn't exist; says "no
  test framework required" (15 tests exist); consumer list omits the three
  newer packages.
- No CI runs tests or schema validation (workflows: auto-label, deploy-docs,
  release-cli only). Schema release is manual by design.
- `tests/tmp/` at repo root holds committed CLI test scratch dirs.
- `styles.schema.json` has no `exports` subpath (reachable only via `$ref`).
