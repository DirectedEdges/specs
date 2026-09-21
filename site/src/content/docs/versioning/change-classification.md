---
title: "Change Classification"
description: "The rules that grade every spec change as MAJOR, MINOR, or PATCH — and why variants can never break the contract."
---

Every change detected between two versions of a spec is graded by rule: **BREAKING** (forces a MAJOR bump), **ADDITIVE** (MINOR), **PATCH**, or **IGNORE**. The component's bump is the most severe grade present, and the library bump is the most severe component bump in the release. The rules live in a data file the CLI ships with, so `specs version cut` and both [reports](/versioning/reports/) grade any given change identically.

## The organizing principle

The [concern split](/settings/output/) is the semver boundary. A spec's files divide into contract and presentation, and the grade a change *can* receive depends entirely on which file it lives in:

| Concern file | Role | Possible grades |
|--------------|------|-----------------|
| `api.yaml` — anatomy, props, subcomponents | **The contract** consumers program against | MAJOR / MINOR (PATCH for descriptions and annotations) |
| `variants.yaml` — default, variants | **The presentation** — styling, layout, bindings | PATCH, always |
| Examples concerns, images | Illustrations of the contract | PATCH, always |

Within `api.yaml` the grades follow one shape. A component's contract is the set of things code looks up by name or programs against — a part, a property, and the attributes that say what each accepts. **Stating one for the first time is MINOR; changing what it says, or withdrawing it, is MAJOR.** Everything else a spec carries — titles, descriptions, examples, provenance — describes the contract rather than forming it, and is PATCH.

A change confined to `variants.yaml` can never exceed PATCH — even a dramatic visual change, like a background token rebound from neutral to brand. The programmatic contract is untouched, so no code breaks. When a visual change deserves louder signaling, use a [manual override](#manual-overrides).

One exception ladder: when a variant references something the API no longer declares (for example a `configuration:` keyed to a removed enum value), the grade comes from the **API change**, and the orphaned variant is reported as a defect rather than graded separately.

## API rules

`<p>` is a prop name, `<e>` an anatomy element, `<s>` a subcomponent.

### Props

| Change | Grade | Why |
|--------|-------|-----|
| Prop added | **MINOR** | Nothing that compiled before stops compiling because a new property exists |
| Prop removed | **MAJOR** | Always breaking |
| Prop renamed (recorded in `renames.yaml`) | **MAJOR** | Reported as one rename with a `from → to` migration line, never as remove + add |
| `type`, `default`, `nullable`, `anyOf`, `minItems` / `maxItems` stated for the first time | **MINOR** | The property says more about itself than it did |
| Any of those changed or withdrawn | **MAJOR** | Whoever relied on the old value or the old constraint can break |
| Enum value added | **MINOR** | New option; existing code unaffected |
| Enum value removed | **MAJOR** | Code using the value breaks |
| Enum value renamed (recorded) | **MAJOR** | One rename with migration line |
| Enum reordered only | **PATCH** | Order is presentational |
| `description` and anything else under a property | **PATCH** | Describes the contract, does not form it |
| `examples` changed | **PATCH** | Documentation, not contract |
| `$extensions` (Figma provenance) | **PATCH** | Consumers never see it |

### Anatomy

| Change | Grade | Why |
|--------|-------|-----|
| Element added | **MINOR** | Additive; consumers may ignore it |
| Element removed | **MAJOR** | Code targeting the element breaks |
| `type`, `instanceOf`, `role` or an action stated for the first time | **MINOR** | The part says more about itself than it did |
| Any of those changed or withdrawn | **MAJOR** | Structure, binding, and behavior are all things code depends on |
| `detectedIn`, `$extensions`, and anything else under a part | **PATCH** | Describes the part, not the contract |

### Title, subcomponents, and combinations

| Change | Grade | Why |
|--------|-------|-----|
| `title` changed | **PATCH** | The same component said differently — but it must still be recorded in the [rename ledger](/versioning/identity/), because the component name and its spec folder derive from it |
| `title` changed as a recorded rename | **MAJOR** | The component's identity moved |
| Subcomponent added | **MINOR** | Additive surface |
| Subcomponent removed | **MAJOR** | Anything referencing it breaks |
| Invalid prop combinations stated for the first time | **MINOR** | The component says more about itself than it did |
| Invalid prop combinations changed or no longer stated | **MAJOR** | Which combinations are unsupported is something consumers program against |

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
