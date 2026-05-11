# ADR: Slot Content — Component.slotContent and SlotBinding

**Branch**: `047-slot-content`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-042 — Composition Structural Type](042-composition-type), [ADR-046 — Component Examples](046-component-examples)

---

## Context

ADR-042 established `Composition` as the structural base type. ADR-046 established `InstanceExample` and `Component.instanceExamples` for scalar-prop-configured usages.

A second authoring need is *content placed inside a component's slot layer* — a named, reusable arrangement of elements that fills a slot. Three decisions follow:

1. **What type expresses slot content?** — `Composition` (ADR-042) is already the structural shape. Does this ADR introduce a new wrapper type, or use `Composition` directly?

2. **Where on `Component` does it live?** — Bundled into `Component.instanceExamples` as a discriminated-union peer of `InstanceExample`, or hosted on its own sibling field? ADR-046 left `InstanceExamples` typed narrowly so this ADR could resolve the question.

3. **How does the default variant reference it?** — A slot-bound container in `default.elements` or `variants[n].elements` needs a way to point at the content placed inside its slot layer in the design file. The reference must be expressible per-variant, colocated with the binding it defaults, and recognizable to consumers as design-tool authoring metadata so that consumers without a "default slot data" concept (e.g., code components, which resolve missing slots through logic) can correctly ignore it.

This ADR scopes slot content to **one level deep**: a slot-content entry declares its own anatomy and may contain component instances, but does not reach into those instances' own slot fills. Filling nested slots from a parent context has its own design space and is deferred to a follow-on ADR.

The existing `Element.children` discriminant (`string[] | PropBinding` — plain-frame children vs. slot-bound binding) is reused here; no new element type is introduced.

---

## Decision Drivers

- **One level deep (scope of this ADR)** — slot content declares its own anatomy but does not recurse into nested instances' slot fills; recursion is deferred to a follow-on ADR
- **No cross-component references** — all keys resolve within the same component definition; an entry's anatomy may reference `instanceOf: SomeComponent` but does not reach into that component's content
- **Reuse `Composition` directly** — a slot-content entry is structurally identical to a `Composition`; introducing a new type that wraps it would add a name without adding structure
- **Slot binding at the reference site, not on the content** — the same content (e.g., a glyph icon) may fill different slots; binding it to one slot inside the entry forks identical content into per-slot copies
- **Separation of concerns over union neatness** — `InstanceExample` documents a usage of the whole component; slot content declares fill for a named slot. They differ in purpose, in author intent, and in which other types reference them. A flat sibling on `Component` makes that split explicit; a discriminated union papers over it
- **Slot defaults are design-tool provenance, not binding semantics** — Figma stores "what's placed inside the slot layer" as part of the file; code components handle missing slots through logic, not data. The reference must be expressed in a way consumers can correctly ignore — `$extensions['com.figma']` is exactly that mechanism (DTCG pattern, used elsewhere in the schema for Props and TokenReference)
- **Default colocated with binding** — the slot binding and its design-tool default describe the same object ("this slot-bound container, and what Figma shows in it"); they live on the same `SlotBinding`, not on `Element`
- **`PropBinding` stays narrow** — `PropBinding` is generic and used by `content`, `instanceOf`, and `visible` as well. The Figma-default-fill field is meaningful only for slot bindings on `children`, so it goes on a children-specific extension (`SlotBinding`), not on `PropBinding` itself
- **Variant-sensitive defaults** — `Element.children` lives in `default.elements` or `variants[n].elements`, so a per-variant Figma default falls out naturally without any new mechanism
- **Additive-only** — all new fields are optional; no existing type narrows → MINOR
- **Type ↔ schema symmetry** — every field has a schema counterpart (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)

---

## Options Considered

### Option A: `Component.slotContent: Record<string, Composition>` + `SlotBinding.$extensions['com.figma'].default` *(Selected)*

A new top-level field `Component.slotContent` holds named `Composition` entries — *sibling* to `Component.instanceExamples` (which remains `Record<string, InstanceExample>` from ADR-046). No new type is introduced for slot content; `Composition` is reused as-is.

A new interface `SlotBinding` extends `PropBinding` with an optional `$extensions` field carrying platform-specific metadata. `Children` widens from `string[] | PropBinding` to `string[] | SlotBinding`. Because `Children` lives on `Element`, anything on a `SlotBinding` appears naturally in `default.elements[name]` and `variants[n].elements[name]` — per-variant variation falls out for free.

Two reference sites point into `Component.slotContent`:

1. **`Element.propConfigurations.<slotName>`** — *authored documentation/usage, meaningful to all consumers.* When an `InstanceExample` (ADR-046) sets a slot prop, or when any nested-instance element fills its slot via the cross-boundary mechanism (ADR-049), the value resolves to a Composition in `slotContent`. Lives as a plain prop value, not in `$extensions`, because the reference is part of authored documentation/usage, not Figma-specific provenance.
2. **`SlotBinding.$extensions['com.figma'].default`** — *Figma authoring metadata, ignored by code consumers.* References the content Figma renders inside the slot layer when no consumer override is supplied. Lives in `$extensions` because code consumers resolve missing slots through component logic (not data) and must correctly skip the field.

Minimal example — one slot, one content entry, both reference sites visible:

```yaml
# ActionListItem (only fields that demonstrate Option A are shown).
# Assumed to live at `#/components/actionListItem` so JSON Pointer references resolve.
components:
  actionListItem:
    anatomy:
      startVisualSlot: { type: container }   # slot-bound

    props:
      startVisual: { type: slot }

    instanceExamples:
      withIcon:
        propConfigurations:
          startVisual:
            $composition: "#/components/actionListItem/slotContent/searchIcon"   # reference site #1 (ADR-049)

    slotContent:
      searchIcon:
        anatomy:
          icon: { type: glyph }
        elements:
          icon:
            content: search
            styles:
              width: 16
              height: 16
        layout: [icon]

    default:
      elements:
        startVisualSlot:
          children:
            $binding: "#/components/actionListItem/props/startVisual"
            $extensions:
              com.figma:
                default: "#/components/actionListItem/slotContent/searchIcon"    # reference site #2 (Figma authoring default)
```

#### Naming the new field on `Component`

Candidate terms considered:

- **`slotContent`** *(Selected)* — Figma's own term for what lives inside a slot layer. Reads naturally cross-platform: Web Components, Vue, and Svelte all use `<slot>`; SwiftUI/Compose use "slot APIs" / content closures; React's render-prop pattern is widely described as "slots." "Content" is the universal noun for what fills one. Pairs cleanly with `examples` as a sibling without role overlap.
- **`slotExamples`** — parallels `examples` symmetrically, but reads as "examples of slots" rather than "content for slots," which understates what's authored (a complete composition, not an exemplar).
- **`slotCompositions`** — accurate to ADR-042's `Composition` base, but `Composition` is a structural-shape word; authors don't think of slot fills as "compositions" in everyday language.
- **`compositions`** — overreaches: ADR-042 reserves the unqualified term for the system-scoped `compositions.yaml` bucket (layout and page compositions). Using it here would force a rename later.
- **`slots`** — collides with `SlotProp` use of "slots" on `Component.props`; ambiguous.
- **`fills`** / **`slotFills`** — short but jargony; not established in any of the target platform vocabularies.

`slotContent` wins on platform alignment (Figma + Web Components + Vue + Svelte all use "slot"; "content" is the standard noun for what fills one), on authoring clarity (it names what's authored, not the form), and on namespace cleanliness (no collision with `SlotProp` or with ADR-042's `compositions.yaml`).

#### Naming the field inside `$extensions['com.figma']`

The field lives at `SlotBinding.$extensions['com.figma'].default`. Inside the `com.figma` namespace, "default" is unambiguous — it reads as "Figma's default" by virtue of its enclosing key — and there is no collision risk because the scope is one extension object. The field's *value* is a JSON Pointer to a `Composition` (in `slotContent` or in an external composition file), matching the form ADR-049 uses for cross-boundary slot fill references.

- **`default`** *(Selected)* — concise, reads naturally in scope (`$extensions.com.figma.default` = "Figma's default"). The enclosing namespace already qualifies it.
- **`defaultContent`** — verbose given the namespace already implies "Figma's default for this slot binding."
- **`defaultComposition`** — accurate but redundant given the value type is documented; "default" plus the obvious scope is clearer.

**Pros**:
- No new type for slot content — `Composition` carries the structure it already defines
- Slot-content entries are slot-agnostic; one icon entry can be referenced as `startVisual` *or* `endVisual` without duplication
- The Figma default-fill key lives on the slot binding inside `$extensions['com.figma']` — colocated with `$binding`, no name collision with `content`, and correctly marked as design-tool provenance that code consumers ignore
- Per-variant Figma defaults fall out for free: `children` already lives on `Element`, which is mapped through `default`/`variants`
- `examples` and `slotContent` are siblings with one purpose each; no `kind` discriminator on either
- ADR-046's `InstanceExamples` is not widened; this ADR is purely additive
- Future system-scoped `compositions.yaml` (ADR-042 follow-on) lives at the same conceptual level without competing with either field

**Cons / Trade-offs**:
- Two namespaces to teach instead of one
- A consumer that wants "everything authored on this component" must read both fields and union them
- One-level-deep boundary; recursion deferred to a follow-on ADR
- Schema cannot enforce that `$extensions['com.figma'].default` JSON Pointers resolve to actual compositions — consumer validation concern. (The "only valid for slot-bound" constraint *is* enforced structurally — `$extensions` only exists in the `SlotBinding` arm of `Children`.)

---

### Option B: New `SlotExample` type with a `slot` field; entries bundled in `Component.instanceExamples`; reference via `Element.$extensions` *(Rejected)*

Introduce `SlotExample extends Composition` with an added `slot: string`, widen `Component.instanceExamples` to a `ComponentExample = InstanceExample | SlotExample` discriminated union (each entry carries a `kind`), and reference defaults via `Element.$extensions['com.figma'].defaultComposition` — i.e., put the extension on `Element` rather than on the slot binding.

**Rejected because**:
- The `slot` field hard-codes a content entry to a single slot; identical content used in two slots must be duplicated.
- `SlotExample` adds no structure over `Composition` once `slot` is removed — it's an alias for an alias.
- The `kind` discriminator is pure schema bookkeeping with no authoring value; the two types don't share an audience (`InstanceExample` is consumed by docs/rendering tooling that wants whole-component usages; slot content is consumed by slot-rendering and by Figma's default-fill reference). Bundling forces every consumer to filter by `kind`.
- The `$extensions` *placement* is wrong — putting it on `Element` separates the default from the binding it defaults. Option A keeps the extension but moves it onto `SlotBinding`, where it belongs.
- The `$extensions` *use* is correct — the Figma default-content reference *is* design-tool provenance (code components don't have a "default slot data" concept; defaults in code are logic). Earlier drafts that put a plain `default: string` field on `SlotBinding` (no `$extensions` wrapper) misrepresented the field as binding-level semantics that all consumers should honor; code consumers should ignore it.

---

### Option C: Slot default on `SlotProp.default` *(Rejected)*

Store the default-content reference on `SlotProp.default` rather than on the element.

**Rejected because**: `SlotProp` is the public prop API surface. Default content is per-variant element data — variant-sensitive, and tied to a specific element in the tree (the slot-bound container), not to the prop definition. Per-variant variation cannot live on the prop definition.

---

### Option D: Separate slot-content file *(Rejected)*

Store slot content in a separate file alongside the component, rather than in the component definition.

**Rejected because**: Slot-content entries are component-specific — they describe content authored to fill named slots on that component. They belong in the component definition for discoverability and so `propConfigurations.<slotName>` references and the Figma default reference can resolve via JSON Pointer paths inside the same component spec.

---

### Option E: New top-level field on `Element` (sibling of `content` and `children`) *(Rejected)*

Place the Figma default-fill reference as a new field directly on `Element` — under names like `defaultContent`, `defaultChildren`, or `defaultSlotContent` — alongside `content` and `children`.

```yaml
default:
  elements:
    itemsSlot:
      children: { $binding: "#/props/items" }
      defaultContent: defaultItems        # sibling of children
```

**Rejected because**:
- Names like `defaultContent` collide conceptually with `content` (text body of leaves) and with `children` (layout structure), regardless of which name is chosen. The reader naturally reads `defaultContent` as "default for `content`" — which it isn't.
- The reference is separated from the binding it defaults: `children` holds the slot binding; the new field holds the default. Two objects, one fact.
- It pollutes `Element`'s public surface with a field whose meaning depends on the shape of a sibling field (`children` must be a slot binding for the field to be valid) and whose audience is a single platform (Figma authoring tools). Public-surface fields should be meaningful to all consumers and structurally self-contained.

Option A's `SlotBinding.$extensions['com.figma'].default` colocates with the binding and lives in the namespace that correctly signals "design-tool provenance, code consumers ignore."

---

### Option F: Widen `Element.content` to accept slot-content keys *(Rejected)*

Reuse the existing `Element.content` field. When `Element.children` is a slot binding, interpret `content`'s string value as a key into `Component.slotContent` instead of as literal text.

```yaml
default:
  elements:
    itemsSlot:
      children: { $binding: "#/props/items" }
      content: defaultItems               # interpreted as slotContent key here
    label:
      content: "Browse all issues"        # interpreted as text leaf body here
```

**Rejected because**:
- `content` is already typed `string | PropBinding`. Making the same `string` mean "literal text" in one element shape and "slotContent key" in another is a conditional that JSON Schema cannot express.
- Consumers would have to branch on `children`'s shape to interpret a string in `content`. A field's meaning should not depend on a sibling field's shape.
- It conflates two different kinds of content (text body vs. composition reference) under one name and loses the design-tool-provenance framing that `$extensions['com.figma']` provides.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Component.ts` | Add optional `slotContent?: Record<string, Composition>` | MINOR |
| `Children.ts` | Add `SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension`; widen `Children` from `string[] \| PropBinding` to `string[] \| SlotBinding` | MINOR |
| `index.ts` | Export `SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension` | MINOR |

No new type file for slot-content entries. `SlotContent` is not introduced as a named alias — `Record<string, Composition>` is small and explicit; an alias would obscure that this field is just a named map of `Composition` entries.

**Widening `Children`** (`types/Children.ts`):

```ts
import { PropBinding } from './PropBinding.js';

/**
 * Figma-specific extension on a SlotBinding.
 * Carries Figma authoring metadata for the slot — not honored by code consumers.
 */
export interface FigmaSlotBindingExtension {
  /**
   * JSON Pointer to a Composition — Figma's authoring default for this slot
   * (the content placed inside the slot layer in the design file). Resolves
   * to a Composition in `Component.slotContent` (component-scoped, e.g.
   * `"#/components/pill/slotContent/composedLabel"`) or in an external
   * composition file (system-scoped). Code consumers handle missing slots
   * through component logic and ignore this.
   */
  default?: string;
  [key: string]: unknown;
}

/** Open extension bag on a SlotBinding for platform-specific metadata. */
export interface SlotBindingExtensions {
  'com.figma'?: FigmaSlotBindingExtension;
  [key: string]: unknown;
}

/** A slot binding: a PropBinding to a slot prop, with optional platform extensions. */
export interface SlotBinding extends PropBinding {
  $extensions?: SlotBindingExtensions;
}

export type Children = string[] | SlotBinding;
```

`SlotBinding extends PropBinding`, so existing `children: { $binding: "#/props/items" }` values still validate (the new `$extensions` field is optional). `PropBinding` itself is unchanged — its other consumers (`content`, `instanceOf`, `visible`) are unaffected.

**Extended `Component`** (`types/Component.ts`):

```yaml
# Before (after ADR-046)
Component:
  title: string
  anatomy: Anatomy
  props?: Props
  subcomponents?: Subcomponents
  default: Variant
  variants?: Variants
  invalidVariantCombinations?: PropConfigurations[]
  metadata?: Metadata
  instanceExamples?: InstanceExamples      # InstanceExample only — ADR-046

# After
Component:
  title: string
  anatomy: Anatomy
  props?: Props
  subcomponents?: Subcomponents
  default: Variant
  variants?: Variants
  invalidVariantCombinations?: PropConfigurations[]
  metadata?: Metadata
  instanceExamples?: InstanceExamples      # unchanged
  slotContent?: Record<string, Composition> # new — named, slot-agnostic content entries
```

`Element` itself is **unchanged** — the new field lives inside `Element.children`, not as a sibling.

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `slotContent` property to `#/definitions/Component` | MINOR |
| `component.schema.json` | Add `#/definitions/SlotBinding`, `#/definitions/SlotBindingExtensions`, `#/definitions/FigmaSlotBindingExtension`; update `#/definitions/Children` to use `SlotBinding` | MINOR |

**New property** in `#/definitions/Component/properties`:

```yaml
slotContent:
  type: object
  description: "Named slot-content entries for this component. Each entry is a Composition. Entries are referenced via JSON Pointer (e.g. `\"#/components/pill/slotContent/composedLabel\"`) from SlotBinding.$extensions['com.figma'].default and from Element.propConfigurations slot-prop entries (ADR-049 CompositionRef)."
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      $ref: "#/definitions/Composition"
  additionalProperties: false
```

**New definitions** and updated `#/definitions/Children`:

```yaml
FigmaSlotBindingExtension:
  type: object
  description: "Figma-specific authoring metadata on a slot binding. Not honored by code consumers."
  properties:
    default:
      type: string
      description: "JSON Pointer to a Composition — Figma's authoring default for this slot. Resolves to a Composition in Component.slotContent (component-scoped, e.g. `\"#/components/pill/slotContent/composedLabel\"`) or in an external composition file (system-scoped)."
  additionalProperties: true

SlotBindingExtensions:
  type: object
  description: "Open extension bag on a SlotBinding for platform-specific metadata."
  properties:
    "com.figma":
      $ref: "#/definitions/FigmaSlotBindingExtension"
  additionalProperties: true

SlotBinding:
  type: object
  description: "Slot binding: a PropBinding to a slot prop, optionally with platform-specific authoring metadata in $extensions."
  required: [$binding]
  properties:
    $binding:
      type: string
      description: "JSON Pointer to the bound slot prop, e.g. \"#/components/pill/props/children\"."
    $extensions:
      $ref: "#/definitions/SlotBindingExtensions"
  additionalProperties: false

Children:
  oneOf:
    - type: array
      items: { type: string }
    - $ref: "#/definitions/SlotBinding"
```

### Out of scope for this ADR

- **Nested slot filling (recursion)** — When a slot-content entry contains component instances that themselves have slots, filling those nested slots from the parent context is a separate problem with its own design space. Deferred to a follow-on ADR. This ADR scopes slot content to one level only; each component resolves its own slot content independently.
- **`compositions.yaml` file schema** — system-scoped (`layout`, `page`) compositions; a follow-on ADR.

### Notes

- Slot-content entries are slot-agnostic. The same `Composition` (e.g., a single glyph icon) can be referenced from multiple `propConfigurations.<slotName>` sites (in InstanceExamples or in nested-instance fills per ADR-049) and from multiple slot-binding defaults; authors are not forced to duplicate identical content per slot.
- `SlotBinding.$extensions` is structurally available only when `Element.children` is a slot binding (the second arm of `Children`). A container with `children: string[]` cannot express a Figma default — the schema enforces this through the `Children` discriminant.
- Because `Element.children` lives in `default.elements` and `variants[n].elements`, different variants may declare different Figma defaults for the same slot-bound container with no special-case mechanism.
- `PropBinding` itself is unchanged. `SlotBinding extends PropBinding` adds `$extensions` only for the children-binding case; `PropBinding`'s other use sites (`content`, `instanceOf`, `visible`) cannot accidentally accept it.
- Slot fills inside an `InstanceExample` (or any other `propConfigurations`-based call site) do *not* live in `$extensions`. They are authored documentation/usage and are meaningful to all consumers, not just Figma.
- `SlotBindingExtensions` and `FigmaSlotBindingExtension` use `additionalProperties: true` — open extension objects by design, following the DTCG pattern.
- Schema validation cannot enforce that `$extensions['com.figma'].default` JSON Pointers and ADR-049 `$composition` references resolve to existing compositions — consumer validation concern.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `Component.slotContent?: Record<string, Composition>` ↔ `#/definitions/Component/properties/slotContent` (`patternProperties` → `Composition`)
  - `FigmaSlotBindingExtension { default?: string }` ↔ `#/definitions/FigmaSlotBindingExtension`
  - `SlotBindingExtensions { 'com.figma'?: FigmaSlotBindingExtension }` ↔ `#/definitions/SlotBindingExtensions`
  - `SlotBinding extends PropBinding { $extensions?: SlotBindingExtensions }` ↔ `#/definitions/SlotBinding`
  - `Children = string[] | SlotBinding` ↔ `#/definitions/Children` (`oneOf`)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `Component.slotContent` from slot layers; must emit `$extensions['com.figma'].default` on slot bindings in `default.elements` / `variants[n].elements` | Read new fields; implement slot-content detection; update output emitters |
| `specs-cli` | Recompile; output includes `slotContent` and `SlotBinding.$extensions` when present | Recompile; no breaking change |
| `specs-plugin-2` | Recompile; slot-content rendering is a follow-on capability | Recompile; pass through data initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive — new optional `Component.slotContent` field; new `SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension` interfaces; `Children` widened from `string[] | PropBinding` to `string[] | SlotBinding`, where `SlotBinding` is a structural superset of `PropBinding` (existing `children: { $binding }` values still validate). No new types for slot content (`Composition` from ADR-042 is reused). `PropBinding` and `Element` are unchanged. `InstanceExamples` from ADR-046 is unchanged. → MINOR per Constitution §III.

---

## Consequences

- `Component.instanceExamples` and `Component.slotContent` are siblings: each holds one type with one purpose. `instanceExamples` documents whole-component usages (`InstanceExample`); `slotContent` holds named `Composition` entries that fill slots.
- Slot-content entries are slot-agnostic; the binding to a specific slot happens at the reference site (`propConfigurations.<slotName>` per ADR-049, `SlotBinding.$extensions['com.figma'].default`). Identical content used in multiple slots is authored once.
- `Composition` is reused directly with no wrapper type; ADR-042's structural type carries its own weight here.
- `SlotBinding.$extensions['com.figma'].default` colocates the Figma default-fill reference with the slot binding itself, inside `Element.children`. The `$extensions` framing correctly marks it as design-tool provenance — code consumers ignore it (defaults in code are logic, not data). No collision with `content`, `children`, or any top-level `Element` field. Per-variant Figma defaults fall out because `children` already lives on `Element`.
- `SlotBindingExtensions` is an open extension object — future Figma-specific or platform-specific slot-binding metadata can be added without a new ADR.
- Slot fills via `propConfigurations.<slotName>` (the unified mechanism per ADR-049) resolve into `Component.slotContent` via JSON Pointer. ADR-046's `InstanceExamples` type is not widened.
- This ADR scopes slot content to one level deep; recursion (filling slots of nested instances from a parent context) is deferred to a follow-on ADR.
