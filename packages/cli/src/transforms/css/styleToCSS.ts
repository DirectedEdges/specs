// Maps atomic spec style keys to CSS declarations.
// Layout-group keys (layoutMode, mainAxisAlignment, crossAxisAlignment, wrap,
// wrapAlignment, itemSpacing, layoutSizingHorizontal, layoutSizingVertical)
// are handled by layoutToCSS — they require cross-key context and are skipped here.

import { isTokenRef, resolveTokenVar, dimensionValue, colorValue, sidesValue } from './values.js';

const TEXT_ALIGN_MAP: Record<string, string> = {
  LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify',
};

const TEXT_CASE_MAP: Record<string, string> = {
  UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize', ORIGINAL: 'none',
};

const TEXT_DECORATION_MAP: Record<string, string> = {
  UNDERLINE: 'underline', STRIKETHROUGH: 'line-through', NONE: 'none',
};

// Figma fontStyle strings that carry weight semantics.
// Figma uses the style name as a combined weight+style descriptor.
const FONT_STYLE_WEIGHT_MAP: Record<string, string> = {
  Thin: '100', ExtraLight: '200', Light: '300', Regular: '400',
  Medium: '500', SemiBold: '600', Semibold: '600', Bold: '700',
  ExtraBold: '800', Black: '900',
};

const FONT_STYLE_ITALIC_SUFFIXES = ['Italic', 'Oblique'];

const DIMENSION_KEYS: Array<[string, string]> = [
  ['width', 'width'],
  ['height', 'height'],
  ['minWidth', 'min-width'],
  ['minHeight', 'min-height'],
  ['maxWidth', 'max-width'],
  ['maxHeight', 'max-height'],
];

export interface StyleToCSSOptions {
  /**
   * Whether coordinates without an explicit position imply absolute placement.
   * True for children of non-auto-layout parents (Figma places them
   * absolutely); false inside auto-layout flow, where stray coordinates are
   * layout metadata, not offsets.
   */
  inferAbsolute?: boolean;
}

export function styleToCSS(
  styles: Record<string, unknown>,
  tokensFormat = 'TOKEN',
  elemType?: string,
  options: StyleToCSSOptions = {},
): string[] {
  const decls: string[] = [];

  // ── Colors ──────────────────────────────────────────────────────────────────

  if ('backgroundColor' in styles) {
    const v = colorValue(styles.backgroundColor, tokensFormat);
    if (v) decls.push(`background: ${v}`);
  }

  if ('textColor' in styles) {
    const v = colorValue(styles.textColor, tokensFormat);
    if (v) decls.push(`color: ${v}`);
  }

  if ('fillColor' in styles) {
    const v = colorValue(styles.fillColor, tokensFormat);
    if (v) {
      // Anatomy type decides the paint target: glyphs/vectors render as
      // mask-tinted boxes (background-color shows through the mask shape);
      // shape elements render as plain boxes; untyped keeps legacy fill.
      if (elemType === 'glyph' || elemType === 'vector') decls.push(`background-color: ${v}`);
      else if (elemType === undefined) decls.push(`fill: ${v}`);
      else decls.push(`background: ${v}`);
    }
  }

  // ── Opacity ─────────────────────────────────────────────────────────────────

  if ('opacity' in styles && styles.opacity !== undefined) {
    const v = styles.opacity;
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) decls.push(`opacity: ${resolved}`);
    else if (typeof v === 'number') decls.push(`opacity: ${v}`);
  }

  // ── Border ──────────────────────────────────────────────────────────────────
  //
  // strokes + strokeWeight together form a border. border-style must be emitted
  // whenever strokes is present and non-null — CSS borders are invisible without it.
  //
  // strokeAlign mapping:
  //   INSIDE  → CSS border (default behavior: border inside element bounds)
  //   CENTER  → CSS outline (renders centered on element edge, outside box model)
  //   OUTSIDE → CSS outline (renders outside element bounds)
  //   null    → remove border (border-width: 0; border-color: transparent)

  const hasStrokes = 'strokes' in styles;
  const hasStrokeWeight = 'strokeWeight' in styles;
  const strokeAlign = styles.strokeAlign as string | null | undefined;

  if (hasStrokes) {
    const strokesVal = styles.strokes;
    if (strokesVal === null) {
      decls.push('border-color: transparent');
    } else {
      const v = colorValue(strokesVal, tokensFormat);
      if (v) {
        if (strokeAlign === 'OUTSIDE' || strokeAlign === 'CENTER') {
          decls.push(`outline-color: ${v}`);
          decls.push('outline-style: solid');
        } else {
          decls.push(`border-color: ${v}`);
          decls.push('border-style: solid');
        }
      }
    }
  }

  if (hasStrokeWeight) {
    const v = styles.strokeWeight;
    if (v === null) {
      decls.push('border-width: 0');
    } else if (typeof v === 'object' && v !== null && !isTokenRef(v)) {
      decls.push(...sidesValue(v as Record<string, unknown>, 'border-width', tokensFormat));
    } else {
      const d = dimensionValue(v, tokensFormat);
      if (d) {
        if (strokeAlign === 'OUTSIDE' || strokeAlign === 'CENTER') {
          decls.push(`outline-width: ${d}`);
        } else {
          decls.push(`border-width: ${d}`);
        }
      }
    }
  }

  // ── Corner radius ────────────────────────────────────────────────────────────

  if ('cornerRadius' in styles && styles.cornerRadius !== undefined) {
    const v = styles.cornerRadius;
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) {
      decls.push(`border-radius: ${resolved}`);
    } else if (typeof v === 'object' && v !== null) {
      // Corners object: topStart topEnd bottomEnd bottomStart
      const c = v as Record<string, unknown>;
      const vals = [c.topStart, c.topEnd, c.bottomEnd, c.bottomStart]
        .map(x => dimensionValue(x, tokensFormat));
      decls.push(`border-radius: ${vals.map(x => x ?? '0').join(' ')}`);
    } else {
      const d = dimensionValue(v, tokensFormat);
      if (d) decls.push(`border-radius: ${d}`);
    }
  }

  // ── Effects ──────────────────────────────────────────────────────────────────

  if ('effects' in styles && styles.effects !== null && styles.effects !== undefined) {
    const v = styles.effects;
    if (isTokenRef(v)) {
      // Distinguish backdrop-filter (blur) from box-shadow by token name.
      // Phase 2 will resolve to precise values; this is a best-effort phase-1 mapping.
      const resolved = resolveTokenVar(v, tokensFormat) ?? '';
      if (/blur/i.test(v.$token)) {
        decls.push(`backdrop-filter: blur(${resolved})`);
      } else {
        decls.push(`box-shadow: ${resolved}`);
      }
    }
    // Inline Effects objects (drop shadows, blur) deferred to phase 2.
  }

  // ── Dimensions ───────────────────────────────────────────────────────────────

  for (const [key, cssProp] of DIMENSION_KEYS) {
    if (key in styles) {
      const d = dimensionValue((styles as Record<string, unknown>)[key], tokensFormat);
      if (d && d !== '0') decls.push(`${cssProp}: ${d}`);
    }
  }

  // ── Padding ──────────────────────────────────────────────────────────────────

  if ('padding' in styles && styles.padding !== undefined) {
    const v = styles.padding;
    if (v === null) {
      decls.push('padding: 0');
    } else if (typeof v === 'object' && !isTokenRef(v)) {
      decls.push(...sidesValue(v as Record<string, unknown>, 'padding', tokensFormat));
    } else {
      const d = dimensionValue(v, tokensFormat);
      if (d) decls.push(`padding: ${d}`);
    }
  }

  // ── Typography ───────────────────────────────────────────────────────────────

  if ('typography' in styles && styles.typography !== null && styles.typography !== undefined) {
    const v = styles.typography;
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) {
      // Typography token reference → CSS font shorthand placeholder. Phase 2 resolves.
      decls.push(`font: ${resolved}`);
    } else if (typeof v === 'object') {
      const t = v as Record<string, unknown>;

      // Sub-properties are literal values unless they are explicit token refs —
      // a plain string here ("Inter", "Regular", "120%") is data, not a token name.
      if (t.fontSize !== undefined) {
        const r = isTokenRef(t.fontSize) ? resolveTokenVar(t.fontSize, tokensFormat) : null;
        if (r) decls.push(`font-size: ${r}`);
        else decls.push(`font-size: ${typeof t.fontSize === 'number' ? `${t.fontSize}px` : t.fontSize}`);
      }
      if (t.fontFamily !== undefined) {
        const r = isTokenRef(t.fontFamily) ? resolveTokenVar(t.fontFamily, tokensFormat) : null;
        if (r) decls.push(`font-family: ${r}`);
        else if (typeof t.fontFamily === 'string') {
          const fam = /\s/.test(t.fontFamily) ? `"${t.fontFamily}"` : t.fontFamily;
          decls.push(`font-family: ${fam}`);
        }
      }

      // fontStyle in Figma encodes weight + italic as a combined name ("SemiBold Italic").
      // Split into font-weight and font-style separately.
      if (t.fontStyle !== undefined && (typeof t.fontStyle === 'string' || isTokenRef(t.fontStyle))) {
        const r = isTokenRef(t.fontStyle) ? resolveTokenVar(t.fontStyle, tokensFormat) : null;
        if (r) {
          decls.push(`font-weight: ${r}`);
        } else if (typeof t.fontStyle === 'string') {
          const parts = t.fontStyle.split(/\s+/);
          const isItalic = FONT_STYLE_ITALIC_SUFFIXES.some(
            s => t.fontStyle === s || (t.fontStyle as string).endsWith(` ${s}`)
          );
          const weightName = parts.find(p => FONT_STYLE_WEIGHT_MAP[p]);
          if (weightName) decls.push(`font-weight: ${FONT_STYLE_WEIGHT_MAP[weightName]}`);
          if (isItalic) decls.push('font-style: italic');
        }
      }

      // lineHeight from Figma is always in pixels when a number.
      // Unitless lineHeight in CSS is a multiplier — always append px for numeric values.
      if (t.lineHeight !== undefined) {
        const r = isTokenRef(t.lineHeight) ? resolveTokenVar(t.lineHeight, tokensFormat) : null;
        if (r) decls.push(`line-height: ${r}`);
        else if (typeof t.lineHeight === 'number') decls.push(`line-height: ${t.lineHeight}px`);
        else if (typeof t.lineHeight === 'string') decls.push(`line-height: ${t.lineHeight}`);
      }

      if (t.letterSpacing !== undefined) {
        const r = isTokenRef(t.letterSpacing) ? resolveTokenVar(t.letterSpacing, tokensFormat) : null;
        if (r) decls.push(`letter-spacing: ${r}`);
        else if (typeof t.letterSpacing === 'number') decls.push(`letter-spacing: ${t.letterSpacing}px`);
      }
      if (t.textCase !== undefined && typeof t.textCase === 'string') {
        const mapped = TEXT_CASE_MAP[t.textCase];
        if (mapped) decls.push(`text-transform: ${mapped}`);
      }
      if (t.textDecoration !== undefined && typeof t.textDecoration === 'string') {
        const mapped = TEXT_DECORATION_MAP[t.textDecoration];
        if (mapped) decls.push(`text-decoration: ${mapped}`);
      }
    }
  }

  // ── Text alignment ───────────────────────────────────────────────────────────

  if ('textAlignHorizontal' in styles && styles.textAlignHorizontal !== undefined) {
    const v = styles.textAlignHorizontal;
    if (typeof v === 'string' && TEXT_ALIGN_MAP[v]) {
      decls.push(`text-align: ${TEXT_ALIGN_MAP[v]}`);
    }
  }

  // ── Aspect ratio ─────────────────────────────────────────────────────────────

  if ('aspectRatio' in styles && styles.aspectRatio !== null && styles.aspectRatio !== undefined) {
    const v = styles.aspectRatio as Record<string, number>;
    if ('x' in v && 'y' in v) {
      decls.push(`aspect-ratio: ${v.x} / ${v.y}`);
    }
  }

  // ── Visibility ───────────────────────────────────────────────────────────────

  if ('visible' in styles && styles.visible === false) {
    decls.push('display: none');
  }

  // ── Overflow ─────────────────────────────────────────────────────────────────

  if ('clipContent' in styles && styles.clipContent !== undefined) {
    if (styles.clipContent === true) decls.push('overflow: hidden');
    else if (styles.clipContent === false) decls.push('overflow: visible');
  }

  // ── Transform ────────────────────────────────────────────────────────────────

  if ('rotation' in styles && styles.rotation !== undefined) {
    const v = styles.rotation;
    const r = resolveTokenVar(v, tokensFormat);
    if (r) decls.push(`transform: rotate(${r})`);
    else if (typeof v === 'number' && v !== 0) decls.push(`transform: rotate(${v}deg)`);
  }

  // ── Raw CSS pass-through (injected by CssRule pre-passes) ────────────────────

  if ('_rawCss' in styles && Array.isArray(styles._rawCss)) {
    for (const line of styles._rawCss as string[]) decls.push(line);
  }

  // ── Position & offsets ───────────────────────────────────────────────────────
  //
  // position: ABSOLUTE is emitted on the element that carries it in the spec.
  // position: AUTO means the element re-enters auto-layout flow (variant transition
  // from ABSOLUTE back to AUTO); emit position: static to undo a prior absolute rule.

  if ('position' in styles) {
    if (styles.position === 'ABSOLUTE') decls.push('position: absolute');
    else if (styles.position === 'AUTO') decls.push('position: static');
  } else if (options.inferAbsolute && hasInsets(styles)) {
    decls.push('position: absolute');
  }

  for (const [specKey, cssKey] of [
    ['top', 'inset-block-start'],
    ['bottom', 'inset-block-end'],
    ['start', 'inset-inline-start'],
    ['end', 'inset-inline-end'],
  ] as const) {
    if (specKey in styles && styles[specKey] !== null && styles[specKey] !== undefined) {
      const d = dimensionValue(styles[specKey], tokensFormat);
      if (d) decls.push(`${cssKey}: ${d}`);
    }
  }

  return decls;
}

/** True when any inset coordinate (top/bottom/start/end) is present and non-null. */
export function hasInsets(styles: Record<string, unknown>): boolean {
  return ['top', 'bottom', 'start', 'end'].some(
    k => k in styles && styles[k] !== null && styles[k] !== undefined
  );
}

/**
 * Whether coordinates imply Figma absolute placement, given the parent's
 * layout. Outside auto-layout, any coordinates do. Inside auto-layout,
 * children are flow-placed, so coordinates only mean layoutPositioning:
 * ABSOLUTE when they are meaningful — non-zero, or anchored on opposing
 * sides (top+bottom / start+end). Zero-only single anchors are canvas noise.
 */
export function impliesAbsolute(styles: Record<string, unknown>, parentAutoLayout: boolean): boolean {
  if ('position' in styles) return styles.position === 'ABSOLUTE';
  if (!hasInsets(styles)) return false;
  if (!parentAutoLayout) return true;
  const val = (k: string) => styles[k];
  const present = (k: string) => k in styles && val(k) !== null && val(k) !== undefined;
  const nonZero = ['top', 'bottom', 'start', 'end'].some(k => present(k) && val(k) !== 0);
  const opposing = (present('top') && present('bottom')) || (present('start') && present('end'));
  return nonZero || opposing;
}
