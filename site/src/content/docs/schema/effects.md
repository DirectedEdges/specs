---
title: "Effects"
description: "Shadows and blur effects"
---

An `Effects` object holds shadow and blur definitions. It appears on the `effects` style property as an alternative to a [`TokenReference`](/schema/token-reference/).

```ts
interface Effects {
  shadows?: Shadow[];
  layerBlur?: Blur;
  backgroundBlur?: Blur;
}
```

## Properties

| Name | Category | Description |
|------|----------|-------------|
| `shadows` | shadow | Array of drop and inner shadow definitions |
| `layerBlur` | blur | Layer blur (`filter: blur()`) |
| `backgroundBlur` | blur | Background blur (`backdrop-filter: blur()`) |

## Values

| Name | Description | Example |
|------|-------------|---------|
| `Shadow` | A single shadow definition | `{ visible: true, offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: "#00000040" }` |
| `Blur` | A blur definition | `{ visible: true, radius: 8 }` |

### Shadow

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `visible` | `boolean` | Yes | Whether the shadow is active |
| `inset` | `boolean` | No | `true` for inner shadow; absent or `false` for drop shadow |
| `offsetX` | `number \| TokenReference` | Yes | Horizontal offset |
| `offsetY` | `number \| TokenReference` | Yes | Vertical offset |
| `blur` | `number \| TokenReference` | Yes | Blur radius |
| `spread` | `number \| TokenReference` | Yes | Spread distance |
| `color` | `string \| TokenReference` | Yes | Shadow color (`#RRGGBBAA` or [token](/schema/token-reference/)) |

### Blur

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `visible` | `boolean` | Yes | Whether the blur is active |
| `radius` | `number \| TokenReference` | Yes | Blur radius |

## Example

```yaml
shadows:
  - visible: true
    offsetX: 0
    offsetY: 4
    blur: 8
    spread: 0
    color:
      $token: DS Color.Shadow.Default
      $type: color
  - visible: true
    inset: true
    offsetX: 0
    offsetY: 1
    blur: 0
    spread: 1
    color: "#0000001A"
backgroundBlur:
  visible: true
  radius: 12
```

## Further Reading

- [ADR 002 — Replace effectStyleId with effects](https://github.com/DirectedEdges/specs/blob/main/adr/002-effects-shadows-blurs.md) — introduces the grouped `Effects`, `Shadow`, and `Blur` types
