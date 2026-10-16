---
name: specs-cli.author.primer
description: The structural contract for authoring specs by hand — the two kinds, the three files, the five references, the authoring order, and the validate loop. Prerequisite for every specs-cli.author.* skill.
---
<!--
  Canonical skill emitted by `specs skills install` — overwritten on every
  refresh; do not edit in place. Local customizations belong in your own
  separate skill.
-->

# Authoring specs: the primer

**Prerequisite:** read `specs-cli.primer` first — what Specs is and the rules for reading its data. This primer adds what *writing* a spec requires. Read both once per session.

An authored spec is identical in shape to a generated one: the schema is the single source of structural truth, and `specs validate` is the referee. You never infer a shape from an existing spec file — existing specs are exemplars of idiom (naming, token choices, prop vocabulary), never of structure. When you need a structure fact, it comes from the schema; when you need a consistency fact, it comes from `analysis/` reports.

## The two kinds

| Kind | Folder | Is |
|---|---|---|
| component | `specs/components/<key>/` | A reusable contract: anatomy, props, variants, examples |
| composition | `specs/compositions/<key>/` | An arrangement of components: page type, template, pattern |

`<key>` is the camelCase folder key (`tooltip`, `pageHeader`). Keys *inside* a spec follow the workspace's `spec.keys` setting.

## The three files

| File | Holds | Required top-level |
|---|---|---|
| `api.yaml` | The contract: `title`, `anatomy`, `props`, optional `invalidPropCombinations`, optional `subcomponents` | `metadata`, `title`, `anatomy`, `props` |
| `variants.yaml` | The appearance: complete `default` (layout + every element's styles/content), then `variants` — each a delta activated by a `configuration` | `metadata`, `default`, `variants` |
| `examples.yaml` | Ready-made usages: `instanceExamples` (whole-component configurations) and `slotContentExamples` (named slot fills) | `metadata` |

Every file's `metadata` states its `concern` (`api`, `variants`, or `examples`). An authored spec omits `metadata.source` — those are Figma capture facts you do not have — and validates with `--authored`, which downgrades exactly that omission to a warning. Never fabricate a `pageId`/`nodeId`.

## Anatomy and elements

`anatomy` declares every element: a key plus `type` — one of `container`, `text`, `glyph`, `slot`, `instance`, `vector`, `line`, `ellipse`, `rectangle`, `polygon`, `star`. An `instance` element carries `instanceOf`. There is always a `root`.

In `variants.yaml`, `default.elements` describes **every** anatomy element: `styles`, `content` (text string, glyph name, or a `$binding`), `children`, `propConfigurations` (nested instances only). Entries under `variants` describe only what that configuration changes.

## The five references

| Reference | Written where | Value | Resolves to |
|---|---|---|---|
| `instanceOf` | `anatomy.<el>` and `elements.<el>` | component name, plain string | that component's spec folder |
| `instanceOf: {$ref}` | same | `"#/subcomponents/<name>"` | `subcomponents.<name>` in this spec |
| `$binding` | element `content`, `children`, `styles.visible`, configuration values | `"#/props/<prop>"` | the owning scope's `props` — a subcomponent's binding resolves against the subcomponent's own props |
| `$slotContent` | slot-prop configuration values, `children.examples` | `"#/components/<key>/slotContentExamples/<name>"` (optionally `/subcomponents/<sub>/` in the middle) | that spec's examples file |
| `$token` | style values | `{$token: "<dtcg.path>", $type: "<type>"}` | a token in the source library |

## The authoring order

1. **Requirements split first.** Before writing anything, list every requirement in a table with its intended home: spec (name the schema path that carries it) or supplemental (name the schema path that cannot). This table is graded later; write it honestly now.
2. **Correlate.** Read `analysis/props.yaml` (the system's prop vocabulary), `analysis/styling.byToken.yaml` (which tokens are used where), `analysis/dependencies.*` (what nests what), and the component folder list. Decide what to nest, what to emulate, and which tokens to use. An authored spec must look native to its catalogue.
3. **api → validate → variants → validate → examples → validate.** One file at a time, `specs validate <key> --authored` after each, zero errors before the next file. A validation error is fixed before anything else happens.
4. **Compile and observe.** The dev posture is live: `specs run` re-emits on save, `specs render --watch` re-renders on save. Save, then check Storybook and the canvas.
5. **Supplemental last.** What the schema cannot carry goes in hand-authored platform files plus `supplementalRequirements.md` — see the triage rule below.

## Rules

- **Cite the schema path for every shape you write.** If you cannot name the type or definition a node instantiates, you are inferring — go read the schema.
- **Deterministic and complete.** The `default` variant fully describes every element. Variants are deltas layered onto it in order.
- **A requirement goes supplemental only after naming the schema path that cannot carry it.** "The schema can't do X" requires showing where X would live and why it does not fit. The reverse failure is worse: forcing into the spec what the schema cannot express.
- **Consistency is graded.** Prop names, enum values, token choices, and element naming follow what `analysis/` shows the system already does.

## Where to go deeper

| Topic | Skill |
|---|---|
| Style properties, token placement, Figma style relationships | `specs-cli.author.styles` |
| Layout trees, auto vs absolute positioning, slots across the three files | `specs-cli.author.slots-layout` |
| The new-component procedure and templates | `specs-cli.author.component` |

**Modeling rules live on the docs site, not in skills.** The guides at [specsplugin.com/guides](https://specsplugin.com/guides/element-types/) are the durable home for rules about expressing things correctly in data — element-type selection, positioning, slot constraints, key formatting. Skills carry procedure and link to guides; when you learn a new modeling rule, it belongs in a guide page, never appended to a skill file (refresh overwrites them).
