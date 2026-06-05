// Shared value helpers for CSS emission.

export function isTokenRef(v: unknown): v is { $token: string; $type: string } {
  return typeof v === 'object' && v !== null && '$token' in v;
}

/**
 * Kebabize a token path to a CSS custom property name.
 * Applied for TOKEN, TOKEN_FIGMA_EXTENSIONS, TOKEN_NAME, FIGMA_NAME, and as
 * the final fallback in all other formats.
 *
 * Transform steps (in order):
 *   ", " → "-"     ("Body/M, Emphasized" → "Body/M-Emphasized")
 *   "/"  → "-"
 *   " +" → "-"
 *   "_+" → "-"
 *   "-+" → "-"     (dedupe)
 *   lowercase
 *   strip leading "-"
 */
export function kebabizePath(path: string): string {
  return path
    .replace(/,\s*/g, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .replace(/^-/, '');
}

/** Wrap a CSS variable name in var(). */
function cssVar(name: string): string {
  return `var(--${name.replace(/^--/, '')})`;
}

/**
 * Resolve a spec token reference to a CSS var() string.
 *
 * Resolution is format-aware:
 *
 *   FIGMA_SYNTAX_WEB
 *     - String starting with "--" → var(that string)
 *     - { $token } fallback (no web syntax set) → path derivation
 *
 *   CUSTOM
 *     1. $cssVar field on the custom object → var($cssVar)
 *     2. Variables file reverse lookup (deferred — requires --variables flag, not yet wired)
 *     3. Path derivation fallback
 *
 *   Everything else (TOKEN, TOKEN_FIGMA_EXTENSIONS, TOKEN_NAME, FIGMA_NAME, …)
 *     - { $token } object → kebabize path
 *     - plain string     → kebabize string
 */
export function resolveTokenVar(v: unknown, tokensFormat: string): string | null {
  if (v === null || v === undefined) return null;

  // ── FIGMA_SYNTAX_WEB ────────────────────────────────────────────────────────
  if (tokensFormat === 'FIGMA_SYNTAX_WEB') {
    if (typeof v === 'string') {
      // Designer set a web code syntax — already the CSS var name
      if (v.startsWith('--')) return cssVar(v);
      // Non-"--" string: no web syntax was set; fall through to path derivation below
    }
    // { $token } fallback shape (FIGMA_SYNTAX_WEB falls back to TOKEN when unset)
    if (isTokenRef(v)) return cssVar(kebabizePath(v.$token));
    return null;
  }

  // ── CUSTOM ──────────────────────────────────────────────────────────────────
  if (tokensFormat === 'CUSTOM') {
    if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;

      // Step 1: $cssVar explicitly set in the custom object
      if (typeof obj.$cssVar === 'string') return cssVar(obj.$cssVar);

      // Step 2: variables file reverse lookup — deferred (requires --variables flag)
      // When implemented: build reverse index JSON.stringify($custom) → codeSyntax.WEB

      // Step 3: path derivation — try $token if present in the custom object
      if (typeof obj.$token === 'string') return cssVar(kebabizePath(obj.$token));
    }
    return null;
  }

  // ── TOKEN / TOKEN_FIGMA_EXTENSIONS / TOKEN_NAME / FIGMA_NAME / others ───────
  if (isTokenRef(v)) return cssVar(kebabizePath(v.$token));
  if (typeof v === 'string') return cssVar(kebabizePath(v));
  return null;
}

// ---------------------------------------------------------------------------
// Legacy export — kept for callers that don't yet pass tokensFormat.
// Behaves as TOKEN format (kebabize $token path).
// ---------------------------------------------------------------------------
/** @deprecated Use resolveTokenVar(v, tokensFormat) instead. */
export function tokenVar(v: { $token: string }): string {
  return cssVar(kebabizePath(v.$token));
}

/** Render a dimension-style value (number → px, token → var(), string → as-is). */
export function dimensionValue(v: unknown, tokensFormat = 'TOKEN'): string | null {
  if (v === null || v === undefined) return null;
  if (isTokenRef(v) || (typeof v === 'object' && v !== null)) {
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) return resolved;
  }
  if (isTokenRef(v)) return tokenVar(v);
  if (typeof v === 'number') return v === 0 ? '0' : `${v}px`;
  if (typeof v === 'string') return v;
  return null;
}

/** Render a color-style value. null → transparent, token → var(), string → as-is. */
export function colorValue(v: unknown, tokensFormat = 'TOKEN'): string | null {
  if (v === null) return 'transparent';
  if (v === undefined) return null;
  if (isTokenRef(v) || (typeof v === 'object' && v !== null)) {
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) return resolved;
  }
  if (typeof v === 'string') {
    if (v.startsWith('--')) return cssVar(v); // bare CSS var string (FIGMA_SYNTAX_WEB)
    return v;
  }
  if (typeof v === 'object' && v !== null && 'colorSpace' in (v as object)) {
    const co = v as { hex?: string };
    return co.hex ?? 'currentColor';
  }
  // GradientValue — deferred to phase 2
  return null;
}

/** Render a Sides object (top/end/bottom/start) as shorthand or per-side declarations. */
export function sidesValue(v: Record<string, unknown>, prop: string, tokensFormat = 'TOKEN'): string[] {
  const { top, end, bottom, start } = v;
  const vals = [top, end, bottom, start].map(x => dimensionValue(x, tokensFormat));
  if (vals.every(x => x !== null)) {
    return [`${prop}: ${vals.join(' ')}`];
  }
  const decls: string[] = [];
  if (top !== undefined) { const d = dimensionValue(top, tokensFormat); if (d) decls.push(`${prop}-top: ${d}`); }
  if (end !== undefined) { const d = dimensionValue(end, tokensFormat); if (d) decls.push(`${prop}-right: ${d}`); }
  if (bottom !== undefined) { const d = dimensionValue(bottom, tokensFormat); if (d) decls.push(`${prop}-bottom: ${d}`); }
  if (start !== undefined) { const d = dimensionValue(start, tokensFormat); if (d) decls.push(`${prop}-left: ${d}`); }
  return decls;
}

/** camelCase → kebab-case. */
export function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
