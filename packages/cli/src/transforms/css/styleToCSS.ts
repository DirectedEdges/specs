// Maps atomic spec style keys to CSS declarations.
// Layout-group keys (layoutMode, mainAxisAlignment, crossAxisAlignment, wrap,
// wrapAlignment, itemSpacing, layoutSizingHorizontal, layoutSizingVertical)
// are handled by layoutToCSS — they require cross-key context and are skipped here.

import { isTokenRef, resolveTokenVar, dimensionValue, dimensionValueOrUnset, colorValue, sidesValue, isGradient, isGradientToken, gradientValue } from './values.js';

// ADR-064 logical directions — the transform speaks only the current schema.
const TEXT_ALIGN_MAP: Record<string, string> = {
  START: 'start', CENTER: 'center', END: 'end', JUSTIFY: 'justify',
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

/**
 * Whether a stroke is drawn as an outline rather than a border.
 *
 * Everything but a per-side weight, which an outline has no way to express.
 * `strokeAlign` does not enter into it: no alignment should cost layout space,
 * and undefined reads as INSIDE, Figma's own default when none is recorded.
 */
/**
 * A length as its negative.
 *
 * A plain length just takes a minus sign. Anything else — a `var()`, a `calc()`
 * — cannot: `-var(--x)` is not a value, and the whole declaration is dropped as
 * invalid. Every token-valued stroke width hit exactly that, which read as the
 * stroke sitting in the wrong place rather than as broken CSS.
 */
function negate(length: string): string {
  if (/^[\d.]+(px|rem|em|%)$/.test(length)) return `-${length}`;
  return `calc(-1 * ${length})`;
}


function asOutline(strokeWeight: unknown): boolean {
  return !(typeof strokeWeight === 'object' && strokeWeight !== null && !isTokenRef(strokeWeight));
}

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
  /**
   * Whether any layer of this element strokes with a gradient. A gradient ring
   * is painted with a transparent border carrying its thickness, so a variant
   * restating only the weight has to put it on the border rather than the
   * outline a solid stroke uses.
   */
  gradientStroke?: boolean;
  /**
   * Emit `border-image: none` alongside solid stroke colors. Set when another
   * layer of the same element uses a gradient stroke (border-image) — without
   * the reset, an earlier variant's border-image outranks a later border-color.
   */
  resetBorderImage?: boolean;
  /**
   * Whether these declarations are the element's default block.
   *
   * Only there does "strokes with no weight" mean the element has no border.
   * A variant block that restates `strokes` is changing the stroke's colour
   * and inheriting its width from the default rule, so giving it a width of
   * its own would erase a border the design keeps.
   */
  isDefaultBlock?: boolean;
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
    const g = gradientValue(styles.backgroundColor, tokensFormat);
    if (g) {
      decls.push(`background: ${g}`);
    } else {
      const v = colorValue(styles.backgroundColor, tokensFormat);
      if (v) decls.push(`background: ${v}`);
    }
  }

  if ('textColor' in styles) {
    const g = gradientValue(styles.textColor, tokensFormat);
    if (g) {
      // Gradient text: paint the gradient as a background clipped to the glyphs.
      decls.push(`background: ${g}`);
      decls.push('-webkit-background-clip: text');
      decls.push('background-clip: text');
      decls.push('color: transparent');
    } else {
      const v = colorValue(styles.textColor, tokensFormat);
      if (v) decls.push(`color: ${v}`);
    }
  }

  if ('fillColor' in styles) {
    const g = gradientValue(styles.fillColor, tokensFormat);
    if (g) {
      // Gradient fills paint as background-image — through the mask for
      // glyphs/vectors, directly for shapes. Untyped legacy `fill` (SVG paint)
      // has no inline-gradient equivalent and is skipped.
      if (elemType !== undefined) decls.push(`background: ${g}`);
    } else {
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
  }

  // ── Opacity ─────────────────────────────────────────────────────────────────

  // An unbound opacity arrives as the ratio Figma stores (0.36). An opacity
  // VARIABLE is authored on a percentage scale (36), because that is what reads
  // naturally across platforms — so a token reference is multiplied into a CSS
  // percentage. Emitting the variable bare gives `opacity: 36`, which clamps to
  // 1 and silently discards the state.
  if ('opacity' in styles && styles.opacity !== undefined) {
    const v = styles.opacity;
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) decls.push(`opacity: calc(${resolved} * 1%)`);
    else if (typeof v === 'number') decls.push(`opacity: ${v}`);
  }

  // ── Border ──────────────────────────────────────────────────────────────────
  //
  // strokes + strokeWeight together form a border. border-style must be emitted
  // whenever strokes is present and non-null — CSS borders are invisible without it.
  //
  // strokeAlign mapping — every alignment is an outline:
  //   INSIDE  → outline pulled in by its own width (outline-offset: -W)
  //   CENTER  → outline (renders centered on the element edge)
  //   OUTSIDE → outline (renders outside element bounds)
  //   null    → remove border (border-width: 0; border-color: transparent)
  //
  // A Figma stroke costs no space at any alignment: the frame stays the size it
  // was and the stroke is drawn relative to its edge. A CSS border cannot do
  // that — it is only "inside" when the element has an explicit size, and
  // `box-sizing: border-box` does nothing for a hugging element, where the
  // border adds its width to the box and pushes the content in. A badge hugging
  // its content came out 2px taller than the design for exactly that reason.
  //
  // An outline affects no layout and follows border-radius, so a negative
  // offset of its own width lands an inside stroke where Figma draws it. The
  // one thing an outline cannot express is a per-side weight, which keeps the
  // border mapping — the design strokes some sides and not others, and four
  // widths need four properties.

  const hasStrokes = 'strokes' in styles;
  const hasStrokeWeight = 'strokeWeight' in styles;
  const strokeAlign = styles.strokeAlign as string | null | undefined;
  // A gradient stroke paints a ring whose thickness is a transparent border, so
  // its width belongs to the border even though a solid stroke's width goes to
  // the outline. A variant restating only `strokeWeight` cannot tell from its
  // own declarations, so the caller reports whether any layer of this element
  // strokes with a gradient.
  const gradientStroke =
    isGradient(styles.strokes) || isGradientToken(styles.strokes) || options.gradientStroke === true;

  if (hasStrokes) {
    const strokesVal = styles.strokes;
    if (strokesVal === null) {
      // Clears both mechanisms. A variant that drops its stroke has to cancel
      // whatever the default block drew, and since a solid stroke is an outline
      // and a gradient one is a border-image, resetting only the border leaves
      // the default's outline painting on a variant that has no stroke.
      decls.push('border-color: transparent');
      decls.push('outline-style: none');
      if (options.resetBorderImage) decls.push('border-image: none');
    } else if (isGradient(strokesVal) || isGradientToken(strokesVal)) {
      // A gradient stroke is painted on a ::before ring by the caller, not
      // declared here — see gradientRingRule. Nothing on the element itself:
      // an outline cannot take a gradient, `border-image` is the only border
      // property that can and it ignores `border-radius`, and painting into
      // the element's own `background` destroys whatever fill it declares.
      //
      // The element must still cancel the mechanisms a sibling layer may have
      // drawn with, so a variant switching between a solid and a gradient
      // stroke does not show both at once.
      decls.push('outline-style: none');
      decls.push('border-color: transparent');
      if (options.resetBorderImage) decls.push('border-image: none');
    } else {
      const v = colorValue(strokesVal, tokensFormat);
      if (v) {
        if (asOutline(styles.strokeWeight)) {
          decls.push(`outline-color: ${v}`);
          decls.push('outline-style: solid');
          // A gradient stroke still paints through border-image, so a solid
          // stroke on another variant of the same element has to cancel it —
          // the outline it emits instead cannot override a border property.
          if (options.resetBorderImage) decls.push('border-image: none');
        } else {
          decls.push(`border-color: ${v}`);
          decls.push('border-style: solid');
          if (options.resetBorderImage) decls.push('border-image: none');
        }
      }
    }
  }

  if (hasStrokeWeight) {
    const v = styles.strokeWeight;
    if (v === null) {
      decls.push('border-width: 0');
      decls.push('outline-width: 0');
    } else if (typeof v === 'object' && v !== null && !isTokenRef(v)) {
      decls.push(...sidesValue(v as Record<string, unknown>, 'border-width', tokensFormat));
    } else {
      const d = dimensionValue(v, tokensFormat);
      if (d) {
        if (gradientStroke) {
          // The ring's thickness lives on the ::before rule; the host draws
          // no stroke of its own, and giving it a border would cost layout
          // that a Figma stroke never costs.
        } else if (asOutline(v)) {
          decls.push(`outline-width: ${d}`);
          // Centre and outside sit where the outline naturally falls; only an
          // inside stroke is pulled back over the element's own edge.
          if (strokeAlign !== 'OUTSIDE' && strokeAlign !== 'CENTER') {
            decls.push(`outline-offset: ${negate(d)}`);
          }
        } else {
          decls.push(`border-width: ${d}`);
        }
      }
    }
  }

  // A stroke paint with no weight is not a border. Emitting `border-style`
  // without a width lets CSS fall back to the initial `medium` — about 3px of
  // border the design does not have. Figma reports `strokeWeight: 0` for these,
  // and the spec carries the paint without the zero, so the width has to be
  // stated here.
  //
  // Keyed on this declaration set having no width of its own, so the layout
  // reservation that emits a transparent border at a variant's width (see
  // borderShiftInsetShadow) is untouched — it always emits one.
  // A gradient stroke is deliberately excluded: it emits `border-image` and
  // relies on the same missing width, but zeroing it removes the gradient
  // border entirely rather than removing a border that should not be there.
  // That case needs its own weight and is tracked separately.
  const emittedStyle = (kind: 'border' | 'outline'): boolean =>
    decls.some(d => d.startsWith(`${kind}-style:`)) && !decls.some(d => d.startsWith('border-image:'));
  const emittedWidth = (kind: 'border' | 'outline'): boolean =>
    decls.some(d => /^border-(?:[a-z]+-)*width:/.test(d) || d.startsWith(`${kind}-width:`));

  if (options.isDefaultBlock) {
    for (const kind of ['border', 'outline'] as const) {
      if (emittedStyle(kind) && !emittedWidth(kind)) decls.push(`${kind}-width: 0`);
    }
  }

  // ── Corner radius ────────────────────────────────────────────────────────────

  if ('cornerRadius' in styles && styles.cornerRadius !== undefined) {
    const v = styles.cornerRadius;
    const resolved = resolveTokenVar(v, tokensFormat);
    if (resolved) {
      decls.push(`border-radius: ${resolved}`);
    } else if (isTokenRef(v)) {
      // A token reference resolveTokenVar declined is a withheld unresolved
      // variable. Degrade to the captured raw value where the engine carried
      // one; otherwise `unset` says the variant overrode the radius with
      // something unreadable, so a base rule's radius does not win here.
      decls.push(`border-radius: ${dimensionValueOrUnset(v, tokensFormat) ?? 'unset'}`);
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

  if ('effects' in styles && styles.effects !== undefined) {
    const v = styles.effects;
    if (v === null) {
      // Variant removes the layer's effects — reset every property the
      // Effects mapping can emit.
      decls.push('box-shadow: none');
      decls.push('filter: none');
      decls.push('backdrop-filter: none');
    } else if (isTokenRef(v)) {
      // An effect-style reference names up to three role vars — <name>-shadows,
      // <name>-layer-blur, <name>-background-blur (mirroring the Effects schema
      // keys) — each holding its CSS property's complete value. All three
      // properties are emitted with a `none` fallback, so only the roles the
      // consumer actually defines take effect; `none` is a true no-op (unlike
      // blur(0), which would still create a stacking context).
      const base = resolveTokenVar(v, tokensFormat);
      if (base) {
        const role = (suffix: string) => base.replace(/\)$/, `-${suffix}, none)`);
        decls.push(`box-shadow: ${role('shadows')} /* effects */`);
        decls.push(`filter: ${role('layer-blur')} /* effects */`);
        decls.push(`backdrop-filter: ${role('background-blur')} /* effects */`);
      }
    } else if (typeof v === 'object') {
      decls.push(...effectsDecls(v as Record<string, unknown>, tokensFormat));
    }
  }

  // ── Dimensions ───────────────────────────────────────────────────────────────

  // An element that declares an aspect ratio has its height determined by its
  // width, and the authored height is that same value at the authored width —
  // the two are redundant. Only the ratio survives composition: a fixed height
  // beats `aspect-ratio` in the cascade, so once the component is placed in a
  // narrower box the element keeps its full authored height and its background
  // is scaled to cover a box the design never had.
  //
  // A style set that sets `aspectRatio: null` is stating it has no ratio, so
  // its height is authored and is emitted.
  const hasAspectRatio =
    'aspectRatio' in styles && styles.aspectRatio !== null && styles.aspectRatio !== undefined;

  for (const [key, cssProp] of DIMENSION_KEYS) {
    if (key in styles) {
      if (key === 'height' && hasAspectRatio) continue;
      const d = dimensionValueOrUnset((styles as Record<string, unknown>)[key], tokensFormat);
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
      // `font` cannot carry letter-spacing, so cssvars emits it as a companion
      // variable. Nothing referenced it, and the shorthand resets it to normal —
      // so every tracked type token lost its tracking, while the raw-typography
      // path below applied it correctly. `normal` for tokens that declare none.
      const companion = resolved.replace(/^var\((--[\w-]+)/, '$1').match(/^(--[\w-]+)/)?.[1];
      if (companion) decls.push(`letter-spacing: var(${companion}-letter-spacing, normal)`);
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

  // ── Text truncation ──────────────────────────────────────────────────────────
  //
  // Figma truncates a text layer by line count, optionally with an ellipsis.
  // CSS has two mechanisms and they do not overlap: a single line truncates
  // with `text-overflow`, which needs the line held on one line and the
  // overflow hidden; more than one line needs the line-clamp box.
  //
  // Both need `overflow: hidden`, and `clipsContent` may have already said so —
  // a duplicate declaration is harmless, and omitting it where clipsContent is
  // absent would leave the truncation inert.

  const maxLines = styles.maxLines;
  const ellipsis = styles.textOverflow === 'ELLIPSIS';
  if (typeof maxLines === 'number' && maxLines > 0) {
    if (maxLines === 1) {
      decls.push('white-space: nowrap');
      decls.push('overflow: hidden');
      if (ellipsis) decls.push('text-overflow: ellipsis');
    } else {
      decls.push('display: -webkit-box');
      decls.push('-webkit-box-orient: vertical');
      decls.push(`-webkit-line-clamp: ${maxLines}`);
      decls.push(`line-clamp: ${maxLines}`);
      decls.push('overflow: hidden');
    }
  } else if (ellipsis) {
    // An ellipsis with no line count is a single-line truncation.
    decls.push('white-space: nowrap');
    decls.push('overflow: hidden');
    decls.push('text-overflow: ellipsis');
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

  if ('clipsContent' in styles && styles.clipsContent !== undefined) {
    if (styles.clipsContent === true) decls.push('overflow: hidden');
    else if (styles.clipsContent === false) decls.push('overflow: visible');
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

/**
 * Inline Effects object → CSS declarations.
 *
 *   shadows (inset absent/false) → box-shadow entries
 *   shadows (inset true)         → inset box-shadow entries
 *   layerBlur                    → filter: blur()
 *   backgroundBlur               → backdrop-filter: blur()
 *
 * Invisible entries are dropped; a present-but-fully-invisible group emits an
 * explicit reset so variant overrides can turn a lower layer's effect off.
 * When one effects value fans out into multiple CSS properties, each carries
 * an /* effects *​/ trace comment tying the individual declarations back to
 * the single spec value they came from.
 */
function effectsDecls(effects: Record<string, unknown>, tokensFormat: string): string[] {
  const decls: string[] = [];

  if (Array.isArray(effects.shadows)) {
    const visible = (effects.shadows as Array<Record<string, unknown>>).filter(s => s.visible !== false);
    if (visible.length === 0) {
      decls.push('box-shadow: none');
    } else {
      const parts = visible.map(s => {
        const x = dimensionValue(s.offsetX, tokensFormat) ?? '0';
        const y = dimensionValue(s.offsetY, tokensFormat) ?? '0';
        const blur = dimensionValue(s.blur, tokensFormat) ?? '0';
        const spread = dimensionValue(s.spread, tokensFormat) ?? '0';
        const color = colorValue(s.color, tokensFormat) ?? 'currentColor';
        return `${s.inset ? 'inset ' : ''}${x} ${y} ${blur} ${spread} ${color}`;
      });
      decls.push(`box-shadow: ${parts.join(', ')}`);
    }
  }

  const blur = (key: 'layerBlur' | 'backgroundBlur', prop: string): void => {
    const b = effects[key] as Record<string, unknown> | undefined;
    if (!b || typeof b !== 'object') return;
    if (b.visible === false) {
      decls.push(`${prop}: none`);
      return;
    }
    const r = dimensionValue(b.radius, tokensFormat);
    if (r) decls.push(`${prop}: blur(${r})`);
  };
  blur('layerBlur', 'filter');
  blur('backgroundBlur', 'backdrop-filter');

  return decls.length > 1 ? decls.map(d => `${d} /* effects */`) : decls;
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
