---
title: "styling"
description: "Emit a token inventory showing which variables are applied to each anatomy element"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a `styling.json` file for each component. Each entry lists the Figma variables, color styles, text styles, and effect styles applied to the component's anatomy elements, along with how they are applied (fill, background, spacing, etc.).

## Use When

- You want an audit of which design tokens a component uses without reading the spec YAML directly.
- You want to cross-reference token application across components.
- You want to detect when a component uses a token not in your design system's published set.

## Invocation

```bash
specs analyze styling
```

## Output

Writes two files to `_analysis/` after all components are processed.

## Example: By Component

`_analysis/styling.byComponent.json` contains every component keyed by scope (and subcomponent dot-keys). Each entry has four arrays — `variables`, `colorStyles`, `textStyles`, `effectStyles`.

```json
{
  "dsAlert": {
    "variables": [
      {
        "name": "Color/Surface/Neutral",
        "appliedAs": "backgroundColor",
        "appliedTo": { "root": 1 }
      },
      {
        "name": "Color/Surface/Warning",
        "appliedAs": "backgroundColor",
        "appliedTo": { "root": 1 }
      },
      {
        "name": "Color/Icon/Neutral",
        "appliedAs": "fillColor",
        "appliedTo": { "icon": 1 }
      },
      {
        "name": "Color/Icon/Warning",
        "appliedAs": "fillColor",
        "appliedTo": { "icon": 1 }
      },
      {
        "name": "Radius/LG",
        "appliedAs": "cornerRadius",
        "appliedTo": { "root": 1 }
      },
      {
        "name": "Space/3",
        "appliedAs": "itemSpacing",
        "appliedTo": { "root": 1 }
      },
      {
        "name": "Space/4",
        "appliedAs": "padding.top",
        "appliedTo": { "root": 1 }
      },
      {
        "name": "Space/6",
        "appliedAs": "padding.start",
        "appliedTo": { "root": 1 }
      },
      {
        "name": "Size/Icon/MD",
        "appliedAs": "width",
        "appliedTo": { "icon": 1 }
      },
      {
        "name": "Size/Icon/MD",
        "appliedAs": "height",
        "appliedTo": { "icon": 1 }
      }
    ],
    "colorStyles": [],
    "textStyles": [
      {
        "name": "Typography/Body/SM",
        "appliedAs": "textStyle",
        "appliedTo": { "body": 1 }
      }
    ],
    "effectStyles": []
  },
  "dsAlert.actions": {
    "variables": [
      {
        "name": "Space/3",
        "appliedAs": "itemSpacing",
        "appliedTo": { "root": 1 }
      }
    ],
    "colorStyles": [],
    "textStyles": [],
    "effectStyles": []
  }
}
```

Each token entry has:

| Field | Description |
|-------|-------------|
| `name` | Full Figma variable or style name |
| `appliedAs` | How the token is used: `backgroundColor`, `fillColor`, `cornerRadius`, `itemSpacing`, `padding.start`, etc. |
| `appliedTo` | Map of anatomy element name → occurrence count |

## Example: By Token

`_analysis/styling.byToken.json` is the token-first view — it answers "which components use this token?" and is useful for auditing token coverage or planning a token rename.

```json
{
  "Color/Surface/Neutral": {
    "appliedAs": "backgroundColor",
    "usedBy": {
      "dsAlert": { "root": 1 },
      "dsBanner": { "root": 1 },
      "dsToast": { "root": 1 }
    }
  },
  "Space/6": {
    "appliedAs": "padding.start",
    "usedBy": {
      "dsAlert": { "root": 1 },
      "dsCard": { "root": 1 },
      "dsDialog": { "root": 2 }
    }
  },
  "Typography/Body/SM": {
    "appliedAs": "textStyle",
    "usedBy": {
      "dsAlert": { "body": 1 },
      "dsTooltip": { "body": 1 }
    }
  }
}
```

## See Also

- [Analyze overview](/specs/cli/analyze/)
- [`props` analyzer](/specs/cli/analyze/props/)
- [Transforms overview](/specs/cli/transforms/)
