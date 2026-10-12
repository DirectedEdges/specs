# Skills

Procedures a customer's agent runs, as against the reference pages that document
what each setting accepts. A page says what a knob takes; a skill says how to
read the library's evidence and decide what to put in it.

## Contents

| Skill | Status |
|---|---|
| `css-states-setup.md` | Linked from the [states settings page](https://www.specsplugin.com/settings/states/) as a GitHub blob. Not yet installed by `specs skills install`, which ships only `specs-cli.premerge` and `specs-cli.release` (string constants in `src/version/skills.ts`). |

It sat in `src/transforms/css/` until 2026-10-07, under the CSS transformer it
has nothing to do with. Moved here rather than deleted because
[#592](https://github.com/DirectedEdges/specs/issues/592) names it as the
precedent for the shipped skill collection — "the right instinct", per the sealed
first-customer run.

## Pending #592

That issue makes skills canonical and ships them with the CLI package, under a
shared template with its own naming and reporting rules. This directory is a
holding place until then: expect the file to be renamed, reshaped to the
template, and emitted by `specs skills install` rather than linked as a blob URL.
Nothing here is a settled convention yet.
