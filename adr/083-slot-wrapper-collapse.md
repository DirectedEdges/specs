# ADR: Collapsing a Slot-Only Wrapper

**Branch**: `083-slot-wrapper-collapse`
**Created**: 2026-09-01
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none — amends ADR-058)*

---

## Context

ADR-058 introduced `spec.collapsePrimitiveWrapper`. When true, a component whose root is a plain container holding a single `text` or `glyph` leaf is collapsed: the wrapper is stripped and the leaf becomes the spec root. Its stated rationale is that such a wrapper is *"a Figma-side convenience with no design-system meaning."*

That ADR explicitly refuses the same shape when the child is a **slot**:

> Collapse is blocked by … a root with a slot binding on its children (the wrapper has semantic slot structure).

The refusal treats a slot binding as evidence that the wrapper means something. Often it is not. A layout component authored in Figma as a frame containing one slot frame is the same convenience: one box that lays out its children, expressed as two layers because that is how a slot is authored.

### What the refusal costs

A container primitive binding (ADR-074, ADR-076) substitutes a design-system component for a box that holds children. ADR-076 records the precondition:

> **A bound component's root must be the box its children land in.**

A component authored as root + slot fails it. The collapsed-away wrapper survives into generated markup, so everything the substituted element carried — spacing, padding, alignment, sizing — lands on an outer box whose only child is the wrapper. Spacing is silently lost, and a wrapper carrying a zero flex-basis inside a hug-height parent collapses the subtree to nothing. Neither failure raises an error.

Collapsing the slot-only wrapper removes the second box and makes such components valid binding targets.

### The shape, measured

Across a 115-component catalogue, exactly **four** components are a root container with one slot child:

| Component | Root styles vs slot styles |
|---|---|
| layout | identical |
| action list | identical |
| list | disjoint; no shared key differs |
| bottom bar | root `VERTICAL` vs slot `HORIZONTAL`; differing `height`, `cornerRadius` |

The bottom bar is genuinely two boxes — a vertical bar containing a horizontal row — and must not collapse. Any rule has to exclude it.

### "Style-free" is a disqualifying set, not a binary

ADR-058's wrapper is not literally free of styles. Its eligibility bars a specific list:

```yaml
# ADR-058 disqualifying styles on the wrapper
- clipContent
- cornerRadius
- strokes
- strokeAlign
- strokeWeight
- itemSpacing
- padding
- effects
- backgroundColor
- cornerSmoothing
```

Everything outside that list — `layoutMode`, `layoutSizingHorizontal`, `layoutSizingVertical`, `primaryAxisSizingMode`, `width`, `height` — is already tolerated on a collapsing wrapper. The question was never "does the wrapper have styles" but "which styles mean something."

Applied literally to the four candidates, that list blocks **all of them**, and three on `clipContent` alone — which on a pure wrapper is an overflow rule rather than design intent, and which the slot child carries identically in every one of those three.

---

## Decision Drivers

- **Consistency with ADR-058** — the same argument that justifies collapsing a text wrapper justifies collapsing a slot wrapper; the eligibility test should differ only where the two cases genuinely differ
- **A real box must survive** — a root carrying its own surface (`backgroundColor`, `cornerRadius`, `strokes`, `effects`) is not a wrapper, and no rule may flatten it
- **Round-trip stability** — `figma-from-specs` reverses ADR-058's collapse, and its expansion assumes a style-free wrapper. A slot wrapper carries styles, so the reversal needs a stated rule
- **Absence must reproduce current behaviour exactly** — a workspace that does not enable the setting sees no change
- **No logic in this package (Constitution II)** — the schema declares the setting; the collapse and its inverse live in the consuming packages
- **Type ↔ schema symmetry (Constitution I)** — whatever changes in `types/` changes in `schema/`
- **Minimal, stable, intentional public API (Constitution III)** — reuse the existing setting rather than adding a second one that would have to be explained against the first

---

## Options Considered

*(Pre-decided — the eligibility rule and the governing setting were settled before drafting.)*

Two eligibility rules were weighed. **Any non-conflicting merge** was selected: collapse when the root and its sole slot child share no style key with differing values, paired with a fixed rule for splitting them back on expansion. The alternative — collapse only when the two are **identical or the root lacks the key** — would let expansion reproduce the original layer styling exactly, but excludes the list component and buys that exactness with a narrower rule. Spec → Figma → spec stability is the contract that matters; byte-identical Figma layer styling is not.

Adding a second setting was also considered and rejected: a reader would have to learn why two switches exist for one idea, and every workspace wanting either would set both.

---

## Decision

Widen `spec.collapsePrimitiveWrapper` to cover a slot-only wrapper. **No member is added, removed, or retyped** — the setting's documented meaning widens, and the behaviour it selects is implemented by consumers.

### Eligibility

A component collapses when **all** hold:

- The root element's type is `container`
- The root has exactly one anatomy-visible child, and that child's type is `slot`
- No style key present on **both** the root and the slot child has differing values
- The root carries none of `backgroundColor`, `cornerRadius`, `cornerSmoothing`, `strokes`, `strokeAlign`, `strokeWeight`, `effects` — a root with its own surface is a box, not a wrapper
- Every valid variant is eligible — collapse stays all-or-nothing, as in ADR-058

`clipContent`, `itemSpacing` and `padding` are **not** disqualifying here, unlike ADR-058. In the slot case they are either identical on both boxes, or present on only one and therefore mergeable without a choice.

### The collapsed form needs no new representation

The slot binding moves onto the root, which the schema already expresses:

```yaml
# Before — two boxes
anatomy:
  root: { type: container }
  children: { type: slot }
elements:
  root: { styles: { layoutMode: HORIZONTAL } }
  children: { styles: { itemSpacing: 8 } }

# After — one box, styles merged
anatomy:
  root: { type: container }
elements:
  root:
    styles: { layoutMode: HORIZONTAL, itemSpacing: 8 }
    children: { $binding: "#/props/children" }
```

### Expansion, for the reverse direction

Rebuilding two layers from one requires a rule, since the merge does not record which box a style came from:

- Sizing and clipping — `layoutSizingHorizontal`, `layoutSizingVertical`, `primaryAxisSizingMode`, `width`, `height`, `clipContent` — go to the **outer wrapper**
- Spacing and alignment — `itemSpacing`, `padding`, `crossAxisAlignment`, `mainAxisAlignment` — go to the **slot box**, where they act on the children
- `layoutMode` goes to **both**, as it did before the merge

Layer styling may therefore be distributed differently than a designer authored it, while the re-generated spec is identical.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Settings.ts` | `Settings.spec.collapsePrimitiveWrapper` — doc comment widened to include a slot-only wrapper and to state the eligibility difference from ADR-058 | PATCH |
| `types/Settings.ts` | `ResolvedSettings.spec.collapsePrimitiveWrapper` — same | PATCH |

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/settings.schema.json` | `description` of `spec.collapsePrimitiveWrapper` widened to match | PATCH |

### Notes

The setting keeps its name. "Primitive wrapper" reads as the wrapper being removed rather than the leaf being promoted (ADR-058's own naming rationale), and that reading holds for a slot child as well as a text or glyph one.

Absence or `false` reproduces current behaviour exactly. A workspace that already sets it to `true` **will** see specs change shape for components of this form — the deliberate consequence of widening one setting rather than adding a second.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — documentation-only, applied to both artifacts
- **Parity check**: `Settings.spec.collapsePrimitiveWrapper` and `ResolvedSettings.spec.collapsePrimitiveWrapper` ↔ `settings.schema.json` `#/properties/spec/properties/collapsePrimitiveWrapper`. No property is added or removed, so parity is preserved by construction

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Widen collapse eligibility to a slot-only root and merge the two elements' styles | Implement |
| `figma-from-specs` | Reverse the collapse for a slot-only root, splitting merged styles per the expansion rule | Implement |
| `specs-cli` | None — the setting is passed through unchanged | Recompile |
| `specs-plugin-2` | Output for components of this form changes when the setting is enabled | Recompile |

---

## Semver Decision

**Version**: `0.31.0` (release branch `release/schema-0.31.0+cli-0.28.0`) — **PATCH**

**Justification**: no type, property, or default changes. The setting already exists (`@since 0.26.0`); only its documented meaning widens, and the behaviour it selects belongs to the consuming packages (Constitution II). The observable change in generated specs is a consumer behaviour change, not a change to this package's contract.

---

## Consequences

- Components authored as a root container around a single slot emit one box, and so satisfy ADR-076's precondition for a container primitive binding
- ADR-058's eligibility list no longer reads as universal: `clipContent`, `itemSpacing` and `padding` disqualify a primitive wrapper but not a slot one, because the two cases lose different things
- A root with its own surface never collapses, so a component that is genuinely two boxes stays two boxes
- The reverse direction gains a stated rule for splitting merged styles. Figma layer styling may differ from what a designer authored while spec → Figma → spec stays stable — an explicit trade, not an accident
- **Enabling the setting now does more than it did.** A workspace already setting it to `true` sees specs change shape for this class of component with no configuration change of its own. This is the cost of one setting rather than two, accepted deliberately
