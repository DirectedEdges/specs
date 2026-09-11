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

/** One warning type for every unresolved token, however it was written out. */
const UNRESOLVED_WARNING = 'unresolved variable — no value emitted for this property';

/**
 * Name warnings describe the spec's own names, so a second emission of the same
 * component — the shadow-tree form of the same rules — must not report them
 * again. Suppressed for the duration of that pass.
 */
let suppressed = false;

export function withNameWarningsSuppressed<T>(fn: () => T): T {
  const previous = suppressed;
  suppressed = true;
  try {
    return fn();
  } finally {
    suppressed = previous;
  }
}

function recordNameWarning(type: string, name: string): void {
  if (suppressed) return;
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

/**
 * Names the engine writes when part of a variable or style could not be read:
 * a bracketed `[…unresolved…]` segment where the collection name should be,
 * and a sentinel variable name when the lookup itself came back empty.
 *
 * A missing collection is not survivable either. Custom-property names are
 * derived from the whole path, collection included, so a path carrying the
 * sentinel derives a name no stylesheet defines — the reference is dead
 * whichever half of it failed to resolve.
 */
const UNRESOLVED_SEGMENT = /\[[^\]]*unresolved[^\]]*\]/i;
const UNRESOLVED_NAMES = new Set(['Unavailable variable', 'Variable (no loader)']);

/**
 * A variable Figma could not resolve at capture time. Its sentinel name
 * kebabizes into a perfectly ordinary custom-property name that is defined
 * nowhere, so the reference is dead on arrival.
 *
 * Emitting it is worse than emitting nothing: where the declaration lands on a
 * size or spacing property, the element collapses to zero. Only a colour
 * carries a raw value in the spec to degrade to, so the remaining rungs of the
 * ladder are that raw value, or no declaration at all.
 */
function isUnresolvedTokenPath(path: string): boolean {
  const trimmed = path.trim();
  if (UNRESOLVED_SEGMENT.test(trimmed)) return true;
  return UNRESOLVED_NAMES.has(trimmed.slice(trimmed.lastIndexOf('/') + 1));
}

/** Wrap a CSS variable name in var(), with an optional fallback value. */
function cssVar(name: string, fallback?: string): string {
  const n = name.replace(/^--/, '');
  return fallback ? `var(--${n}, ${fallback})` : `var(--${n})`;
}

/**
 * The value a token reference falls back to when its variable has no definition.
 *
 * `cssvars` skips a variable whose value aliases one outside the fetched
 * payload, but the stylesheets still reference it by name — so the declaration
 * resolves to nothing and the surface renders transparent or inherited. The
 * spec carries what Figma last read for that token, so the reference degrades
 * to it rather than to nothing.
 *
 * Only colour-shaped raw values are used. A bare number cannot be rendered
 * without knowing whether it is a length, an opacity or a font weight, and
 * guessing would emit `opacity: var(--x, 0.5px)`. Colours are unambiguous.
 */
function rawValueFallback(v: unknown): string | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const raw = ((v as Record<string, any>).$extensions?.['com.figma'])?.rawValue;
  const hex = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).hex : undefined;
  return typeof hex === 'string' ? hex : undefined;
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
    if (isTokenRef(v)) {
      if (isUnresolvedTokenPath(v.$token)) {
        recordNameWarning(UNRESOLVED_WARNING, v.$token);
        return rawValueFallback(v) ?? null;
      }
      return cssVar(kebabizePath(v.$token));
    }
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
      if (typeof obj.$token === 'string') {
        if (isUnresolvedTokenPath(obj.$token)) {
          recordNameWarning(UNRESOLVED_WARNING, obj.$token);
          return rawValueFallback(v) ?? null;
        }
        return cssVar(kebabizePath(obj.$token));
      }
    }
    return null;
  }

  // ── TOKEN / TOKEN_FIGMA_EXTENSIONS / TOKEN_NAME / FIGMA_NAME / others ───────
  if (isTokenRef(v)) {
    const fallback = rawValueFallback(v);
    if (isUnresolvedTokenPath(v.$token)) {
      recordNameWarning(UNRESOLVED_WARNING, v.$token);
      return fallback ?? null;
    }
    return cssVar(kebabizePath(v.$token), fallback);
  }
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
  // resolveTokenVar returning null for a token ref means it withheld the
  // reference deliberately (an unresolved variable) — the legacy path must not
  // re-emit what it just refused.
  if (isTokenRef(v)) return isUnresolvedTokenPath(v.$token) ? null : tokenVar(v);
  if (typeof v === 'number') return v === 0 ? '0' : `${v}px`;
  if (typeof v === 'string') return v;
  return null;
}

/**
 * A single property whose token could not be resolved must still be written.
 *
 * Omitting it lets a base rule's value for the same property win, which is not
 * what the design says: the variant overrode that property, with a value we
 * cannot read. `unset` states exactly that, and matches what the browser did
 * with the old dead `var()` reference — a var() that resolves to nothing is
 * invalid at computed-value time, which makes the property take its inherited
 * or initial value.
 *
 * Only for a declaration written from one value. A value composed into a
 * shorthand (padding's four sides, a shadow's offsets) must keep returning
 * null, so the composite falls back to its own zero rather than embedding a
 * keyword where a length belongs.
 */
export function dimensionValueOrUnset(v: unknown, tokensFormat = 'TOKEN'): string | null {
  if (isTokenRef(v) && isUnresolvedTokenPath(v.$token)) {
    recordNameWarning(UNRESOLVED_WARNING, v.$token);
    return 'unset';
  }
  return dimensionValue(v, tokensFormat);
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

/**
 * A token reference whose value is a gradient.
 *
 * The spec carries the reference, not the gradient — the value arrives through
 * the custom property the tokens transform writes. `$type` is the only thing
 * that says which kind it is, and while it said `color` a gradient token was
 * indistinguishable from a colour one and fell through to `border-color`,
 * which cannot hold a gradient.
 */
export function isGradientToken(v: unknown): boolean {
  return isTokenRef(v) && (v as { $type?: string }).$type === 'gradient';
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

/**
 * The property names one Sides object expands to.
 *
 * A side is not a suffix. `padding` takes it as one (`padding-inline-start`),
 * but `border-width` splits around it (`border-inline-start-width`), so
 * appending the side to the property name produces `border-width-left` — a
 * name no browser implements, silently dropping every per-side stroke weight.
 *
 * The names are logical because the spec's vocabulary is: it keys these by
 * `start` and `end`, never `left` and `right`, and positioning already emits
 * `inset-inline-start`. Physical names would flip under RTL while the insets
 * beside them stayed put.
 */
interface SideNames {
  top: string;
  end: string;
  bottom: string;
  start: string;
  /** Two-value shorthands, used when all four sides are known. */
  block: string;
  inline: string;
}

const SIDE_NAMES: Record<string, SideNames> = {
  padding: {
    top: 'padding-block-start',
    end: 'padding-inline-end',
    bottom: 'padding-block-end',
    start: 'padding-inline-start',
    block: 'padding-block',
    inline: 'padding-inline',
  },
  'border-width': {
    top: 'border-block-start-width',
    end: 'border-inline-end-width',
    bottom: 'border-block-end-width',
    start: 'border-inline-start-width',
    block: 'border-block-width',
    inline: 'border-inline-width',
  },
};

/**
 * Render a Sides object (top/end/bottom/start) as shorthand or per-side
 * declarations.
 *
 * A property with no entry in {@link SIDE_NAMES} falls back to appending the
 * physical side, which is what every caller got before the table existed.
 */
export function sidesValue(v: Record<string, unknown>, prop: string, tokensFormat = 'TOKEN'): string[] {
  const names = SIDE_NAMES[prop] ?? {
    top: `${prop}-top`,
    end: `${prop}-right`,
    bottom: `${prop}-bottom`,
    start: `${prop}-left`,
    block: undefined,
    inline: undefined,
  } as SideNames;

  const { top, end, bottom, start } = v;
  const vals = [top, end, bottom, start].map(x => dimensionValue(x, tokensFormat));

  if (vals.every(x => x !== null)) {
    const [t, e, b, s] = vals as string[];
    // There is no four-value logical shorthand, so all-four collapses to the
    // block and inline pair rather than to `prop: t e b s` — which would read
    // as top/right/bottom/left and put `start` on the left in every direction.
    if (names.block && names.inline) {
      return [`${names.block}: ${t === b ? t : `${t} ${b}`}`, `${names.inline}: ${s === e ? s : `${s} ${e}`}`];
    }
    return [`${prop}: ${t} ${e} ${b} ${s}`];
  }

  const decls: string[] = [];
  if (top !== undefined) { const d = dimensionValue(top, tokensFormat); if (d) decls.push(`${names.top}: ${d}`); }
  if (end !== undefined) { const d = dimensionValue(end, tokensFormat); if (d) decls.push(`${names.end}: ${d}`); }
  if (bottom !== undefined) { const d = dimensionValue(bottom, tokensFormat); if (d) decls.push(`${names.bottom}: ${d}`); }
  if (start !== undefined) { const d = dimensionValue(start, tokensFormat); if (d) decls.push(`${names.start}: ${d}`); }
  return decls;
}

/** camelCase → kebab-case. */
export function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
