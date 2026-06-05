// Shared value helpers for CSS emission.

export function isTokenRef(v: unknown): v is { $token: string; $type: string } {
  return typeof v === 'object' && v !== null && '$token' in v;
}

/** Convert a token path to a CSS custom property reference. Phase 2 replaces these. */
export function tokenVar(v: { $token: string }): string {
  const name = v.$token
    .replace(/,\s*/g, '-')   // "Body/M, Emphasized" → "Body/M-Emphasized"
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')     // normalize underscores (including __) to hyphens
    .replace(/-+/g, '-')
    .toLowerCase()
    .replace(/^-/, '');
  return `var(--${name})`;
}

/** Render a dimension-style value (number → px, token → var(), string → as-is). */
export function dimensionValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (isTokenRef(v)) return tokenVar(v);
  if (typeof v === 'number') return v === 0 ? '0' : `${v}px`;
  if (typeof v === 'string') return v;
  return null;
}

/** Render a color-style value. null → transparent, token → var(), string → as-is. */
export function colorValue(v: unknown): string | null {
  if (v === null) return 'transparent';
  if (v === undefined) return null;
  if (isTokenRef(v)) return tokenVar(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'colorSpace' in (v as object)) {
    const co = v as { hex?: string };
    return co.hex ?? 'currentColor';
  }
  // GradientValue — deferred to phase 2
  return null;
}

/** Render a Sides object (top/end/bottom/start) as shorthand or per-side declarations. */
export function sidesValue(v: Record<string, unknown>, prop: string): string[] {
  const { top, end, bottom, start } = v;
  const vals = [top, end, bottom, start].map(dimensionValue);
  if (vals.every(x => x !== null)) {
    return [`${prop}: ${vals.join(' ')}`];
  }
  const decls: string[] = [];
  if (top !== undefined) { const d = dimensionValue(top); if (d) decls.push(`${prop}-top: ${d}`); }
  if (end !== undefined) { const d = dimensionValue(end); if (d) decls.push(`${prop}-right: ${d}`); }
  if (bottom !== undefined) { const d = dimensionValue(bottom); if (d) decls.push(`${prop}-bottom: ${d}`); }
  if (start !== undefined) { const d = dimensionValue(start); if (d) decls.push(`${prop}-left: ${d}`); }
  return decls;
}

/** camelCase → kebab-case. */
export function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
