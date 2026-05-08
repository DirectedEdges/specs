# RFC 001: Component Dictionary

| | |
|---|---|
| **Status** | Proposed |
| **Authors** | Nathan Curtis |
| **Date** | 2026-05-08 |
| **Index** | [RFCs](../README.md) |

---

## Contents

- [Summary](#summary)
- [Motivation](#motivation)
- [Prior art and relationship to existing tools](#prior-art-and-relationship-to-existing-tools)
- [Detailed design](#detailed-design)
- [Alternatives considered](#alternatives-considered)
- [Drawbacks](#drawbacks)
- [Decisions ratified by this RFC](#decisions-ratified-by-this-rfc)
- [Unresolved questions](#unresolved-questions)
- [Future work](#future-work)
- [Companion documents](#companion-documents)

---

## Summary

This RFC proposes a deterministic emitter registry inside `specs-cli` that fans each validated `{component}.yaml` into ~16 purpose-built files — a *Component Dictionary* — so each consumer (engineers, agentic coding tools, design-system reviewers, report scripts) gets the shape closest to its workflow. The pipeline is pure: zero LLM calls, zero opinions, byte-reproducible from the spec. The contract stays canonical and derivative files are projections; inference (prose, a11y, design intent) is deferred to a separate downstream stage out of scope here. The bet: **the right shape for design-system data in the agentic-coding era is a blend of structured (YAML/JSON) and prose (MD) outputs deterministically projected from a single schema-validated contract.**

---

## Motivation

`specs-cli` produces a single artifact: a validated, compressed contract (YAML in v1) that captures everything Figma can express about a component. That artifact is correct and complete, but it is shaped for the schema — not for any particular consumer.

### The Multi-Consumer Mismatch

- **Humans** browsing a component want a readable reference with anatomy, props, layout, tokens, and variant behavior at a glance — not 1000+ lines of nested YAML.
- **LLMs scaffolding code** want a small retrieval doc that fits inside a single tool call's worth of context. Loading the full YAML to answer "what props does Button take?" is expensive and noisy.
- **Framework tooling** (React, Web Components, iOS, CSS, Tailwind) wants prop types, slot signatures, and styling hooks expressed in its native idiom. Every consumer that re-derives these from the YAML duplicates work and risks drift.
- **Workspace-level questions** ("which components depend on token X?", "what's the instance graph?") have no good answer today — each requires a one-off script over the YAML directory.
- **Reports and audits** — token usage maps, naming-consistency audits, anatomy censuses, variant-complexity reports, dependency graphs, color/spacing/typography system audits, maturity scorecards. Each is a script that walks the YAML and aggregates, and each re-implements the same traversal and grouping logic. Purpose-built contracts (the workspace-level dictionary files plus additional roll-ups for styling, naming, and similar dimensions) feed these scripts directly instead of asking each one to re-derive the index it needs.

The shared trait: every downstream consumer either re-parses the contract or invents its own intermediate format. The information is already there; the open question is whether a shared deterministic projection layer is worth building, or whether per-team adapters and on-demand LLM interpretation are good enough. This proposal bets on projection.

The agentic-coding workflow is where that bet pays off most clearly. A coding agent benefits more from a short, retrieval-shaped doc than from re-parsing 1000 lines of YAML — but only if such a doc exists, is up to date, and can be trusted as a faithful projection of the spec. That last condition is what determinism buys, and it's the load-bearing reason to prefer pre-baked projection over on-demand interpretation.

### The Agentic Extraction Alternative

The common alternative — point an LLM at raw Figma node trees and ask it to produce documentation — has drawbacks of both quality and cost.

**Quality.** Asking an LLM to do structured extraction over unstructured input predictably produces:

- **Hallucinated results** of styling, variables, layout and structure properties not in the source and **omissions** of those that are.
- **Injected opinions** — renamed props, collapsed architecture, rendering strategy that may not match design intent.
- **Unjustified and misleading confidence** in those extractions and opinions.
- **Run-to-run agentic drift** between invocations, and the reconciliation overhead any multi-pass approach inherits.

**Cost.** A single component can run on the order of **100k tokens and tens of minutes** — to re-derive facts the schema already encodes. At 100 components per refresh: tens of millions of tokens and the better part of a day. The deterministic emitter pipeline produces the same data reference in **0 tokens and ~1 second** per component because `specs generate` does that interpretation mechanically. The schema-validated contract *is* the extraction; emitters just reshape it. Inference is then reserved for genuinely ambiguous work (accessibility, behaviors, motion... for now) running against the structured contract — at a fraction of the budget.

### Vendor Coupling

A separate concern, lower-volume but real for DS leads thinking past the next 18 months: a design system anchored to any single tool's API inherits that tool's pricing, roadmap, and continuity risk. The history of design tooling has enough turnover that "we're coupled to Vendor X" is something architects flinch at on principle, regardless of how well Vendor X is doing today.

The contract's value props — schema-validated, lossless, format-as-validator — are structural and don't depend on Figma. Figma remains a strong primary ingest because it's the most structured visual database we have for design decisions, and that structure is what makes the contract possible in the first place. I see no within-a-year threat to Figma as best-in-class visual database of robust, precise design system visual decisions.

But the architecture treats Figma as one ingest path among possible others (code analysis, prototyping tools, hand authorship), not as the source of the contract. Teams adopting the dictionary get a portable contract by virtue of the architecture, even though the only ingest adapter shipped today is Figma. Additional adapters and the questions they raise (multi-origin reconciliation, hand-authoring as a first-class workflow) are explicitly out of scope for this proposal — but the architecture doesn't preclude them.

### Composition and Adapter Burden

Solving the multi-consumer mismatch creates a second-order problem. Once a component has a fanout of generated files, teams accumulate supplementary content around it: accessibility specs, behavioral notes, usage guidance, examples, team-specific React conventions, design intent prose. This content has a different lifecycle than generated output (persistent vs. regenerable) and different authority (team-owned vs. canonical contract). Without architectural conventions:

- Consumers can't tell what's authoritative, what's outdated, and what's safe to regenerate.
- Teams writing supplements next to generated files risk losing them on the next `specs generate`.
- Every team invents its own naming, folder structure, and merging logic for the layered content.
- The promise of "thin adapter layer" disappears — teams end up writing as much glue as they would have without the dictionary.

---

## Prior art and relationship to existing tools

A team adopting the dictionary already has tooling. The honest framing isn't "this is a new thing" — it's "this is what gets retired, served, or left alone in your existing stack."

| Tool / system | Relationship | What changes |
|---|---|---|
| **Storybook** | Serves | Storybook is a runtime surface; the dictionary is a static substrate. `contract.ts` becomes argTypes; `fixture.json` seeds stories; `stories.ts` is the direct CSF feed; `tokens.json` powers token-panel addons. Reduces hand-written `.stories.ts` and addon-doc work; doesn't compete |
| **react-docgen / TypeScript inference from source** | Augments | The dictionary's `contract.ts` carries the prop-type surface that's derivable from the design system — enums, defaults, slot signatures, nullable flags. It does not replace docgen, because Figma (and any structural ingest) is an incomplete picture of a real component: event handler signatures, ref types, internal hooks, JSDoc-from-source all still come from the codebase. The win is that the ingestable portion of the type surface stops drifting; the rest is still docgen's job |
| **Code Connect** | Complementary | Code Connect maps Figma components to existing code components; the dictionary produces the shape of the code components in the first place. Different points in the pipeline; both can ship |
| **Style Dictionary, Tokens Studio, or other homegrown token tooling** | Complementary | Token-transformation tools handle paths → CSS vars → multi-platform outputs; the dictionary's `tokens.json` and `dictionary.tokens.json` carry the *usage map* (which components reference which tokens, with counts). Different jobs |
| **Hand-rolled internal Figma generators** | Replaces | Most mature DS teams have a homegrown generator that walks Figma and produces some subset of these outputs. The dictionary covers the common cases; team-specific work moves into custom emitters or sibling-authored extensions |
| **MDX docs sites, Storybook Docs, custom doc pipelines** | Serves | `docs.md` and `elements.md` are direct source material; `md` is the orientation index. Teams with their own renderers consume the YAML directly |

**The risk to manage.** Adopting the dictionary alongside the above without retiring anything makes the architecture worse. Adoption guidance is concrete: docgen-shaped work moves to `contract.ts` consumption; homegrown generators get decommissioned in stages as emitters cover their outputs; Storybook stories move from hand-authored to `stories.ts`-seeded. A team that adds a sixth source of truth and keeps the other five hasn't gained anything.

---

## Detailed design

### Pipeline overview

We propose adding a deterministic emitter registry to `specs generate`. Each emitter is a pure function of the validated spec; the CLI walks emitters × specs and writes the outputs. No interpretation, no inference, no Figma round-trip. The determinism is the load-bearing architectural choice — not because it's obvious, but because it's what makes every other commitment in this RFC (regenerability, auditability, edge-artifact trust) tractable. We could have chosen otherwise; the rest of this RFC is about what follows from this choice.

The emitter layer fits into the existing pipeline as the final scripted stage:

```
            ┌─── deterministic, scripted ───────────────────────┐
            │                                                   │
Designer updates Figma                                          │
        │                                                       │
        ▼                                                       │
┌──────────────────┐    Pull component data via Figma API.      │
│  specs fetch     │    → raw/{component}.json (Figma payload)  │
└──────────────────┘                                            │
        │                                                       │
        ▼                                                       │
┌──────────────────┐    Parse, validate, normalize against      │
│  specs scan      │    specs-schema.                           │
└──────────────────┘    → {component}.yaml (canonical,          │
        │               schema-validated, deterministic)        │
        ▼                                                       │
┌──────────────────┐    Run emitter registry: spec → file       │
│  specs generate  │    fanout.                                 │
└──────────────────┘    → {component}.md, .docs.md, .layout.md, │
        │               .elements.md, .tokens.json,              │
        │               .provenance.md, …                        │
        │                                                       │
            └───────────────────────────────────────────────────┘
        │
        ▼
            ┌─── inference, agent-driven ───────────────────────┐
            │                                                   │
┌──────────────────┐    (optional, opt-in) Read scripted        │
│  Agent           │    outputs, produce smoothed siblings:     │
│  inference       │    prose, invariants, exception callouts,  │
│  pass            │    usage examples, a11y suggestions.       │
└──────────────────┘    → {component}.smoothed.md, sidecar      │
        │               enrichment files. User chooses to       │
        │               overwrite scripted outputs or not.      │
            └───────────────────────────────────────────────────┘
        │
        ▼
Agentic coding tool      Cursor / Claude Code / Copilot retrieves
(consumer)               the component dictionary — scripted +
                         (optionally) smoothed — to scaffold,
                         refactor, or review code against the
                         design system. The `.md` index is the
                         primary orientation target; platform-
                         specific files seed scaffolding.
```

This RFC scopes `specs generate` and its emitter registry. Everything above generate is existing CLI behavior; the agent smoothing pass downstream is a separate workstream and the scripts/inference boundary is a hard rule (see Principles).

Inside `specs generate`, each emitter is a Style-Dictionary-style `Selector → Transform → Format` pipeline: a pure function `(spec, options) => { filename, content }` with no I/O. The registry lives in **`specs-cli`**; custom emitters are deferred (see Decisions).

### Guiding principles

#### Pipeline integrity

##### 1. Lossless ingest

The contract produced by the ingest stage (`{component}.yaml` in v1) carries everything downstream needs. No emitter, agent, or consumer should ever re-open the source artifact to answer a question about the component. If something is missing, fix the schema and the ingest adapter rather than reaching back upstream. The property holds for Figma today and generalizes to any future adapter producing a schema-valid contract. This is what makes the rest of the pipeline reproducible and offline-friendly.

##### 2. Favor scripts over inference

If a transformation can be a pure function of the spec, it belongs in an emitter, not a prompt. Inference is for what genuinely resists clean rules — judgment, prose, pattern recognition.

##### 3. Favor verbatim over interpretation

The emitter does not rename props, invent component names, or pick which slot becomes `children` by taste. It *does* collapse Figma boolean visibility props onto a single nullable slot prop — that's mechanical, lossless representation, not a style choice. When in doubt, emit identifiers verbatim and let downstream tooling decide.

##### 4. Confine inference downstream

Fetch, scan, and generate are deterministic and byte-reproducible. No emitter calls an LLM, infers prose, or invents identifiers. Inference is a separate downstream stage — never woven into the pipeline itself.

##### 5. Favor regeneration over restriction

`specs generate` guarantees byte-for-byte reproducibility from the spec. What downstream agents or users do with those files — sidecar, overwrite, edit, replace, ignore — is their call. We make regeneration cheap so any choice is reversible; we don't prescribe sibling conventions or block in-place edits.

#### Output design

##### 6. The contract is the spine

The pipeline shape is *ingest → contract spine → projection*: an adapter produces a schema-valid contract; that contract is the only canonical artifact; emitters project from it. The contract is YAML in v1, but the architecture is format-agnostic — JSON, or any schema-validated structured representation with comparable diffability and readability properties, would serve the same role. The contract's authority comes from format-as-validator, not convention: schema validation adjudicates every value, so a typo in a prop name or token path fails immediately rather than drifting silently. Prose derivatives can't enforce that; markdown's flexibility is exactly what invites hallucinations to take root. When a derivative and the contract disagree, the contract wins by definition, not by policy — which makes "spine" a structural property of the architecture rather than an aspiration.

##### 7. Start at the consumer's edge

Each consumer has a natural starting point: a React engineer reaches for `contract.ts`, a CSS author for `button.css`, a token-impact tool for `tokens.json`, a Storybook integrator for `button.stories.ts`, a reader for `button.md`. Load-bearing edge artifacts must be lossless within their idiom — `contract.ts`, `tokens.json`, `css`, `tailwind.css`, and the workspace dictionary files all are. Platform `.md` files ship as **worked examples** of what a mechanical projection looks like, not as starting points — losslessness there would require opinions Principle 4 forbids. The contract remains the universal canonical fallback.

##### 8. Compose, don't collide

Generated emitter outputs sit alongside team-authored sidecars (a11y, behavior, usage) and agent-smoothed siblings. Each class has a distinct lifecycle and naming convention so consumers compose them at retrieval time: generated files regenerate without touching authored content; authored files persist through schema changes; smoothed files replay against the latest generated baseline.

##### 9. Favor emitter coverage over team glue

Every generated output exists to reduce what teams hand-write to consume the design system. An emitter earns its slot by shrinking the team's adapter surface — less scaffolding to write, less polish to repeat — not by adding parallel ways to express what's already covered. Repeated team extensions across teams are signal that the supplement belongs in the emitter or upstream in the schema.

##### 10. Format carries lifecycle

Structured contracts (YAML, JSON, or any schema-validated representation) carry what the schema validates: anatomy, props, layout, variants, tokens, bindings — anything adversarially robust against drift. Prose (MD) carries what the schema can't: a11y rationale, behavioral notes, usage prose, design intent. The format choice tells consumers and tools what lifecycle to expect: the structured contract is regenerable, validatable, diffable on facts; prose is authored, prose-shaped, validatable only on structure. The split is enforceable by file extension alone; the three-classes composition framing follows from it.

Note: Sketches are exploratory,  not proposals.

### Proposed outputs

Workspace-level files are pure functions of the set of all specs in the workspace. Effort is implementation cost; value is consumer impact. Groups bundle outputs for selection (CLI flag, config preset, sidecar): `defaults` always emit; the rest are opt-in via `--emit <group>` or `--emit <file>`. The `Sketch` column links to an illustrative template grounded in `button.yaml` — treat as direction, not specification.

| File | Group | Value | Effort | Source / contents | Sketch |
|---|---|---|---|---|---|
| `{c}.md` | defaults | critical | low | Default short structural index — props, anatomy, default layout, layout deltas, typography (default per text element, marked when it varies by variant), bindings, invalid combinations, subcomponent refs, provenance. Structural shape only; per-variant styling lives in the contract. Also serves as the **vocabulary primer** agents use when drafting team-authored sidecars — anatomy keys, prop names, slot identifiers all match the contract, so authored content stays coherent across regenerations | [sketch](sketches/button.md) |
| `{c}.docs.md` | defaults | high | low | Comprehensive scripted reference — overview counts, anatomy, full API tables, subcomponent specs, layout tree + variant tree deltas, dimensions, auto-layout, typography, color tokens + variant deltas, effects + variant effects, conditional logic, token index, provenance. The data-reference form, fully scripted from the contract | [sketch](sketches/button.docs.md) |
| `{c}.tokens.json` | defaults | high | trivial | Flat list of every `$token` referenced, with `$type` and per-element usage map | [sketch](sketches/button.tokens.json) |
| `{c}.layout.md` | defaults | medium | trivial | Default tree + variant tree deltas (only variants that restructure) | [sketch](sketches/button.layout.md) |
| `{c}.elements.md` | defaults | high | low | Per-element rendering guide — for each anatomy element, default styles then a flat override table of every variant configuration that touches it. Inverts the contract's variant→element axis to element→variant | [sketch](sketches/button.elements.md) |
| `{c}.provenance.md` | defaults | low | trivial | Author, schema version, source node, generator, config | — |
| `{c}.contract.ts` | contracts | high | trivial | Framework-agnostic TS prop interface + slot signature, no framework imports. Lossless within its idiom; the load-bearing platform emitter for typed languages | [sketch](sketches/button.contract.ts) |
| `{c}.css` | styling | high | medium | One class per anatomy element, custom properties from `$token` paths, `[data-state=…]` selectors per variant. Lossless for the deterministic ruleset | [sketch](sketches/button.css) |
| `{c}.tailwind.css` | styling | medium | medium | `@layer components` block, `@apply` chains keyed on `data-*` attrs, configurable token-path → theme-path transform | [sketch](sketches/button.tailwind.css) |
| `{c}.stories.ts` | integrations | medium | low | Storybook CSF stories file — per-variant story declarations seeded from `fixture.json`, importing types from `contract.ts`. Direct feed for Storybook autodocs and addon-driven workflows | [sketch](sketches/button.stories.ts) |
| `{c}.fixture.json` | testing | medium | low | Sample prop combos covering every variant configuration plus boolean coverage | [sketch](sketches/button.fixture.json) |
| `{c}.skeleton.html` | testing | low | low | Default tree as unstyled HTML with `data-*` attrs for every prop | [sketch](sketches/button.skeleton.html) |
| `{c}.react.md` | examples | low | low | Reference rendering — what a mechanical projection of `contract.ts` into React looks like. Worked example, not a starting point. Copy, modify, throw away | [sketch](sketches/button.react.md) |
| `{c}.webcomponents.md` | examples | low | low | Reference rendering — tag, attribute reflection, named slots. Worked example, not a starting point | [sketch](sketches/button.webcomponents.md) |
| `{c}.ios.md` | examples | low | low | Reference rendering — Swift enums and struct initializer. Worked example, not a starting point | [sketch](sketches/button.ios.md) |
| `dictionary.index.md` | workspace | high | trivial | Every component with one-line summary (counts of props/anatomy/variants) | — |
| `dictionary.tokens.json` | workspace | high | low | Union of `$token` refs across all components with usage counts | — |
| `dictionary.graph.json` | workspace | medium | low | Instance dependency graph from `instanceOf` references — cycles, roots, leaves | — |

The workspace-level dictionary files double as **inputs for report and audit scripts** — token-usage maps, naming-consistency audits, dependency analyses, and similar workspace-scale reports walk these contracts rather than re-traversing the YAML directory each time. Additional report-shaped contracts (styling roll-ups, naming concordances, anatomy censuses) are a natural extension of this group as report use cases solidify.

Selection examples:

```
specs generate ./specs                      # defaults only
specs generate ./specs --emit defaults,platform,styling
specs generate ./specs --emit all
specs generate ./specs --emit defaults,+react,+css
```

#### Which artifact to start with

**Start at the edge artifact closest to your idiom; reference the contract for definitive decisions.** Each consumer has a natural starting point (Principle 7); `button.md` is the default short index, not a universal one.

| Consumer / question | Start with | Fall back to |
|---|---|---|
| React / typed-language engineer building a component | `button.contract.ts` (+ `button.team.react.md` if present) | YAML; `button.react.md` as a worked-example reference |
| iOS engineer building a SwiftUI view | `button.contract.ts` (port the types) + `button.ios.md` as worked example | YAML |
| CSS / Tailwind author | `button.css` / `button.tailwind.css` | YAML |
| Storybook integrator | `button.stories.ts` + `button.contract.ts` | YAML |
| Token-impact tool, instance graph analysis | `button.tokens.json` / workspace dictionary files | YAML |
| Report or audit script (token usage, naming consistency, dependency graph, maturity scorecard, etc.) | Workspace dictionary files + targeted JSON contracts | YAML for anything not yet rolled up |
| Reader (human or agent) orienting to a component | `button.md` (short structural index) | `button.docs.md` for full data reference, then YAML |
| Agent drafting team-authored sidecars (a11y, usage, migration) | `button.md` — anchors authored content to the contract's identifiers | YAML |
| Comprehensive scripted reference for docs / review | `button.docs.md` | YAML |
| Any precision question — exact token, dimension, padding, effect, per-variant value | **YAML** | — |

**Rationale.** The contract (YAML in v1, ~3k tokens for Button) is canonical and complete but verbose and shaped for the schema, not the consumer. Each edge artifact reshapes the contract's data into a form closer to the consumer's workflow — React types, iOS enums, CSS rules, token graphs, structural index. Starting at the edge means less translation work for the consumer; falling back to the contract for precision means no answer is ever approximated. Edge artifacts should not restate values the contract carries authoritatively when a precision question has a single correct answer.

### Architecture

**Script / inference boundary.** Each output has a *script ceiling* (everything mechanically derivable from the contract) and an *inference seam* (where a downstream agent could usefully add value). Inference work runs in a separate downstream stage (e.g. `specs smooth`); regeneration is the contract on our side, so any downstream choice is reversible (Principle 5). Per-output ceiling/seam table and reusable patterns in [`script-inference-boundaries.md`](script-inference-boundaries.md); the speculative agent backlog in [`smoothing-backlog.md`](smoothing-backlog.md).

**Dictionary composition.** The format split (Principle 10) is the load-bearing distinction: structured contracts carry schema-validated facts, prose carries schema-gap content (a11y, behavior, usage, design intent). Within that, three lifecycle classes — *generated* (regenerable byte-exactly by `specs generate`), *authored* (team-written sidecars and `team.<emitter>` extensions), and *smoothed* (agent-produced, may drift, replayable) — follow from format + naming convention. Authored content never overrides generated facts; smoothed content never overrides authored; the contract wins everything on precision (Principle 6). Platform `.md` files (`react.md`, `webcomponents.md`, `ios.md`) ship as worked examples rather than edge artifacts — the React engineer's starting point is `contract.ts`, not `react.md`. Format split rationale, the three-classes table, authoring patterns, filesystem layouts, and per-platform losslessness in [`dictionary-composition.md`](dictionary-composition.md).

**CLI invocation.** `specs generate --emit` accepts file names, group names, or `all` / `defaults` / `none`, composing with `+` / `-`. Resolution order is per-component sidecar > CLI flag > workspace `Config.emit` > built-in defaults. Full flag surface, the `Config.emit` schema, and per-emitter options in [`cli-reference.md`](cli-reference.md).

### Implementation order

1. **`defaults` group** (`md`, `docs.md`, `tokens.json`, `layout.md`, `elements.md`, `provenance.md`) — one PR. Pure walks of a single spec, no platform opinions. Highest leverage for agentic-coding consumers.
2. **`contracts` + `styling` groups** (`contract.ts`, `css`, `tailwind.css`) — second PR. The load-bearing platform emitters: lossless within their idiom, no platform opinions required. Introduces the shared enum/boolean/nullable formatter and the token-path → CSS-var / theme-path transform layer.
3. **`integrations` + `testing` groups** (`stories.ts`, `fixture.json`, `skeleton.html`) — third PR. Storybook feed plus mechanical fixture generation from variant configurations and anatomy.
4. **`examples` group** (`react.md`, `webcomponents.md`, `ios.md`) — fourth PR. Reference renderings; lowest priority since they're worked examples, not starting points.
5. **`workspace` group** (`dictionary.index.md`, `dictionary.tokens.json`, `dictionary.graph.json`) — fifth PR. First emitter pass over the full workspace; introduces cross-component aggregation.

---

## Alternatives considered

The proposal is one of several possible architectures for closing the multi-consumer mismatch. The alternatives we considered and rejected:

**Per-team adapters against the raw contract.** Each team that wants a component dictionary builds its own renderer or extractor against the contract directly. This works for one or two teams, and is genuinely simpler in isolation. At design-system scale (multiple teams, multiple downstream consumers) it produces fragmentation — different teams' Buttons render inconsistently, the same logic gets re-implemented per team, and infrastructure cost is paid N times over. We bet that a shared projection layer is cheaper in aggregate even though per-team adapters are simpler in isolation.

**On-demand LLM interpretation of the contract.** A coding agent could read the contract at consumption time and infer the projections it needs, treating the contract as the one true input. This works for ad-hoc cases but fails at retrieval scale: ~3k tokens per component loaded for every retrieval is expensive; inferred projections are non-deterministic between runs; the same agent asked the same question twice may get subtly different answers. Determinism + caching beats inference + tokens once you cross a small consumption threshold, and the agentic-coding workflow crosses it quickly.

**Agentic extraction directly from Figma, skipping the contract.** Treat Figma as the source of truth and use agents to produce documentation from it on demand. We discuss this in the Motivation as the Agentic Extraction Alternative and reject it on cost (orders of magnitude more tokens and time per component) and quality (hallucinations, opinions, run-to-run drift) grounds. The structural ingest stage handled by `specs scan` is what makes the rest of this proposal cheap; replacing it with inference is a category-defeating choice.

**A single comprehensive markdown rendering for all consumers.** Instead of a fanout, ship one comprehensive `component.md` that covers everything any consumer might need. Simpler to maintain, easier to publish, fewer files in the repo. We rejected this because consumers vary too widely in what they need — a React engineer, a Storybook integrator, and a token-rename tool require different shapes — and one-size-fits-all means no consumer gets the right shape. The fanout exists because the cost of N small purpose-built files is lower than the cost of every consumer re-parsing one giant file.

**Inference woven into the emitters.** Allow emitters to call LLMs inline for "smart" outputs (e.g. an emitter that produces a `usage.md` with prose, or an emitter that infers a11y annotations from anatomy). Rejected because it weakens regeneration (LLM calls aren't byte-reproducible), invites drift (every regeneration produces slightly different output), and breaks the audit trail (you can't trace a derivative back to its source mechanically). Inference belongs in a separate stage that produces clearly-labeled smoothed outputs, not inside the deterministic registry.

**Tightly-coupled Figma-specific emitter outputs.** Bypass the contract layer entirely and produce per-platform emitter outputs directly from Figma. Faster to build initially, no schema to design. Rejected because it locks the architecture to Figma's API shape, produces no canonical artifact for review or audit or version control, and recreates the vendor-coupling problem the contract's structural value is supposed to neutralize. The contract is the canonical artifact; emitters project from it.

---

## Drawbacks

This proposal commits to real costs and unproven architectural choices. The honest drawbacks:

- **The proposal accumulates ~16 emitter types.** Building, fixture-testing, and maintaining all of them is real work. If only a subset earn their slot in practice (teams use `contract.ts`, `tokens.json`, and `css`, and ignore the rest), the maintenance cost outweighs the value. The "value" column in the Outputs table is our estimate; if it's wrong, this argument breaks.
- **The composition story is unproven at scale.** Three file classes, suffix allowlists, sidecar config, in-place-edit affordances — every DS tool in this space accumulates conventions, and most fail when teams change or don't designate someone to maintain them. Principle 9 ("repeated extensions across teams are signal") names the feedback loop without describing the mechanism that triggers it; that's a real gap.
- **Platform `.md` files may be mistaken for starting points despite the framing.** "Worked example, not a starting point" is a sharp line in the proposal but a soft line in practice — once a `react.md` exists in the repo, engineers will read it, copy from it, and probably build on it. The demotion may not survive contact with real users.
- **The proposal depends on the contract's compression-and-readability claim holding over time.** The claim is empirically validated for the current YAML implementation (~1% the size of Figma's REST API, readable by designers and design leads). If the schema bloats — adding many new fields or representations that aren't compactly expressible — the contract's value as a single canonical artifact weakens, and the rest of the proposal's foundation weakens with it. Schema discipline is upstream of this proposal but load-bearing for it.
- **The smoothing layer is unbuilt.** Many of the highest-value capabilities (a11y inference, prose generation, exception callouts, design intent) live in a stage we explicitly defer. If the smoothing layer never materializes well, the deterministic emitter outputs alone may feel thin to consumers who expected the full shape.
- **Adoption friction is real for teams with stable workflows.** A team running Storybook + react-docgen + a token pipeline + a homegrown generator already has the surface this proposal covers — even if that coverage is patchy. Switching costs may exceed marginal value for teams that are already getting by.
- **The "thin adapter layer" promise is hard to verify.** Principle 9's success metric ("how much team-authored glue does an emitter eliminate?") is conceptually right but operationally vague. Without a concrete way to measure adapter-thinning across teams, the principle becomes aspirational rather than diagnostic.

---

## Decisions ratified by this RFC

These are the firm commitments this RFC makes. As any of them firms up further (e.g. lands in shipped code, becomes load-bearing for downstream work), it can be extracted as a standalone ADR that references this RFC for context.

- **Emitter registry:** lives in `specs-cli`. Custom emitters deferred — built-in registry only for v1. The deferred design for opt-in template-driven emitters (consumers customizing presentation without forking the registry) is sketched in [`templates-appendix.md`](templates-appendix.md).
- **Variable / identifier casing:** reuses `config.format.keys`. Per-emitter override available where a platform forces a casing (e.g. CSS).
- **Defaults vs opt-in:** see Outputs table for the full assignment. `defaults` group ships always; `contracts`, `platform`, `styling`, `testing`, and `workspace` groups are opt-in via `emit.include` or `--emit <group>`.
- **Per-component overrides:** sidecar file pattern — `{component}.emit.yaml` next to the component's contract. Mirrors the config-level `emit` shape. Keeps the contract file clean and version-controlled separately from override intent.
- **Per-emitter conventions are configurable, not opinionated.** Where a sensible default exists but is plausibly contested by a team's idiom (e.g. token-path → theme-path mapping for Tailwind, text-slot → `children` mapping for React, struct-prefix for iOS), ship a default and expose `emit.options.<emitter>.*` for override rather than picking the convention silently.
- **`md` template:** lock via a small RFC *before* implementation. Goal: the structural-index format stays consistent across schema versions. RFC covers section order, compression rules, and what counts as an "invariant" worth surfacing deterministically.
- **Extending a generated edge artifact:** sibling authoring is the recommended path. Teams write `{component}.team.<emitter>.md` next to the generated file rather than editing the generated file directly. In-place edits are allowed (Principle 5) but break the regeneration contract for that file.
- **Supplementing with team-owned concerns the schema doesn't carry (a11y, behavior, usage, …):** suffix-based sidecars from a known starter allowlist — `a11y`, `behavior`, `usage`, `examples`, `migration`. Teams extend the allowlist via `Config.emit.includeAuthored: [<suffix>, ...]`.
- **Per-platform losslessness:** `contract.ts`, `tokens.json`, `css`, `tailwind.css`, and workspace dictionary files are lossless within their idiom. Platform scaffolds (`react.md`, `webcomponents.md`, `ios.md`) are intentionally scaffold-quality, not lossless — losslessness would require opinions Principle 4 forbids. Team extensions fill the gap; Principle 9 turns repeated extensions across teams into signal for new emitter or schema work.
- **CLI ingest naming:** `specs fetch` and `specs scan` are Figma-shaped today and stay as-is in this RFC. If additional ingest adapters land, the names may evolve toward an `ingest`-prefixed form (e.g. `specs ingest --source=figma`). No rename now; the architecture treats it as a future-compatible refactor, not a v1 commitment.

---

## Unresolved questions

These are immediate questions that block or shape the next implementation step.

- **`md` template structure** — small RFC needed before the defaults PR lands, covering section order, compression rules, and the precise algorithm for which "invariants" get surfaced (e.g. "any style that appears in ≥N variants sharing a single prop value"). The RFC should treat **agent-authored-sidecar drafting** as a primary consumer alongside human orientation, since vocabulary anchoring (identifiers and their semantics) matters more for that use case than per-variant layout deltas — affects section ordering and what gets surfaced.
- **Tailwind transform shape** — confirm the exact token-path → theme-path mapping (kebab full path? preserve token segments? collapse `default`?) when writing the emitter.
- **Composition operationalization (immediate)** — sidecar file discovery (`*.emit.yaml` glob, merge precedence); whether consumer agents need a manifest (`button.manifest.json`) or convention-by-suffix is enough; whether the authored-suffix allowlist is workspace-wide, per-component, or both.

---

## Future work

These are anticipated workstreams that are out of scope for this RFC but consistent with its architecture. Each is named here so reviewers know we've thought about it and aren't blocking the immediate proposal on it.

- **Smoothing layer (`specs smooth`).** The downstream inference stage that elaborates deterministic emitter outputs into prose, exception callouts, a11y annotations, and design-intent notes. Architecturally specified (Principles 1, 4, 5; the [`smoothing-backlog.md`](smoothing-backlog.md) companion) but not built.
- **Hand-authoring the contract as a first-class workflow.** The architecture supports it (the schema is the contract; nothing in the pipeline assumes Figma was the source). The developer experience is unbuilt: schema-aware editing, validation feedback in CI, scaffolding from another component, possibly a dedicated authoring UI for non-engineers. Flagged because the contract framing (Principles 6, 10) implies it should be supported at some point.
- **Multi-origin reconciliation.** If multiple ingest adapters can produce a contract for the same component (Figma vs. code analysis vs. hand-authored versions), the conflict-resolution model is a separate research project. The architecture doesn't preclude it; this RFC doesn't commit to it.
- **Template-driven emitters.** Opt-in template overrides letting teams customize presentation without forking the registry. Sketched in [`templates-appendix.md`](templates-appendix.md). Deferred from v1; the v1 implementation should keep assembly logic separate from string-formation so the future split is cheap.
- **Additional report-shaped contracts.** Styling roll-ups, naming concordances, anatomy censuses, and other workspace-level aggregations that feed report and audit scripts. Natural extensions of the `workspace` group as report use cases solidify (see the Reports row in the Multi-Consumer Mismatch).
- **CLI ingest renaming.** When additional ingest adapters land (code analysis, hand-authoring, prototyping tools), `specs fetch` and `specs scan` may evolve toward an `ingest`-prefixed form. Future-compatible refactor, not a v1 commitment.
- **Principle 9 cadence threshold.** Principle 9 names the feedback loop ("repeated team extensions are signal") but not the trigger — what counts as enough teams writing the same extension to promote it into the emitter? An operational answer would make Principle 9 diagnostic rather than aspirational.
- **Schema neutrality audit.** The schema currently has Figma-shaped extension namespaces (`com.figma`). If the contract framing matures into multi-origin support, the schema's core should be audited for which fields are genuinely neutral and which carry origin-specific semantics. Not blocking; named so it's not forgotten.

---

## Companion documents

- [`script-inference-boundaries.md`](script-inference-boundaries.md) — per-output ceiling/seam table + reusable patterns + agent smoothing layer detail
- [`dictionary-composition.md`](dictionary-composition.md) — three-classes table + authoring patterns + filesystem layouts + per-platform losslessness
- [`cli-reference.md`](cli-reference.md) — full flag surface + Config schema
- [`smoothing-backlog.md`](smoothing-backlog.md) — speculative agent backlog organized by category
- [`templates-appendix.md`](templates-appendix.md) — deferred template-driven-emitters design
- [`sketches/`](sketches/) — illustrative templates for each output, grounded in `button.yaml`
