# ADR: Lossless key formatting — safe key grammar and Figma name preservation

**Branch**: `066-lossless-key-formatting`
**Created**: 2026-08-10
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none — extends ADR-058)*

---

## Context

`config.format.keys` selects a naming convention (`SAFE`, `CAMEL`, `SNAKE`, `KEBAB`, `PASCAL`, `TRAIN`) that is applied to every authored key in a spec: `anatomy` keys, `props` keys, and every reference to them — `elements`, `propConfigurations`, `children`, `slotContent`, `instanceExamples`, `compositions`.

Every format other than `SAFE` is a lossy projection. The formatted key is derived by splitting the source name into `[A-Za-z0-9]` words and re-joining them, which discards:

- **Separator identity** — `Icon leading`, `Icon-leading`, and `Icon_leading` all become `iconLeading` / `icon-leading` / `icon_leading`. The source separator is unrecoverable.
- **Casing** — `URL field` and `Url field` both become `urlField`; `Icon Leading` and `Icon leading` are indistinguishable after formatting.
- **Non-alphanumeric characters** — `&`, `+`, `/`, `.`, `()`, and every non-ASCII letter are deleted outright, taking their word boundary with them: `Cut & paste` becomes `cutPaste`, and nothing in the spec records that a `&` was ever there.
- **Word boundaries adjacent to digits** — `Icon 2 leading` collapses to `icon2Leading`, and no rule recovers the boundary.

Because the schema has no record of the name a key was derived from, a spec produced with any format other than `SAFE` cannot be rendered back into Figma faithfully. Figma layer names and component property names are the identity used to match existing nodes; a formatted key that no longer reconstructs the Figma name causes the render direction to create duplicates or fail to bind.

Three things are missing from the contract:

1. A stated **source name shape** on the Figma side, so producers and consumers agree on what an unformatted key looks like and what a formatted key reverses to.
2. A stated **safe key grammar** — the set of names that survive every `format.keys` value unchanged in meaning.
3. A place to record the **Figma name** whenever a key falls outside that grammar.

The precedent for the third already exists: `AnatomyElement.$extensions['com.figma'].originalName` records the pre-collapse layer name for wrapper-collapsed elements (ADR-058, shipped in `0.28.0`). This ADR generalizes that field to all lossy key derivations, adds the equivalent to props, and renames it to match its widened meaning.

---

## Decision Drivers

- **Round-trip fidelity**: a spec must carry enough information to reconstruct the Figma name of every anatomy element and prop, under any `format.keys` value.
- **Mechanically verifiable contract** (Constitution IV): "which keys are safe" must be expressible in JSON Schema, not only in prose.
- **Quiet by default**: the preservation field must not appear on well-formed specs. A catalog that follows the safe grammar emits no extensions at all.
- **Formats must stay fit for purpose**: `CAMEL` and `PASCAL` exist to produce code identifiers. No widening of the safe character set may compromise that.
- **No logic in this package** (Constitution II): the schema declares the grammar and the fields; deriving and emitting them is producer behavior.
- **Types and schema symmetry** (Constitution I): every added field lands in both `types/` and `schema/`.
- **Minimal, intentional public API** (Constitution III): prefer one field with one meaning over parallel fields or a deprecated alias carried forward.
- **References must stay resolvable**: `elements`, `propConfigurations`, and other key references continue to point at formatted keys — no reference-site duplication of source names.

---

## Options Considered

### Decision 1 — Where the Figma name is preserved

#### Option A: `$extensions['com.figma']` on the definition *(Selected)*

Record the Figma name once, on the `anatomy` element definition and on the prop definition. Reference sites (`elements`, `propConfigurations`, …) continue to use the formatted key and resolve the Figma name through the definition.

**Pros**:
- Reuses the field ADR-058 already established for exactly this purpose on `AnatomyElement`.
- Single source of truth — no chance of divergent values at reference sites.
- Absent on well-formed specs, satisfying "quiet by default".
- Optional field on both types — no reference-site schema churn.

**Cons / Trade-offs**:
- Consumers must dereference the definition to recover the Figma name for a reference.

---

#### Option B: A parallel key-map block on `Component` *(Rejected)*

A top-level `keyMap: Record<string, string>` mapping formatted key → Figma name.

**Rejected because**: it introduces a second naming surface outside `$extensions`, with no namespace, and its entries are ambiguous across the anatomy and prop key spaces (a component may have an anatomy element and a prop that format to the same key). It also grows a block on every component rather than staying quiet by default.

---

#### Option C: Emit unformatted keys and store the formatted key in extensions *(Rejected)*

Invert the relationship — keys stay as Figma names, and the `format.keys` result is recorded in `$extensions`.

**Rejected because**: `format.keys` exists so consumers can read keys in their own platform's convention directly. Moving the formatted value into extensions defeats the feature and breaks every existing consumer of formatted output.

---

### Decision 2 — What that field is called

#### Option A: Rename `originalName` → `name` *(Selected)*

Within `$extensions['com.figma']`, the field becomes `name`. `AnatomyElement` is renamed; `FigmaPropExtension` gains the field under the new spelling.

```yaml
# Before (ADR-058)
$extensions:
  com.figma:
    originalName: Leading icon

# After
$extensions:
  com.figma:
    name: Leading icon
```

**Pros**:
- The namespace already carries the qualifier — `com.figma.name` reads as "this element's name in Figma", which is precisely the contract.
- `original` becomes inaccurate once the field generalizes. Under ADR-058 it meant *pre-collapse*; here it also means *pre-format*. "Original relative to what?" has two answers, and the shared answer is simply "in Figma".
- One field, one meaning, two reasons it may be present — rather than a qualifier that describes only one of them.
- Satisfies Constitution III: the smallest accurate public name.

**Cons / Trade-offs**:
- Breaking rename of a field shipped in `0.28.0`. See Migration — the real footprint is three call sites in one repo.

---

#### Option B: Add `name`, deprecate `originalName` *(Rejected)*

Ship both spellings, remove `originalName` at the next MAJOR.

**Rejected because**: it buys a compatibility window no consumer needs (see Migration) at the cost of a period where either spelling may appear, forcing every reader to check both and every producer to choose. The ADR would ship ambiguity to avoid four line edits.

---

#### Option C: Keep `originalName` *(Rejected)*

**Rejected because**: the field's meaning is being redefined by this ADR regardless. Retaining a qualifier that is accurate for only one of its two triggers embeds the confusion permanently to avoid a one-time rename.

---

### Decision 3 — How the source-side name shape is declared

Reversal needs a stated target: given `iconLeading`, a renderer can only reconstruct the Figma name if it knows what convention that file's names follow. Three ways to supply it.

#### Option A: New `format.figmaKeys` config field, defaulting to `SENTENCE` *(Selected)*

Add a sibling to `format.keys` declaring the naming convention the Figma file itself uses, so `format.keys` describes the *output* convention and `format.figmaKeys` describes the *source* convention. Reversal is defined as: format the key back into `format.figmaKeys`.

```yaml
format:
  figmaKeys: SENTENCE   # what the Figma file uses    — new, defaults to SENTENCE
  keys: KEBAB           # what the spec emits         — existing
```

The accepted values are `SENTENCE` and `TITLE` only — the two conventions observed in practice for Figma layer and component-property names. This is deliberately narrower than `format.keys`; values are added when a real file requires them, not in anticipation.

**Pros**:
- Reversal becomes a declared, symmetric pair rather than a hardcoded assumption.
- Files authored in `Title Case` become losslessly reversible without emitting `name` on every key.
- Defaulting to `SENTENCE` keeps current behavior for every existing config — the field is optional and additive.
- Both accepted values use single-space separators, so the safe grammar's character rules stay uniform and only its casing clause varies.

**Cons / Trade-offs**:
- A file with mixed conventions still diverges from whatever single value is declared, so `name` remains necessary as the escape hatch.
- A future file using an unlisted convention needs a schema change to declare it, rather than picking an already-present enum value.

---

#### Option B: Hardcode sentence case in the schema documentation *(Rejected)*

Declare in prose that Figma names are always assumed sentence case, with no config surface.

**Rejected because**: it is wrong for real files. A library whose layer names are `Title Case` would emit `name` on every anatomy element and every prop, making the "quiet by default" driver unachievable for that catalog and burying genuine problems in noise.

---

#### Option C: Infer the source convention per component from the observed names *(Rejected)*

**Rejected because**: inference is producer logic with no stable contract — the same catalog could infer differently as components are added, and the schema would have no way to state what a spec's keys reverse to. It also violates Constitution II if expressed here.

---

### Decision 4 — How wide the safe character set is

#### Option A: ASCII letters and digits only *(Selected)*

The safe set is `[A-Za-z0-9]` plus the single-space word separator. Every other character — `&`, `+`, `/`, `.`, `()`, punctuation, non-ASCII letters — is unsafe and routes to `com.figma.name`.

**Pros**:
- Keeps `CAMEL` and `PASCAL` fit for purpose. A preserved `&` would emit `cut&Paste` as an anatomy key — valid JSON, unusable as the code identifier those formats exist to produce.
- Avoids ambiguous reversal. Transliterating `&` → `and` cannot be undone: `cutAndPaste` may have come from `Cut & paste` or from a literal `Cut and paste`.
- One rule covers all six output formats, rather than a per-format safe set consumers must track.

**Cons / Trade-offs**:
- Common authoring characters (`&`, `+`, `/`) always trigger the extension, so catalogs using them are not extension-free.

---

#### Option B: Widen the safe set to retain `&` and `+` *(Rejected)*

Preserve selected symbols through formatting rather than deleting them.

**Rejected because**: it violates the "formats must stay fit for purpose" driver. These characters can only survive `SAFE`; under `CAMEL`, `PASCAL`, `SNAKE`, `KEBAB`, and `TRAIN` they either produce illegal identifiers or must be dropped anyway — meaning the safe set would have to be defined per format, and no single grammar could describe it.

---

#### Option C: Transliterate symbols to words (`&` → `and`, `+` → `plus`) *(Rejected)*

**Rejected because**: it is lossy in the direction this ADR exists to fix. The transliteration is not injective, so the render direction cannot tell a transliterated key from a literal one, and it silently rewrites author intent into English-specific words.

---

## Decision

### The source convention — `format.figmaKeys`

`format.figmaKeys` declares the naming convention the Figma file uses for layer names and component-property names. It is the target of reversal: a renderer reconstructs a Figma name by re-formatting the spec key into `format.figmaKeys`.

| Value | Shape | Example |
|-------|-------|---------|
| `SENTENCE` *(default)* | First word capitalized, rest lowercase, single spaces | `Icon leading` |
| `TITLE` | Every word capitalized, single spaces | `Icon Leading` |

Both are source conventions only; neither is accepted by `format.keys`, which describes what the spec emits.

### The safe key grammar

A name is **round-trip safe** when it satisfies both the character rules and the casing rule for the declared `format.figmaKeys`.

Character and word rules, identical for both `figmaKeys` values:

- ASCII letters and digits only — no `&`, `+`, `/`, `.`, parentheses, punctuation, or non-ASCII letters.
- Exactly one space between words. No leading, trailing, or repeated spaces.
- No word begins with a digit — a digit-leading word loses its boundary under `CAMEL` and `PASCAL`.

Casing rule, per declared convention:

| `figmaKeys` | Pattern |
|-------------|---------|
| `SENTENCE` | `^[A-Z][a-z0-9]*( [a-z][a-z0-9]*)*$` |
| `TITLE` | `^[A-Z][a-z0-9]*( [A-Z][a-z0-9]*)*$` |

Names satisfying the grammar reconstruct identically from the output of any `format.keys` value. Names that do not satisfy it require `com.figma.name` to be recoverable.

```yaml
# figmaKeys: SENTENCE

# Safe — survives every format.keys value
Icon leading        # → iconLeading | icon_leading | icon-leading | IconLeading | Icon-Leading
Label
Badge count 2

# Unsafe — requires $extensions.com.figma.name
Icon-leading        # separator is not a space
Icon Leading        # casing diverges from SENTENCE (safe under figmaKeys: TITLE)
URL field           # inner capitals lost
Icon 2 leading      # digit-leading word — boundary lost under CAMEL/PASCAL
Cut & paste         # symbol deleted, word boundary lost
Size (large)        # parentheses deleted
Étiquette           # non-ASCII letter deleted
```

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Anatomy.ts` | Renamed `FigmaAnatomyElementExtension.originalName` → `name`, widened to record the Figma name whenever the anatomy key diverges from it (format projection or wrapper collapse) | MAJOR |
| `Props.ts` | Added optional field `name` to `FigmaPropExtension` | MINOR |
| `Config.ts` | Added optional field `format.figmaKeys` to `Config`, required field `format.figmaKeys` to `ResolvedConfig`, and `figmaKeys: 'SENTENCE'` to `DEFAULT_CONFIG` | MINOR |
| `Config.ts` | Expanded `format.keys` documentation to reference `format.figmaKeys` and the safe key grammar | PATCH |

**Example — anatomy extension** (`types/Anatomy.ts`):

```yaml
# Before
FigmaAnatomyElementExtension:
  originalName?: string   # pre-collapse layer name only (ADR-058)

# After
FigmaAnatomyElementExtension:
  name?: string           # the element's name in Figma — present when the key diverges from it
```

**Example — prop extension** (`types/Props.ts`):

```yaml
# Before
FigmaPropExtension:
  type?: string
  source?: FigmaCodeOnlySource

# After
FigmaPropExtension:
  type?: string
  source?: FigmaCodeOnlySource
  name?: string   # optional — present only when the prop key diverges from the Figma property name
```

**Example — config** (`types/Config.ts`):

```yaml
# Before
Config.format:
  output?: 'JSON' | 'YAML'
  keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN'

# After
Config.format:
  output?: 'JSON' | 'YAML'
  keys?: 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN'
  figmaKeys?: 'SENTENCE' | 'TITLE'   # optional — defaults to SENTENCE
```

**Example — emitted spec under `format.keys: KEBAB`, `format.figmaKeys: SENTENCE`**:

```yaml
anatomy:
  icon-leading:            # safe — derived from "Icon leading", no extension emitted
    type: glyph
  url-field:
    type: text
    $extensions:
      com.figma:
        name: URL field
props:
  is-disabled:             # safe — derived from "Is disabled"
    type: boolean
    default: false
  cut-paste:
    type: boolean
    default: false
    $extensions:
      com.figma:
        name: Cut & paste
elements:
  url-field:               # references remain in formatted key space
    text: Email address
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Renamed `AnatomyElement.$extensions['com.figma'].originalName` → `name`, with widened description | MAJOR |
| `component.schema.json` | Added property `name` to `FigmaPropExtension` | MINOR |
| `component.schema.json` | Added definitions `SafeKeySentence` and `SafeKeyTitle` with their `pattern`s and descriptions | MINOR |
| `component.schema.json` | Expanded descriptions of `Anatomy` and `Props` to reference the safe key definitions | PATCH |
| `workspace.schema.json` | Added property `figmaKeys` under `format`, enum `[SENTENCE, TITLE]`, default `SENTENCE` | MINOR |

**Example — new definitions** (`schema/component.schema.json`):

```yaml
SafeKeySentence:
  type: string
  pattern: "^[A-Z][a-z0-9]*( [a-z][a-z0-9]*)*$"
  description: >-
    A round-trip-safe Figma name under format.figmaKeys SENTENCE: ASCII letters
    and digits, single-space word separators, sentence case, no digit-leading
    words. Names matching this pattern reconstruct identically from the output
    of any format.keys value; names that do not require
    $extensions.com.figma.name.

SafeKeyTitle:
  type: string
  pattern: "^[A-Z][a-z0-9]*( [A-Z][a-z0-9]*)*$"
  description: >-
    As SafeKeySentence, but for format.figmaKeys TITLE — every word capitalized.
```

```yaml
# New property under #/definitions/FigmaPropExtension/properties
name:
  type: string
  description: >-
    The Figma component-property name, recorded when the prop key diverges from
    it under format.keys. Absent when the name matches the safe key grammar.
```

```yaml
# New property under #/definitions/.../format/properties (workspace.schema.json)
figmaKeys:
  type: string
  enum: [SENTENCE, TITLE]
  default: SENTENCE
  description: >-
    Naming convention the Figma file uses for layer names and component
    property names. Reversal target for format.keys.
```

### Notes

- `format.figmaKeys` describes the source, `format.keys` describes the output. They are independent; `figmaKeys: SENTENCE` with `keys: SAFE` is the identity case where keys are emitted as authored.
- `SafeKeySentence` and `SafeKeyTitle` are definitions, not applied constraints on `Anatomy`/`Props` property names. They describe the *Figma-side* name shape, while the keys in a document are in `format.keys` space.
- `name` remains optional on both surfaces so that conforming catalogs emit no extensions at all.
- Reference sites are deliberately unchanged. A consumer resolving `elements.url-field` looks up `anatomy['url-field']` and reads `name` there.
- On `AnatomyElement`, `name` has two triggers — wrapper-collapse promotion and format divergence — that are not distinguished. When both apply, the pre-collapse Figma name is the correct value for both purposes.

### Migration

`originalName` shipped in `0.28.0`. Its consumers are:

| Location | Role | Risk |
|----------|------|------|
| `specs-from-figma` — anatomy element construction | Writes the field | Compile error on rename — caught |
| `figma-from-specs` — collapsed-root name recovery | Reads the field | **Reads via an inline structural type, not the published type — will not fail compilation. Silently yields `undefined` if missed.** |
| `specs-plugin-2` | — | No references |
| `specs-testing` workspace specs | Generated `api.yaml` output | Regenerated, not authored |

The read site in `figma-from-specs` is the one hazard: because it declares the extension shape inline rather than importing `FigmaAnatomyElementExtension`, the rename is invisible to `tsc` there. Implementation MUST update it explicitly rather than relying on the compiler.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `FigmaAnatomyElementExtension.name` (`types/Anatomy.ts`) ↔ `#/definitions/AnatomyElement/properties/$extensions/properties/com.figma/properties/name`
  - `FigmaPropExtension.name` (`types/Props.ts`) ↔ `#/definitions/FigmaPropExtension/properties/name`
  - `Config['format']['figmaKeys']` and `ResolvedConfig['format']['figmaKeys']` (`types/Config.ts`) ↔ `format.figmaKeys` in `schema/workspace.schema.json`
  - `SafeKeySentence` and `SafeKeyTitle` (`#/definitions`) have no TypeScript counterpart — a `pattern` constraint on a string is not expressible as a distinct TypeScript type, and introducing a branded type would be logic, not a declaration (Constitution II). This asymmetry is justified and intentional; the type-side contract remains `string`.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must evaluate each anatomy element name and prop name against the safe key grammar for the declared `format.figmaKeys` and emit `name` when it diverges; existing `originalName` write site breaks | Update key formatting to read `format.figmaKeys` and record divergence; rename the emitted extension key; recompile |
| `specs-cli` | Emits and validates specs carrying the new optional field; the new config key is accepted in workspace config | Recompile against the new schema version; surface `format.figmaKeys` in config resolution and documentation |
| `specs-plugin-2` | Same emission path as the CLI in the plugin runtime; the render direction reconstructs Figma names by formatting into `format.figmaKeys`, preferring `name` where present | Recompile; use `name` in preference to the formatted key when matching Figma nodes |

---

## Semver Decision

**Version bump**: `0.30.0 → 0.31.0` (`MAJOR`-class, released as a pre-1.0 minor)

**Justification**: Renaming `originalName` → `name` removes a published field name, which the constitution classes as `MAJOR`. The package is pre-1.0 and already releases breaking narrowing changes as minors — `0.29.0` narrowed `Styles.textAlignHorizontal` from `Style` to a string enum — so this ships as `0.31.0` under that established convention. All other changes are additive: `FigmaPropExtension.name` and `Config.format.figmaKeys` are optional, and the safe-key definitions are referenced only from descriptions. `ResolvedConfig.format.figmaKeys` is required, but `ResolvedConfig` is the post-defaulting shape and `DEFAULT_CONFIG` supplies `SENTENCE`, so no caller loses a valid construction.

---

## Consequences

- The schema states, for the first time, what an unformatted Figma-side name looks like — declared per workspace via `format.figmaKeys`, defaulting to sentence case.
- Key formatting becomes a declared pair — `figmaKeys` in, `keys` out — so reversal is defined by config rather than inferred.
- The set of names that survive every `format.keys` value is defined by two mechanically checkable patterns rather than by the behavior of one producer.
- Specs produced with a lossy `format.keys` value carry enough information to reconstruct Figma names, making the spec → Figma direction lossless for anatomy and prop identity.
- Well-formed catalogs are unchanged — no `$extensions` appear unless a name falls outside the safe grammar, so the field doubles as a signal that a Figma name needs attention.
- Consumers that match Figma nodes by name MUST prefer `com.figma.name` over the formatted key when it is present; ignoring it reintroduces the divergence this ADR removes.
- Names outside the safe grammar remain fully supported — they are recorded, not rejected. Narrowing them is an authoring recommendation, not a validation gate.
- `&`, `+`, and `/` will always trigger the extension. Catalogs wanting extension-free output must avoid them in layer and property names.
- `format.figmaKeys` starts deliberately narrow at `SENTENCE | TITLE`; encountering a file with another convention is a schema change, not a config choice.
