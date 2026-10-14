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

6. **Check each control against the parts it accepts.** Do this before writing any
   proposal, because it is the only pass that can see what is *absent* — an
   element-by-element walk only ever looks at elements that exist, so a part the
   design never drew is invisible to it.

   Each control role's page carries a "Roles" table listing the parts it accepts.
   Read it as a checklist and ask, for every control you are proposing: does this
   component have an element for each part, and if not, why not?

   | Control | Parts it accepts |
   |---|---|
   | \`textbox\` family | \`label\`, \`description\`, \`errormessage\`, \`value\`, \`placeholder\` |
   | \`checkbox\`, \`radio\`, \`switch\` | \`label\`, \`description\`, \`errormessage\`, \`indicator\` |
   | \`group\` | \`label\`, \`description\`, \`errormessage\` |
   | \`disclosure\` | \`label\`, \`panel\`, \`indicator\` |
   | \`button\`, \`togglebutton\`, \`link\` | \`label\`, \`description\`, \`indicator\` |
   | \`spinbutton\` | \`label\`, \`description\`, \`value\`, \`increment\`, \`decrement\` |

   An absence resolves one of two ways, and they want different outcomes:

   - **The element exists and you did not propose for it.** A defect in the
     proposal. Add the row.
   - **The design has no such element.** A finding about the library, reported and
     never proposed — there is nothing to annotate. State which components are
     affected and what the consequence is.

   The second is the one worth the pass. On a real 69-component library every
   field had a label and a description and **no component drew an error message at
   all**, so \`errormessage\` — fully implemented — went unproposed and unmentioned.
   Ten components could say what a value is for and none could say what was wrong
   with it. No per-element reading surfaces that; only asking what a control
   usually comes with does.

   Check the inverse too: a part with no control anywhere in its component is
   valid — that is a provider declaring what it offers — but a part whose control
   is a *deferred-vocabulary instance* will emit an id pointing at nothing. Report
   those rather than proposing them.

7. **Write the report, in this order.** The shape matters: a reviewer reads the
   decisions first and the exceptions after.

   **Intro.** Three sentences on what a role is and why it cannot be derived, then
   one sentence carrying every number — components, elements, roles proposed, roles
   that do not exist, Figma changes needed, components needing none — then the
   decision rule. No separate summary table; it duplicates the intro. Follow it
   with an anchor list of the sections.

   **Proposed roles.** One flat table for the whole library, not per-component
   tables. Reviewers do group by component, but the flat shape is what makes a
   library-wide inconsistency visible — eight \`label\` rows side by side is how a
   missing ninth gets noticed.

   | Column | Content |
   |---|---|
   | \`✓\` | \`[x]\` to apply, \`[ ]\` to skip. Default every row to \`[x]\` |
   | Component | spec key |
   | Element | anatomy key |
   | Role | the concept, linked to its page on specsplugin.com |
   | Rationale | the evidence, prefixed by a marker where one applies |

   Append \`(Not yet supported)\` to a role that emits nothing, and keep its link —
   a link is to documentation, not a claim that the concept works. **Take support
   from the Inventory's status, never from whether a page exists**: \`group\`,
   \`radio\` and \`textarea\` have complete pages and emit nothing. Only
   **Implemented** emits; **Specified** and a bare dash do not. Reading the link as
   the signal mislabels six rows on a library of this size, and the error only
   surfaces when someone runs the transform and finds a \`<div>\` where they
   expected a \`<fieldset>\`.

   \`[x]\` / \`[ ]\` rather than a checkmark-or-blank, so clearing a row is a
   positive act. Blank cannot distinguish "rejected" from "never read", and both
   would stop the sweep.

   No confidence column: on a real library it is one value for ninety per cent of
   rows, which is a column of noise that also hides the few rows worth arguing
   about. Put \`⚠️ Lower confidence\` at the front of those rows' Rationale
   instead.

   Prefix a row with \`✏️ Figma change, see below\` when it depends on an asset
   change. Propose the role on the element that **will** exist, so the table is the
   whole picture rather than the applicable part of it.

   Rationale carries **checkable evidence only** — \`an open prop and a panel
   beside it\`, \`Field.Label, a text sibling of the control\`. Never provenance:
   a rationale reading "library convention" on eleven rows tells a reviewer nothing
   they can verify, and it is really a pointer to a sentence below the table. Put
   that sentence below the table and let each row stand on its own evidence.

   **Figma asset changes**, below the proposal table. An element carries at most
   one role, so a component needing two semantics across its variants has to say so
   with two elements — a banner that interrupts as a danger and confirms as a
   success cannot do both on one. Show it as before and after layout trees, each
   node \`<layer name> (<type>) ## comment where needed\`, indented. Keep the prose
   to a few sentences; the trees carry the explanation.

   **Proposed new roles**, below that. Only concepts that are **not in the
   vocabulary at all** — a concept that exists but emits nothing is real vocabulary
   and belongs in the proposal table marked \`(Not yet supported)\`. Columns:
   \`#\`, Role, Apply to, Rationale (one or two sentences), Existing alternatives.
   Then any gaps that are not new roles as short bullets: a missing resolution
   rule, a concept with no page, concepts deferred by design.

   **Always propose the concept the element actually is**, even when nothing emits
   for it, and name the working alternative in the Existing alternatives column. A
   spec recording what an element is stays true as support arrives; one recording a
   near-miss has to be re-annotated, and nobody will remember which rows were
   compromises.

8. **Say where no role belongs.** Most elements take none, and that is a correct
   outcome rather than a gap. A table of component names grouped by reason:
   deferred concepts, concepts that do not exist, layout-only, blocked on something
   else. Then the elements inside *annotated* components left bare on purpose —
   those are the ones a reviewer will otherwise ask about. Three recurring traps:

   - A part cannot resolve to a control in **another** component — parts resolve by
     component. A trigger component and a panel component used together cannot
     pair, so do not propose the part; record the gap.
   - An \`aria-label\` text layer is not a \`label\`. That part emits a visible
     \`<label>\`; an accessible name with no visible text reaches the output as a
     contract prop.
   - A control's own text is its content, not a \`label\`. Proposing \`label\` on a
     button's or disclosure's text points a \`<label>\` at a button.

9. **Reconcile, then validate.** Every component must appear exactly once across
   the proposal table and the no-role list — compute it rather than trusting the
   prose, because a component addressed in neither is invisible, and that is how
   two whole components get missed. Then check every row: the element key exists in
   that component's anatomy, and the role is in the vocabulary. A row naming an
   element that is not there fails at write time, mid-sweep.

10. **GATE — human review.** Hand over the path and stop. The reviewer clears the
   \`[x]\` on anything they reject. If they question a proposal, settle it to apply
   or skip in conversation and edit the row — the report never carries a third
   answer, because the applier would have to interpret one.
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

2. **Parse the decisions.** \`[x]\` applies the row's role, \`[ ]\` skips it. There
   is no third answer to interpret — if a reviewer wanted a different role, the
   row says so.

   Two rows are not applied even when checked:

   - **Marked \`✏️ Figma change\`.** The element does not exist yet; the row
     records the intent for after the asset change. Report it as \`deferred\` and
     carry on. Treating it as a missing element would halt the sweep on a row that
     is working exactly as designed.
   - **Marked \`(Not yet supported)\`.** These *are* applied — the concept is real
     vocabulary and the annotation is the point. Nothing emits for it, so expect
     no change in generated output, and say so rather than letting it read as a
     failed write.

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
   roles that moved are exactly the rows that said so, or something went wrong that
   no individual page result showed.

7. **Emit, and read the output.** The point of a role is the code it changes, and
   the sweep proves only that the annotation landed.

   \`\`\`bash
   specs react
   \`\`\`

   Spot-check one component per concept family: a checkbox should hold a real
   \`<input type="checkbox">\` with \`htmlFor\` and \`aria-describedby\` wiring, a
   disclosure an \`aria-expanded\` button paired by \`aria-controls\`, a button a
   real \`<button>\`. This is also the only check that catches a role marked as
   supported that is not — a \`<div>\` where a \`<fieldset>\` was expected says the
   concept is Specified rather than Implemented, whatever its page suggests.
`;

export const SKILL_ASSETS: SkillAsset[] = [
  { name: 'specs-cli.premerge', markdown: PREMERGE },
  { name: 'specs-cli.release', markdown: RELEASE },
  { name: 'specs-cli.roles.propose', markdown: ROLES_PROPOSE },
  { name: 'specs-cli.roles.apply', markdown: ROLES_APPLY },
];
