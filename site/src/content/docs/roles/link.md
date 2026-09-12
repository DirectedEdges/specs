---
title: "link"
description: "Emit a real anchor with href, so navigation is announced, focusable, and copyable"
---

The `link` role declares that an element navigates to another location when activated.

## Why it matters

An anchor, not a button — and the distinction is not cosmetic. A link is announced as a link, opens in a new tab on modifier-click, appears in a screen reader's links list, and is dragged and copied as a URL. A button does none of that. Without the role, a link scaffolds as a generic container: it cannot be tabbed to, Enter does nothing, and it has no `href` for a consumer to point anywhere.

## Emission

### Scaffold

| | |
|---|---|
| Element | `<a href>` |
| Accepted element types | `container`, `text`, `glyph` |
| Accepted parts | `label` |

A glyph carrying the role is re-hosted inside the anchor rather than becoming it, the way a glyph carrying [button](/roles/button/) is.

### Contract

| Prop | Type | Tier | Generated body |
|------|------|------|----------------|
| `href?` | `string` | MUST | Destination. Absent renders a placeholder the browser cannot focus |
| `target?` | `string` | SHOULD | Passed through |
| `rel?` | `string` | SHOULD | Passed through |
| `onClick?` | `(e: MouseEvent) => void` | SHOULD | Stub — navigation is the browser's; what a click means beyond it is the consumer's |

The design file cannot say where a link goes, so `href` is a contract addition with no source in the spec — the one prop this role exists to create a home for.

## States

| State | What the link does | Classify in `states`? |
|-------|--------------------|----------------------------------|
| `disabled` | Drops `href` — which is what actually removes it from the tab order — and announces `aria-disabled` | Recommended |
| `current` | `aria-current="true"` | Recommended |
| `hover` / `active` | Native anchor states | Recommended, if the library styles it |
| `focus` / `focus-visible` | Native focus ring | **Optional — prefer the platform default** |

Two decisions recorded here that earlier emission made silently:

- **Disabled.** An anchor has no `disabled` property. A disabled link drops `href` and carries `aria-disabled="true"`; `aria-disabled` alone would announce a state the element does not enforce. The `css` transformer's disabled selector special-cases anchors to match.
- **`current` is a role concern**, bridged natively like `pressed` on a togglebutton: the role emits `aria-current="true"` — the generic token, matching the states table's canonical `[aria-current="true"]` selector — and the states convention supplies the prop. An earlier emission wrote `aria-current="page"`, which no stylesheet selector matched; the generic token is the recorded resolution.

## Accessible name

A link takes its name from its own text. Where none resolves, the `accessibility.label` convention's prop emits as `aria-label`, and nothing resolving is a warning — a link that announces nothing is worse than the container it replaced.

## Platforms

| | Emits | Behavior a user gets |
|---|---|---|
| Web | `<a href>` | Tab-focusable, Enter navigates, modifier-click opens a tab, appears in the links list |
| iOS | `Link` | VoiceOver announces it as a link and double-tap opens it |
| Android | Clickable text with link semantics | TalkBack announces it as a link and double-tap opens it |

## Before and after

Without the role:

```tsx
<div className="ds-inline-link" data-element="root">
  {p.text}
</div>
```

With the role:

```tsx
<a
  className="ds-inline-link"
  data-element="root"
  href={p.disabled ? undefined : p.href}
  aria-disabled={p.disabled ? true : undefined}
  aria-current={p.current ? 'true' : undefined}
  target={p.target}
  rel={p.rel}
  onClick={(e) => p.onClick?.(e)}
>
  {p.text}
</a>
```

## See also

- [button](/roles/button/) — activation without navigation
- [disclosure](/roles/disclosure/) — a trigger that expands a region rather than leaving the page
- [Roles overview](/roles/) — how roles and the `states` convention fit together
