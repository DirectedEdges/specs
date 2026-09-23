---
title: "Licensing"
---

<script>document.querySelector('#_top').insertAdjacentHTML('afterbegin','<span class="sl-badge pro-badge pro-badge-hero">Pro</span>')</script>

Specs works at two tiers: **Free** and **Pro**. Both read the same Figma files, honour the same configuration, and produce the same structure. The difference is how much of that structure is filled in — free output describes each component, Pro output connects it to your token system, its other components, and every state it can be in.

Everything is usable at the free tier. Nothing is time-limited, watermarked, or withheld until you pay; a free spec is a complete, valid spec, and a free React component renders.

A Pro subscription is **$10/month**.

- [Purchase Pro](https://buy.polar.sh/polar_cl_xnq7zeKLXunrhOIpfNwA56F4wIq2Y0lLNCKmb0hhYJH) via Polar — you'll receive your license keys by email at checkout
- [Manage your subscription](https://polar.sh/directed-edges-llc/portal) from your Polar customer portal
- Need help? Contact [nathan@specsplugin.com](mailto:nathan@specsplugin.com)

## What Pro unlocks

Specs makes three things. Each has a free tier and a Pro tier, and they are gated separately.

| What you get | Made by | Free | Pro adds |
|---|---|---|---|
| **[The spec](#the-spec)** | The plugin, and `generate` | Component structure, the default variant, metadata | Every other variant, token and style references, prop bindings, invalid combinations |
| **[Canvas output](#canvas-output)** | The plugin | Every spec section, multi-column layout, all settings | Custom styling, the Examples settings, the Bridge tab |
| **[Emitted code](#emitted-code)** | `react` and `webcomponents` | The component, its contract, its stylesheet, one story per variant axis | Composition, glyphs, background images, compound stories, sticker sheets |

Nothing else is licensed. `fetch`, `scan`, `init`, `render`, `version`, `analyze`, `bridge`, `cache`, `migrate`, `applyCustomTokens` and `skills` behave identically with or without a key.

The rest of this page is the detail behind those three rows, then how keys and billing work.

## The spec

A spec is the same at a given tier whichever made it — the plugin and `generate` run the same engine — so this applies to both.

### Free

Without a license key, every generated spec includes:

- **Component structure** — anatomy (element tree), props (with raw values), and layout
- **Default variant** — the component in its base state, with all style values as raw numbers, colors, and strings
- **Metadata** — generator info, author, timestamps, and the conventions and settings used to produce the spec

Free-tier output gives you a complete structural picture of each component — enough to understand what a component is, how it's built, and what its default state looks like.

### Pro

With a valid license key, specs additionally include:

| Feature | What it adds |
|---------|-------------|
| **Non-default variants** | All variant combinations beyond the default — size, state, kind, and any other variant properties |
| **Design token references** | Variable bindings on style properties (spacing, color, corner radius, stroke, typography, shadows, gradients) — connecting raw values to your token system |
| **Named style references** | Links to Figma text styles, color styles, and effect styles instead of inline values |
| **Prop bindings** | `$binding` references connecting anatomy elements to component props (slot content, instance swaps, visibility toggles, text overrides) |
| **Invalid combinations** | The `invalidPropCombinations` array showing which property combinations are impossible (requires `spec.invalidCombinations: true` in `config/settings.yaml`) |

### The same property at each tier

**Free** — raw values only, default variant only:
```yaml
elements:
  label:
    typography:
      fontSize: 14
      lineHeight: 20
    fill:
      color: "#1A1A1A"
    visible: true
```

**Pro** — token references, style references, and bindings:
```yaml
elements:
  label:
    typography:
      $style:
        name: Body/Medium
        key: S:abc123
      fontSize:
        $value: 14
        $variable: typography/body-medium/font-size
      lineHeight:
        $value: 20
        $variable: typography/body-medium/line-height
    fill:
      color:
        $value: "#1A1A1A"
        $variable: colors/text/primary
    visible:
      $value: true
      $binding: "#/props/showLabel"
```

Pro features are never stripped from output — they're simply not created at the free tier. If a style property has a bound Figma variable, free-tier output shows the raw resolved value; pro-tier output shows the token reference alongside the value.


> **Note**: Token references require that your source's `fetch` list in `config/settings.yaml` includes `variables`. Style references require `styles`. See [Configuration](/settings/) for details.

:::caution[Fetching variables over REST requires a Figma Enterprise plan]
A Specs Pro license controls whether **already-fetched** variable and style data gets turned into token references and style references — it does not control whether that data can be fetched from Figma in the first place.

Figma's REST API restricts the `variables` endpoints to organizations on an **Enterprise** plan, regardless of your Specs license; `file` and `styles` data fetch over REST on any plan. On any other plan, fetch variables through the plugin instead — [`specs fetch --only variables --from-bridge`](/cli/commands/fetch/#fetching-variables-via-the-bridge) reads them via Figma's Plugin API, which has no plan restriction, and writes the same payload a REST fetch would. The Figma Plugin itself is likewise unaffected — it always reads variables and styles directly from the open file. See [CLI Requirements](/cli/#requirements) for details.
:::

### Config settings and licensing

All configuration values work at both tiers. Two settings interact with licensing:

#### `spec.tokens`

Controls **how** token references are serialized — not **whether** they appear. At free tier, no token references are created regardless of this setting. At pro tier, this controls the output shape.

#### `spec.invalidCombinations`

Controls whether invalid variant combinations are computed. Even when set to `true` (the default), this feature requires a pro license. At free tier, the setting is accepted but the computation is skipped — the `invalidPropCombinations` array is simply absent from output.

## Canvas output

What the plugin draws on the Figma canvas, as opposed to what the spec says. Every spec section, the [multi-column layout](/plugin/multi-column-layout/), and all settings are free. Three things are not:

| Pro feature | What it adds |
|---|---|
| **Custom styling** (Output settings) | Generates Specs' own Figma styles and variables so the output matches your system: [color including dark mode](/plugin/color/), [typography from text styles](/plugin/text/), [spacing from variables](/plugin/spacing/) |
| **Examples** (Settings) | The Examples section of the settings pane |
| **Bridge** tab | The plugin's connection to the CLI — how [`fetch --from-bridge`](/cli/commands/fetch/) and [`render`](/cli/commands/render/) reach the open file |

The Bridge is the one place the two surfaces meet, and it needs a Pro **plugin** key. The CLI commands that talk to it are free.

## Emitted code

The React and Web Components trees [`specs react`](/cli/commands/react/) and [`specs webcomponents`](/cli/commands/webcomponents/) write. The plugin has no equivalent — it draws on the canvas rather than writing a code tree.

| Artifact | Free | Pro adds |
|---|---|---|
| [Scaffold](/code/scaffold/) | The component, its markup, its variant attributes and its conditionals | **Composition** — an instance element renders as a call to its target component rather than an empty wrapper; **glyphs**; **background images** |
| [Stories](/code/stories/) | One story per variant-prop axis | **Compound-variant stories**, the **sticker sheet**, and **composed slot content** — the ready-made examples a designer assembled |
| [Contract](/code/contract/), [Styles](/code/styles/), [CSS variables](/code/cssvars/) | Complete | — |

Free output is a working component, not a crippled one. What it lacks is the part that depends on other components: a card emits its own shell and its own stylesheet either way, but only a Pro run fills the card with the image, title and price the design file already contains.

The emitted files say so themselves rather than leaving it silent — a free stories file carries `// Compound-variant stories available with Pro.` and `// Composed slot content available with Pro.` where the omission falls.

These commands check the key themselves rather than inheriting a verdict from a `generate` run, so the two tiers are independent. A Pro spec emitted by a free transform loses Pro code, and a free spec cannot be rescued by a licensed transform — there is nothing in it to compose.

## Your keys

A subscription issues **two keys** — one for the plugin, one for the CLI — purchased together and activated separately.

### Plugin key

Activates the Pro tiers above when you work in Figma. Each key is meant for an individual user and can be activated on up to two machines (e.g. a work laptop and a personal machine).

:::caution[Specs 2 vs Specs (Classic)]
This page covers licensing for [**Specs 2**](https://www.figma.com/community/plugin/1549454283615386215/anova) — first published on the Figma community in 2025 as "Anova" — and the **Specs CLI**. Subscriptions are purchased through Polar and managed from your Polar customer portal.

[**Specs (Classic)**](https://www.figma.com/community/plugin/1205622541257680763/specs) is the original Figma plugin launched in 2023. Classic subscriptions are managed entirely by the Figma payment platform and cannot be transferred, converted, or applied to Specs 2 or the CLI. If you have an active Classic subscription and want to use Specs 2, you'll need a separate Pro subscription through Polar.
:::

### CLI key

Activates the Pro tiers above on the command line.

CLI usage is metered at **50 generations per month**, resetting each billing cycle. Each `generate` call that produces Pro-tier output counts as one generation. Other commands — `fetch`, `scan`, `init` — are not metered. If you hit your monthly limit, you can purchase top-off packs to add more generations without waiting for the next cycle.

To avoid spending generations unnecessarily, omit your license key during trial runs — while you're iterating on config, testing component selection, or troubleshooting setup, free-tier output gives you the same structure without counting against your quota. Save Pro runs for when your config and component selection are dialed in.

### Subscription and Billing

Pro subscriptions are purchased and managed through [Polar](https://polar.sh), the merchant of record for Specs. Polar is a platform built for developers selling digital products — they handle payment processing, subscription management, and invoicing so you can manage your plan from a single portal.

From your Polar dashboard you can:

- View your current billing cycle and generation usage
- Upgrade, downgrade, or cancel your subscription
- Purchase top-off generation packs
- Download invoices

## Team Licensing

Teams can purchase a single subscription that covers multiple seats, with volume discounts that apply automatically at checkout:

| Team size | Discount |
|-----------|----------|
| 1–4 seats | None (standard Pro price) |
| 5–9 seats | 10% off |
| 10+ seats | 20% off |

Each seat is functionally identical to an individual Pro subscription: when a team member claims their seat, they receive their own plugin and CLI key pair by email, activated and managed the same way as any other Pro subscriber.

### Purchasing and managing seats

A team subscription is purchased by an administrator, who becomes the owner of the subscription and the only person who can adjust it. Seats are managed by email address — the administrator enters each team member's email individually, and Polar sends that person an invitation to claim their seat.

Seats are managed **one at a time** rather than via bulk import or CSV upload. The administrator adds, removes, or reassigns seats individually through the Polar customer portal.

### Claiming a seat

When a team member is invited, they receive an email with a link to claim their seat. **Invitations must be claimed within 24 hours** — after that the invitation expires and the administrator needs to re-send it from the portal. Once claimed, the team member receives their own plugin and CLI keys and activates them like any individual Pro subscriber.

A seat that hasn't been claimed yet still counts toward the subscription's seat total and is billed normally. Administrators can revoke a pending invitation and reassign the seat to a different email at any time.

### Adjusting your subscription

Administrators manage everything from the Polar customer portal — the same portal used for any Pro subscription. From the portal, the administrator can:

- Add new seats or remove existing ones
- See which seats are claimed and by whom
- Revoke a seat from a team member who has left
- Re-send an expired invitation
- Update payment method, download invoices, and cancel the subscription

The total seat count can be adjusted up or down at any time. Changes are **prorated** on month-to-month invoices — adding a seat mid-cycle adds a partial charge for the remaining days, and removing a seat issues a partial credit applied to the next invoice. The volume discount tier is re-evaluated whenever the seat count crosses a threshold (for example, going from 4 to 5 seats activates the 10% discount on the next invoice).

## Activating a License

### CLI

Provide your license key in any of these ways (recommended first):

1. **`.env` file** in your project directory (loaded automatically):
   ```
   SPECS_LICENSE_KEY=your-license-key
   ```

2. **Environment variable**: `SPECS_LICENSE_KEY`
   ```bash
   export SPECS_LICENSE_KEY="your-license-key"
   specs generate
   ```

3. **CLI flag**: `-l` or `--license` (useful for one-off runs or CI)
   ```bash
   specs generate -l "your-license-key"
   ```

When multiple sources are present, CLI flag takes priority over env var, which takes priority over `.env` file.

**What the CLI prints**: When a license key is provided, the CLI displays the result after generation:

| Scenario | CLI output |
|----------|-----------|
| Valid key | `License: PRO (active)` |
| Invalid key | `License: FREE (invalid — key not recognized)` |
| Expired key | `License: FREE (expired — key expired)` |
| Network error | `License: FREE (network-error — could not reach license server)` |

When no license key is provided, the CLI runs silently in free mode — no license line is printed.

### Figma Plugin

Enter your license key in the plugin's **Account** pane.

## Output Metadata

Generated specs include license information in metadata when a license key was provided:

```yaml
metadata:
  generator:
    license:
      level: PRO       # FREE or PRO
      status: active   # active, invalid, expired, none
```

When no license key is provided, the `license` block is omitted from metadata. When a key is provided but invalid or expired, the block is present with `level: FREE` and the relevant status.

## Troubleshooting

**I have a Pro key but my output looks like free tier**
1. Check that the CLI prints `License: PRO (active)` after generation. If it prints `FREE`, the key wasn't accepted.
2. Verify the key is being picked up: CLI flag (`-l`) takes priority over `SPECS_LICENSE_KEY` env var, which takes priority over `.env` file. Make sure `.env` is in the directory you're running from.
3. For token references specifically, confirm your source's `fetch` list includes `variables` — tokens require fetched variable data.

**I see "network-error" in the license output**
License validation requires a brief network call to the license server. If your network blocks outbound HTTPS or you're offline, validation fails and `generate` falls back to free tier. Generation still completes — it does not error out.

**`specs react` or `specs webcomponents` failed with a license error**
The transforms behave differently on purpose. When a key is provided and the check cannot be completed — offline, rate-limited, interrupted — they **fail the run** rather than falling back to free.

A silent fallback there is worse than an error: it writes a whole free-tier tree under a valid key, and the run reports success. You would find out from the output, days later. A definitive rejection is different — `invalid`, `removed`, `expired` and `wrong-runtime` are answers, and free tier is the right response to them.

Run without a key to emit free-tier output deliberately. That is not an unchecked key, so nothing fails.

**My `invalidPropCombinations` are missing**
This requires both `spec.invalidCombinations: true` (the default) and an active Pro license. If either condition is missing, the array is silently omitted.

## FAQ

**Can I use all config settings at the free tier?**
Yes. Every config setting is accepted at both tiers. Settings that affect pro-only features (like `spec.tokens` or `spec.invalidCombinations`) are stored in your `config/settings.yaml` and take effect when you add a license key.

**Will my specs break if my license expires?**
No. Previously generated specs are static files — they don't change. Future generations will produce free-tier output (raw values, default variant only) until the license is renewed.

**I just got a Pro license. Do I need to regenerate?**
Yes. Previously generated specs are static files and won't retroactively gain Pro features. Run your generation commands again with the license key to produce Pro-tier output.

**Are CLI and plugin license keys the same?**
No. The CLI and Figma plugin use separate license keys. Each is purchased and activated independently.

**Does license validation require internet access?**
Yes. The CLI makes a brief HTTPS call to validate your key. If the network is unavailable, `generate` continues with free-tier output and reports `network-error` in the license status; `react` and `webcomponents` fail the run instead, for the reason above. Previously validated sessions do not cache — each generation validates independently.

**Can I share my license key with my team?**
License terms depend on your plan, but generally, no. Each Pro license is intended for an individual user.

## See Also

- [Getting Started](/cli/getting-started/) — Installation and first spec
- [Configuration Reference](/settings/) — All config options
- [Settings Schema](/schema/settings/) — settings reference and defaults
