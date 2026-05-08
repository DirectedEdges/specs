# Smoothing-stage backlog

Companion to [`README.md`](README.md). The main RFC establishes the boundary between deterministic emitters and downstream agent smoothing (Principles 1, 4) and commits to a separate `specs smooth` stage. This file is the speculative backlog for that stage — concrete inference work the deterministic emitters intentionally don't do, organized so a future smoothing agent has a brief to target one category at a time.

Each bullet below is something a human (or LLM) could add value to that a deterministic emitter cannot. None of this is in scope for v1 of the emitter registry.

## Prose generation (per component)

- One-line role description ("A button control with variant, size, and state styling") — opener for `md` and `docs.md`
- "When to use / when not to use" guidance
- Plain-language summary of what each prop *means* (vs. just listing its values)
- Slot purpose descriptions (why `counterLabel` exists, what `dropdown` signals)
- Subcomponent relationship narrative (e.g. how `ButtonGroup` composes `Button`)

## Pattern recognition across variants

- Detecting and labeling the "universal focus rule" (every `state: focus` config shares cornerRadius + outlineColor + strokeWeight=2)
- Detecting "inactive nulls strokes" as a cross-variant invariant
- Calling out exceptions like `danger + size=large → button label LEFT-aligned`
- Grouping the 46 button variants into rule + exception narrative
- Identifying "axes" (which props meaningfully change style vs. which are passthrough)

## Notes / annotations

- "Why this differs" callouts on outlier variants in `elements.md`
- Flagging suspected spec bugs (e.g. a single variant that breaks an otherwise-uniform pattern)

## Platform idioms (the harder lift)

- React: suggesting which slot maps to `children` vs. named props
- React: idiomatic component name for instance slots (`<Icon name={leadingVisual} />` rather than `<Slot kind="search" />`)
- Web Components: choosing between attribute reflection and property-only props
- iOS: idiomatic SwiftUI modifier chains vs. struct properties
- CSS: collapsing repeated declarations into shared selectors
- Tailwind: choosing between `@apply` chains and arbitrary value syntax

## Cross-component reasoning

- "This token is used by N components" rollups (the `tokens.json` aggregate view)
- Suggesting shared base classes when multiple components share style patterns
- Detecting when a variant is "really" a separate component (composition smell)

## Accessibility (schema gap today)

- Inferring `role`, `aria-*` defaults from anatomy + props
- Suggesting keyboard interaction patterns based on prop shape (e.g. `state: pressed` implies focusable)
- Flagging missing a11y affordances

## Examples / usage

- Generating illustrative usage snippets for each variant
- "Common combinations" list (which prop combos are idiomatic)
- Anti-pattern callouts (combos that are technically valid but discouraged)
