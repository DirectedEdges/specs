---
title: "props"
description: "Emit a property inventory and cross-library aggregate for governance and analysis"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Reads every component's `api.yaml` and produces `_analysis/props.yaml`: a cross-library aggregate covering prop name frequency, enum value discordance, boolean naming patterns, API surface per component, and a slot inventory.

## Use When

- You want to audit prop naming consistency across a component library.
- You want to identify enum values that diverge for the same prop name across components.
- You want a structured input for an LLM to analyze API governance and produce a dated snapshot report (see [Analyzing with an LLM](#analyzing-with-an-llm)).
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
slotMinChildren: null
slotMaxChildren: null
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
| `slotMinChildren` | Minimum slot children, or `null` |
| `slotMaxChildren` | Maximum slot children, or `null` |
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
    minChildren: null
    maxChildren: null
    nullable: false
  - component: dsButton
    name: children
    anyOf: null
    minChildren: null
    maxChildren: null
    nullable: false
```

## Analyzing with an LLM

The aggregate YAML is structured for LLM input. The resulting report is useful as a first-pass orientation — it will surface real issues quickly, especially enum discordances and type mismatches that are hard to spot manually across a large library.

The report has a hard limit: it cannot know your team's intent. Deliberate divergences get flagged; context-dependent issues get missed. In large libraries where the YAML exceeds context limits, findings are real but framing may not be. Treat every action item as a hypothesis until verified.

The data file (`props.yaml`) is the durable artifact. It's diffable across runs and reliable. The report is a one-time orientation tool — most valuable the first time a team looks at this, or after a significant expansion of the component library.

Follow the steps below, then save the report as `_analysis/props.report.YYYY-MM-DD.md` next to the data file.

### Step 1 — send the data and ask for questions

For small libraries (under ~80 components), paste the full `_analysis/props.yaml`. For larger libraries, paste sections in order — `summary` + `propNameFrequency` + `enumDiscordance` first, then `booleanNamingPatterns` + `apiSurface` + `slots` as a follow-up message. The LLM will ask if you haven't finished before proceeding.

Before generating the report, the LLM will ask you up to 10 clarifying questions. Answering them takes one message and significantly reduces false findings — it stops the LLM from guessing at intent.

Use this prompt:

```
You are a design system architect reviewing a component library's API surface.
Below is structured YAML produced by `specs analyze props`. I will paste it in
one or more messages — tell me when you are ready for questions or if you need
more sections.

When all sections are in, ask me up to 10 clarifying questions before producing
the report. Questions should target the findings most likely to be wrong without
knowing team intent. Format them as a numbered list so I can reply by number.
Keep each question to one sentence. Prefer questions I can answer in a few words
or with yes/no. Do not produce the report until I have answered.

When I have answered, produce a Markdown report using EXACTLY this structure:

---

# Props Governance Report — [Library Name]
[YYYY-MM-DD] · [N components] · [N props]

## What Should I Do Monday Morning?

List no more than 5 themes — not specific action items, but the most important
areas that need attention. Each theme is one or two sentences. A reader who
stops here should know where to focus effort this week.

## Health Overview

A table with one row per section. Use a single word for Signal: Critical,
Attention, or Good.

| Section | Signal | One-line verdict |
|---|---|---|
| Naming consistency | … | … |
| Enum governance | … | … |
| Boolean naming | … | … |
| API complexity | … | … |
| Slot inventory | … | … |

## 1. Naming Consistency

Analysis of whether similar concepts are named consistently across components.
Flag divergent names for the same concept (e.g. `label` vs `text` vs `title`).

### Actions
A tight list of specific changes, each on one line:
- **[component.prop]** → `newName` — reason. Effort: S. Breaking: Y/N.

## 2. Enum Governance

Identify enum discordances (same prop name, different value sets). For each,
recommend normalizing with a canonical set, or explain why the divergence is
intentional.

### Actions
- **[propName]** on [components]: normalize to `[canonical set]`. Effort: S/M/L. Breaking: Y/N.

## 3. Boolean Naming

Is the library consistent in `is`/`has`/`can` prefix use vs bare names?
Recommend a convention if mixed.

### Actions
- (only if there are corrections to make — omit section if convention is clean)

## 4. API Complexity

Flag components with unusually high prop counts or enum totals. Are these
justified by the component's role, or does the component do too much?

### Actions
- (only if specific changes are recommended)

## 5. Slot Inventory

Are slot constraints (`anyOf`, `minItems`, `maxItems`) used consistently?
Identify slots that would benefit from tighter constraints.

### Actions
- **[component.slotName]** — add `anyOf: [X]`, `minChildren: N`. Breaking: N.

## Open Questions

Short list of ambiguities that need a human answer before acting. Reference the
relevant section or action item for each.

---

Be specific. Reference component and prop names directly. Do not score or grade
components numerically.

---

<paste summary + propNameFrequency + enumDiscordance here>
```

### Step 2 — answer the questions

The LLM will return a numbered list of up to 10 questions. Reply with a matching numbered list — one line per answer. Short answers are fine; yes/no is fine. Skip any question you can't answer and say so.

```
1. Yes — `state` is Figma-only, not a runtime API prop.
2. Bare names only, no is/has/can prefixes.
3. Breaking changes are acceptable — we're pre-1.0.
4. Unsure.
5. `helpText` and `description` are intentionally different contexts.
…
```

The more direct your answers, the fewer false findings end up in the report.

### Step 3 — paste remaining sections (large libraries only)

If your library has more than ~80 components, paste the remaining YAML before answering questions:

```
Here are the remaining sections:

---

<paste booleanNamingPatterns + apiSurface + slots here>
```

### Step 4 — save the report

When the LLM returns the report after your answers, save it to:

```
specs/
  _analysis/
    props.yaml              # data (regenerated by specs analyze props)
    props.report.2025-06-07.md   # report (manual snapshot — date it)
```

The date in the filename keeps multiple runs distinct as the library evolves. The report is a snapshot — it will not update when you re-run `specs analyze props`. Re-run the prompt against the new `props.yaml` to produce a new dated report.

## See Also

- [Analyze overview](/specs/cli/analyze/)
- [`styling` analyzer](/specs/cli/analyze/styling/)
- [Transforms overview](/specs/cli/transforms/)
