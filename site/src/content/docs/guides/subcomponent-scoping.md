---
title: "Subcomponent Scoping"
description: "Configure how subcomponents are discovered, matched, and excluded"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge pro-badge">Pro</span>')</script>

Complex components are often composed of smaller parts — a `Card` contains a `CardHeader`, a `Table` contains `TableRow` and `TableCell`. In Figma, these subcomponents are separate component assets that follow a naming convention linking them to their parent. The `subcomponents` configuration controls **where to search** for subcomponents, **which assets match**, and **which to exclude**.

## The Problem

Figma pages contain many assets besides genuine subcomponents. A `Button` component might have sibling assets like `Button / Examples / Hover` (a design example) or `Button / Text cases / Long label` (a QA test case). Without scoping, the processing engine either misses subcomponents that live outside the component's own layer tree, or it picks up false positives from unrelated sibling assets.

## What It Does

The `subcomponents` config object has three fields that work together:

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `scope` | `"NESTED"` \| `"PAGE"` | No (default: `NESTED`) | Where to search for subcomponent assets |
| `match` | `string[]` | Yes | Template patterns that identify an asset as a subcomponent |
| `exclude` | `string[]` | No | Template patterns that disqualify matched assets |

When `subcomponents` is absent from the config entirely, no subcomponent detection occurs.

### Scope: Where to Search

**`NESTED`** (default) — searches only within the component's own anatomy. For each element that references another component (via `instanceOf`), the processing engine checks whether that component's name matches a `match` pattern. This is sufficient when all subcomponents are nested inside the parent component's layer tree.

**`PAGE`** — searches the anatomy first (same as `NESTED`), then additionally scans the entire Figma page for `COMPONENT` and `COMPONENT_SET` nodes whose names match a `match` pattern. This catches subcomponents that exist as standalone assets on the same page but aren't nested inside the parent. Page-level discovery is purely additive — it never overrides anatomy-detected subcomponents.

Use `PAGE` when your Figma file organizes subcomponents as sibling assets alongside the parent component rather than nesting them inside it. This is common in libraries where subcomponents are independently usable (e.g., `TableRow` can be used outside `DataTable`) and/or intended for use within a main component's slot.

### Match: Which Assets Qualify

The `match` array contains template patterns using two placeholders:

- `{C}` — the parent component's name
- `{S}` — the subcomponent name (captured)

The processing engine converts each pattern into a regex, replacing `{C}` with the escaped parent name and `{S}` with a capture group. An asset matches if its name fits the pattern, and the captured `{S}` value becomes the subcomponent's key in the output.

**Examples** with parent component `"DS Button"`:

| Pattern | Asset name | Match? | Captured `{S}` |
|---------|-----------|--------|----------------|
| `{C} / {S}` | `DS Button / Icon` | Yes | `Icon` |
| `{C} / _ / {S}` | `DS Button / _ / Label` | Yes | `Label` |
| `{C} / {S}` | `DS Button / _ / Label` | No | — |
| `{C} / _ / {S}` | `DS Button / _ / Icon / Small` | Yes | `Icon / Small` |

Multiple patterns are evaluated in order. The first match wins.

### Exclude: Which Matches to Disqualify

The `exclude` array uses the same `{C}` / `{S}` template syntax. If a matched asset also matches any `exclude` pattern, it is disqualified — **exclude always wins over match**, regardless of whether the asset was found via anatomy or page discovery.

**Example**: with `match: ['{C} / {S}']` and `exclude: ['{C} / Examples / {S}']`:

| Asset name | Matched? | Excluded? | Result |
|-----------|----------|-----------|--------|
| `DS Button / Icon` | Yes | No | Included as subcomponent `Icon` |
| `DS Button / Examples / Hover` | Yes (`{S}` = `Examples / Hover`) | Yes | Excluded |
| `DS Button / Text cases / Long` | Yes (`{S}` = `Text cases / Long`) | No | Included (add another exclude pattern if unwanted) |

## Configuration

Declare `subcomponents` under `figma` in `config/conventions.yaml`:

```yaml
# config/conventions.yaml
figma:
  subcomponents:
    scope: PAGE
    match:
      - '{C} / {S}'
      - '{C} / _ / {S}'
    exclude:
      - '{C} / Examples / {S}'
```

**Defaults**:
- `scope`: `NESTED` when omitted
- `match`: required — must have at least one pattern
- `exclude`: none when omitted

When `subcomponents` is absent entirely, no subcomponent detection occurs.

### Common Patterns

**Single convention** — subcomponents nested one level under the parent:
```yaml
subcomponents:
  match:
    - '{C} / {S}'
```

**Underscore convention** — subcomponents nested under a `_` separator:
```yaml
subcomponents:
  match:
    - '{C} / _ / {S}'
```

**Multiple conventions** — support both direct children and underscore-nested:
```yaml
subcomponents:
  match:
    - '{C} / {S}'
    - '{C} / _ / {S}'
```

**Page-level with exclusions** — search the full page but skip examples and test cases:
```yaml
subcomponents:
  scope: PAGE
  match:
    - '{C} / {S}'
    - '{C} / _ / {S}'
  exclude:
    - '{C} / Examples / {S}'
    - '{C} / Text cases / {S}'
```

## Practical Guidance

**Start with `NESTED` and one pattern.** If your Figma library nests subcomponents inside the parent, `NESTED` scope with a single match pattern is sufficient and fastest.

**Use `PAGE` when subcomponents are siblings.** If your library places subcomponents as standalone assets next to the parent (common for composable patterns), `PAGE` scope discovers them automatically.

**Add `exclude` patterns as you find false positives.** Run a spec generation, check which "subcomponents" are actually examples or test assets, then add corresponding exclude patterns.

**Spacing around slashes is normalized.** `DS Button/Icon`, `DS Button / Icon`, and `DS Button  /  Icon` all match the same pattern. You don't need to worry about exact whitespace in Figma layer names.

## Further Reading

- [ADR 031 — Subcomponent Search Scope](https://github.com/DirectedEdges/specs/blob/main/adr/031-subcomponent-search-scope.md) — architecture decision record covering the `scope`, `match`, and `exclude` design
- [CLI Configuration](/settings/) — full config reference
