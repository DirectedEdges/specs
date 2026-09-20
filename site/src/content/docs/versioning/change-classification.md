---
title: "Change Classification"
description: "The rules that grade every spec change as MAJOR, MINOR, or PATCH — and why variants can never break the contract."
---

Every change detected between two versions of a spec is graded by rule: **BREAKING** (forces a MAJOR bump), **ADDITIVE** (MINOR), **PATCH**, or **IGNORE**. The component's bump is the most severe grade present, and the library bump is the most severe component bump in the release. The rules live in a data file the CLI ships with, so `specs version cut` and both [reports](/versioning/reports/) grade any given change identically.

## The organizing principle

The [concern split](/settings/output/) is the semver boundary. A spec's files divide into contract and presentation, and the grade a change *can* receive depends entirely on which file it lives in:

| Concern file | Role | Possible grades |
|--------------|------|-----------------|
| `api.yaml` — title, anatomy, props, subcomponents | **The contract** consumers program against | MAJOR / MINOR (PATCH for annotations) |
| `variants.yaml` — default, variants | **The presentation** — styling, layout, bindings | PATCH, always |
| Examples concerns, images | Illustrations of the contract | PATCH, always |

A change confined to `variants.yaml` can never exceed PATCH — even a dramatic visual change, like a background token rebound from neutral to brand. The programmatic contract is untouched, so no code breaks. When a visual change deserves louder signaling, use a [manual override](#manual-overrides).

One exception ladder: when a variant references something the API no longer declares (for example a `configuration:` keyed to a removed enum value), the grade comes from the **API change**, and the orphaned variant is reported as a defect rather than graded separately.

## API rules

`<p>` is a prop name, `<e>` an anatomy element, `<s>` a subcomponent.

### Props

| Change | Grade | Why |
|--------|-------|-----|
| Prop added — optional (has `default`, or `nullable: true`) | **MINOR** | Consumers can ignore it |
| Prop added — required | **MAJOR** | Consumers must supply it |
| Prop removed | **MAJOR** | Always breaking |
| Prop renamed (recorded in `renames.yaml`) | **MAJOR** | Reported as one rename with a `from → to` migration line, never as remove + add |
| `type` changed | **MAJOR** | Type expectations break |
| `default` changed | **MAJOR** | Silent behavior change (conservative; override case-by-case) |
| `default` added (prop becomes optional) | **MINOR** | Loosens the contract |
| `default` removed (prop becomes required) | **MAJOR** | Tightens the contract |
| `nullable` `false` → `true` | **MINOR** | Loosens the contract |
| `nullable` `true` → `false` | **MAJOR** | Tightens the contract |
| Enum value added | **MINOR** | New option; existing code unaffected |
| Enum value removed | **MAJOR** | Code using the value breaks |
| Enum value renamed (recorded) | **MAJOR** | One rename with migration line |
| Enum reordered only | **PATCH** | Order is presentational |
| `examples` changed | **PATCH** | Documentation, not contract |
| `$extensions` (Figma provenance) | **PATCH** | Consumers never see it |

### Anatomy

| Change | Grade | Why |
|--------|-------|-----|
| Element added | **MINOR** | Additive; consumers may ignore it |
| Element removed | **MAJOR** | Code targeting the element breaks |
| `type` changed | **MAJOR** | `text` → `container` changes expected structure |
| `instanceOf` changed | **MAJOR** | Different subcomponent, different surface |
| `role` added | **MINOR** | New behavior contract, additive |
| `role` changed or removed | **MAJOR** | Behavior/accessibility contract broken or withdrawn |
| Action added | **MINOR** | Additive behavior |
| Action removed | **MAJOR** | Consumers wiring the action break |
| `detectedIn`, `$extensions` | **PATCH** | Annotations, not contract |

### Title, subcomponents, and combinations

| Change | Grade | Why |
|--------|-------|-----|
| `title` changed | **MAJOR** | A rename event — must also be recorded in the [rename ledger](/versioning/identity/) |
| Subcomponent added | **MINOR** | Additive surface |
| Subcomponent removed | **MAJOR** | Anything referencing it breaks |
| Invalid prop combination added | **MAJOR** | Previously legal usage becomes illegal |
| Invalid prop combination removed | **MINOR** | Loosens the contract |

### Metadata

Run facts (generator version, schema version, conventions, settings) live once per run in `latest.metadata.yaml` — see [Run Metadata](/guides/run-metadata/).

| Change | Grade |
|--------|-------|
| `metadata.lastUpdated` | **Ignored** — always changes, never meaningful |
| Generator version | **PATCH** — tooling upgrade, not a component change |
| Schema version — MAJOR bump | **MAJOR + warning** — the spec now speaks a different dialect; parsers may break |
| Schema version — MINOR/PATCH bump | **PATCH** |
| `source.nodeId` changed, title unchanged | **No bump** — origin update, noted in the ledger (see [Renames & Identity](/versioning/identity/)) |
| Conventions or settings values | **No direct grade** — their effects surface as spec diffs and are graded there; grading them directly would double-count |

## Assets

Generated icons, images, and CSS variables that specs reference by name:

| Change | Grade |
|--------|-------|
| Asset added | **MINOR** — new referenceable content |
| Asset removed while a spec still references it | **MAJOR** — a broken reference, flagged as a defect |
| Asset removed, unreferenced | **PATCH** — cleanup |
| Asset content changed (same name) | **PATCH** — presentation only |
| CSS variable files | **PATCH** |

## Manual overrides

The automatic grade can be overridden when a version is cut, with a required reason that is recorded permanently in the [ledger](/versioning/history/):

```bash
specs version cut --force-minor "visual break: brand background sweep"
```

`--force-major`, `--force-minor`, and `--force-patch` are the only escape hatch — there is no automatic elevation for any style change. The recorded reason keeps the history honest about why a version moved differently than the rules said.

## See Also

- [Version History](/versioning/history/) — where graded changes are recorded
- [Reports & Changelogs](/versioning/reports/) — how grades become readable output
- [Renames & Identity](/versioning/identity/) — why renames grade as one change, not two
