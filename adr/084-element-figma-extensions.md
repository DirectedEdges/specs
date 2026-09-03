# ADR: `Element.$extensions` — Figma Provenance for a Promoted Element

**Branch**: `adr/spec-time-promotion`
**Created**: 2026-09-02
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`AnatomyElement` carries platform extensions today; `Element` does not.

```yaml
AnatomyElement:
  type: ElementType | ElementTypeRef
  detectedIn?: string
  instanceOf?: string | SubcomponentRef
  $extensions?:
    com.figma?:
      name?: string        # the element's name in Figma

Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding
```

The asymmetry has not mattered, because the only provenance recorded so far is a name, and a
name belongs to the anatomy entry. That changes when an element's `styles` are *interpreted*
rather than merely recorded.

ADR-074 introduces promotion: in composed example content, a primitive layer becomes an
instance of the design system's own component, and the styles that promotion consumed are
replaced by `propConfigurations`. A text layer carrying a typography token and a text colour
becomes an instance carrying `size`, `weight` and `color`.

Two facts about that transformation cannot be recovered from its result, and both are needed
to render the spec back to Figma:

- **That it happened.** An instance the designer placed and a layer the pipeline promoted are
  indistinguishable afterwards — both are `type: instance` with `propConfigurations`. Only one
  should be re-rendered as a raw layer.
- **What the original values were.** A prop value cannot be inverted back to the style that
  produced it. Two different sources may map to one prop value, so `size: XS` cannot say
  whether the layer carried a sizing token or a raw `16`.

`styles` is the wrong home for either. It is the element's *current* styling, consumed by
every generator; anything left in it is emitted. Provenance must sit outside the contract
that generators read, in a namespace they already ignore — which is what `$extensions` is for.

---

## Decision Drivers

- **Provenance is vendor data, not contract.** A consumer that does not care about Figma must
  be able to ignore it entirely, which the DTCG `$extensions` convention already guarantees
- **Symmetry with `AnatomyElement`.** The same namespace, the same `com.figma` key, the same
  optionality — a second extension shape would make the same idea readable two ways
- **A transformation must be reversible from the spec alone**, without consulting the source
  file. `figma-from-specs` reads specs, not Figma
- **Absence must mean one thing (ADR-071).** An absent member is "no such provenance", never
  "unknown"
- **Additive only** — every member optional, no existing member changed, so no consumer is
  forced to act
- **No logic in the package** (Constitution II) — these are declarations

---

## Options Considered

### Option A: Add `$extensions` to `Element`, mirroring `AnatomyElement` *(Selected)*

Two members under `com.figma`: a flag saying the element was promoted, and the styles the
promotion consumed.

```yaml
heading:
  instanceOf: dsTypography
  propConfigurations: { color: Inverse on surface, size: 400, weight: Medium }
  styles:
    layoutSizingHorizontal: FILL     # untouched by promotion — still emitted
  $extensions:
    com.figma:
      promotedPrimitive: true
      styles:
        textColor:  { $token: Color/Inverse on surface, $type: color }
        typography: { $token: Typography/font__400__medium, $type: typography }
```

**Pros**:

- Puts element provenance on the element, where the styles it describes live
- Reuses the namespace and shape `AnatomyElement` established, so one convention covers both
- The reversal is a local read: an element carries everything needed to restore it
- `styles` keeps its meaning exactly — what this element is styled with now

**Cons / Trade-offs**:

- Two places now carry `com.figma` provenance for one conceptual element. Justified: they
  describe different things, and each sits with the data it qualifies

---

### Option B: Record both on `AnatomyElement`, which already has `$extensions` *(Rejected)*

**Rejected because**: the residue is a `Styles` object, and `Styles` do not appear in
`anatomy`. Anatomy states what an element *is*; a value belonging to `Element` would have to
be read from a sibling structure to be applied, and the two can be edited independently.

---

### Option C: A reserved key inside `styles` *(Rejected)*

**Rejected because**: every consumer of `styles` would have to learn to skip it, and any that
did not would emit provenance as styling. It also makes `Styles` non-uniform — one key whose
value is not a style.

---

### Option D: Infer promotion from the presence of the residue, with no flag *(Rejected)*

**Rejected because**: an element can be promoted without any style being consumed. A glyph
whose `content` maps to a `name` prop while no style rule resolves is promoted and drops
nothing, so an absent residue would read as "the designer placed this instance" when it did
not. The signal must be declared, not inferred from a side effect.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Element.ts` | Added optional `$extensions?: ElementExtensions` | MINOR |
| `Element.ts` | Added `ElementExtensions` — `{ 'com.figma'?: FigmaElementExtension }` | MINOR |
| `Element.ts` | Added `FigmaElementExtension` — `promotedPrimitive?: boolean`, `styles?: Styles` | MINOR |

**Example — new shape** (`types/Element.ts`):

```yaml
# Before
Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding

# After
Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding
  $extensions?: ElementExtensions      # optional — MINOR

FigmaElementExtension:
  promotedPrimitive?: boolean   # this element was a primitive layer, promoted to an instance
  styles?: Styles               # the styles promotion consumed, verbatim as captured
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Added `$extensions` property under `#/definitions/Element` | MINOR |
| `component.schema.json` | Added `#/definitions/ElementExtensions` and `#/definitions/FigmaElementExtension` | MINOR |

**Example — new shape** (`schema/component.schema.json`):

```yaml
# New property under #/definitions/Element/properties
$extensions:
  $ref: "#/definitions/ElementExtensions"
  description: "Platform extensions; com.figma carries capture provenance."
  # not in required[] — optional field

# New definition
FigmaElementExtension:
  type: object
  properties:
    promotedPrimitive:
      type: boolean
      description: "True when this element was a primitive layer promoted to a component instance."
    styles:
      $ref: "#/definitions/Styles"
      description: "The styles promotion consumed, recorded verbatim as captured."
  additionalProperties: false
```

### Notes

`promotedPrimitive` is `boolean` rather than a presence-only marker so that `false` remains
expressible. Absence and `false` mean the same thing today; a spec that states `false`
explicitly is making the same claim, and no consumer needs to distinguish them.

`styles` reuses the existing `Styles` definition rather than a reduced one. The residue is a
subset of what the element carried, recorded verbatim, and a narrower type would have to be
maintained in parallel as `Styles` grows.

Both members are optional and independent. A promoted element that consumed no styles carries
`promotedPrimitive: true` and no `styles`; nothing carries `styles` without the flag.

`ElementExtensions` is named for the type it extends, matching `AnatomyElementExtensions`.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**: `Element.$extensions` ↔ `#/definitions/Element/properties/$extensions`;
  `ElementExtensions` ↔ `#/definitions/ElementExtensions`; `FigmaElementExtension` ↔
  `#/definitions/FigmaElementExtension`, whose `styles` property `$ref`s the same `Styles`
  definition the type references

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Emits the new members when promotion runs | Write provenance during capture |
| `specs-from-figma` | Produces the values | Record consumed styles and set the flag |
| `specs-plugin-2` | Same, via the plugin runtime | Recompile; same capture path |
| `figma-from-specs` | Reads both to decide raw layer vs placed instance | Branch on `promotedPrimitive`, restore from `styles` |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **MINOR**

**Justification**: three additions, all optional — a new optional member on an existing type
and two new definitions. No existing member changes name, type, or presence. Additive types
and optional fields are MINOR per the constitution's versioning rule.

---

## Consequences

- An element can record that it was promoted, and what it was promoted from, without either
  fact reaching a generator that does not ask for it
- A spec is reversible on its own terms: restoring a promoted layer needs the spec, not the
  Figma file it came from
- `Element` and `AnatomyElement` now carry provenance the same way, so `com.figma` means one
  thing across the two
- Promotion becomes safe to make lossy in the spec's primary channels, because the loss is
  recorded rather than discarded
- A spec whose elements were promoted is larger. The residue is bounded by what promotion
  consumed, and only composed example content is affected
- Nothing yet writes these members. ADR-074 defines when they are written
