---
title: "Subcomponents"
description: "Configure subcomponent discovery, matching patterns, and exclusions"
---

Subcomponent organization and naming. A library fact, declared in `config/conventions/figma.yaml`: where a library keeps its subcomponents and how it names them are properties of the library, and a wrong declaration leaves subcomponents undiscovered. When present, the block enables subcomponent detection. When absent, the library declares no subcomponent convention and none are detected.

## Configuration

```yaml
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
| `scope` | `"NESTED"` \| `"PAGE"` | No | `NESTED` | Where the library keeps subcomponents. `NESTED` = component anatomy only; `PAGE` = also search the Figma page |
| `match` | `string[]` | Yes | — | Template patterns using `{C}` (component name) and `{S}` (subcomponent name) placeholders |
| `exclude` | `string[]` | No | — | Template patterns to exclude from matches. Same `{C}/{S}` syntax |

An asset must match at least one `match` pattern to be considered a subcomponent. If it also matches an `exclude` pattern, the exclusion wins regardless of discovery source.

## Path

`subcomponents` in `config/conventions/figma.yaml`

## See Also

- [Subcomponents guide](/guides/subcomponent-scoping/) - Detailed patterns and strategies
- [Schema: Subcomponents](/schema/subcomponents/) - Subcomponent schema reference
