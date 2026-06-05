# Dictionary composition

Companion to [`README.md`](README.md). Principles 8 and 10 in the main RFC establish the architecture; this file carries the full reference — the format split, the three lifecycle classes that follow from it, authoring patterns, filesystem layouts, and per-platform losslessness rationale.

## The format split is the architecture

The deepest organizing principle is the format choice itself (Principle 10). Structured contracts (YAML, JSON, or any schema-validated representation) carry what the schema validates: anatomy, props, layout, variants, tokens, bindings — anything adversarially robust against drift. Prose (MD) carries what the schema can't: a11y rationale, behavioral notes, usage prose, design intent. The format choice tells a consumer (and a tool) what lifecycle to expect:

- **Structured contract files** (YAML in v1; JSON or other schema-validated formats in principle) — schema-validated, regenerable, diffable on facts. A typo fails schema check; values can be cross-referenced and re-derived.
- **MD files** — authored or projected for humans, validatable only on structure, prose-shaped. A typo doesn't fail anything; consumers read MD like documentation, not like a contract.

Class membership (generated / authored / smoothed) is a second-order distinction that follows from format + naming. The format alone is enough to know whether a file is a fact-carrier or a prose-carrier.

## Lifecycle classes (within the format split)

| Class | Lifecycle | Examples | Naming convention |
|---|---|---|---|
| **Generated** | Regenerable byte-exactly by `specs generate`. The source of truth among derivatives. | `button.md`, `button.docs.md`, `button.react.md`, `button.css`, … | Standard emitter output names |
| **Authored** | Team-written, persistent, version-controlled, never overwritten by generation. Carries concerns the schema doesn't (Pattern B) or extends a generated edge (Pattern A). | `button.a11y.md`, `button.behavior.md`, `button.usage.md`, `button.team.react.md` | Suffix from a known allowlist (B) or `team.<emitter>` (A) |
| **Smoothed** | Agent-produced from generated + authored inputs. May drift; replayable. | `button.smoothed.md`, `button.smoothed.docs.md`, `button.smoothed.react.md` | `smoothed.<emitter>` |

## Authoring patterns (decided)

- **Pattern A — extend a generated output.** Write a sibling: `button.team.react.md` extends `button.react.md`. Don't edit the generated file in place — that breaks the regeneration contract (Principle 5). Consumers compose the pair at retrieval time.
- **Pattern B — supplement with new concerns.** Write a sibling at a known suffix. Starter allowlist: `a11y`, `behavior`, `usage`, `examples`, `migration`. Teams extend the allowlist via `Config.emit.includeAuthored: [<suffix>, ...]`.
- **Pattern C — agentic adaptation.** Smoothing layer; covered separately (`specs smooth`). Outputs land at `smoothed.<emitter>` by default, but the smoothing tool's operator chooses (Principle 5).

## Consumer composition order

A retrieving agent or human reader composes the dictionary in this order:

1. **Generated files** establish shape and canonical projections of the contract.
2. **Authored sidecars** layer team-specific concerns and extensions.
3. **Smoothed siblings** add prose / pattern recognition (when present).
4. **The contract** resolves any precision question by definition (Principle 6).

Authored content never overrides generated *facts* — it adds to or extends them. Smoothed content never overrides authored content. The contract wins everything on precision.

## Filesystem layouts

Two valid layouts; teams pick:

**Flat** — recommended for small dictionaries:

```
button/
  button.yaml
  button.md, button.docs.md, button.react.md, ...  (generated)
  button.a11y.md, button.behavior.md               (authored — Pattern B)
  button.team.react.md                             (authored — Pattern A)
  button.smoothed.md                               (smoothed)
```

Teams that want stricter separation can also nest under `generated/`, `authored/`, and `smoothed/` subfolders — useful when `.gitignore`-ing the regenerable `generated/` is desirable.

## Per-platform losslessness — what edge artifacts owe their idiom

Principle 7 says edge artifacts must be lossless within their idiom. In practice:

| Edge artifact | Lossless within its idiom? | Why |
|---|---|---|
| `contract.ts` | Yes — by construction | Pure types and slot signatures; no platform opinions required |
| `tokens.json`, workspace dictionary files | Yes — within their slice | Pure data inversions of the spec |
| `css`, `tailwind.css` | Yes for the deterministic ruleset | One class per anatomy element, custom property per token, `[data-*]` selectors per variant. Compound selectors and shared declarations belong in Pattern A siblings if a team wants them |
| `md`, `docs.md` | Lossless for *orientation* and *data reference* respectively; neither is a per-variant values reference (by design) | Values live in the contract. `md` is the short index; `docs.md` is the comprehensive scripted reference. Neither restates per-variant precision values inline |
| `react.md`, `webcomponents.md`, `ios.md` | **Worked examples, not edge artifacts** | Losslessness would require platform opinions Principle 4 forbids. These ship as reference renderings of what a mechanical projection looks like in each idiom — copy, modify, throw away — and are explicitly not the React/iOS engineer's starting point. The load-bearing edge for typed-language consumers is `contract.ts` |

The platform `.md` files are worked examples by design: the scripted output stops where platform opinions would begin, and team-specific completion happens via Pattern A authoring on top of `contract.ts` or via custom emitters. Principle 9 makes this a feedback loop — when many teams write the same extension, that extension belongs in the emitter (or in the schema, if it's a content question).
