/**
 * Distributed orchestration skills — package assets of specs-cli, emitted into a
 * consuming project's `.claude/skills/` by `specs skills install`. Canonical and
 * overwritten on refresh; they orchestrate ("run these commands, stop at these
 * human gates") and never generate report or changelog content — scripts do all
 * the work (the scripted-everything stance).
 *
 * `roles.propose` is the one deliberate exception, and it is worth naming rather
 * than discovering. Proposing a role is a judgment: which of `checkbox`, `switch`
 * and `togglebutton` an element is cannot be derived from its props, because the
 * discriminator is what the control *does* when operated. A rule that read
 * `checked` + `indeterminate` and emitted `checkbox` would be right about
 * `checkbox` and wrong about `toggle`, `switch` and `togglegroup`. So that skill
 * authors its report, and everything about it is built to keep the judgment
 * reviewable: a confidence column, the evidence behind each row, and a human gate
 * before anything is written to a Figma file. `roles.apply` is pure orchestration
 * like the rest.
 */

export interface SkillAsset {
  /** Skill directory name under .claude/skills/. */
  name: string;
  markdown: string;
}

const HEADER_COMMENT = `<!--
  Canonical skill emitted by \`specs skills install\` — overwritten on every
  refresh; do not edit in place. A local override layer (a separate file the
  refresh never touches) is planned but not yet implemented; until it exists,
  local customizations belong in your own separate skill.
-->`;

const PREMERGE = `---
name: specs-cli.premerge
description: Pre-merge impact report for a Figma feature branch — one command fetches both sides, generates both spec trees, and diffs them; stop for a human read of the report before any merge proceeds.
---
${HEADER_COMMENT}

# Pre-merge report

Compare the specs a Figma feature branch produces against the specs main
produces, and put the graded impact report in front of a human before the
merge.

All content is scripted. This skill only sequences commands and stops at the
gates — it never writes or edits report content, never summarizes the diff in
its own words, and never decides whether the merge proceeds.

## Steps

1. **Run the pipeline** from the workspace (it needs \`config/\` and a
   \`FIGMA_TOKEN\` in the workspace \`.env\`), passing the Figma branch URL:

   \`\`\`bash
   specs version figmapremerge "<figma branch URL>"
   \`\`\`

   The command fetches both sides in parallel, generates both spec trees,
   diffs them, and writes the run under \`versions/diffs/<date>-<branch>/\` —
   the report is \`report.md\` in that folder, and it also prints to stdout.
   By default only the report and the impacted components' specs are kept;
   pass \`--keep-data\` to retain both full spec trees and the fetched
   payloads.

2. **GATE — human reads the report.** Hand over the report path and stop.
   Do not summarize it, grade it, or soften it. The reader decides whether the
   merge proceeds.

3. Only after an explicit go-ahead does the merge continue, outside this skill.
`;

const RELEASE = `---
name: specs-cli.release
description: Release a spec workspace — pre-release report and changelog from the ledgers, human review, then cut the version, tag, and publish sequence with a stop at every gate.
---
${HEADER_COMMENT}

# Release

Accumulate what changed since the last release, put the report and itemized
changelog in front of a human, then cut, tag, and publish — stopping at every
gate.

All content is scripted. This skill sequences commands and stops; it never
drafts or polishes report/changelog content and never invents version numbers.

## Steps

1. **Pre-release report and changelog** (from ledger diffs since the last
   release):

   \`\`\`bash
   specs version report
   \`\`\`

2. **GATE — human reviews.** Hand over the report and changelog and stop.
   The reader decides the release proceeds — or does not.

3. **Cut the version.** After an explicit go-ahead:

   \`\`\`bash
   specs version cut
   \`\`\`

   If the human directed an override, pass it with its reason, exactly as
   given: \`--force-major "…"\`, \`--force-minor "…"\`, or \`--force-patch "…"\`.

4. **Tag** only when the human asks for it:

   \`\`\`bash
   specs version tag
   \`\`\`

   (defaults to the newest cut version). Tags are never pushed by this skill —
   pushing is a manual act.

5. **GATE — publish sequence.** Whatever ships the release (npm publish, docs,
   announcements) happens outside this skill, after another explicit go-ahead.
`;

const ROLES_PROPOSE = `---
name: specs-cli.roles.propose
description: Propose a role for every unannotated anatomy element in a library, as a markdown table a system designer marks up — then stop. Writes nothing to Figma.
---
${HEADER_COMMENT}

# Propose roles

Produce \`analysis/roles.proposed.md\`: a per-component table proposing a
[role](https://www.specsplugin.com/roles/) for each unannotated anatomy element,
with the evidence behind it and a **Decision** column a system designer edits in
place.

This skill **authors its report**, unlike the others here. Which role an element
takes is a judgment — the discriminator between \`checkbox\`, \`switch\` and
\`togglebutton\` is what the control does when operated, which no prop records.
A rule that read \`checked\` + \`indeterminate\` and emitted \`checkbox\` would be
right about \`checkbox\` and wrong about \`toggle\`, \`switch\` and
\`togglegroup\`. Everything below exists to keep that judgment reviewable.

Nothing is written to Figma. The sweep is \`specs-cli.roles.apply\`, and it runs
only after a human has marked this file up.

## Steps

1. **Check the preflight.**

   \`\`\`bash
   specs bridge status
   \`\`\`

   One plugin must be connected, in the file the specs were generated from.
   \`settings.spec.roles\` must be \`true\`, or generated specs carry no roles
   and the before-measure is meaningless rather than zero.

2. **Produce the inputs.**

   \`\`\`bash
   specs analyze
   \`\`\`

   \`analysis/roles.yaml\` is the before-measure and the list of bare elements
   with their types. \`analysis/props.yaml\` is the cross-library prop inventory.
   \`analysis/dependencies.byComponent.yaml\` says which elements are instances of
   other components.

3. **Read what is already annotated, first.** In \`analysis/roles.yaml\`, any
   component with a \`roles\` entry was annotated by hand, and it is the library's
   own convention. It calibrates everything else — one hand-annotated field
   component settles how every other field in the library should read. Check it
   for gaps too: a partial annotation is a likely oversight, and proposing the
   missing part is one of the most valuable rows in the report.

4. **Read the live components.** \`POST /inspect\` per component, with
   \`pageId\` and \`nodeId\` from each spec's \`metadata.source\`, and
   \`conventions\` / \`settings\` taken from \`specs/latest.metadata.yaml\` —
   that file records the resolved pair, so do not reconstruct it. The response
   gives, per anatomy key: the Figma layer name behind it, the element type, which
   variants carry it, and any annotations already standing on it.

   The Figma layer name is the part a spec cannot supply under
   \`figma.naming: NONE\`, and it is often the strongest evidence in the report —
   a layer named \`Field.Label\` says what \`fieldLabel\` only hints at.

   Variant coverage matters for the same reason: a spec's \`detectedIn\` names a
   single variant that witnesses the element, not the set it appears in.

5. **Read the vocabulary, in this order.**
   [Choosing a role](https://www.specsplugin.com/roles/choosing/) first — it is
   the differentials, which is where most of the judgment comes from. Then the
   per-role pages for the mechanics of each candidate, which also state **which
   parts each control accepts and on which element types**; a part proposed onto a
   type its control does not accept will not resolve. Then
   [precedence](https://www.specsplugin.com/roles/precedence/).

6. **Write the report.** Three sections before any proposal table, because each
   one removes rows that would otherwise be bad proposals:

   - **Needs reauthoring first.** An element the component owns carries **at most
     one** role. A component that needs two announcement semantics across its
     variants — a banner that is an interruption when it is a danger and a
     confirmation when it is a success — cannot express that on one element. The
     fix is separate elements per semantic in Figma, then one role each. That is
     an authoring change, and it comes before annotation rather than being
     resolved by picking a winner.
   - **Gaps.** Where the library needs a concept that is inert (in the vocabulary,
     nothing emits) or absent (not in the vocabulary at all), say so as a table
     with the component it bites and what exists instead. Frame each row so it can
     become an issue without rewriting.
   - **Start here.** The judgment calls, each with the question it turns on, so
     review begins where it matters rather than at the top.

   Then the per-component tables. Columns: element, Figma layer name, type, which
   variants carry it, the proposed role, **Support**, confidence, why, Decision.

   \`Support\` is \`emits\` / \`inert\` / \`new\`. **Always propose the concept the
   element actually is, even when nothing emits for it**, and name the degradation
   that works today as the alternative in the prose. A spec recording what an
   element is stays true as support arrives; one recording a near-miss has to be
   re-annotated, and nobody will remember which rows were compromises.

7. **Say where no role belongs, and why.** Most elements take none, and that is a
   correct outcome rather than a gap. Group them: concepts deferred from the
   vocabulary, concepts that do not exist, layout-only containers, and elements
   blocked on something else. Two traps worth their own line:

   - A part cannot resolve to a control in **another** component — parts resolve by
     component. A trigger component and a panel component used together cannot
     pair, so do not propose the part; record the gap.
   - An \`aria-label\` text layer is not a \`label\`. That part emits a visible
     \`<label>\`; an accessible name with no visible text reaches the output as a
     contract prop.

8. **Validate before handing over.** Every proposed element key must exist in that
   component's anatomy, and every proposed role must be in the documented
   vocabulary or be explicitly marked \`new\`. A row naming an element that is not
   there fails at write time, in the middle of a sweep.

9. **GATE — human review.** Hand over the path and stop. The designer edits the
   Decision column: \`accept\`, a different role name, or \`no\`. A blank cell is
   undecided and must not be applied.
`;

const ROLES_APPLY = `---
name: specs-cli.roles.apply
description: Apply the approved roles from analysis/roles.proposed.md to the Figma file as Dev Mode annotations, one page at a time, then prove the round trip.
---
${HEADER_COMMENT}

# Apply roles

Add the approved roles from \`analysis/roles.proposed.md\` to the live Figma file
as Dev Mode annotations, page by page, then regenerate and measure.

This skill decides nothing. Every role it writes came from a Decision cell a human
edited, and it never reinterprets one.

## Steps

1. **Check the preflight.**

   \`\`\`bash
   specs bridge status
   \`\`\`

   One plugin must be connected, in the file the specs were generated from.

2. **Parse the decisions.** For each table row: \`accept\` takes the proposed
   role, any role name overrides it, \`no\` and \`skip\` reject it. **A blank
   Decision cell stops the run** — report every one and apply nothing. An
   undecided row is not a rejected row, and treating it as either is a decision
   this skill does not get to make.

3. **Group by page.** Each component's page comes from its spec's
   \`metadata.source.pageId\`. One \`POST /annotate\` per page, because a page is
   the unit a reviewer can watch and stop at.

4. **Apply, one page at a time.** Print the page's component list before writing,
   then the result table after. Elements are named by anatomy key; the plugin
   resolves each against the live component at write time, so nothing depends on a
   node id recorded earlier.

   Each element reports one of:

   - \`applied\` — the annotation was appended. Nothing already on the layer was
     read for content, rewritten, or reordered
   - \`conflict\` — the element already carries a role, on this variant or
     another. Left alone. **Report and continue**: that layer is already authored
   - \`unresolved\` — nothing in the live component keys to that name. **Halt.**
     The component changed since the proposal was reviewed, so every later page is
     suspect and the review needs redoing rather than overriding
   - \`unsupported\` — the element resolved to a node type that cannot hold an
     annotation. Report and continue

5. **GATE — confirm in Dev Mode.** Before sweeping the rest, have a human open one
   annotated layer in Figma and confirm two things: the role is there, and anything
   that was there before still is. The write is additive by construction, but it is
   a designer's file and the check costs one look.

6. **Prove the round trip.**

   \`\`\`bash
   specs fetch --only file
   \`\`\`
   \`\`\`bash
   specs generate
   \`\`\`
   \`\`\`bash
   specs analyze roles
   \`\`\`

   Reading annotations back needs no bridge — the REST payload carries annotation
   labels. Diff \`analysis/roles.yaml\` against the copy from before the sweep: the
   roles that moved are exactly the Decision cells that said so, or something went
   wrong that no individual page result showed.
`;

export const SKILL_ASSETS: SkillAsset[] = [
  { name: 'specs-cli.premerge', markdown: PREMERGE },
  { name: 'specs-cli.release', markdown: RELEASE },
  { name: 'specs-cli.roles.propose', markdown: ROLES_PROPOSE },
  { name: 'specs-cli.roles.apply', markdown: ROLES_APPLY },
];
