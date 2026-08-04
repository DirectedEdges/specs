---
description: Generate a dependency blast-radius or change-impact report for one or more components from fresh `specs analyze dependencies` data.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Purpose

Answer "what is impacted if this component changes?" from the dependency graph the `dependencies` analyzer emits — without the user running commands, locating entries, or pasting data. The skill regenerates the analysis (it is cheap and deterministic — never report from a stale snapshot), reads the relevant entries, and returns one of two reports:

- **Change-impact report** — when the input describes an intended change ("remove `Subtle` from dsIcon's `appearance` enum"). Verdict, blast radius, safe surface, verification checklist.
- **Blast-radius profile** — when the input is only component name(s). The component's position in the graph, its dependents by depth, contract relations, and prop utilization.

## Outline

### 1. Parse the input

- **Component name(s)** — required. If none given, ask which component(s) to analyze and stop.
- **Change description** — everything after the component name(s) that reads as an intended change. Present → change-impact report; absent → blast-radius profile.

### 2. Locate the workspace and CLI

- The target workspace is the current working directory's specs workspace: a directory with `specs.config.yaml` whose `outputDirectory` points at the generated specs. If the cwd is not a specs workspace, ask which workspace to analyze.
- **Never use the globally installed `specs` binary** — it may be stale. Invoke the locally built CLI:
  - Inside the `specs` repo: `node packages/cli/dist/specs.js` (run `npm run build --workspace=packages/cli` first if `dist/` is missing or source changed).
  - In any other workspace: `node <specs-repo>/packages/cli/dist/specs.js`, or the workspace's own installed `@directededges/specs-cli` binary if the specs repo is not checked out locally.

### 3. Regenerate the data

From the workspace root:

```bash
node <path-to>/specs.js analyze dependencies
```

Then read both aggregates from `_analysis/` (extension follows the workspace's `format.output` — `.json` or `.yaml`):

- `dependencies.graph.{json,yaml}`
- `dependencies.byComponent.{json,yaml}`

### 4. Resolve the component(s)

Match each requested name against `byComponent` keys, case- and separator-insensitively (`DS Icon` → `dsIcon`). If a name matches nothing, list the closest keys and stop — do not guess. If it matches an `external` node in the graph, say so: externals have no entry and no blast radius data.

### 5. Gather the evidence

For each resolved component:

- Its own `byComponent` entry — dependents, dependencies, contract relations, `propUsage`.
- The `byComponent` entries of every direct and transitive dependent (their `directDependencies` show *how* they consume the target; the graph's `edges` show *which elements* place it).
- For a change that names specific props or values: the target's `api.yaml` prop definitions, to compare the declared surface against configured usage.
- The graph `summary` for cycles involving the target and its root/leaf status.

### 6. Produce the report

Reply in the conversation. Multiple components get one report with a per-component section plus a combined blast-radius union.

Ground every claim in the data. Where the data cannot answer — runtime code usage, consumers outside the analyzed workspace, teams not represented in specs — say so explicitly rather than guessing. For contract-level changes (deleting or renaming a component), treat `contractDependents` as part of the blast radius; for styling/prop-value changes, they are informational.

**Change-impact report structure:**

```markdown
# Change Impact Report — {component}
{YYYY-MM-DD} · {change summary}

## Verdict
One paragraph: safe, risky, or breaking — and for whom.

## Blast Radius
| Component | Depth | Consumes via | Configured props touched by this change |
One row per impacted component, ordered by depth. Include contract
dependents (marked as such) when the change is contract-level.

## Safe Surface
Props and values in the change that no dependent configures.

## Verify Before Shipping
Checklist of specific component + prop combinations to re-test, ordered by depth.
```

**Blast-radius profile structure:**

```markdown
# Blast Radius — {component}
{YYYY-MM-DD}

## Position
Root/leaf/interior; degrees; cycles if any; external references if any.

## Dependents
Direct, then transitive with depth, then contract relations.

## Prop Utilization
Props ranked by configuredBy, with value → consumer breakdowns.
Call out props no consumer configures.
```

### 7. Offer to save

After replying, offer to save a dated copy to `<specs-dir>/_analysis/dependencies.report.{YYYY-MM-DD}.md`. Write the file only if the user accepts.
