---
title: "Subcomponents"
description: "Configure subcomponent discovery, matching patterns, and exclusions"
---

Subcomponent discovery configuration. When present, enables subcomponent detection. When absent, subcomponents are not detected.

## Configuration

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

## Result

Matched assets are harvested into a `subcomponents` registry on the component. Below is a narrow slice of the `DS Alert` output: the `DS Alert / Actions` subcomponent, discovered via a `{C} / {S}` pattern.

```json
{
  "title": "DS Alert",
  "subcomponents": {
    "actions": {
      "title": "DS Alert / Actions",
      "anatomy": {
        "root": { "type": "container" },
        "children": { "type": "slot" }
      },
      "props": {
        "children": { "type": "slot" }
      }
    }
  }
}
```

Without `subcomponents`, the registry is absent and these nested components are not detected.

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `scope` | `"NESTED"` \| `"PAGE"` | No | `NESTED` | Where to search. `NESTED` = component anatomy only; `PAGE` = also search the Figma page |
| `match` | `string[]` | Yes | — | Template patterns using `{C}` (component name) and `{S}` (subcomponent name) placeholders |
| `exclude` | `string[]` | No | — | Template patterns to exclude from matches. Same `{C}/{S}` syntax |

An asset must match at least one `match` pattern to be considered a subcomponent. If it also matches an `exclude` pattern, the exclusion wins regardless of discovery source.

## Path

`config.processing.subcomponents`

## See Also

- [Subcomponents guide](/specs/guides/subcomponent-scoping/) - Detailed patterns and strategies
- [Schema: Subcomponents](/specs/schema/subcomponents/) - Subcomponent schema reference
