---
title: "ColorObject"
description: "Structured color value preserving color space and components"
---

An inline resolved color value per [DTCG Color Module §4.1](https://tr.designtokens.org/color/). Used as one arm of [`ColorStyle`](/schema/styles/background-color/#types) when `Config.format.color` is set to `OBJECT`.

```ts
interface ColorObject {
  colorSpace: string;
  components: (number | 'none')[];
  alpha?: number;
  hex?: string;
}
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `colorSpace` | `string` | Yes | Color space identifier per DTCG Color §4.2 (e.g. `srgb`, `oklch`, `display-p3`) |
| `components` | `(number \| 'none')[]` | Yes | Ordered component values for the given color space |
| `alpha` | `number` | No | Alpha channel 0–1. Defaults to 1 (fully opaque) when omitted |
| `hex` | `string` | No | Optional 6-digit sRGB fallback (`#RRGGBB`) — alpha excluded per DTCG §4.1 |

```yaml
colorSpace: srgb
components: [1, 0.4, 0]
alpha: 1
hex: "#FF6600"
```

The `colorSpace` field is typed as `string` rather than a literal union to avoid drift with the schema enum — the schema provides the validation constraint. 14 `colorSpace` values are supported, corresponding to DTCG Color §4.2.

This shape mirrors `ColorObject` in `schema/styles.schema.json`.

## Further Reading

- [Settings → Color](/settings/color/) — controls whether colors serialize as `ColorObject`, hex string, or CSS functional notation
