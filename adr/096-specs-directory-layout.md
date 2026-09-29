# ADR: The `specs/` Directory Names What Kind of Thing Each Folder Is

**Branch**: `feature/compositions-cli`
**Created**: 2026-09-29
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A workspace's `specs/` directory is flat. Every child is a component's spec folder, named
by its camelCase key, except for two things that are not components:

```
specs/
  latest.metadata.yaml      run facts (ADR-089)
  _analysis/                analyzer reports
  actionList/               a component
  alert/                    a component
  … 76 more
```

The underscore on `_analysis` is load-bearing: it is what keeps the analysis directory
from being read as a component whose key happens to be `analysis`, and every reader of
the directory encodes that convention independently — the emitter walk filters for a
child containing `api.yaml`, the version assembler filters out names starting with `_` or
`.`. Two different rules, in two places, for the same question.

Compositions (ADR-095) now need somewhere to go, and every option puts pressure on this
layout:

- Flat, beside components, distinguished only by `metadata.source.nodeType: FRAME`. A
  composition named the same as a component collides, and there is no room to resolve it.
  Browsing mixes two kinds of thing with no way to tell them apart without opening files.
- `specs/_compositions/`. No break to the existing layout, and the underscore cannot
  collide with a component key — but it extends the convention that a leading underscore
  means "not a component", which is exactly the convention that already costs two
  divergent filters.

Both work. Both leave the flat directory's real problem in place: the directory's shape
does not say what is in it, so every consumer has to know, and each one knows slightly
differently.

---

## Decision Drivers

- **A directory should name what it holds.** A reader opening `specs/` should learn the
  kinds of thing a run produced without opening a file or knowing a convention.
- **No collision between kinds.** A component and a composition may legitimately share a
  name. The layout must make that a non-event.
- **One rule, one place.** Which directory holds what must be resolved by a single
  module, not re-derived by each reader with its own filter.
- **Existing workspaces keep working.** There are populated workspaces on the flat
  layout. A release that makes them unreadable, or silently emits half-correct output
  against them, is not acceptable.
- **The emitted trees mirror the spec trees.** A reader who understands `specs/` should
  be able to predict `react/src/`.
- **Nothing derives a path by climbing.** The emitters find the specs root today by
  walking up a fixed number of levels from their own output directory. Any change to
  output depth breaks that silently, which is exactly what this ADR changes.

---

## Options Considered

### Option A: Named subdirectories per kind *(Selected)*

```
specs/
  latest.metadata.yaml
  analysis/
  components/<key>/
  compositions/<key>/
```

**Pros**:
- The directory names its contents. `components` and `compositions` are the two kinds of
  thing a spec run produces, and `analysis` is the reports about them.
- The collision problem disappears by construction, rather than by a naming convention
  that has to be defended.
- `_analysis` loses its underscore, because nothing can collide with it any more — and
  with it goes the "leading underscore means not-a-component" convention, so both
  divergent filters are replaced by one resolver.
- Mirrors cleanly into the emitted trees, which already use
  `<tree>/src/components/<Component>/`: compositions become
  `<tree>/src/compositions/<Component>/` with no new idea.

**Cons / Trade-offs**:
- It is a breaking change to the layout. Every consumer of `specs/` — in this repo, in
  the emitter packages, and in any consumer outside them — learns a new shape.
- One more level of nesting on every path a human types.

---

### Option B: `specs/_compositions/`, components stay flat *(Rejected)*

**Rejected because**: it is the cheaper change and buys the smaller half of the benefit.
Collisions are solved; the directory still does not name what it holds, `_analysis` keeps
its underscore, and the two divergent filters stay. It also leaves the asymmetry that one
kind of spec is at the root and the other is one level down, which the emitted trees
would then have to reproduce or deliberately break.

---

### Option C: Flat, distinguished only by `metadata.source.nodeType` *(Rejected)*

**Rejected because**: it admits an unresolvable collision between a component and a
composition of the same name, and it makes the kind of a spec folder invisible until a
file inside it is parsed. Violates *no collision between kinds*.

---

## Decision

### The layout

```
specs/
  latest.metadata.yaml          run facts — root, unchanged (ADR-089)
  analysis/                     analyzer reports, formerly `_analysis/`
  components/
    actionList/                 api.yaml, variants.yaml, examples.yaml
  compositions/
    checkoutSmall/              api.yaml, variants.yaml, examples.yaml
```

`latest.metadata.yaml` stays at the root because it is the *run's* facts, not any one
kind's. A composition and a component produced by the same run share it.

The concern split inside a spec folder is unchanged, and identical for both kinds. A
composition's spec is a spec: `api.yaml` with `metadata.source.nodeType: FRAME`, and
`variants.yaml` only when there is something to put in it — a frame has no variant axes,
so in practice there is not.

### The emitted trees

```
react/src/components/<PascalName>/
react/src/compositions/<PascalName>/
```

and the same under `webcomponents/`. A transformer's `outputTree` declaration is
unchanged; what changes is that the segment between `src` and the component directory is
now derived from the spec's kind rather than hardcoded to `components`.

### One resolver, and the end of path climbing

A single module owns every fact in this ADR: where each kind lives, how a spec folder is
recognised, and how a legacy layout is read. No consumer re-derives it.

`TransformerContext` gains two members so that emitters stop inferring location from
their own position:

| Member | Meaning |
|---|---|
| `specsRoot` | absolute path to the `specs/` directory this run read from |
| `kind` | `'component'` or `'composition'` — what the spec being emitted is |

Today an emitter finds the specs root by walking up three levels from
`<workspace>/<tree>/src/components/<Component>`. That arithmetic is correct only for one
output depth, and this ADR introduces a second. `specsRoot` replaces the climb with the
path the CLI already knows, and sibling-contract lookups resolve against
`specsRoot/components/<key>/` explicitly.

### Legacy flat layouts

A reader resolves the layout once, from the directory itself:

| Condition | Resolution |
|---|---|
| `specs/components/` exists | **Current layout.** `components/` and `compositions/` are the authority. Spec folders at the root are ignored entirely — not merged |
| `specs/components/` absent, spec folders at the root | **Legacy layout.** Root folders are read as components; `_analysis` is honoured; no compositions exist. One deprecation line per run |
| Neither | Empty — the existing "run `specs generate` first" error |

Root folders are *ignored*, not merged, in the current layout. A workspace mid-migration
would otherwise emit one component from two sources with no way to say which won, and a
stale root folder would resurrect a component a rename had retired.

Writers only ever write the current layout. A `specs generate` run against a legacy
workspace produces `components/`, after which the run's own root folders become ignored
leftovers — so the same run prints what to delete rather than deleting spec files it did
not write.

Orphan pruning is authoritative per kind: a full run prunes
`<tree>/src/components/` against its components and `<tree>/src/compositions/` against its
compositions, never one against the other.

---

## Type ↔ Schema Impact

- **Symmetric**: N/A — no `@directededges/specs-schema` type or JSON schema changes. The
  directory layout is a CLI artifact, and `Settings.spec.directory` continues to name the
  `specs/` root, whose internal shape is fixed rather than configured.
- **Parity check**: spec document content is untouched. `metadata.source.nodeType` remains
  the contract for what a spec describes; the directory is navigation, not identity.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` — generate | Writes the new layout | Route spec output by kind through the resolver |
| `specs-cli` — react / webcomponents | Discovers specs, derives output paths, prunes orphans | Read through the resolver; pass `specsRoot` and `kind` |
| `specs-cli` — analyze | Writes `analysis/` | Drop the underscore |
| `specs-cli` — version | Assembles components from the specs directory | Read through the resolver instead of its own `_`/`.` filter |
| `react-from-specs`, `webcomponents-from-specs` | Stop climbing to the specs root | Consume `specsRoot`; resolve siblings under `components/` |
| Populated workspaces on the flat layout | Read as legacy, with a deprecation line | Re-run `specs generate`, then delete the reported leftovers |

---

## Semver Decision

**Target version**: `0.32.0` — `@directededges/specs-cli` on the active release branch.

**Change class**: `MAJOR` — the on-disk layout a run produces changes, and a consumer
reading `specs/*/api.yaml` finds nothing.

**Justification**: output shape is part of the contract. The legacy read path keeps
existing workspaces working, which makes the change survivable, not additive.

---

## Consequences

- `specs/` states what a run produced. A reader learns the kinds without a convention.
- A component and a composition may share a name with no consequence.
- The "leading underscore means not a component" convention is retired, and the two
  divergent filters that implemented it are replaced by one resolver.
- Emitters no longer compute the specs root from their own depth, so output depth becomes
  a free variable rather than a coupling — which is what lets compositions emit at a
  different depth at all.
- A workspace on the flat layout keeps emitting until it is regenerated, and is told once
  per run that it should be.
- Any external tool reading `specs/<key>/api.yaml` breaks and must read
  `specs/components/<key>/api.yaml`.
