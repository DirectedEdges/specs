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
 *
 * Characters that are invalid in a CSS dashed-ident (anything other than
 * letters, digits, "-", "_", and non-ASCII — e.g. parentheses, "%", "&") are
 * dropped afterwards; each drop is recorded for the end-of-run warning summary.
 */
export function kebabizePath(path: string): string {
  const kebabized = path
    .replace(/,\s*/g, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .replace(/^-/, '');
  const sanitized = kebabized
    .replace(/[^a-z0-9_\-\u0080-\uFFFF]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (sanitized !== kebabized) {
    recordNameWarning('invalid characters dropped from CSS custom property name', path);
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Name warnings — collected during emission, drained by the CSS transformer's
// finalize() for an end-of-run summary. type → (original name → occurrences).
// ---------------------------------------------------------------------------

const nameWarnings = new Map<string, Map<string, number>>();

function recordNameWarning(type: string, name: string): void {
  const byName = nameWarnings.get(type) ?? new Map<string, number>();
  byName.set(name, (byName.get(name) ?? 0) + 1);
  nameWarnings.set(type, byName);
}

/** Return all collected name warnings and reset the collector. */
export function drainNameWarnings(): Map<string, Map<string, number>> {
  const drained = new Map(nameWarnings);
  nameWarnings.clear();
  return drained;
}

/**
 * Drain collected name warnings and print a per-type count summary.
 * Called from a transformer's finalize(); the label names the transform.
 * No-op when nothing was collected.
 */
export function reportNameWarnings(label: string): void {
  const warnings = drainNameWarnings();
  if (warnings.size === 0) return;
  console.warn('');
  console.warn(`⚠ [${label}] name warnings:`);
  for (const [type, names] of warnings) {
    const total = [...names.values()].reduce((a, b) => a + b, 0);
    console.warn(`  ${type} — ${total} occurrence${total === 1 ? '' : 's'} across ${names.size} name${names.size === 1 ? '' : 's'}:`);
    const shown = [...names.entries()].slice(0, 10);
    for (const [name, count] of shown) console.warn(`    "${name}" ×${count}`);
    if (names.size > shown.length) console.warn(`    …and ${names.size - shown.length} more`);
  }
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
  // GradientValue is not a color — callers map gradients per property via gradientValue()
  return null;
}

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------

const GRADIENT_TYPES = new Set(['LINEAR', 'RADIAL', 'ANGULAR']);

interface GradientLike {
  type: string;
  angle?: number;
  center?: { x?: number; y?: number };
  stops: Array<{ position?: number; color?: unknown }>;
}

export function isGradient(v: unknown): v is GradientLike {
  if (typeof v !== 'object' || v === null) return false;
  const g = v as Record<string, unknown>;
  return typeof g.type === 'string' && GRADIENT_TYPES.has(g.type) && Array.isArray(g.stops);
}

/** Normalised 0–1 position → CSS percentage (trailing zeros trimmed). */
function percent(n: unknown): string {
  const v = typeof n === 'number' ? n : 0;
  return `${+(v * 100).toFixed(2)}%`;
}

/**
 * Render a GradientValue as a CSS gradient function.
 *
 *   LINEAR  → linear-gradient(Ndeg, …)   — spec angle is already CSS convention
 *   RADIAL  → radial-gradient(at X% Y%, …)
 *   ANGULAR → conic-gradient(from 90deg at X% Y%, …) — Figma's angular sweep
 *             starts at 3 o'clock; CSS conic 0deg is 12 o'clock
 *
 * Stop colors run through colorValue, so token references become var(--…).
 */
export function gradientValue(v: unknown, tokensFormat = 'TOKEN'): string | null {
  if (!isGradient(v)) return null;
  const stops = v.stops
    .map(s => {
      const c = colorValue(s.color, tokensFormat);
      return c ? `${c} ${percent(s.position)}` : null;
    })
    .filter((s): s is string => s !== null);
  if (stops.length < 2) return null;
  const stopList = stops.join(', ');
  const at = `at ${percent(v.center?.x ?? 0.5)} ${percent(v.center?.y ?? 0.5)}`;
  switch (v.type) {
    case 'LINEAR': return `linear-gradient(${v.angle ?? 0}deg, ${stopList})`;
    case 'RADIAL': return `radial-gradient(${at}, ${stopList})`;
    case 'ANGULAR': return `conic-gradient(from 90deg ${at}, ${stopList})`;
    default: return null;
  }
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
