# ADR: Lossless key formatting — safe key grammar and original-name preservation

**Branch**: `066-lossless-key-formatting`
**Created**: 2026-08-10
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`config.format.keys` selects a naming convention (`SAFE`, `CAMEL`, `SNAKE`, `KEBAB`, `PASCAL`, `TRAIN`) that is applied to every authored key in a spec: `anatomy` keys, `props` keys, and every reference to them — `elements`, `propConfigurations`, `children`, `slotContent`, `instanceExamples`, `compositions`.

Every format other than `SAFE` is a lossy projection. The formatted key is derived by splitting the original name into `[A-Za-z0-9]` words and re-joining them, which discards:

- **Separator identity** — `Icon leading`, `Icon-leading`, and `Icon_leading` all become `iconLeading` / `icon-leading` / `icon_leading`. The original separator is unrecoverable.
- **Casing** — `URL field` and `Url field` both become `urlField`; `Icon Leading` and `Icon leading` are indistinguishable after formatting.
- **Non-alphanumeric characters** — `+`, `/`, `.`, `()`, `&`, and every non-ASCII letter are deleted outright.
- **Word boundaries adjacent to digits** — `Icon 2 leading` collapses to `icon2Leading`, and no rule recovers the boundary.

Because the schema has no record of the name a key was derived from, a spec produced with any format other than `SAFE` cannot be rendered back into Figma faithfully. Figma layer names and component property names are the identity used to match existing nodes; a formatted key that no longer reconstructs the Figma name causes the render direction to create duplicates or fail to bind.

Two things are missing from the contract:

1. A stated **source name shape** on the Figma side, so producers and consumers agree on what an unformatted key looks like and what a formatted key reverses to.
2. A stated **safe key grammar** — the set of names that survive every `format.keys` value unchanged in meaning — plus a place to record the original name whenever a key falls outside it.

The precedent for the second already exists: `AnatomyElement.$extensions['com.figma'].originalName` records the pre-collapse layer name for wrapper-collapsed elements (ADR-058). This ADR generalizes that field to all lossy key derivations and adds the equivalent to props.

---

## Decision Drivers

- **Round-trip fidelity**: a spec must carry enough information to reconstruct the Figma name of every anatomy element and prop, under any `format.keys` value.
- **Mechanically verifiable contract** (Constitution IV): "which keys are safe" must be expressible in JSON Schema, not only in prose.
- **Quiet by default**: the preservation field must not appear on well-formed specs. A catalog that follows the safe grammar emits no extensions at all.
- **No logic in this package** (Constitution II): the schema declares the grammar and the field; deriving and emitting them is producer behavior.
- **Types and schema symmetry** (Constitution I): every added field lands in both `types/` and `schema/`.
- **Naming without abbreviation** and reverse-domain extension keys, consistent with the existing `$extensions` surface.
- **References must stay resolvable**: `elements`, `propConfigurations`, and other key references continue to point at formatted keys — no reference-site duplication of original names.

---

## Options Considered

### Decision 1 — Where the original Figma name is preserved

#### Option A: `$extensions['com.figma'].originalName` on the definition *(Selected)*

Record the original name once, on the `anatomy` element definition and on the prop definition. Reference sites (`elements`, `propConfigurations`, …) continue to use the formatted key and resolve the original through the definition.

**Pros**:
- Reuses the field ADR-058 already established for exactly this purpose on `AnatomyElement`.
- Single source of truth — no chance of divergent originals at reference sites.
- Absent on well-formed specs, satisfying "quiet by default".
- Additive optional field on both types — no reference-site schema churn.

**Cons / Trade-offs**:
- Consumers must dereference the definition to recover the original name for a reference.
- One field now carries two provenance meanings on `AnatomyElement` (wrapper-collapse origin and format-divergence origin). Both are "the Figma name this key came from", so the meaning stays coherent.

---

#### Option B: A parallel key-map block on `Component` *(Rejected)*

A top-level `keyMap: Record<string, string>` mapping formatted key → original Figma name.

**Rejected because**: it introduces a second naming surface outside `$extensions`, with no namespace, and its entries are ambiguous across the anatomy and prop key spaces (a component may have an anatomy element and a prop that format to the same key). It also grows a block on every component rather than staying quiet by default.

---

#### Option C: Emit unformatted keys and store the formatted key in extensions *(Rejected)*

Invert the relationship — keys stay as Figma names, and the `format.keys` result is recorded in `$extensions`.

**Rejected because**: `format.keys` exists so consumers can read keys in their own platform's convention directly. Moving the formatted value into extensions defeats the feature and breaks every existing consumer of formatted output.

---

### Decision 2 — How the safe key grammar is expressed

#### Option A: `propertyNames` pattern on `Anatomy` and `Props`, applied only under `format.keys: SAFE` semantics *(Rejected)*

**Rejected because**: JSON Schema has no access to the config that produced the document, so a conditional constraint cannot be expressed. A single pattern would have to accept the union of all six formats, which admits nothing and rejects nothing useful.

---

#### Option B: A named, documented grammar plus a reusable `SafeKey` definition *(Selected)*

Define the safe grammar once as a schema definition (`#/definitions/SafeKey`) with its `pattern`, and reference it from the description of `Anatomy` and `Props` rather than as a hard constraint on their property names. Producers validate against it to decide whether `originalName` must be emitted; consumers can validate a spec's keys against it deliberately.

**Pros**:
- The grammar becomes mechanically checkable (Constitution IV) without rejecting legitimate formatted output.
- One definition governs both anatomy and prop keys — no duplicated regex.
- Non-breaking: no existing document becomes invalid.

**Cons / Trade-offs**:
- Conformance is opt-in rather than enforced by ordinary validation.

---

#### Option C: Prose-only definition in the `format.keys` documentation *(Rejected)*

**Rejected because**: the grammar is the thing producers must agree on exactly. Prose leaves the boundary cases (digit-leading words, casing of the second word, non-ASCII letters) unresolved, which is how the current divergence arose.

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

**Pros**:
- Reversal becomes a declared, symmetric pair rather than a hardcoded assumption.
- Files that follow a non-sentence convention (`Title Case` layer names, `camelCase` property names) become losslessly reversible without emitting `originalName` on every key.
- Defaulting to `SENTENCE` keeps current behavior for every existing config — the field is optional and additive.
- Reuses the existing `format.keys` vocabulary, extended with the two casings that occur in Figma but not in code output.

**Cons / Trade-offs**:
- A file with mixed conventions still diverges from whatever single value is declared, so `originalName` remains necessary as the escape hatch.
- `format.figmaKeys` accepts two values `format.keys` does not (`SENTENCE`, `TITLE`), so the two unions are near-siblings rather than identical.

---

#### Option B: Hardcode sentence case in the schema documentation *(Rejected)*

Declare in prose that Figma names are always assumed sentence case, with no config surface.

**Rejected because**: it is wrong for real files. A library whose layer names are `Title Case` or whose component properties are `camelCase` would emit `originalName` on every anatomy element and every prop, making the "quiet by default" driver unachievable for that catalog and burying genuine problems in noise.

---

#### Option C: Infer the source convention per component from the observed names *(Rejected)*

**Rejected because**: inference is producer logic with no stable contract — the same catalog could infer differently as components are added, and the schema would have no way to state what a spec's keys reverse to. It also violates Constitution II if expressed here.

---

## Decision

### The source convention — `format.figmaKeys`

`format.figmaKeys` declares the naming convention the Figma file uses for layer names and component-property names. It is the target of reversal: a renderer reconstructs a Figma name by re-formatting the spec key into `format.figmaKeys`.

| Value | Shape | Example |
|-------|-------|---------|
| `SENTENCE` *(default)* | First word capitalized, rest lowercase, single spaces | `Icon leading` |
| `TITLE` | Every word capitalized, single spaces | `Icon Leading` |
| `CAMEL` | First word lowercase, rest capitalized, no separators | `iconLeading` |
| `PASCAL` | Every word capitalized, no separators | `IconLeading` |
| `KEBAB` | All lowercase, hyphen-separated | `icon-leading` |
| `SNAKE` | All lowercase, underscore-separated | `icon_leading` |
| `TRAIN` | Every word capitalized, hyphen-separated | `Icon-Leading` |

`SENTENCE` and `TITLE` are accepted here but not by `format.keys` — they describe how names are authored in Figma, not an output convention the spec emits.

### The safe key grammar

A name is **round-trip safe** when it is composed only of safe characters *and* its casing and separators match the declared `format.figmaKeys`.

Character and word rules, common to every `format.figmaKeys` value:

- ASCII letters and digits only — no `.`, `/`, `+`, `&`, parentheses, punctuation, or non-ASCII letters.
- Exactly one separator between words, and it is the separator the declared convention uses. No leading, trailing, or repeated separators.
- No word begins with a digit — a digit-leading word loses its boundary under `CAMEL` and `PASCAL`.

Casing rule, per declared convention: the name's word casing matches the convention's shape in the table above.

Under the default `figmaKeys: SENTENCE`, the grammar is:

```
^[A-Z][a-z0-9]*( [a-z][a-z0-9]*)*$
```

Names satisfying the grammar reconstruct identically from the output of any `format.keys` value. Names that do not satisfy it require `originalName` to be recoverable.

```yaml
# figmaKeys: SENTENCE

# Safe — survives every format.keys value
Icon leading        # → iconLeading | icon_leading | icon-leading | IconLeading | Icon-Leading
Label
Badge count 2

# Unsafe — requires $extensions.com.figma.originalName
Icon-leading        # separator is not the declared convention's
Icon Leading        # casing diverges from SENTENCE (safe under figmaKeys: TITLE)
URL field           # inner capitals lost
Icon 2 leading      # digit-leading word — boundary lost under CAMEL/PASCAL
Size (large)        # parentheses deleted
Étiquette           # non-ASCII letter deleted
```

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Anatomy.ts` | Widened documented meaning of `FigmaAnatomyElementExtension.originalName` — now also records the original Figma layer name when the anatomy key diverges from it under `format.keys` | PATCH |
| `Props.ts` | Added optional field `originalName` to `FigmaPropExtension` | MINOR |
| `Config.ts` | Added optional field `format.figmaKeys` to `Config`, required field `format.figmaKeys` to `ResolvedConfig`, and `figmaKeys: 'SENTENCE'` to `DEFAULT_CONFIG` | MINOR |
| `Config.ts` | Expanded `format.keys` documentation to reference `format.figmaKeys` and the safe key grammar | PATCH |

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
  figmaKeys?: 'SENTENCE' | 'TITLE' | 'CAMEL' | 'PASCAL' | 'KEBAB' | 'SNAKE' | 'TRAIN'   # optional — defaults to SENTENCE
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
  originalName?: string   # optional — present only when the prop key diverges from the Figma property name
```

**Example — emitted spec under `format.keys: KEBAB`**:

```yaml
anatomy:
  icon-leading:            # safe — derived from "Icon leading", no extension emitted
    type: glyph
  url-field:
    type: text
    $extensions:
      com.figma:
        originalName: URL field
props:
  is-disabled:             # safe — derived from "Is disabled"
    type: boolean
    default: false
  size-large:
    type: string
    enum: [small, large]
    default: small
    $extensions:
      com.figma:
        originalName: Size (large)
elements:
  url-field:               # references remain in formatted key space
    text: Email address
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Added definition `SafeKey` with the round-trip-safe `pattern` and description | MINOR |
| `workspace.schema.json` | Added property `figmaKeys` under `format`, enum of the seven source conventions, default `SENTENCE` | MINOR |
| `component.schema.json` | Added property `originalName` to `FigmaPropExtension` | MINOR |
| `component.schema.json` | Expanded descriptions of `AnatomyElement.$extensions['com.figma'].originalName`, `Anatomy`, and `Props` to reference `SafeKey` | PATCH |

**Example — new definition** (`schema/component.schema.json`):

```yaml
SafeKey:
  type: string
  pattern: "^[A-Z][a-z0-9]*( [a-z][a-z0-9]*)*$"
  description: >-
    A round-trip-safe Figma name under the default format.figmaKeys of
    SENTENCE: ASCII letters and digits, single-space word separators, sentence
    case, no digit-leading words. Names matching this pattern reconstruct
    identically from the output of any format.keys value; names that do not
    require $extensions.com.figma.originalName. Other format.figmaKeys values
    substitute that convention's separator and casing.
```

```yaml
# New property under #/definitions/.../format/properties (workspace.schema.json)
figmaKeys:
  type: string
  enum: [SENTENCE, TITLE, CAMEL, PASCAL, KEBAB, SNAKE, TRAIN]
  default: SENTENCE
  description: >-
    Naming convention the Figma file uses for layer names and component
    property names. Reversal target for format.keys.
```

```yaml
# New property under #/definitions/FigmaPropExtension/properties
originalName:
  type: string
  description: >-
    Original Figma component-property name, recorded when the prop key
    diverges from it under format.keys. Absent when the name matches
    #/definitions/SafeKey.
```

### Notes

- `format.figmaKeys` describes the source, `format.keys` describes the output. They are independent; `figmaKeys: SENTENCE` with `keys: SAFE` is the identity case where keys are emitted as authored.
- `SafeKey` is a definition, not an applied constraint on `Anatomy`/`Props` property names. It describes the *Figma-side* name shape, while the keys in a document are in `format.keys` space.
- `originalName` remains optional on both surfaces so that conforming catalogs emit no extensions at all.
- Reference sites are deliberately unchanged. A consumer resolving `elements.url-field` looks up `anatomy['url-field']` and reads `originalName` there.
- On `AnatomyElement`, `originalName` already exists (ADR-058) and its two triggers — wrapper-collapse promotion and format divergence — are not distinguished. When both apply, the pre-collapse Figma name is the correct value for both purposes.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `FigmaPropExtension.originalName` (`types/Props.ts`) ↔ `#/definitions/FigmaPropExtension/properties/originalName`
  - `Config['format']['figmaKeys']` and `ResolvedConfig['format']['figmaKeys']` (`types/Config.ts`) ↔ `format.figmaKeys` in `schema/workspace.schema.json`
  - `SafeKey` (`schema/component.schema.json` `#/definitions/SafeKey`) has no TypeScript counterpart — a `pattern` constraint on a string is not expressible as a distinct TypeScript type, and introducing a branded type would be logic, not a declaration (Constitution II). This asymmetry is justified and intentional; the type-side contract remains `string`.
  - `FigmaAnatomyElementExtension.originalName` (`types/Anatomy.ts`) ↔ existing `#/definitions/AnatomyElement/.../originalName` — description-only change on both sides.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must evaluate each anatomy element name and prop name against the safe key grammar for the declared `format.figmaKeys` and emit `originalName` when it diverges | Update key formatting to read `format.figmaKeys` and record divergence; recompile |
| `specs-cli` | Emits and validates specs carrying the new optional field; the new config key is accepted in workspace config | Recompile against the new schema version; surface `format.figmaKeys` in config resolution and documentation |
| `specs-plugin-2` | Same emission path as the CLI in the plugin runtime; the render direction reconstructs Figma names by formatting into `format.figmaKeys`, preferring `originalName` where present | Recompile; use `originalName` in preference to the formatted key when matching Figma nodes |

---

## Semver Decision

**Version bump**: `0.30.0 → 0.31.0` (`MINOR`)

**Justification**: All schema and type changes are additive optional fields plus documentation — `FigmaPropExtension.originalName` and `Config.format.figmaKeys` are optional, `SafeKey` is a new definition referenced only from descriptions, and no existing document becomes invalid. `ResolvedConfig.format.figmaKeys` is required, but `ResolvedConfig` is the post-defaulting shape and `DEFAULT_CONFIG` supplies `SENTENCE`, so no caller loses a valid construction. Per the constitution's versioning rule, additive types and new optional fields are `MINOR`.

---

## Consequences

- The schema states, for the first time, what an unformatted Figma-side name looks like — declared per workspace via `format.figmaKeys`, defaulting to sentence case.
- Key formatting becomes a declared pair — `figmaKeys` in, `keys` out — so reversal is defined by config rather than inferred.
- Libraries that author layer or property names in `Title Case`, `camelCase`, or another convention can declare it and stay extension-free.
- The set of names that survive every `format.keys` value is defined by a single mechanically checkable pattern rather than by the behavior of one producer.
- Specs produced with a lossy `format.keys` value carry enough information to reconstruct Figma names, making the spec → Figma direction lossless for anatomy and prop identity.
- Well-formed catalogs are unchanged — no `$extensions` appear unless a name falls outside the safe grammar, so the field doubles as a signal that a Figma name needs attention.
- Consumers that match Figma nodes by name MUST prefer `originalName` over the formatted key when it is present; ignoring it reintroduces the divergence this ADR removes.
- Names outside the safe grammar remain fully supported — they are recorded, not rejected. Narrowing them is an authoring recommendation, not a validation gate.
