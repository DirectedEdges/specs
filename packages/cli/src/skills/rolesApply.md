---
name: specs-cli.roles.apply
description: Apply the approved roles from reports/<YYYY-MM-DD>.roles.proposal.md to the Figma file as Dev Mode annotations, one page at a time, then prove the round trip.
---
<!--
  Canonical skill emitted by `specs skills install` — overwritten on every
  refresh; do not edit in place. A local override layer (a separate file the
  refresh never touches) is planned but not yet implemented; until it exists,
  local customizations belong in your own separate skill.
-->

> **Prerequisite — read once per session.** If you have not already read
> `.claude/skills/specs-cli.primer/SKILL.md` in this session, read it now. It is
> what Specs is and why its data is structured, and this procedure assumes it.

# Apply roles

Add the approved roles from `reports/<YYYY-MM-DD>.roles.proposal.md` to the live Figma file
as Dev Mode annotations, page by page, then regenerate and measure.

This skill decides nothing. Every role it writes came from a Decision cell a human
edited, and it never reinterprets one.

## Steps

1. **Check the preflight.**

   ```bash
   specs bridge status
   ```

   One plugin must be connected — **and you must check which file it is connected
   to.** The status line prints the connected file's key and name:

   ```
   Bridge running (pid 36652). 1 plugin connected:
     043ln8eiOoivUN5FicuGCF (ADS Components) — connected
   ```

   That key has to match the `key` of a source in `config/settings.yaml` under
   `data.sources`. **If it does not match, stop and say so.** Do not read or write
   anything through the bridge.

   "Connected" on its own is not the gate, and treating it as the gate is how a
   sweep ends up in the wrong Figma file. A bridge left running from earlier work
   answers exactly like the right one, every request succeeds, the report says
   `applied`, and the write lands in a file nobody was looking at. Nothing
   downstream detects it, because the file you meant to annotate is unchanged and
   still looks like it simply has no roles yet.

2. **Parse the decisions.** `[x]` applies the row's role, `[ ]` skips it. There
   is no third answer to interpret — if a reviewer wanted a different role, the
   row says so.

   Two rows are not applied even when checked:

   - **Marked `✏️ Figma change`.** The element does not exist yet; the row
     records the intent for after the asset change. Report it as `deferred` and
     carry on. Treating it as a missing element would halt the sweep on a row that
     is working exactly as designed.
   - **Marked `(Not yet supported)`.** These *are* applied — the concept is real
     vocabulary and the annotation is the point. Nothing emits for it, so expect
     no change in generated output, and say so rather than letting it read as a
     failed write.

3. **Group by page.** Each component's page comes from its spec's
   `metadata.source.pageId`. One `POST /annotate` per page, because a page is
   the unit a reviewer can watch and stop at.

4. **Apply, one page at a time.** Print the page's component list before writing,
   then the result table after. Elements are named by anatomy key; the plugin
   resolves each against the live component at write time, so nothing depends on a
   node id recorded earlier.

   Each element reports one of:

   - `applied` — the annotation was appended. Nothing already on the layer was
     read for content, rewritten, or reordered
   - `conflict` — the element already carries a role, on this variant or
     another. Left alone. **Report and continue**: that layer is already authored
   - `unresolved` — nothing in the live component keys to that name. **Halt.**
     The component changed since the proposal was reviewed, so every later page is
     suspect and the review needs redoing rather than overriding
   - `unsupported` — the element resolved to a node type that cannot hold an
     annotation. Report and continue

5. **GATE — confirm in Dev Mode.** Before sweeping the rest, have a human open one
   annotated layer in Figma and confirm two things: the role is there, and anything
   that was there before still is. The write is additive by construction, but it is
   a designer's file and the check costs one look.

6. **Prove the round trip.**

   ```bash
   specs fetch --only file
   ```
   ```bash
   specs generate
   ```
   ```bash
   specs analyze roles
   ```

   Reading annotations back needs no bridge — the REST payload carries annotation
   labels. Diff `analysis/roles.yaml` against the copy from before the sweep: the
   roles that moved are exactly the rows that said so, or something went wrong that
   no individual page result showed.

7. **Emit, and read the output.** The point of a role is the code it changes, and
   the sweep proves only that the annotation landed.

   ```bash
   specs react
   ```

   Spot-check one component per concept family: a checkbox should hold a real
   `<input type="checkbox">` with `htmlFor` and `aria-describedby` wiring, a
   disclosure an `aria-expanded` button paired by `aria-controls`, a button a
   real `<button>`. This is also the only check that catches a role marked as
   supported that is not — a `<div>` where a `<fieldset>` was expected says the
   concept is Specified rather than Implemented, whatever its page suggests.

