---
title: "Curation"
description: "Which components of your library get a spec at all"
---

Your library has more components in it than your team actually consumes. Curation is the step that decides which ones are worth a spec.

`specs scan` makes a first guess, writes it to a manifest as a checklist, and you correct it by hand. These three settings control how that guess is made, whether your corrections survive the next scan, and how far the selection reaches.

```yaml
curation:
  defaultSelection: READY_FOR_DEV
  preserveManualSelections: false
  includeDependencies: true
```

Every default matches what Specs does today, so you can ignore this whole page until one of these is a problem.

## `defaultSelection` — what gets picked to begin with

| Value | What it selects |
|---|---|
| `READY_FOR_DEV` (default) | Components you marked **Ready for dev** in Figma. If you marked none, every component set and standalone component instead. |
| `ALL` | Every component, marked or not. |

Most teams leave this alone. Set it to `ALL` if you don't use Figma's dev status and want everything, rather than relying on the fallback to notice for you.

The per-run flag `--include-all` does the same as `ALL` for a single scan.

## `preserveManualSelections` — who wins when you disagree with Figma

You uncheck a component in the manifest. Later, someone marks that component Ready for dev and you scan again. Who wins?

| Value | Result |
|---|---|
| `false` (default) | Figma wins. The new status overrides your edit. |
| `true` | You win. Your edit stands. |

This only comes up when the Figma status actually changed. A component nobody touched keeps whatever you set, either way.

The per-run flag `--keep-checks` does the same as `true` for a single scan.

## `includeDependencies` — whether the pieces come along

Components are built from other components. A web header places a brand logo. A payment form places the card-network marks.

You marked the header Ready for dev. Nobody marked the brand logo — it's an asset the design team maintains, not something an engineer picks up on its own. So if Specs generated only what you marked, you'd get a header spec that refers to a logo with no spec of its own.

| Value | Result |
|---|---|
| `true` (default) | The logo is generated too, along with anything it uses. |
| `false` | Only what you marked. |

**On:**

```
specs/
  dsWebHeader/
  dsBrandLogo/
```

**Off:**

```
specs/
  dsWebHeader/     # still says it uses dsBrandLogo, but no spec was written for it
```

### Parts are different

This doesn't apply to pieces you've already told Specs are pieces. If your naming says `Card / _ / Header` belongs to Card — see [subcomponents](/settings/subcomponents/) — that header is written *inside* Card's spec rather than beside it. It was never going to get its own folder.

This setting is about one component reaching for a *separate* component that lives on its own.

## If you narrow the selection

Either turning `includeDependencies` off, or unchecking components by hand with `preserveManualSelections: true`, can leave a spec referring to a component you didn't generate.

Nothing breaks loudly. No error, no failed build, no red Storybook. The generated React and Web Components code just leaves those pieces out — where the brand logo should appear, you get an empty box.

That's the thing to watch for. Narrow the selection deliberately, and expect to find the empty boxes yourself.
