---
title: "icons.setup"
description: "Work out how your library marks a component as an icon glyph, then prove the glyph names resolve"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

A skill that establishes the [`glyphs`](/settings/glyphs/) convention for your library: how a component is recognised as an icon glyph, so a placed icon resolves to a **name** rather than an anonymous vector.

Installed by [`specs skills install`](/cli/commands/skills/) as `.claude/skills/specs-cli.icons.setup/`, then invoked in Claude Code.

## When you need it

Only when the name form is not obvious. Many libraries name their glyph components by a pattern — `DS Icon Glyph / search` — and a single line of config covers them:

```yaml
glyphs:
  match: 'DS Icon Glyph / {i}'
```

If reading your icons manifest shows a pattern like that, write it and move on. This skill is for the case where it does not: glyphs named plainly as the icon itself (`Cross`, `Chevron down`), or several generations of naming that no single pattern spans. There, membership has to come from what each component *contains*, and that is the [structural form](/settings/glyphs/#structure).

## Why this is a skill and not a command

The shape of the evidence is mechanical — a name pattern or a child structure can be read off the file. What cannot be derived is **which components in the file are icons at all.**

An icon file usually holds more than icons: illustrations, logos, device frames, UI chrome, and parts that other components instance. Nothing in the data labels those populations. Pick the boundary wrongly and a convention claims hundreds of components that are not icons, each one acquiring a glyph name that is not an icon name.

## It costs a refetch, and the order is fixed

The `icons` fetch kind cannot run before the convention exists — [`specs fetch`](/cli/commands/fetch/) refuses to start without it. So:

1. The icons file is fetched with `fetch: [file]` and [scanned](/cli/commands/scan/).
2. The skill establishes the convention from that payload.
3. `icons` is added to the source's fetch list.
4. That source is refetched — which is when icons are actually pulled.

On a large icon file step 4 is the slowest single step in a setup. The skill says so before starting rather than after.

## What it does

1. Reads `data/<alias>.manifest.md` — every component in the file by name.
2. **Groups the names and says which population is the icon set**, with counts. This is the judgment everything else inherits.
3. Tries the name form first, because it is one line and self-documenting.
4. **Measures the candidate pattern for both recall and precision** — how many of the components it called icons the pattern matches, and whether it matches anything it did not. Both as counts, with every miss named.
5. Falls back to the structural form, deriving a child matcher from several sampled components rather than one.
6. Checks the disqualifiers: a component set, a variant, or any component declaring component properties can never be a structural glyph.
7. Writes the block, adds `icons` to the fetch list, refetches, and runs [`specs generate`](/cli/commands/generate/) to confirm the names resolved.

## Four semantics it gets right

The structural form reads more simply than it behaves, and each of these is a way to be confidently wrong.

**`children` is a set of alternatives, not a positional list.** `children: [{type: VECTOR}]` means every child is a `VECTOR`, any number of them — not "exactly one child".

**Coverage is exhaustive.** A component holding anything the matchers do not cover is not a glyph. That is the protection against over-claiming, and it is why listing every node type you happened to see is worse than listing the types a glyph actually has.

**A matcher's `name` is literal, with `*` as the only wildcard**, matched whole against the whitespace-normalised node name. A matcher that is right about type and wrong about name matches nothing at all.

**`fill` tests leaves only** — the childless nodes that matched — and is skipped on placed instances, which context recolours. It constrains the stored component alone, and it is the member most likely to narrow a match to zero.

## Verifying it landed

A convention that matches nothing fails exactly like one that was never written: no error, no warning, and specs that look complete.

In a spec that places an icon, the element must be `type: glyph` **and** carry a `content` naming the icon. Both halves matter — `type: glyph` with no `content` means the component matched but the name capture produced nothing, which is a `{i}` in the wrong place or a `structure.name` that does not fit.

When nothing matches, the skill does not widen the convention blindly. It takes one component that is certainly an icon, compares it against the convention member by member, and reports which member excluded it.

---

**See Also:**

- [`glyphs` convention](/settings/glyphs/) — the two forms and their full semantics
- [Icon Glyphs](/guides/glyph-name-pattern/) — naming strategies and worked examples
- [`specs skills install`](/cli/commands/skills/) — how the skill reaches your project
- [`scan`](/cli/commands/scan/) and [`fetch`](/cli/commands/fetch/) — the manifest it reads, and the refetch it ends with
