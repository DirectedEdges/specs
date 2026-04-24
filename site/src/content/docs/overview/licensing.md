---
title: "Licensing"
---

<script>document.querySelector('#_top').insertAdjacentHTML('afterbegin','<span class="sl-badge pro-badge pro-badge-hero">Pro</span>')</script>

Specs works at two tiers: **Free** and **Pro**. Both tiers use the same configuration and generate the same component structure — the difference is in how much detail the `generate` command's output contains. Other commands (`fetch`, `scan`, `init`) are not affected by licensing.

## Free Tier

Without a license key, every generated spec includes:

- **Component structure** — anatomy (element tree), props (with raw values), and layout
- **Default variant** — the component in its base state, with all style values as raw numbers, colors, and strings
- **Metadata** — generator info, author, timestamps, and the config used to produce the spec

Free-tier output gives you a complete structural picture of each component — enough to understand what a component is, how it's built, and what its default state looks like.

## Pro Tier

With a valid license key, specs additionally include:

| Feature | What it adds |
|---------|-------------|
| **Non-default variants** | All variant combinations beyond the default — size, state, kind, and any other variant properties |
| **Design token references** | Variable bindings on style properties (spacing, color, corner radius, stroke, typography, shadows, gradients) — connecting raw values to your token system |
| **Named style references** | Links to Figma text styles, color styles, and effect styles instead of inline values |
| **Prop bindings** | `$binding` references connecting anatomy elements to component props (slot content, instance swaps, visibility toggles, text overrides) |
| **Invalid combinations** | The `invalidVariantCombinations` array showing which property combinations are impossible (requires `config.include.invalidCombinations: true`) |

### Example: Free vs Pro Output

The same component property at each tier:

**Free tier** — raw values only, default variant only:
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

**Pro tier** — token references, style references, and bindings:
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

> **Note**: Token references require that your source config includes `variables` in the `data` array. Style references require `styles`. See [Configuration](/specs/config/) for details.

## Config Settings and Licensing

All config settings work at both tiers. Two settings interact with licensing:

### `format.tokens`

Controls **how** token references are serialized — not **whether** they appear. At free tier, no token references are created regardless of this setting. At pro tier, this controls the output shape.

### `include.invalidCombinations`

Controls whether invalid variant combinations are computed. Even when set to `true` (the default), this feature requires a pro license. At free tier, the setting is accepted but the computation is skipped — the `invalidVariantCombinations` array is simply absent from output.

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

Enter your license key in the plugin's **Account** pane. The plugin validates the key and displays the activation status:

| Status | Meaning |
|--------|---------|
| Active | License is valid and active |
| Invalid | Key not recognized |
| Expired | License has expired |
| Not activated | No key entered |

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
3. For token references specifically, confirm your source config includes `variables` in the `data` array — tokens require fetched variable data.

**I see "network-error" in the license output**
License validation requires a brief network call to the license server. If your network blocks outbound HTTPS or you're offline, validation fails and output falls back to free tier. Generation still completes — it does not error out.

**My `invalidVariantCombinations` are missing**
This requires both `config.include.invalidCombinations: true` (the default) and an active Pro license. If either condition is missing, the array is silently omitted.

## FAQ

**Can I use all config settings at the free tier?**
Yes. Every config setting is accepted at both tiers. Settings that affect pro-only features (like `format.tokens` or `include.invalidCombinations`) are stored in your config and take effect when you add a license key.

**Will my specs break if my license expires?**
No. Previously generated specs are static files — they don't change. Future generations will produce free-tier output (raw values, default variant only) until the license is renewed.

**I just got a Pro license. Do I need to regenerate?**
Yes. Previously generated specs are static files and won't retroactively gain Pro features. Run your generation commands again with the license key to produce Pro-tier output.

**Are CLI and plugin license keys the same?**
No. The CLI and Figma plugin use separate license keys. Each is purchased and activated independently.

**Does license validation require internet access?**
Yes. The CLI makes a brief HTTPS call to validate your key. If the network is unavailable, generation continues with free-tier output and reports `network-error` in the license status. Previously validated sessions do not cache — each generation validates independently.

**Can I share my license key with my team?**
License terms depend on your plan, but generally, no. Each Pro license is intended for an individual user.

## See Also

- [Getting Started](/specs/overview/cli/getting-started/) — Installation and first spec
- [Configuration Reference](/specs/config/) — All config options
- [Config Schema](/specs/overview/schema/config/) — Config type reference and defaults
