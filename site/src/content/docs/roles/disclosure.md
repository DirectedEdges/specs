---
title: "disclosure"
description: "Emit an expandable trigger wired to its panel through aria-expanded and aria-controls"
---

The `disclosure` role declares that an element is the trigger for a region that expands and collapses — an accordion header, a "show more" control, a details summary. The region itself carries the [`panel`](/roles/panel/) part role.

## Why it matters

Without the role, an accordion header is a container with a rotating chevron. It cannot be focused or activated from the keyboard, and nothing in the markup connects the header to the region it controls — so assistive technology cannot report that the control is expandable, cannot report its current state, and cannot navigate a user to the content that appeared.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<button type="button" aria-expanded aria-controls>` |
| Accepted element types | `container` |
| Accepted parts | `label`, `panel`, `indicator` |

There is no `disclosure` ARIA role. The emission is a button plus two attributes; `role="disclosure"` is never emitted, because it is not a valid ARIA value.

The trigger and the panel are one concept, not two: the trigger carries the role, the region carries `#panel`, and the `aria-controls` linkage follows from that pairing. The panel is typically not a descendant of the trigger — the two are usually siblings under a shared root — so parts resolve by proximity, and two disclosures in one component with an ambiguous panel is an error naming both candidates, never a silent pick.

The role never hides the panel. It emits semantics and linkage only; visibility stays with CSS and the variant conditions the analysis already produced, so a library that animates the transition keeps working.

Edge cases:

- A disclosure with no `#panel` part emits `aria-expanded` only, plus a warning.
- A panel absent in the current variant makes `aria-controls` conditional, matching the panel's own render condition — pointing it at an id that is not in the document is worse than omitting it.
- A library that carries separate collapsed and expanded label props binds only one into the anatomy, so an expanded trigger would announce its collapsed label. The transform warns when it detects an unpairable sibling text prop; a `propRoles` entry pairing a state concept to the alternate text prop fixes it.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `onExpandedChange?` | `(expanded: boolean) => void` | MUST | **Wired** — flips expanded, then calls the prop |
| `onClick?` | `(e: MouseEvent) => void` | SHOULD | Stub, called after the toggle |
| `expanded` | `boolean` | — | The existing variant prop |

`onExpandedChange` is **wired**: the transform generates real state logic — it holds internal state seeded from the `expanded` prop, flips it on activation, and calls the consumer callback. The accordion opens and closes before a consumer attaches anything.

Wiring has a prerequisite: the transform must know which prop holds the expanded state, and it never guesses one by name. That binding comes from the `expanded` classification in [`processing.states`](/settings/states/). Without it the handler degrades to a stub and the transform warns.

`onClick` is a stub — the transform calls the prop and nothing else, because what a click means beyond the toggle is the consumer's decision and the design file cannot say what it is.

## States

| State | What the disclosure does | Classify in `processing.states`? |
|-------|--------------------------|----------------------------------|
| `expanded` | `aria-expanded="true"`, flipped by the wired handler | Recommended |
| `collapsed` | `aria-expanded="false"` | Recommended |
| `disabled` | Native `disabled` — unfocusable and unclickable, enforced by the platform | Recommended |
| `hover` | Native hover | Recommended, if the library styles it |
| `active` | Native pressed-down | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus ring | **Optional — prefer the platform default** |

Platforms ship a focus indicator that already meets contrast requirements and matches what users of that platform expect, so specifying one from Figma usually replaces a good default with a worse one.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<button type="button" aria-expanded aria-controls>` | Tab-focusable, Enter and Space toggle, screen readers announce "expanded" or "collapsed" |
| iOS | `DisclosureGroup` | VoiceOver announces the expanded state, and double-tap toggles it |
| Android | Toggleable header with expand/collapse semantics | TalkBack announces "expanded" or "collapsed", double-tap toggles, and it joins the accessibility focus order |

## Before and after

Without the role:

```tsx
<div className="accordion-header" data-element="header" data-expanded={p.expanded}>
  {/* … */}
</div>
<div className="accordion-panel" data-element="panel">{p.children}</div>
```

With the role:

```tsx
<button
  type="button"
  className="accordion-header"
  data-element="header"
  aria-expanded={isExpanded}
  aria-controls={panelId}
  onClick={() => { setExpanded(!isExpanded); p.onExpandedChange?.(!isExpanded); }}
>
  {/* … */}
</button>
<div className="accordion-panel" data-element="panel" id={panelId}>{p.children}</div>
```

Only two elements change, and neither changes depth.

## See also

- [panel](/roles/panel/) — the controlled region
- [button](/roles/button/) — the same base emission without expansion
- [Roles overview](/roles/) — how roles and `processing.states` fit together
