/**
 * Distributed orchestration skills — package assets of specs-cli, emitted into a
 * consuming project's `.claude/skills/` by `specs skills install`. Canonical and
 * overwritten on refresh; they orchestrate ("run these commands, stop at these
 * human gates") and never generate report or changelog content — scripts do all
 * the work (the scripted-everything stance).
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
description: Pre-merge impact report for a Figma feature branch — generate specs from both sides, diff them, and stop for a human read of the report before any merge proceeds.
---
${HEADER_COMMENT}

# Pre-merge report

Compare the specs a feature branch produces against the specs main produces,
and put the graded impact report in front of a human before the merge.

All content is scripted. This skill only sequences commands and stops at the
gates — it never writes or edits report content, never summarizes the diff in
its own words, and never decides whether the merge proceeds.

## Steps

1. **Fetch and generate both sides.** Produce two spec trees with the same
   curation rules — one from the merge target (main), one from the feature
   branch. Use the project's usual \`specs fetch\` / \`specs generate\`
   invocations, writing to two separate directories (for example
   \`premerge/main/specs\` and \`premerge/branch/specs\`).

2. **Run the report:**

   \`\`\`bash
   specs version premerge --base premerge/main/specs --current premerge/branch/specs --out premerge/report.md
   \`\`\`

3. **GATE — human reads the report.** Hand over \`premerge/report.md\` and stop.
   Do not summarize it, grade it, or soften it. The reader decides whether the
   merge proceeds.

4. Only after an explicit go-ahead does the merge continue, outside this skill.
`;

const RELEASE = `---
name: specs-cli.release
description: Release a spec workspace — pre-release report and changelog from the ledgers, human review, then version bump, tag, and publish sequence with a stop at every gate.
---
${HEADER_COMMENT}

# Release

Accumulate what changed since the last release, put the report and itemized
changelog in front of a human, then bump, tag, and publish — stopping at every
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

3. **Bump.** After an explicit go-ahead:

   \`\`\`bash
   specs version bump
   \`\`\`

   If the human directed an override, pass it with its reason, exactly as
   given: \`--force-major "…"\`, \`--force-minor "…"\`, or \`--force-patch "…"\`.

4. **Tag** only when the human asks for it:

   \`\`\`bash
   specs version bump --tag
   \`\`\`

   (or run the bump with \`--tag\` in step 3). Tags are never pushed by this
   skill — pushing is a manual act.

5. **GATE — publish sequence.** Whatever ships the release (npm publish, docs,
   announcements) happens outside this skill, after another explicit go-ahead.
`;

export const SKILL_ASSETS: SkillAsset[] = [
  { name: 'specs-cli.premerge', markdown: PREMERGE },
  { name: 'specs-cli.release', markdown: RELEASE },
];
