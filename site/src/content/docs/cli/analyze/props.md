---
title: "props"
description: "Emit a property inventory and cross-library aggregate for governance and analysis"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Reads every component's `api.yaml` and produces `_analysis/props.yaml`: a cross-library aggregate covering prop name frequency, enum value discordance, boolean naming patterns, API surface per component, and a slot inventory.

## Use When

- You want to audit prop naming consistency across a component library.
- You want to identify enum values that diverge for the same prop name across components.
- You want a structured input for an LLM to analyze API governance (see [Analyzing with an LLM](#analyzing-with-an-llm)).
- You want to track how the library's prop surface changes over time by diffing the aggregate YAML.

## Invocation

```bash
specs analyze props
```

## Output

Writes a single file to `_analysis/` after all components are processed.

```
specs/
  _analysis/
    props.yaml   # cross-library aggregate
  ds-button/
    api.yaml
  ds-alert/
    api.yaml
```

## Example: Prop Entries

`_analysis/props.yaml` contains all six aggregate sections (see below). The raw prop data underlying the aggregate uses this shape — one entry per prop per component scope, with subcomponents under dot-path keys (`dsButton.startVisual`):

```yaml
# within propNameFrequency / apiSurface source data
# (not emitted directly, but reflects what each prop entry looks like)
component: dsButton
name: appearance
type: string
hasEnum: true
enumValues:
  - filled
  - outline
  - text
enumCount: 3
default: filled
nullable: false
slotAnyOf: null
slotMinItems: null
slotMaxItems: null
figmaType: null
```

Each prop entry has:

| Field | Description |
|-------|-------------|
| `component` | Scope key — component key or `componentKey.subName` for subcomponents |
| `name` | Prop name as it appears in the spec |
| `type` | `string`, `boolean`, `number`, or `slot` |
| `hasEnum` | `true` when the prop has a fixed set of values |
| `enumValues` | The enum value list, or `null` |
| `enumCount` | Count of enum values (0 when none) |
| `default` | Default value, or `null` |
| `nullable` | `true` when the prop accepts `null` |
| `slotAnyOf` | Allowed component types for a slot prop, or `null` |
| `slotMinItems` | Minimum slot items, or `null` |
| `slotMaxItems` | Maximum slot items, or `null` |
| `figmaType` | Figma property type (`VARIANT`, `TEXT`, etc.), or `null` |

## Aggregate Structure

`_analysis/props.yaml` has six sections.

### summary

High-level counts across all components and subcomponents.

```yaml
summary:
  totalProps: 446
  totalComponents: 95
  uniquePropNames: 138
  typeDistribution:
    string: 277
    boolean: 113
    slot: 35
    number: 21
```

### propNameFrequency

Prop names ranked by how many component scopes share them. Reveals the library's most load-bearing prop contracts and names worth standardizing.

```yaml
propNameFrequency:
  - name: a11yLabel
    occurrences: 39
    components:
      - dsButton
      - dsIcon
      - dsLink
      # ...
    types:
      - string
  - name: state
    occurrences: 27
    components:
      - dsButton
      - dsCheckbox
      # ...
    types:
      - string
```

### enumDiscordance

Props that share a name but have different enum value sets across components. Each entry lists the conflicting value sets and which components use each.

```yaml
enumDiscordance:
  - propName: selected
    valueSets:
      - values:
          - unselected
          - selected
          - indeterminate
        components:
          - dsCheckbox
      - values:
          - unselected
          - selected
        components:
          - dsTabs.tab
```

### booleanNamingPatterns

Distribution of boolean prop naming conventions across the library.

```yaml
booleanNamingPatterns:
  isPrefix: 4    # isDisabled, isLoading, …
  hasPrefix: 2   # hasIcon, hasLabel, …
  canPrefix: 0
  bare: 18       # disabled, loading, elevated, …
```

### apiSurface

All component scopes ranked by prop count. Useful for identifying the most complex components and comparing slot-to-prop ratios.

```yaml
apiSurface:
  - component: dsTextInput
    props: 12
    enumValues: 18
    slots: 1
    booleans: 4
  - component: dsDialog
    props: 10
    enumValues: 9
    slots: 2
    booleans: 3
```

### slots

All slot props in the library with their constraints.

```yaml
slots:
  - component: dsActionList
    name: items
    anyOf:
      - dsActionListItem
    minItems: null
    maxItems: null
    nullable: false
  - component: dsButton
    name: children
    anyOf: null
    minItems: null
    maxItems: null
    nullable: false
```

## Analyzing with an LLM

The aggregate YAML is designed to be read by an LLM. Copy the prompt below into any LLM, replace `<paste aggregate YAML here>` with the contents of `_dictionary/props.aggregate.yaml`, and send.

```
You are a design system architect reviewing a component library's API surface.
Below is a structured YAML aggregate of every prop across the library, produced
by `specs analyze props`. Analyze it and produce a report covering:

1. **Naming consistency** — are similar concepts named consistently across
   components? Flag divergent names for the same concept (e.g. `label` vs
   `text` vs `title` for visible labels).

2. **Enum governance** — identify enum discordances (same prop name, different
   value sets). For each, recommend whether to normalize and what the canonical
   set should be, or explain why the divergence is intentional.

3. **Boolean naming conventions** — is the library consistent in its use of
   `is`/`has`/`can` prefixes vs bare names? Recommend a convention if mixed.

4. **API complexity** — flag components with unusually high prop counts or
   enum value totals. Are these justified by the component's role, or do they
   suggest the component is doing too much?

5. **Slot inventory** — are slot constraints (`anyOf`, `minItems`, `maxItems`)
   used consistently? Identify slots that would benefit from tighter constraints.

6. **Recommended actions** — a priority-ordered action table with columns:
   Priority, Finding, Affected components, Effort (S/M/L), Breaking change (Y/N).

Be specific. Reference component and prop names directly. Where findings are
ambiguous, say so and explain what additional context would resolve them.

---

<paste aggregate YAML here>
```

## See Also

- [Analyze overview](/specs/cli/analyze/)
- [`styling` analyzer](/specs/cli/analyze/styling/)
- [Transforms overview](/specs/cli/transforms/)
