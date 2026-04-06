---
title: Typography
order: 16
description: Text style properties for font, spacing, and alignment
---

# Typography

A `Typography` object holds individual text style properties. It appears on the `typography` style property as an alternative to a [`TokenReference`](token-reference.md) — when the text style is not backed by a single token, the individual properties are listed instead.

```ts
interface Typography {
  fontSize?: number | 'mixed' | TokenReference;
  fontFamily?: string | 'mixed' | TokenReference;
  fontStyle?: string | 'mixed' | TokenReference;
  lineHeight?: string | number | TokenReference;
  letterSpacing?: number | 'mixed' | TokenReference;
  textCase?: string | 'mixed' | TokenReference;
  textDecoration?: string | 'mixed' | TokenReference;
  paragraphIndent?: number | TokenReference;
  paragraphSpacing?: number | TokenReference;
  leadingTrim?: 'NONE' | 'CAP_HEIGHT' | 'mixed';
  listSpacing?: number | TokenReference;
  hangingPunctuation?: boolean | TokenReference;
  hangingList?: boolean | TokenReference;
}
```

## Properties

| Name | Category | Description |
|------|----------|-------------|
| `fontFamily` | font | Font family name |
| `fontSize` | font | Font size in pixels |
| `fontStyle` | font | Font style (e.g. `"Regular"`, `"Bold Italic"`) |
| `hangingList` | formatting | Enable hanging list markers |
| `hangingPunctuation` | formatting | Enable hanging punctuation |
| `leadingTrim` | spacing | Leading trim mode |
| `letterSpacing` | spacing | Letter spacing in pixels |
| `lineHeight` | spacing | Line height (number for pixels, string for percentages like `"150%"`) |
| `listSpacing` | spacing | Spacing between list items |
| `paragraphIndent` | spacing | First-line indent in pixels |
| `paragraphSpacing` | spacing | Spacing between paragraphs in pixels |
| `textCase` | formatting | Text transform (e.g. `"UPPER"`, `"LOWER"`, `"TITLE"`) |
| `textDecoration` | formatting | Text decoration (e.g. `"UNDERLINE"`, `"STRIKETHROUGH"`) |

## Values

| Name | Description | Example |
|------|-------------|---------|
| `number` | Literal numeric value | `16` |
| `string` | Literal string value | `"Inter"` |
| `boolean` | Literal boolean value | `true` |
| `'mixed'` | Multiple conflicting values within a single text node | `"mixed"` |
| [`TokenReference`](token-reference.md) | Reference to a design token | `{ $token: "DS.Font.Size.400", $type: "dimension" }` |
| `'NONE' \| 'CAP_HEIGHT'` | Leading trim enum (for `leadingTrim` only) | `"CAP_HEIGHT"` |

## Example

```json
{
  "fontSize": 14,
  "fontFamily": "Inter",
  "fontStyle": "Medium",
  "lineHeight": "150%",
  "letterSpacing": 0
}
```

## Further Reading

- [ADR 005 — Replace Typography Flat Properties with Composite](../../adr/005-typography-composite.md) — consolidates 14 flat typography keys into a single composite type
- [ADR 032 — Typography leadingTrim — Correct to String Enum](../../adr/032-typography-leading-trim-enum.md) — fixes `leadingTrim` to a string enum
- [ADR 033 — Typography fontFamily/fontStyle — Remove Number, Add TokenReference](../../adr/033-typography-font-token-reference.md) — adds token reference support to font properties
