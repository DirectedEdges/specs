# ADR: String-Composable Slots — A Slot Whose Default Content Is Text

**Branch**: `102-default-text-slots`
**Created**: 2026-10-06
**Status**: DRAFT
**Summary**: `SlotProp.accepts`, `Element.contentStyles` and `inferComposableSlots` let a slot take string content and format it per variant.
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A component's label is composable on every code platform. React types a Button's
children `ReactNode`, which accepts a string *or* an element. Web Components
expose the default `<slot>`, which accepts text nodes and element nodes alike.
SwiftUI takes a `@ViewBuilder` closure that a `Text` view satisfies as readily as
any other view. All three agree: a label is content, and content may be a string
or a component.

The spec cannot say that. Two shapes exist today and neither expresses it:

- A Figma `TEXT` component property becomes a `StringProp`. A string prop has no
  content set to widen, so a Button whose label is a `StringProp` cannot describe
  a Button containing a Badge.
- A Figma slot becomes a `SlotProp` whose `anyOf` is `string[]` — a list of
  permitted *component* names. There is no value in that array, and no sibling
  member, that admits a plain string.

So a design system that genuinely accepts either has to pick which half to
describe, or carry two parallel props for one real one.

**Figma already distinguishes the two cases, and the distinction is authored.** A
designer who wants a composable label authors a **slot** and puts a text layer in
its default content. A designer who wants a plain string authors a **`TEXT`
property on a text layer**. Those are different acts producing different
structures, and the difference is the intent — it does not need to be guessed from
prop names or declared a second time in an annotation. What the schema is missing
is not a detection mechanism but two records: that such a slot accepts a string,
and how that string is formatted.

Formatting is the harder half, because it varies. A Button's label typography and
color change across `appearance` and `state`; a Badge's change across
`appearance`. A consumer filling the slot with a string must apply that
formatting per variant. One filling it with a Badge must discard it, because the
Badge brings its own. And the text layer carrying that formatting lives inside
the slot's default content — it is a *fill*, not a part of the component — so it
cannot persist as its own entry in `anatomy`, where a transform would emit a text
node the component does not always have.

**Default-ness is orthogonal and already solved.** ADR-099 added
`SpecsConventions.slots.default.match` and `SlotProp.defaultSlot` to name a
component's one always-composed slot. Whether a slot is *the default* and whether
it *accepts a string* are independent questions: a Button's `children` is both, an
Alert's `description` is composable but not default, and a multi-slot layout
component's slots are default-eligible but take components only. This ADR changes
nothing about ADR-099 — no convention is widened, no marker is reinterpreted.

---

## Decision Drivers

- **Constitution I (types ↔ schema parity)**: any new member on `SlotProp`,
  `Element`, or `PlatformConventions` requires a symmetric change to the matching
  definition in `schema/`.
- **Constitution II (no logic)**: this package states that a slot may accept a
  string, what gates the reading, and where the string's formatting is recorded.
  It does not state the traversal that finds a slot's default content, nor the
  cascade a transform applies when rendering a fill.
- **Constitution III (minimal, intentional API)**: add a member only where the
  fact has no existing home, and prefer a reading of an existing shape to a new
  mechanism (ADR-099 Decision 4's precedent).
- **Constitution VI rule 1 (code platforms first, 2+ agreeing)**: React, Web
  Components, and SwiftUI all model a slot as accepting string content alongside
  element content, so their model governs and Figma's property-type vocabulary
  does not.
- **Read what the designer authored; never re-declare it.** Where Figma's own
  structure already carries the intent unambiguously, a convention or annotation
  restating it is a second source of truth that can disagree with the file.
- **Composability varies per component, not per catalogue.** `description` is
  composable on an Alert and a plain string on a Tooltip; `helpText` is composable
  on a Form Label and not elsewhere. Any mechanism keyed to a library-wide name
  pattern is structurally unable to express this, and would be wrong for most of
  what it matched.
- **Anatomy lists only what the component always has.** A slot's default text
  content is a fill. It must not persist as an anatomy element that a composed
  fill would delete — anatomy is what a transform reads to emit structure.
- **Per-variant formatting must not fork from how variants already work**:
  variant-specific element values already live in `default.elements` and
  `variants[].elements`. Whatever carries the string's formatting must be
  addressable through that mechanism, with no new per-variant structure.
- **A changed reading of existing data is opt-in.** Emitting a slot differently
  than it is emitted today changes output for libraries that authored nothing new,
  so it must be gated by a declaration, defaulting to today's behavior.
- **Absence must stay backward compatible**: every existing spec must remain valid
  and keep its meaning. A new member's absence must read as today's behavior.
- **Degrade only with data the spec carries**: where a fill is a component rather
  than a string, the recorded string formatting must be identifiable as
  discardable — not silently cascaded onto the composed instance.

---

## Options Considered

### Decision 1 — What identifies a slot as string-composable

#### Option A: The authored Figma shape — a slot whose default content is a single text layer *(Selected)*

A `SlotProp` is string-composable when the Figma slot it came from has exactly one
text layer as its default content. Nothing else is consulted: not the prop name,
not an annotation, not a per-component config entry.

**Pros**:
- The intent is already authored, and this reads it rather than asking for it
  twice. A designer who wants composability builds a slot with text inside; one
  who wants a plain string uses a `TEXT` property on a text layer. Both shapes
  exist in real files today and already mean these two things.
- Correct at per-component granularity for free. Alert's `description` is a slot
  with text in it; Tooltip's `message` is a `TEXT` prop. No declaration
  distinguishes them because the file already does.
- No new vocabulary, no new convention surface, no annotation to drift. The
  mechanism has nothing to keep in sync with the design file because it *is* the
  design file.
- Orthogonal to default-ness by construction, which matches the two facts being
  independent. A named non-default slot and a default slot are read identically.
- The text layer found this way is exactly the source of the formatting record
  (Decision 4) — one traversal answers both questions, and it cannot find a layer
  whose styles it then fails to capture.

**Cons / Trade-offs**:
- A slot authored with a single text layer of default content *purely as
  placeholder scaffolding*, with no intent that a string ever fill it, reads as
  string-composable. This is the reason Decision 2 gates the whole reading behind
  a declaration rather than turning it on for everyone, and the reason the
  fallback is a correct-but-wider content set rather than a wrong one: such a slot
  gains `accepts: [string, component]` when it should have had `[component]`, and
  a consumer's worst outcome is permitting a string fill the design never
  intended.
- Reading "exactly one text layer" means a slot whose default content is a text
  layer *plus* a decorative icon is not string-composable. That is deliberate —
  two children are a composed arrangement, not a string — but it does mean the
  answer depends on default content a designer may change for unrelated reasons.

---

#### Option B: A library-wide name convention, `slots.composable.match`

Add a `SpecsConventions.slots.composable.match: string[]` naming which prop names
are string-composable, beside ADR-099's `slots.default.match`. ADR-099 explicitly
reserved room under the `slots` wrapper for "a future non-default slot
convention".

**Rejected because**: composability is not a catalogue-wide property of a name.
`children` is composable everywhere, but `description` is composable on an Alert
and a plain string on a Tooltip, and `helpText` is composable on a Form Label and
nowhere else. A pattern matching `description` would promote it on every component
that happens to use the word, which is wrong for most of them, and a pattern
narrow enough to be correct would have to enumerate component/prop pairs — at
which point it is a per-component table in the wrong file, duplicating what the
design already says. The convention ADR-099 reserved space for may still be
needed for some other slot fact; it is not this one.

---

#### Option C: A Figma Dev Mode annotation on the text layer

Add a third annotation key beside `role:<concept>` (ADR-067) and `action:<concept>`
(ADR-087) — a `slot` keyword on the text layer declaring its prop composable.

**Rejected because**: it asks a designer to declare, in an annotation, a fact
their structural choice already states. A slot containing a text layer is already
the composable case and a `TEXT` prop on a text layer is already the
non-composable one, so the annotation's only possible jobs are to agree with the
shape (redundant) or contradict it (a second source of truth, with no rule for
which wins). Annotations earn their place where structure genuinely cannot carry
the fact — `role:` names a semantic a layer's geometry does not imply — and that
is not the situation here. It also requires Dev Mode, which not every workspace
has, for a fact readable without any design-tool access.

---

#### Option D: Promote a `TEXT` prop keyed to `slots.default.match`

Leave the authored slot case alone and instead convert a `TEXT` property into a
`SlotProp` when its prop name matches ADR-099's `slots.default.match`.

**Rejected because**: it answers a different question than the one asked, and
answers it narrowly. `slots.default.match` names at most one slot per component,
so a component with two composable text props — Alert's `children` and
`description` — can only ever have one promoted, and the second stays a
`StringProp` with no way to say otherwise. It also conflates two independent
facts: being *the default slot* and *accepting a string* are orthogonal, and
using the former as the trigger for the latter makes every string-composable slot
necessarily the default one, which Alert's `description` disproves. Promoting a
`TEXT` prop also discards the authored distinction Option A relies on, leaving no
shape left that means "plain string".

---

### Decision 2 — Whether the reading is gated, and where that gate lives

#### Option A: `inferComposableSlots` on `PlatformConventions` *(Selected)*

Add `inferComposableSlots?: boolean` to `PlatformConventions`, authored in
`config/conventions/figma.yaml`, optional and defaulting to `false`, with a
required counterpart on `ResolvedPlatformConventions` — mirroring
`inferNumberProps` exactly.

```yaml
# config/conventions/figma.yaml
inferNumberProps: true
inferComposableSlots: true
```

**Pros**:
- `inferNumberProps` is the precedent and the direct analogue: it says "this
  platform authors numeric props as `TEXT` props whose values parse as numbers,
  so read them as `NumberProp`." This says "this platform authors composable text
  as a slot with a text layer in it, so read it as string-accepting." Same kind of
  claim, same risk profile, same opt-in treatment.
- Correctly a `PlatformConventions` member under ADR-073 Decision 4: what it names
  — a slot primitive's default content — exists only in a platform's artifacts. A
  reader holding only the spec cannot apply it, which is the test that keeps it
  out of `SpecsConventions`.
- Default `false` keeps the change opt-in, so a library that authored nothing new
  gets byte-identical output and the Option A trade-off (placeholder scaffolding
  read as composable) cannot surprise anyone who did not ask for the reading.
- The required-on-resolved shape means a consumer never has to decide what an
  absent value meant, matching how `inferNumberProps` and `slotConstraints`
  already resolve.

**Cons / Trade-offs**:
- A third `infer*`-style member accumulates on `PlatformConventions`, which is
  already a wide type. The alternative is fewer members and less control over a
  reading that can be wrong, which is the worse trade.

---

#### Option B: No gate — always read a text-only slot as string-composable

**Rejected because**: it changes generated output for every existing library with
no declaration and no opt-in. Any slot whose default content happens to be one
text layer — including placeholder scaffolding never meant to take a string —
silently gains a wider content set on the next generation. `inferNumberProps`
exists as an opt-in for exactly this reason: a reading that is usually right and
sometimes wrong belongs behind a declaration, not in the default path.

---

#### Option C: A `Settings` member rather than a convention

Put the gate on `Settings.spec`, beside `promotePrimitives` and `roleValidation`.

**Rejected because**: `Settings` holds run choices — a different value produces
different output from the same library. This is a fact *about the library*: either
this design system authors composable text as text-in-a-slot or it does not, and
the answer does not change run to run. ADR-071 drew that line, and
`inferNumberProps` sits on the conventions side of it for the identical reason.

---

### Decision 3 — How a `SlotProp` declares the kinds of content it accepts

#### Option A: A reserved sentinel value inside `anyOf`

Admit a reserved entry — `"string"`, or a sigil form like `"$string"` — into the
existing `anyOf: string[]`.

**Rejected because**: `anyOf` lists component names drawn from the library's own
namespace, and a reserved word inside it collides with that namespace. A design
system with a component named `String`, or `Text` under the same scheme extended,
produces an array a consumer cannot disambiguate; the sigil variant only moves the
collision to names beginning with `$`. It also makes the element type a lie —
`string[]` would mean "component names, except the ones that are not", with the
distinction carried by convention rather than type.

---

#### Option B: A dedicated boolean, `acceptsString?: boolean`

**Rejected because**: it answers today's question and closes tomorrow's. The
accepted content set grows — React's `ReactNode` admits a number, and ADR-063
image support makes an image-accepting slot plausible — and each addition would
arrive as another parallel boolean, with no single place to read what a slot
takes. A boolean also cannot express a slot accepting a string and *nothing else*,
the Badge case, because an absent `anyOf` already means "any component", so the
two members cannot jointly narrow.

---

#### Option C: An `accepts` array of content kinds *(Selected)*

Add `accepts?: SlotContentKind[]` to `SlotProp`, where
`SlotContentKind = 'component' | 'string'`. `accepts` states the *kinds* of
content permitted; `anyOf` continues to narrow *which components*. Absence means
`['component']` — today's meaning, unchanged.

```yaml
# An Alert: composable children, and a composable but non-default description
props:
  children:
    type: slot
    defaultSlot: true            # ADR-099, orthogonal
    accepts: [string, component]
  description:
    type: slot
    accepts: [string, component]  # composable, not default
    anyOf: [link, badge]

# A Badge whose children slot is text-only
props:
  children:
    type: slot
    accepts: [string]
```

**Pros**:
- Composes with `anyOf` rather than competing. The two answer different questions
  — what kind, and which components — so a slot widens one and narrows the other
  independently, which neither a sentinel nor a boolean permits.
- Expresses the text-only slot: `accepts: [string]` with no `anyOf` states that no
  component is permitted, where a boolean plus absent `anyOf` still reads as "any
  component, and also a string".
- Extends additively. A future image or number kind adds a union member, not a
  `SlotProp` member, so what a consumer reads stays one place.
- Backward compatible by construction — every published spec omits it, and
  omission is defined as the behavior those specs have.
- Lowercase members match the casing `AnyProp.type` already uses. The
  constitution's SCREAMING_CASE rule scopes to `Styles` and its children, not
  `Props`.

**Cons / Trade-offs**:
- Two members now describe the content set, so a consumer reading only `anyOf`
  sees an incomplete picture — mitigated by absence meaning the historical
  behavior, so an unaware consumer is correct rather than wrong.

---

### Decision 4 — Where the string content's per-variant formatting is recorded

The text layer is inside the slot's default content, so it is a fill and cannot
be an anatomy element (see Context). The element that *is* in anatomy is the slot.
The question is what carries the formatting applied to a string placed in it.

#### Option A: A `contentStyles` companion to `styles` on the slot element *(Selected)*

The slot element gains a second style block beside its own `styles`. Its `styles`
are the slot container's own — padding, alignment, sizing. Its `contentStyles` are
what a fill is formatted with, captured from the single text layer in the slot's
default content. It is addressed through the mechanism that already varies element
values per variant, so per-variant formatting needs nothing new:

```yaml
# api.yaml
anatomy:
  - key: children
    type: slot

# variants.yaml
default:
  elements:
    children:
      styles:
        padding: { $token: "DS Space.200", $type: dimension }
        mainAxisAlignment: CENTER
      contentStyles:
        typography: { $token: "DS Type.Label.Medium", $type: typography }
        textColor: { $token: "DS Color.Text.OnPrimary", $type: color }

variants:
  - configuration: { appearance: primary, state: hover }
    elements:
      children:
        contentStyles:
          textColor: { $token: "DS Color.Text.OnPrimaryHover", $type: color }
  - configuration: { appearance: subtle, state: default }
    elements:
      children:
        contentStyles:
          textColor: { $token: "DS Color.Text.Subtle", $type: color }
```

**Pros**:
- Keeps anatomy honest. The only anatomy element is the slot, which the component
  always has. Nothing in anatomy disappears when the slot takes a component.
- Per-variant formatting costs nothing new. `default.elements` and
  `variants[].elements` are already `Elements` keyed into the same record and
  already where every per-variant element value lives.
- Separates two genuinely separate subjects. A slot container's padding and its
  label's typography are different things, and two members say so structurally
  rather than by naming convention inside one block.
- Makes the discard rule expressible. A component fill is formatted by the
  component, so a consumer applies `styles` and ignores `contentStyles`. That rule
  is only statable because the two are separate members — a merged block has no
  seam to discard along.
- Carries a narrow, named set of formatting properties rather than everything
  `Styles` can hold (Decision 5), so a capture cannot put a container's layout or
  surface styling into the content record.

**Cons / Trade-offs**:
- A reader resolving a property must know which of two blocks it came from.
  Mitigated by the subjects being disjoint in practice.
- `contentStyles` is meaningful only on a slot element. Nothing in the schema
  prevents it elsewhere; the ADR documents rather than enforces that, consistent
  with ADR-099's treatment of the at-most-one-`defaultSlot` invariant.

---

#### Option B: Keep the text layer as its own anatomy element

Leave the slot's default text layer in `anatomy` and `elements`, and read its
per-variant `styles` as the string formatting. No new member anywhere.

**Rejected because**: anatomy would list an element that any composed fill
deletes. A Button filled with a Badge has no label text node, yet anatomy would
declare one, and a transform reading anatomy to emit structure would emit it. The
slot's default content is a fill, and a fill is not a part of the component's
anatomy. It also leaves the discard rule unstateable: with formatting on an
element that may or may not exist, there is nothing to point at to say "this
applies to string fills only".

---

#### Option C: Leave it in `slotContentExamples`

Keep the captured text layer as a `SlotContent` triplet under
`Component.slotContentExamples`, where slot fills already live, and read the
formatting from there.

**Rejected because**: it puts the formatting out of reach of the mechanism that
varies it. `Variant.elements` keys into the component's own `elements` record; a
`SlotContent` triplet has its own, and no variant can address inside one. The
placement would force a companion change — per-variant addressing into
`slotContentExamples`, or a variant array nested in `SlotContent` — to recover
what Option A gets for free, and it fails the per-variant driver outright.

---

#### Option D: A per-variant style block on `SlotProp`

Record the formatting on the prop as an array mirroring `Variants` — each entry a
`configuration` plus the `Styles` that apply.

**Rejected because**: it makes `props` a second place variant-conditional values
live. Every consumer walking variants to resolve a style would have to walk props
too, and the two could disagree with no rule saying which wins. It also makes a
prop definition structurally dependent on the variant axis, where today `props`
declares the API surface and `variants` describes configurations of it. Option A
gets identical expressivity through the mechanism that already exists.

---

### Decision 5 — What type `contentStyles` takes

Decision 4 settled that a style block sits on the slot element. This settles what
may appear inside it.

#### Option A: A narrow, named `ContentStyles` type *(Selected)*

Define `ContentStyles` in `types/Styles.ts` as a `Partial` over exactly the
properties that format content, each typed identically to its `Styles`
counterpart:

```yaml
ContentStyles:
  textColor: ColorStyle
  typography: TokenReference | Typography   # the composite carries fontSize, fontFamily, lineHeight, …
  textAlignHorizontal: TextAlignHorizontal | null
  textAlignVertical: Style
  textOverflow: TextOverflow | null
  maxLines: Style
```

**Pros**:
- The type states what is evaluated. A reader does not have to learn by
  experiment which of `Styles`' forty-odd members mean anything in this position,
  and a transform does not have to decide what to do with a `padding` it finds
  there.
- A capture cannot smuggle a container's styling into the content record. With
  `Styles`, a generator bug that copied the slot frame's `padding` or
  `backgroundColor` into `contentStyles` would validate; here it does not
  compile and does not validate.
- `typography` carries the composite, so its own members — `fontSize`,
  `fontFamily`, `lineHeight`, `letterSpacing`, `textCase`, `textDecoration` —
  travel inside it with no enumeration needed and no second place to maintain
  them.
- Each member keeps the exact type its `Styles` counterpart has, so a value that
  validates in `styles` validates identically in `contentStyles`, and token
  binding, prop binding, and conditionals work unchanged where the underlying
  type is `Style`.
- It expands on a real trigger rather than speculation. Adding `glyph` to
  `SlotContentKind` is what brings `fillColor`, `width`, and `height` into the
  set — an additive, MINOR change at the time the kind exists.

**Cons / Trade-offs**:
- A second type must track `Styles` when a shared member's type changes — if
  `maxLines` were ever narrowed from `Style`, both would need it. This is a real
  maintenance edge, accepted because the alternative permits every property
  rather than the six that mean something.
- The set is a judgement about what formats content today. A text property that
  turns out to matter and is not listed requires an ADR to add, where `Styles`
  would have allowed it silently — which is the point, not a defect.

---

#### Option B: Reuse `Styles` wholesale

Type `contentStyles` as `Styles`, the same type `styles` uses, and let a capture
populate whichever subset it found.

**Rejected because**: it makes the schema permit what it cannot mean. `Styles`
holds layout, sizing, positioning, strokes, corner radius, and padding, none of
which format a string fill, and a `contentStyles` carrying `layoutMode` would
validate while being nonsense. It also leaves consumers without a contract: each
transform would decide independently which members to honour and which to ignore,
and those decisions would drift. The convenience it buys — one `$ref`, no second
type to maintain — is worth less than a type that says what it evaluates.

---

#### Option C: A text-specific `TextStyles` type

Name and scope the type to text, since every property in the set today is a text
property.

**Rejected because**: it repeats Decision 6's `nestedTextStyles` mistake one
level down. The member is reached through a kind-neutral name for a reason — a
glyph or image fill is formatted through the same member — and a type called
`TextStyles` would either have to be renamed when `glyph` joins
`SlotContentKind`, or would sit under `contentStyles` while no longer describing
it. `ContentStyles` names the role the type plays, and the role does not change
when the set widens.

---

### Decision 6 — What the content-style block is called

A separate decision from Decision 4's shape and Decision 5's type. Constitution
VI governs.

#### Option A: `contentStyles` *(Selected)*

**Selected because**: it pairs with `Element.content`, the member that already
names what a content-bearing element carries, so a reader meets it with the right
referent in hand. It is kind-neutral, which matters because the block is not
text-specific even though every value in it today comes from a text layer — a
glyph or image fill is formatted through the same member rather than needing a
second one. Under Constitution VI rule 1, two code platforms agree on the
underlying model: CSS inheritance and SwiftUI's environment propagation both have
a container declare styles its content takes on. `contentStyles` names that
relation without borrowing either one's syntax.

#### Option B: `childStyles`

**Rejected because**: it collides with `Element.children`, a list of element keys.
A reader would reasonably take it to mean "styles for the elements listed in
`children`" — a different and plausible feature — and the collision sits in the
public contract where a wrong first reading is expensive. A slot's fill is not
among the element's `children` either, so the name is inaccurate as well as
ambiguous.

#### Option C: `nestedTextStyles`

**Rejected because**: it names the kind of content rather than the relation, and
so forecloses a non-text fill. A slot accepting a glyph or image would need a
second member of identical shape with a different prefix — the parallel-member
problem Decision 3 rejected `acceptsString` for. The `nested` prefix also does no
work `content` does not do more directly.

#### Option D: `slottedStyles`

**Rejected because**: it borrows `::slotted()`, one platform's syntax, where rule
1 applies and two platforms agree on a broader model. It would also read as
permanently scoped to slots, which is true of today's usage but is a documented
constraint rather than one the name should fix.

---

## Decision

### `PlatformConventions` gains `inferComposableSlots`

`PlatformConventions` (`types/Conventions.ts`) gains `inferComposableSlots?:
boolean`, optional and defaulting to `false`, with a required
`inferComposableSlots: boolean` counterpart on `ResolvedPlatformConventions` and a
`false` entry in `DEFAULT_CONVENTIONS` — mirroring `inferNumberProps` in every
respect (Decision 2). Authored in `config/conventions/figma.yaml`.

When true, a slot whose default content is exactly one text layer is read as
string-composable (Decision 1). When false or absent, slots are emitted exactly as
they are today.

```yaml
# Before (PlatformConventions, excerpt)
PlatformConventions:
  slotConstraints?: boolean
  inferNumberProps?: boolean

# After
PlatformConventions:
  slotConstraints?: boolean
  inferNumberProps?: boolean
  inferComposableSlots?: boolean   # new — optional, default false, MINOR
```

### `SlotProp` gains `accepts`

`SlotProp` (`types/Props.ts`) gains `accepts?: SlotContentKind[]`, where
`SlotContentKind` is a new exported union `'component' | 'string'` (Decision 3).
`anyOf` is unchanged and continues to narrow which components are permitted.
Absence of `accepts` means `['component']`.

```yaml
# After (SlotProp, excerpt)
SlotProp:
  type: 'slot'
  anyOf?: string[]
  defaultSlot?: boolean
  accepts?: SlotContentKind[]   # new — optional, MINOR

# New exported union
SlotContentKind: 'component' | 'string'
```

A slot read as string-composable is emitted with `'string'` among its `accepts`.
Whether `'component'` joins it, and what `anyOf` lists, follows from the slot's
captured constraints as it does today.

**Default-ness is untouched.** `defaultSlot` and
`SpecsConventions.slots.default.match` keep exactly the meaning ADR-099 gave
them. A string-composable slot may or may not be the default slot, and the two
records are independent.

### `Element` gains `contentStyles`

`Element` (`types/Element.ts`) gains `contentStyles?: ContentStyles` (Decision 4,
typed per Decision 5, named per Decision 6). On a slot element it carries the
styles applied to content filling the slot, captured from the single text layer in
the slot's default content.

```yaml
# After (Element, excerpt)
Element:
  children?: Children
  styles?: Styles
  contentStyles?: ContentStyles   # new — optional, MINOR
  content?: string | PropBinding
```

`ContentStyles` is a new type in `types/Styles.ts` — a `Partial` over exactly the
properties that format content, each typed identically to its `Styles`
counterpart, so a value valid in `styles` is valid here:

```yaml
# New type (types/Styles.ts)
ContentStyles:
  textColor: ColorStyle
  typography: TokenReference | Typography   # composite — fontSize, fontFamily, lineHeight, … travel inside
  textAlignHorizontal: TextAlignHorizontal | null
  textAlignVertical: Style
  textOverflow: TextOverflow | null
  maxLines: Style
```

Nothing else may appear in `contentStyles`. The set widens when another kind joins
`SlotContentKind` — a glyph would add `fillColor`, `width`, `height` — and that
widening is an additive MINOR change at the time the kind exists, not now.

It is per-variant through the existing mechanism, with no new structure:
`default.elements[key].contentStyles` carries the default formatting, and
`variants[].elements[key].contentStyles` overrides it per configuration, exactly
as `styles` is overridden today.

**`contentStyles` applies to a string fill only.** A component fill is formatted
by the component it instantiates; a consumer rendering one applies the element's
`styles` and discards its `contentStyles` rather than cascading them onto the
instance.

**The slot's default text layer is not an anatomy element.** The anatomy element
is the slot. The text layer inside it is the slot's default content, its
formatting is what `contentStyles` records, and it does not also persist as its
own entry in `anatomy` or `elements`.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Props.ts` | Added `SlotContentKind` exported union (`'component' \| 'string'`) | MINOR |
| `Props.ts` | Added `accepts?: SlotContentKind[]` to `SlotProp` | MINOR |
| `Props.ts` | Doc-only: `anyOf` description clarified to narrow components *within* the accepted kinds | PATCH |
| `Styles.ts` | Added `ContentStyles` exported type — a `Partial` over `textColor`, `typography`, `textAlignHorizontal`, `textAlignVertical`, `textOverflow`, `maxLines` | MINOR |
| `Element.ts` | Added `contentStyles?: ContentStyles` to `Element` | MINOR |
| `Conventions.ts` | Added `inferComposableSlots?: boolean` to `PlatformConventions` | MINOR |
| `Conventions.ts` | Added required `inferComposableSlots: boolean` to `ResolvedPlatformConventions` | MINOR |
| `index.ts` | Exported `SlotContentKind` and `ContentStyles` from the barrel | MINOR |

`DEFAULT_CONVENTIONS` gains nothing. It carries no members at all — a platform-keyed
map has no fixed key to populate — so the `false` default is supplied by whoever
resolves a platform, exactly as `inferNumberProps`' and `slotConstraints`' are. Only
the doc comment naming those defaulted members is updated.

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Added `SlotContentKind` definition (string enum: `component`, `string`) | MINOR |
| `component.schema.json` | Added `accepts` array property to `SlotProp`, items `$ref`-ing `SlotContentKind` | MINOR |
| `styles.schema.json` | Added the `ContentStyles` definition beside `Styles` — the six content-formatting properties, each `$ref`-ing the value-type definition its `Styles` counterpart uses, with `additionalProperties: false` | MINOR |
| `component.schema.json` | Added a `ContentStyles` stub `$ref`-ing `styles.schema.json#/definitions/ContentStyles`, mirroring how `Styles` is already referenced | MINOR |
| `component.schema.json` | Added `contentStyles` property to `Element`, `$ref`-ing `ContentStyles` | MINOR |
| `component.schema.json` | Doc-only: `SlotProp.anyOf` description updated to match the type doc | PATCH |
| `conventions.schema.json` | Added `inferComposableSlots` boolean (`default: false`) to the `PlatformConventions` definition | MINOR |

No `ResolvedPlatformConventions` counterpart is added to `schema/`, because the schema
defines no `Resolved*` shape at all — it validates authored documents, and the resolved
shapes exist only in `types/`. That is a pre-existing, justified asymmetry this ADR
inherits rather than introduces.

**Example — new shape** (`schema/component.schema.json`):
```yaml
# New definition
SlotContentKind:
  type: string
  enum: [component, string]
  description: >
    A kind of content a slot permits. `component` admits a component instance,
    narrowed by the slot's `anyOf` when present. `string` admits plain string
    content, formatted by the slot element's `contentStyles`.

# New property under #/definitions/SlotProp/properties
accepts:
  type: array
  items:
    $ref: '#/definitions/SlotContentKind'
  description: >
    The kinds of content this slot permits. Absent means `["component"]` — a slot
    admitting component instances only, which is how every slot without this
    property behaves. `string` is recorded when the slot's default content was a
    single text layer and the platform declared `inferComposableSlots`; the
    formatting applied to a string fill is then in the slot element's
    `contentStyles`, per variant via `variants[].elements`. Orthogonal to
    `anyOf`, which narrows which components are permitted rather than which
    kinds, and to `defaultSlot`, which states whether this is the default slot.

# New definition, beside Styles
ContentStyles:
  type: object
  additionalProperties: false
  properties:
    textColor: { $ref: '#/definitions/ColorStyleValue' }
    typography: { $ref: '#/definitions/TypographyValue' }
    textAlignHorizontal: { $ref: '#/definitions/TextAlignHorizontal' }
    textAlignVertical: { $ref: '#/definitions/StyleValue' }
    textOverflow: { $ref: '#/definitions/TextOverflow' }
    maxLines: { $ref: '#/definitions/StyleValue' }
  description: >
    The styles that apply to content filling an element. Deliberately narrower
    than `Styles`: only properties that format content appear, so a container's
    layout or surface styling cannot enter the content record. Each property is
    typed identically to its `Styles` counterpart, so a value valid in `styles`
    is valid here. `typography` carries the composite, so its own members
    travel inside it. The set widens when another kind joins `SlotContentKind`.

# New property under #/definitions/Element/properties
contentStyles:
  $ref: '#/definitions/ContentStyles'
  description: >
    Styles applied to content filling this element, as distinct from `styles`,
    which are the element's own. On a slot element this is the formatting a
    string fill takes on — captured from the single text layer in the slot's
    default content — overridden per variant through `variants[].elements`
    exactly as `styles` is. A component fill is formatted by the component it
    instantiates, so a consumer rendering one applies `styles` and discards
    `contentStyles`. Meaningful only on a slot element; that constraint is an
    authoring/generator contract, not schema-enforced.
```

### Notes

- `ContentStyles` is closed at six properties, not a `Partial<Styles>`. A capture
  records whichever of the six it found; anything else is invalid rather than
  ignored. The member name stays kind-neutral so the *type* can widen when a kind
  is added without the member being renamed.
- `typography` is listed once, as the composite. Its members — `fontSize`,
  `fontFamily`, `lineHeight`, `letterSpacing`, `textCase`, `textDecoration` and
  the rest — are not enumerated in `ContentStyles`, because `Typography` already
  holds them and duplicating the list would create a second place to maintain it.
- `accepts` and `defaultSlot` are independent, and so are the facts behind them.
  An Alert's `description` is string-composable and not default; a multi-slot
  layout component's slots are default-eligible and take components only.
- No ordering or uniqueness constraint is placed on `accepts`. It is a set
  expressed as an array, following `anyOf`'s precedent on the same type.
- An empty `accepts: []` is not given a meaning and should not be emitted.
  `nullable` already states that a slot may be empty.
- **The string value itself is not re-decided here.** A string filling a slot is a
  slot fill like any other, recorded where slot fills already are —
  `SlotProp.default` for the authoring default, `Element.propConfigurations` for
  an instance's fill. This ADR changes what a slot *accepts* and how a string fill
  is *formatted*, not where a fill is written.
- A slot whose default content is a text layer *plus* another child is not
  string-composable. Two children are a composed arrangement; only the
  single-text-layer case is read as a string.
- No `number` kind is added to `SlotContentKind`. React's `ReactNode` admits one,
  but no observed Figma slot carries numeric-only default content that a
  `NumberProp` does not describe better, so adding it now would be speculative.
  The union is where it lands additively if a real case emerges.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `SlotContentKind` (type, `types/Props.ts`) maps to
  `#/definitions/SlotContentKind` — a string literal union against a string enum
  with the same two members.
- **Parity check**: `SlotProp.accepts` maps to
  `#/definitions/SlotProp/properties/accepts` — both optional arrays of
  `SlotContentKind`, both absent-means-`['component']`, neither in `required[]`.
- **Parity check**: `ContentStyles` (type, `types/Styles.ts`) maps to
  `#/definitions/ContentStyles` (schema, `component.schema.json`, mirrored in
  `styles.schema.json`) — the same six properties on both sides, each `$ref`-ing
  the definition its `Styles` counterpart uses, with `additionalProperties: false`
  enforcing the closed set the `Partial` expresses.
- **Parity check**: `Element.contentStyles` maps to
  `#/definitions/Element/properties/contentStyles`, which `$ref`s
  `ContentStyles` — optional on both sides, absent from `required[]`.
- **Parity check**: `PlatformConventions.inferComposableSlots` (optional,
  defaults to false) maps to
  `#/definitions/PlatformConventions/properties/inferComposableSlots` with
  `default: false`.
- **Justified asymmetry**: `ResolvedPlatformConventions.inferComposableSlots` is
  required in `types/` and has no schema counterpart, because `schema/` defines no
  `Resolved*` shape — it validates authored documents, and resolved shapes are
  in-memory only. `inferNumberProps` and `slotConstraints` sit the same way. The
  required-on-resolved form is what lets a consumer read a boolean without a null
  check, and resolution is what supplies it.
- **No unjustified asymmetry.** The constraints this ADR states but does not
  encode — `contentStyles` being meaningful only on a slot element, and a
  component fill discarding it — are expressed in descriptions on both sides and
  introduce no field on either.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Reads `inferComposableSlots` and, when set, inspects each slot's default content: a single text layer makes the slot string-composable, recorded as `'string'` in `accepts`. That layer's styles are captured into the slot element's `contentStyles`, per variant, and the layer is no longer emitted as its own anatomy element. | Engine work to apply the reading and the capture relocation this ADR decides. |
| `figma-from-specs` | Reads `accepts` to decide whether a slot's fill is string content or a composed instance, and on a string fill rebuilds the text layer inside the slot from `contentStyles` for the variant being rendered. Applies `styles` but not `contentStyles` to a component fill. | Engine work to render a string-composable slot in both fill modes. |
| `specs-cli` | Loads and validates `inferComposableSlots` from `config/conventions/figma.yaml`, and documents it in the `init` template. The `react` and `webcomponents` transforms emit a string-composable slot as content rather than a string prop — `children: ReactNode`, or a named `<slot>` — and emit `contentStyles` as the rule formatting slotted text, applied to string content only. | Config loader, template, and transform work. |
| `specs-plugin-2` | None at this ADR's scope. | Recompiles against the new optional members; no behavioral change until the engine it bundles consumes them. |

---

## Semver Decision

**Target version**: `0.35.0` — the version of `@directededges/specs-schema` on
the active release branch (`release/next`) this ADR merges into.

**Change class**: `MINOR`.

**Justification**: The additions are three optional members (`accepts` on
`SlotProp`, `contentStyles` on `Element`, `inferComposableSlots` on
`PlatformConventions`) and two new exported types (`SlotContentKind`,
`ContentStyles`), with no removal, rename, or narrowing of any existing field —
additive-only per Constitution Additional Constraints & Standards ("Versioning":
MINOR for additive types or new optional fields). `ContentStyles` narrows nothing
that exists: it is a new type, and no published field changes type to adopt it.

The required `inferComposableSlots` on `ResolvedPlatformConventions` is a new
required member on a resolved shape, which is MAJOR-shaped in isolation. It is
MINOR here on the same grounds `inferNumberProps` and `slotConstraints` were:
`ResolvedPlatformConventions` is produced by resolution, never authored, and
resolution supplies the default — so no authored document becomes invalid and no
consumer loses a field it had.

That a string-composable slot's default text layer stops being emitted as an
anatomy element changes generated output, but only for a library that sets
`inferComposableSlots: true`. The opt-in default of `false` is what keeps this
MINOR rather than MAJOR.

---

## Consequences

- A slot can state that it accepts plain string content, so a Button, Badge, or
  Alert label is describable as what it is on every code platform — content that
  may be a string or a component — rather than as one or the other.
- The two cases are distinguished by what a designer already authored: a slot with
  a text layer in its default content is composable; a `TEXT` property on a text
  layer is a plain string. No convention names it, no annotation declares it, and
  nothing can drift out of sync with the file.
- This works at per-component granularity for free. An Alert's `description` is
  composable because that Alert's `description` slot has text in it; a Tooltip's
  `message` is a plain string because it is a `TEXT` prop. Neither needs an entry
  anywhere.
- Composability and default-ness are independent records. A string-composable slot
  may be the default slot or not, and ADR-099's convention and marker are
  untouched by this ADR.
- The reading is opt-in per platform via `inferComposableSlots`, defaulting to
  `false`. A library that declares nothing gets byte-identical output.
- A library that opts in and has placeholder-only text slots will see those slots
  gain `accepts: [string, component]`. The failure mode is a wider content set
  than intended, not a wrong one — the remedy is authoring the slot without a lone
  text layer, or leaving the reading off.
- Anatomy stays honest. A composable slot contributes one anatomy element — the
  slot — and nothing in anatomy disappears when the slot takes a component.
- A string fill's formatting is recorded on the slot element as `contentStyles`,
  separate from the slot container's own `styles`, and varies per variant through
  `default.elements` and `variants[].elements` — the mechanism every other
  per-variant element value already uses.
- A component fill does not inherit the string formatting. `contentStyles`
  describes content formatting specifically, and its separation from `styles` is
  what makes discarding it expressible.
- Two style blocks now exist on `Element`, and they are different types. `styles`
  stays `Styles`; `contentStyles` is `ContentStyles`, closed at `textColor`,
  `typography`, `textAlignHorizontal`, `textAlignVertical`, `textOverflow`, and
  `maxLines`. A property outside that set in `contentStyles` is invalid rather
  than ignored, so a generator cannot quietly record a container's layout as
  content formatting.
- The content-formatting set expands only when a content kind is added. Adding
  `glyph` to `SlotContentKind` is what brings `fillColor`, `width`, and `height`
  into `ContentStyles`, as an additive MINOR change at that time.
- `contentStyles` is meaningful only on a slot element. The schema permits it
  anywhere an `Element` appears, and that constraint is an authoring/generator
  contract rather than a validated one — consistent with ADR-099's handling of the
  at-most-one-`defaultSlot` invariant.
- `anyOf` acquires a companion rather than a replacement. A consumer reading only
  `anyOf` behaves as it does today; one reading both learns the full content set.
- **Follow-up implementation work in `specs-from-figma`**: read
  `inferComposableSlots`, inspect slot default content, record `accepts`, capture
  the text layer's styles into `contentStyles` per variant, and stop emitting that
  layer as an anatomy element.
- **Follow-up implementation work in `figma-from-specs`**: render a
  string-composable slot in both fill modes, rebuilding the text layer from
  `contentStyles` on a string fill and ignoring it on a component fill.
- **Follow-up implementation work in `specs-cli`**: load and template the new
  convention, and emit the slot as content in the React and Web Components
  transforms.
- All three are engine work against a rule this ADR decides. None is a deferred
  design decision, and none requires a further ADR unless it surfaces a
  schema-visible concept this ADR did not anticipate.
