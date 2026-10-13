/**
 * Distributed orchestration skills — package assets of specs-cli, emitted into a
 * consuming project's `.claude/skills/` by `specs skills install`. Canonical and
 * overwritten on refresh; they orchestrate ("run these commands, stop at these
 * human gates") and never generate report or changelog content — scripts do all
 * the work (the scripted-everything stance).
 *
 * `roles.propose` and `states.setup` are the deliberate exceptions, and they are
 * worth naming rather than discovering. Both configure a library by a judgment no
 * rule reaches.
 *
 * Which of `checkbox`, `switch` and `togglebutton` an element is cannot be derived
 * from its props, because the discriminator is what the control *does* when
 * operated: a rule reading `checked` + `indeterminate` would be right about
 * `checkbox` and wrong about `toggle`, `switch` and `togglegroup`. And whether a
 * boolean variant prop is a state concept, a visibility toggle or a presentation
 * flag is not in the data either — `filled`, `segmented`, `showChevron` and
 * `highlighted` are all booleans, and one of them is a state.
 *
 * So both author their reports, and everything about them is built to keep the
 * judgment reviewable: the evidence behind each row, a checkbox a human clears, and
 * a gate before anything reaches a Figma file or a config. `roles.apply` and the
 * rest are pure orchestration.
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

   One plugin must be connected — **and you must check which file it is connected
   to.** The status line prints the connected file's key and name:

   \`\`\`
   Bridge running (pid 36652). 1 plugin connected:
     043ln8eiOoivUN5FicuGCF (ADS Components) — connected
   \`\`\`

   That key has to match the \`key\` of a source in \`config/settings.yaml\` under
   \`data.sources\`. **If it does not match, stop and say so.** Do not read or write
   anything through the bridge.

   "Connected" on its own is not the gate, and treating it as the gate is how a
   sweep ends up in the wrong Figma file. A bridge left running from earlier work
   answers exactly like the right one, every request succeeds, the report says
   \`applied\`, and the write lands in a file nobody was looking at. Nothing
   downstream detects it, because the file you meant to annotate is unchanged and
   still looks like it simply has no roles yet.
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

   One plugin must be connected — **and you must check which file it is connected
   to.** The status line prints the connected file's key and name:

   \`\`\`
   Bridge running (pid 36652). 1 plugin connected:
     043ln8eiOoivUN5FicuGCF (ADS Components) — connected
   \`\`\`

   That key has to match the \`key\` of a source in \`config/settings.yaml\` under
   \`data.sources\`. **If it does not match, stop and say so.** Do not read or write
   anything through the bridge.

   "Connected" on its own is not the gate, and treating it as the gate is how a
   sweep ends up in the wrong Figma file. A bridge left running from earlier work
   answers exactly like the right one, every request succeeds, the report says
   \`applied\`, and the write lands in a file nobody was looking at. Nothing
   downstream detects it, because the file you meant to annotate is unchanged and
   still looks like it simply has no roles yet.

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

const STATES_SETUP = `---
name: specs-cli.states.setup
description: Propose the states block for a library's specs.yaml from its own prop data — which variant props are state concepts, which are not, and why — then stop for review.
---
${HEADER_COMMENT}

# Set up states

Propose the \`states:\` block for \`config/conventions/specs.yaml\`: which of this
library's variant props carry
[state concepts](https://www.specsplugin.com/settings/states/), which value of each
activates the concept, and which props are deliberately left as \`data-*\`.

Without the block, every variant prop emits as a \`data-*\` selector and nothing bridges
to a real CSS pseudo-class or ARIA attribute. With it, \`:hover\` and \`:disabled\` reach
the states they describe and \`aria-expanded\` says what a container only hinted at.

This skill **authors its report**, like \`roles.propose\` and unlike the others here.
Whether a boolean prop is a state, a visibility toggle, or presentation is a judgment.
Four booleans on variant props can be a condition the control is in, a look, an optional
layer, and a behaviour flag, with nothing in their names, types or frequency to separate
them — the distinction is what the library *means* by each, which the data does not record.

Classify from this library's own evidence. Where a step gives an example, it is a shape to
recognise and never the answer for the prop it names: a prop called \`filled\` is a state
in one library and a presentation flag in the next.

It writes no config. The last step hands you a block to paste and stops.

## Steps

1. **Produce the input.**

   \`\`\`bash
   specs analyze props
   \`\`\`

   \`analysis/props.yaml\` is the candidate list: every prop name with its types, the
   components carrying it, and \`typeDiscordance\` where one name means two things.

2. **Read what the library already declares.** If \`config/conventions/specs.yaml\` has a
   \`states:\` block, this is an audit rather than a first run: say which props are newly
   present and which declared entries no longer match any prop, and leave the rest alone.
   An existing entry is a decision someone made, not a draft.

3. **Narrow to the props a variant can drive.** \`props.yaml\` carries no flag for this —
   it is the candidate list, not the filter. The tell is in each component's \`api.yaml\`:

   | Shape in \`api.yaml\` | Candidate? |
   |---|---|
   | \`type: boolean\` | **yes, always** |
   | \`type: string\` with a closed \`enum\` | **yes** |
   | \`type: string\` with no \`enum\`, or \`type: text\`, \`container\`, \`image\` | no — content and slots |
   | code-only props | no |

   **Do not filter on \`$extensions['com.figma'].type: VARIANT\`, and do not filter on
   \`nullable\`.** Both read as the obvious discriminator and neither is one. Which
   booleans carry the VARIANT marker varies within a single library for reasons unrelated
   to state — a Figma boolean property drives a selector exactly as a variant does. And
   \`nullable\` is a property of content props, not of booleans: in real libraries every
   boolean omits the key entirely, so \`nullable: false\` selects the string props you
   mean to exclude and rejects every boolean you mean to keep.

   Expect this step to leave most of the library in. It removes content and slots; the
   candidate pool is still large, and step 4 is where the work is.

   Read prop names from \`api.yaml\`, never from a \`detectedIn\` string. \`detectedIn\`
   shows the Figma spelling, which the spec normalises — \`Read only\` becomes
   \`readOnly\`, and \`prop:\` must be the normalised name. The verbatim rule in step 6
   applies to **values**, not to prop names.

4. **Sort every candidate into one of five.** This is the judgment, and most of the work:

   | Kind | Tell | Outcome |
   |---|---|---|
   | **State concept** | Names a condition the control is *in*, and the vocabulary has a concept for it | an entry in the block |
   | **State with no concept** | A real interaction condition the vocabulary cannot express — the keyboard-highlighted option in a listbox is the recurring one | no entry, and a row in the gaps section |
   | **Visibility toggle** | Turns an optional element on or off | no entry; it is structure, not state |
   | **Presentation** | Selects a look — a size, a colour, an alignment, a density | no entry |
   | **Behaviour flag** | Configures what the component *does* rather than what it looks like or is in: an auto-dismiss, a selection mode, a character limit | no entry; it belongs to the contract and carries no selector |

   The last two rows exist because three kinds do not partition a real library, and
   forcing a behaviour flag or a conceptless state into "presentation" to satisfy the
   table files it wrongly.

   Most props are not states, in every library seen so far — by a wide margin, and the
   margin widens with library size. A report that classifies most of its candidates has
   gone wrong somewhere. Do not calibrate against a ratio from another library: the
   proportions differ enough between libraries that a borrowed number is worse than none.

   Count props here, not rows. The block is keyed by concept and one prop can hold
   several, so a library can legitimately yield 9 classified props and 14 rows. A row
   count above the prop count is expected, not a sign of over-proposing.

5. **Check what each candidate actually changes.** A prop whose configuration only flips
   \`visible\` on some element is usually a visibility toggle however much its name sounds
   like a state — and a genuine state with no style delta is worth proposing but worth
   saying so about, because classifying it emits no selector.

   **Two markers settle most of the visibility toggles mechanically**, before any judgment:

   - \`$extensions['com.figma'].visibilityProp\` on an element names the prop that reveals
     it.
   - a \`$binding: "#/props/<name>"\` on an element's \`visible\` style, under
     \`default.elements\` in \`variants.yaml\`.

   Grep for both across the library and you will have identified a large fraction of the
   non-states with no reasoning at all. Do that first; spend the judgment on what is left.

   **Look in both halves of \`variants.yaml\`.** Style deltas live under \`variants:\`, but
   a visibility-only effect lives under \`default.elements.<el>.styles.visible\` and has no
   \`variants:\` entry whatsoever. Reading only \`variants:\` shows nothing for those props
   and leads straight to the wrong branch of this step — "a genuine state with no style
   delta" — for props that are plainly toggles.

   **Classify the deltas with a script, not by reading.** On a library of any size this
   step means tens of components with dozens of variant entries each. Parse the files and
   bucket each delta as style / layout / visible-only / child-passthrough. The bucketing
   is the step; done by eye it is neither repeatable nor finishable.

   Then three traps. Each one makes a real state look like a non-state, so the judgment is
   only safe with all three in hand.

   **A revealed layer can be the state.** The visibility test asks what the layer is
   *for*, not whether visibility changed. A layer that exists only to express a condition
   — a focus ring, an error message, a checkmark, a placeholder — is the library drawing
   the state, so the prop that reveals it is the state. \`focusRing.visible\` flipping is
   a focus state, not a toggle. A layer that would be meaningful with the state absent —
   a chevron, a caption, a trailing icon slot — is a toggle.

   This cuts both ways on names. \`placeholderVisible\` reads as pure visibility and is
   \`placeholder-shown\`; \`showChevron\` reads the same way and is a toggle. The name
   decides nothing either direction.

   **The delta may live one level down.** A prop whose configuration produces only
   \`someChild: propConfigurations\` is passing the state through to a nested instance,
   where the styling actually is. That is a state with a real delta, reported one level
   away — not a no-op. Follow it into the child component before concluding anything.

   **Subcomponent variants are nested.** \`props.yaml\` lists \`parent.child\` as its own
   component, but its variants sit under \`subcomponents:\` inside the *parent's*
   \`variants.yaml\`. A flat read shows the parent with no variants at all. Some libraries
   also carry the child a second time as a standalone component with the same props;
   where the two disagree, the nested one is what the parent renders.

6. **Match each state to a concept, and read its value from the data.** The vocabulary is
   fixed. This is the whole list — a name outside it cannot be configured, and a
   misremembered name fails the same silent way a wrong value does:

   | Concept | Emits | In the contract? |
   |---|---|---|
   | \`hover\` | \`:hover\` | omitted |
   | \`active\` | \`:active\` | omitted |
   | \`focus\` | \`:focus-visible\`, or \`:has(:focus-visible)\` on a wrapper root | omitted |
   | \`focus-visible\` | \`:focus-visible\` | omitted |
   | \`focus-within\` | \`:focus-within\` | omitted |
   | \`placeholder-shown\` | \`:placeholder-shown\` | omitted |
   | \`disabled\` | \`:disabled, [aria-disabled="true"]\` | included |
   | \`readonly\` | \`[readonly], [aria-readonly="true"]\` | included |
   | \`required\` | \`[required], [aria-required="true"]\` | included |
   | \`invalid\` | \`[aria-invalid="true"]\` | included |
   | \`valid\` | \`[aria-invalid="false"]\` | included |
   | \`selected\` | \`[aria-selected="true"]\` | included |
   | \`checked\` | \`:checked, [aria-checked="true"]\` | included |
   | \`indeterminate\` | \`:indeterminate, [aria-checked="mixed"]\` | included |
   | \`expanded\` | \`[aria-expanded="true"]\` | included |
   | \`collapsed\` | \`[aria-expanded="false"]\` | included |
   | \`pressed\` | \`[aria-pressed="true"]\` | included |
   | \`busy\` | \`[aria-busy="true"]\` | included |
   | \`current\` | \`[aria-current="true"]\` | included |

   The \`/settings/states/\` page carries the same table with the reasoning around it, but
   do not depend on reaching it — this skill has to work with no network.

   Read the **Emits** column when breaking a tie in step 7, and when deciding whether a
   concept describes your element at all.

   **Every row is a library-wide match on prop name plus value.** There is no way to scope
   a row to some components and not others, and this reframes several judgments below.
   Where one prop name means different things on different components — a boolean on some
   and an enum on others, or a value like \`Selected\` that is selection on a list item
   and the current tab on a tab — one row has to serve them all, and it will be wrong
   somewhere. Choose the reading that fits the most components, say which components it
   misdescribes, and report it as a gap rather than a decision. Check
   \`typeDiscordance\` in \`props.yaml\` for exactly this: it names the props whose
   meaning splits across components.

   Four rules the data will teach you anyway:

   - **The value must be one the prop's \`enum\` actually holds.** Copy it from the enum
     rather than inventing it from the concept name. Case and surrounding whitespace are
     forgiven — the match is case-insensitive, so \`hover\` finds \`Hover\` — but a value
     the enum does not contain at all matches nothing, and nothing warns you.

     That silence costs more than it looks. Naming a prop in *any* row excludes it from
     \`data-*\` emission entirely, so a row whose value resolves to nothing leaves that
     variant's styling with neither a concept selector nor the attribute it used to have.
     The styling is simply dropped. A real library carried \`value: active\` against an
     enum spelling it \`press\` and silently lost every pointer-down rule on its button.
   - **A boolean prop omits \`value\`** — it defaults to \`"true"\`. Quote \`"false"\` to
     map the *absence*, which is needed whenever the concept is the off side of the prop
     or the prop defaults to on. A \`filled\` prop that is true when a field has content
     is \`placeholder-shown\` at \`value: "false"\`. A drawer that defaults
     \`expanded: true\` records its only delta at \`false\`, so \`collapsed\` is the row
     that carries it.
   - **The focus concepts are three names for two behaviours.** \`focus\` and
     \`focus-visible\` are the same selector, so declaring both spends two rows on one
     thing. Choose by what you want emitted, not by what the prop is called:

     | Want | Declare |
     |---|---|
     | the ring to follow the component's shape — \`:focus-visible\` on a focusable root, \`:has(:focus-visible)\` on a wrapper | \`focus\` |
     | \`:focus-within\` verbatim, whatever the root is | \`focus-within\` |

     \`focus\` is the better default, because the narrowing is the behaviour most
     libraries want and it is decided per component rather than once in your config.
     Where a library has both a \`state: Focus\` enum value and a separate \`focus\`
     boolean, those are two props for one concept and step 7 applies.
   - **One prop commonly serves several concepts.** A single \`state\` enum may carry
     hover, active, focus, disabled, readonly, invalid and current at once; a \`selected\`
     boolean may be both \`selected\` and \`pressed\`. Six of seven real libraries reuse at
     least one prop. Treating prop and concept as one-to-one gets the library wrong.

7. **Where two candidates claim one concept, pick one and name the loser.** Two props may
   both look like \`expanded\`, or one enum may spell a value three ways — \`Read-only\`,
   \`Read only\`, \`Read-Only\`. Only one can be configured; say which you chose, why, and
   that the others stay \`data-*\`. A concept takes a single value today, so the spellings
   are a finding about the library rather than something the config can absorb.

   Expect these, and expect several — ties ran to a fifth of the rows in both libraries
   this procedure has been tested on. They come in two shapes the config treats alike:
   two different props claiming one concept, and two values of a *single* prop claiming
   it. Each loser leaves styling that exists with no selector at all, so every tie gets
   its own row in the report rather than a footnote.

   Break a tie in this order:

   1. **Does the concept's emitted selector actually describe this element?**
      \`indeterminate\` emits \`:indeterminate, [aria-checked="mixed"]\`, which describes
      a checkbox and not a progress bar — so a checkbox's prop wins over a progress
      bar's however the coverage falls. A row that emits a wrong ARIA attribute is worse
      than one that emits nothing, because nothing downstream will question it.
   2. **Which candidate covers more components?** Only once both candidates are
      semantically valid. This decides most ties and decides none of the hard ones.

   Say which rule settled it, and what the loser costs.

8. **Write the report**, in this order:

   - **Intro**: one sentence on what the block does, then the numbers — candidates
     considered, proposed, left as \`data-*\` — then the decision rule.
   - **Proposed states**: one flat table. Columns: \`✓\` (\`[x]\` to apply, \`[ ]\` to skip,
     defaulting to \`[x]\`), Concept (linked to its page), Prop, Value, Rationale. Put
     \`⚠️ Lower confidence\` at the front of a rationale rather than adding a column for
     it — on a real library the confidence column reads the same for most rows.
   - **The YAML block**, ready to paste, matching the table.
   - **Not a state, and why**: a table grouping the rest by the three kinds above. This is
     most of the candidates and it is the half a reader will question.
   - **Concepts with two candidates**: one row per tie — the concept, the prop chosen, the
     prop that lost, and what styling the loser leaves on \`data-*\`. Omit the section only
     when there were none.
   - **Concepts this library needs that do not exist**: where a real interaction state has
     no concept. Frame each so it can become an issue.

9. **GATE — human review.** Hand over the path and stop. Paste the block only once the
   reviewer has cleared any \`[x]\` they disagree with.

10. **Verify the selectors appear.** A classification that emits nothing looks identical to
    one that was never made:

    \`\`\`bash
    specs react
    \`\`\`

    A configured concept shows up in the emitted stylesheet as its documented selector —
    \`:disabled\`, \`[aria-expanded="true"]\` — in place of \`[data-*]\`. Check **every row
    you wrote**, not a sample, and check that the \`[data-*]\` selectors it replaced are
    gone rather than merely joined. A row naming a value the enum does not hold removes
    the attribute and adds no selector, so its styling disappears from the output with no
    error anywhere — the one failure that looks like success from every other angle.

    Four reasons a selector may be missing. Separate them before reporting, because two
    are defects and two are the correct outcome:

    | Why | Verdict |
    |---|---|
    | The value is not in the prop's enum | **Defect.** Step 6; fix the value. |
    | The styling sits on an element that cannot enter the state — a container is never \`:disabled\` | **Defect**, but a [role](https://www.specsplugin.com/roles/) one, not a states one. Report it as that. |
    | The prop drives **conditional rendering** rather than styling — it reveals a layer and changes nothing about how anything looks | **Correct.** Expected, and it is the revealed-layer row step 5 told you to classify. |
    | The prop drives no output at all | **Correct**, and step 5 should already have said so. |

    The third row is the one to get right, because it is the predictable result of
    following step 5's first trap. A \`required\` or \`placeholder-shown\` row often sits on
    a prop that only toggles a layer's visibility: classifying it is still right, and it
    still earns its place — it reaches the contract and the markup rather than the
    stylesheet, as \`aria-required\` or a rendering condition. **Confirm that** instead of
    the selector: look for the attribute in the emitted scaffold.

    For every such row, also confirm **nothing was lost**. A revealed-layer prop that
    carried no styling has no \`data-*\` selector to give up, so classifying it costs
    nothing. Check the residual \`data-*\` set in the stylesheet: every attribute left in
    it should be a prop you declined to classify, and no classified prop should appear.
    That check is what distinguishes this case from the first row of the table.
`;

export const SKILL_ASSETS: SkillAsset[] = [
  { name: 'specs-cli.premerge', markdown: PREMERGE },
  { name: 'specs-cli.release', markdown: RELEASE },
  { name: 'specs-cli.roles.propose', markdown: ROLES_PROPOSE },
  { name: 'specs-cli.roles.apply', markdown: ROLES_APPLY },
  { name: 'specs-cli.states.setup', markdown: STATES_SETUP },
];
