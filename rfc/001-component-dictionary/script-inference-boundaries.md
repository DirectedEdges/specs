# Script / inference boundaries

Companion to [`README.md`](README.md). The main RFC establishes the boundary as a principle (1, 4, 5) and summarizes it under Architecture; this file makes it concrete per output and lists the reusable patterns that sit on the script side of the seam.

Every emitter is a pure, scriptable transform of the spec — no LLM calls, no invented identifiers, no inferred prose. Each output has a *script ceiling* (everything mechanically derivable from the contract) and an *inference seam* (where a downstream agent could usefully add value beyond what scripts can do). Naming both per output makes implementation scope explicit and gives the smoothing layer a concrete brief.

## Per-output ceiling and seam

| Output / group | Script ceiling | Inference seam |
|---|---|---|
| `md`, `layout.md`, `elements.md`, `provenance.md` | Direct walk of the spec: prop tables, anatomy, layout tree, element-first override tables, metadata footer | One-line role descriptions, when-to-use guidance, exception callouts on outlier variants, "this element's behavior pattern resembles X" |
| `md` | Short structural index under a fixed template; every fact byte-traceable to a contract field | Plain-language framing, invariants that need pattern recognition (e.g. "focus universally overrides border weight"), labeling outlier configs as exceptions |
| `docs.md` | Comprehensive scripted reference — overview counts, anatomy, full API tables, layout, structure, color, effects, conditional logic, token index, provenance | Editorial prose (role descriptions, "when to use" guidance, design-intent annotations) — those belong in the smoothed sibling, not here |
| `tokens.json` | Inverted view of the contract — flat list of every `$token` referenced with per-element/per-variant usage map. Shape the contract doesn't store directly | None — inference-free by construction; any prose belongs in an adjacent `.md` output |
| `contract.ts` | Types, defaults, slot signatures, nullable/optional flags | None in v1 — doc comments could be inference territory but belong upstream in the spec |
| `react.md`, `webcomponents.md`, `ios.md` (worked examples) | Reference renderings: prop types, default-bearing call signatures, attribute reflection, slot maps grounded in `instanceOf` values. Not the engineer's starting point — `contract.ts` is | Idiomatic component naming for instance slots, which slot maps to `children`, attribute-vs-property choices, modifier-chain idioms — these are explicitly out of the worked example's scope |
| `css` | One class per anatomy element, custom property per `$token`, `[data-*]` selectors per variant configuration | Collapsing repeated declarations into shared selectors; opinionated reset rules |
| `tailwind.css` | `@layer components` block, `@apply` chains keyed on `data-*` attrs, configurable token-path → theme-path transform | Choosing between `@apply` chains and arbitrary value syntax; collapsing redundant utilities |
| `fixture.json`, `skeleton.html` | One fixture per variant entry plus boolean-prop coverage; default tree as HTML with `data-*` attrs | Hand-picked "interesting" combos, anti-pattern callouts, ARIA hints |
| `dictionary.*` (workspace) | Counts, token usage rollups, instance graph from `instanceOf` references | Composition smells, shared-base suggestions, structural-similarity rollups |
| Accessibility (`role`, `aria-*`, focus order, keyboard) | None today — the schema doesn't carry this | Entirely inference territory; the structured spec gives much richer input than raw nodes (anatomy → roles, layout → focus order, bindings → visibility rules) |

## Reusable patterns on the script side

A few patterns recur across emitters. Build them once at the registry level rather than per-emitter:

- **Pattern collapse** — when N variants share a prop value and exhibit identical style deltas, collapse to a single rule (e.g. surface "focus always uses `mode/focus/outlineColor` and `strokeWeight: 2`" mechanically, not as inferred prose).
- **Configurable conventions** — for the few choices that look like opinions but are knob-able (text-slot → `children`, token-path → theme-path), expose `emit.options.<emitter>.*` rather than picking a default silently.
- **Verbatim identifiers** — anatomy keys, prop names, token paths emit verbatim from the spec. No casing tweaks beyond what `config.format.keys` already declares.

Every emitter ships with a fixture test: input contract + emitter version → exact byte-equal output.

## Agent smoothing layer

Inference work — anything in the right column above — runs downstream of `specs generate` in a separate stage (e.g. an opt-in `specs smooth` command). How it writes its output — sibling files like `*.smoothed.md`, in-place edits, a separate tree — is the smoothing tool operator's choice, not a constraint imposed by this pipeline. Regeneration is the contract on our side: `specs generate` always restores scripted output to canonical form, so any downstream choice is reversible (Principle 5). The concrete backlog of inference work — prose generation, pattern recognition, exception callouts, platform idioms, accessibility, usage examples — lives in [`smoothing-backlog.md`](smoothing-backlog.md).
