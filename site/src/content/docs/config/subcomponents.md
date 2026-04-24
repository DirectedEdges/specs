---
title: "Subcomponents"
description: "Configure subcomponent discovery, matching patterns, and exclusions"
---

**Config path:** `config.processing.subcomponents`

Subcomponent discovery configuration. When present, enables subcomponent detection. When absent, subcomponents are not detected.

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `scope` | `"NESTED"` \| `"PAGE"` | No | `NESTED` | Where to search. `NESTED` = component anatomy only; `PAGE` = also search the Figma page |
| `match` | `string[]` | Yes | — | Template patterns using `{C}` (component name) and `{S}` (subcomponent name) placeholders |
| `exclude` | `string[]` | No | — | Template patterns to exclude from matches. Same `{C}/{S}` syntax |

## Example

```yaml
config:
  processing:
    subcomponents:
      scope: PAGE
      match:
        - '{C} / {S}'
        - '{C} / _ / {S}'
      exclude:
        - '{C} / Examples / {S}'
```

An asset must match at least one `match` pattern to be considered a subcomponent. If it also matches an `exclude` pattern, the exclusion wins regardless of discovery source.

## See Also

- [Subcomponents guide](/specs/guides/subcomponent-scoping/) - Detailed patterns and strategies
- [Schema: Subcomponents](/specs/schema/subcomponents/) - Subcomponent schema reference
