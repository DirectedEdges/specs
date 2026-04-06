---
description: Release @directededges/specs-cli to npm. Swaps file: refs to versioned, verifies, builds, tests, publishes with confirmation gates.
---

## User Input

```text
$ARGUMENTS
```

Arguments: `<version> <schema-version> <specs-from-figma-version>`
- First argument: the CLI version to release (e.g., `0.6.0`)
- Second argument: the @directededges/specs-schema version to reference (e.g., `0.16.0`)
- Third argument: the @directededges/specs-from-figma version to reference (e.g., `0.7.0`)

You **MUST** have all three values before proceeding. If any are missing, ask for them.

## Working Directory

All commands in this agent run from the **CLI package directory**: `packages/cli` (relative to repo root). Use absolute paths for file reads, but run shell commands from `packages/cli`.

## Outline

1. **Verify version**: Read `packages/cli/package.json`. Confirm the `version` field matches the first argument. If not, STOP and ask whether to update it or abort.

2. **Verify CHANGELOG**: Read `packages/cli/CHANGELOG.md`. Confirm:
   - An entry exists for this version (e.g., `## [0.6.0]`)
   - The entry has a date (use today if missing)
   - A **Summary** line exists at the top of the version entry (immediately after the heading), providing a high-level overview of this release
   - The entry has content under Added/Changed/Removed/Fixed
   - A **Dependency updates** subsection summarizes what changed in upstream packages. To write this:
     1. Read the specs-schema CHANGELOG (`packages/schema/CHANGELOG.md`) for the `<schema-version>` entry
     2. Read the specs-from-figma CHANGELOG for the `<specs-from-figma-version>` entry
     3. Summarize in plain language what these upstream changes mean for CLI users — focus on user-visible behavior changes (new output fields, changed data shapes, corrected values) rather than internal code structure. Write from the CLI user's perspective (e.g., "Specs now include..." not "The transformer refactored...")
   If incomplete, STOP and report what's missing.

3. **Verify clean working tree**:
   ```bash
   git status --porcelain
   ```
   If dirty, STOP and report. Exception: changes made by this agent (e.g., CHANGELOG date, ref swap) are expected.

4. **Verify npm auth**:
   ```bash
   npm whoami --registry https://registry.npmjs.org/
   ```
   If this fails, STOP and report. The user needs to run `npm login --registry https://registry.npmjs.org/` first.

5. **Verify dependency versions**: Read `packages/cli/package.json` and confirm:
   - `@directededges/specs-schema` matches `^[schema-version]`
   - `@directededges/specs-from-figma` matches `^[specs-from-figma-version]`
   If either is a `file:` path, update it to the versioned reference. If the version doesn't match, ask whether to update or abort.

6. **Build**:
   ```bash
   cd packages/cli && npm run build
   ```
   If build fails, STOP.

7. **Run tests**:
   ```bash
   cd packages/cli && npm test
   ```
   If tests fail, report the failures and ask the user whether to proceed or abort.

8. **Present setup summary**:
   ```
   @directededges/specs-cli v[version] — Setup Summary
     ✓ Version: [version]
     ✓ CHANGELOG: [version] — [date]
     ✓ Working tree: clean (before ref swap)
     ✓ Auth: [username]
     ✓ Dependencies: specs-schema → ^[schema-version], specs-from-figma → ^[fts-version]
     ✓ Build: passed
     ✓ Tests: passed (or ⚠ with note)
   ```

9. **Ship gate**: Use `AskUserQuestion` with Yes/No options: **"Ready to commit, tag, and publish @directededges/specs-cli v[version]?"**
   On Yes:
   1. Commit (if there are uncommitted changes):
      ```bash
      git add -A && git commit -m "release: @directededges/specs-cli v[version]"
      ```
   2. Tag (scoped for monorepo):
      ```bash
      git tag -a "specs-cli@[version]" -m "release: @directededges/specs-cli v[version]"
      ```
   3. Publish from the package directory (uses workspace `.npmrc.public` token to target npmjs.org):
      ```bash
      cd packages/cli && npm publish --access public --userconfig "$WORKSPACE_ROOT/.npmrc.public"
      ```
      where `$WORKSPACE_ROOT` is the anova-local-workspace directory (typically `../anova-local-workspace` relative to this repo).
      If publish fails with "previously published version", report and ask the user whether to bump the patch version or skip.

10. **Finalize gate**: Use `AskUserQuestion` with Yes/No options: **"Ready to push, create PR, and GitHub Release for @directededges/specs-cli v[version]?"**
    On Yes:
    1. Push to remote (including the tag):
       ```bash
       git push --follow-tags
       ```
    2. Create the PR:
       ```bash
       gh pr create --base main --title "release: @directededges/specs-cli v[version]" --body "$(cat <<'EOF'
       ## Summary
       - Release @directededges/specs-cli v[version]
       - Compatible with @directededges/specs-schema ^[schema-version] and @directededges/specs-from-figma ^[fts-version]
       - See packages/cli/CHANGELOG.md for details
       EOF
       )"
       ```
       If a PR already exists for this branch, report the existing PR URL instead of failing.
    3. Create the GitHub Release (scoped tag):
       - Extract the release notes from `packages/cli/CHANGELOG.md` for this version.
       ```bash
       gh release create "specs-cli@[version]" --title "@directededges/specs-cli v[version]" --notes "$(cat <<'EOF'
       [extracted CHANGELOG content for this version]
       EOF
       )"
       ```
       - Verify the release was created:
       ```bash
       gh release view "specs-cli@[version]" --json url --jq '.url'
       ```
    4. Report the PR URL and release URL.

## Key rules

- Use absolute paths for all file operations.
- All shell commands run from `packages/cli` unless they are git or gh commands (which run from repo root).
- **Tag format**: `specs-cli@[version]` — scoped to distinguish from schema releases in the same repo.
- Two gates only: **ship** (commit + tag + publish) and **finalize** (push + PR + GitHub release).
- If any verification step fails, halt immediately — do not skip to later steps. For test failures, ask the user whether to proceed.
- The committed state has **versioned** dependency references (not `file:` paths). This is intentional — `file:` paths are a local development convenience, not committed to GitHub.
- If any step fails after refs were swapped, run `git restore packages/cli/package.json` before reporting the error.
- Cleanup (branch deletion after PR merge) is handled by the release orchestrator, not this agent.
