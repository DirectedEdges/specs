---
title: "Renames & Identity"
description: "How version history stays intact when components, props, or enum values are renamed, split, or merged."
---

Names are how everything in a spec is identified: the component title, each prop name, each enum value. Renaming any of them poses the same question — is this the same thing with a new name, or an old thing removed and a new thing added? The answer changes the story history tells, so identity events are recorded explicitly rather than guessed.

## The spec is the source of truth

Identity comes from the spec, not from Figma:

1. **The name is the identity** — component title (equivalently the spec folder name), prop name, enum value. Human-meaningful and tool-agnostic; the component title maps 1:1 to its ledger file.
2. **Figma origin metadata** (`metadata.source`: nodeId, pageId) is provenance — useful for locating the Figma asset and for *hinting* that a rename happened, never used as identity itself.
3. **The rename ledger** (`versions/renames.yaml`) records confirmed identity events at any scope.

Round-tripping makes this non-negotiable: rendering a spec to Figma creates new node IDs, and regenerating from that render must map back to the same component. The title does that; a node ID cannot.

## Why renames are recorded, not inferred

An unrecorded rename diffs as a removal plus an addition. For a prop, the resulting MAJOR grade is right — but the changelog lies ("removed `size`, added `scale`") and the migration mapping is lost. Recorded, the same change reports as **one rename with a `from → to` migration line**.

The failure case that makes this essential: a conventions change (say, a key-format sweep) can rename **every prop at once**. Untracked, that reads as the removal of your entire API surface. One mass-rename event keeps history honest.

Renames are always explicit — confirmed by you, never auto-detected. When the tool sees a title change whose node ID matches an existing ledger, it flags a *likely rename* and asks; it does not record one on its own.

## The rename ledger

`versions/renames.yaml` is YAML and human-facing — you review it, and occasionally write it. Each entry is scoped by path, so the same shape covers components, props, and enum values:

```yaml
events:
  - at: 2026-09-20
    kind: rename
    scope: dsButton                     # a component
    from: DS Primary Button
    to: DS Button
    version: 1.5.0
    reason: Simplified naming convention

  - at: 2026-09-20
    kind: rename
    scope: dsAlert.props                # a prop
    from: size
    to: scale
    version: 2.0.0
    reason: Align with code platform naming

  - at: 2026-09-20
    kind: rename
    scope: dsAlert.props.state.enum     # an enum value
    from: rest
    to: default
    version: 2.0.0
    reason: Term standardization

  - at: 2026-09-20
    kind: rename
    kindNote: mass rename               # one event, many mappings
    scope: "*"
    reason: "settings keys: SENTENCE → CAMEL"
    mappings:
      - { scope: dsButton.props, from: Start icon visible, to: startIconVisible }
      - { scope: dsAlert.props, from: Icon visible, to: iconVisible }
```

The diff engine consults these mappings before comparing names at each scope, so a recorded rename matches old name to new name and grades as a single change.

## Identity events

| Event | Version impact | What history does |
|-------|----------------|-------------------|
| **Component rename** | MAJOR | Ledger file renamed, mapping recorded, history continues |
| **Prop rename** | MAJOR — one rename with migration mapping, not remove + add | Path-scoped mapping recorded |
| **Enum value rename** | MAJOR — same single-rename reporting | Path-scoped mapping recorded |
| **Split** (one component becomes two) | Source archived at its final version; new components start at 0.1.0 with an `originatedFrom` pointer | Split entry records the resulting components |
| **Merge** (two components become one) | The designated primary's history continues with a MAJOR; the others are archived with a forward pointer | Merge entry designates the primary |
| **Origin update** (recreated in Figma, files moved) | None | Source metadata updated, noted in the ledger |

## Edge cases

- **Duplicate** — a component copied and then diverging is a new component; no rename link.
- **Title collision** — renaming onto an existing title is an error; pick a different name.
- **Casing-only rename** — still a rename (filesystem safety).
- **Circular renames** (A→B→A) — cycles are detected and warned about.

## See Also

- [Change Classification](/versioning/change-classification/) — how rename grades are assigned
- [Reports & Changelogs](/versioning/reports/) — where migration lines appear
- [Version History](/versioning/history/) — the ledgers that identity events keep coherent
