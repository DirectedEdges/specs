import type { CssRule } from '../CssRule.js';
import { colorValue, dimensionValue } from '../values.js';

type Styles = Record<string, unknown>;
type ElementMap = Record<string, { styles?: Styles }>;

export const borderShiftInsetShadow: CssRule = {
  name: 'border-shift-inset-shadow',

  apply(variantsYaml, { tokensFormat }) {
    const data = JSON.parse(JSON.stringify(variantsYaml)) as Record<string, unknown>;

    const variants = (data.variants ?? []) as Array<Record<string, unknown>>;
    const defaultBlock = (data.default ?? {}) as Record<string, unknown>;
    const defaultElements = (defaultBlock.elements ?? {}) as ElementMap;

    // Collect element keys whose strokeWeight or strokes change in any variant.
    // Only INSIDE strokes affect layout — OUTSIDE/CENTER use outline, skip those.
    const shiftable = new Set<string>();
    for (const variant of variants) {
      const elements = (variant.elements ?? {}) as ElementMap;
      for (const [elemKey, elem] of Object.entries(elements)) {
        const styles = elem.styles ?? {};
        const align = (styles.strokeAlign ?? defaultElements[elemKey]?.styles?.strokeAlign) as string | undefined;
        if (align === 'OUTSIDE' || align === 'CENTER') continue;
        if ('strokeWeight' in styles || 'strokes' in styles) {
          shiftable.add(elemKey);
        }
      }
    }

    if (shiftable.size === 0) return data;

    for (const elemKey of shiftable) {
      // Find the reservation width: use default's strokeWeight if present,
      // otherwise use the first variant that declares one.
      const defaultStyles = (defaultElements[elemKey]?.styles ?? {}) as Styles;
      let reservationWeight: unknown =
        'strokeWeight' in defaultStyles ? defaultStyles.strokeWeight : undefined;

      if (reservationWeight === undefined) {
        for (const variant of variants) {
          const elements = (variant.elements ?? {}) as ElementMap;
          const s = elements[elemKey]?.styles ?? {};
          if ('strokeWeight' in s && s.strokeWeight != null) {
            reservationWeight = s.strokeWeight;
            break;
          }
        }
      }

      // Ensure the default element exists and has a transparent border reservation.
      if (!defaultElements[elemKey]) defaultElements[elemKey] = {};
      const defStyles: Styles = { ...(defaultElements[elemKey].styles ?? {}) };
      if (reservationWeight != null) defStyles.strokeWeight = reservationWeight;
      defStyles.strokes = null; // transparent — reserves space without showing
      defStyles.strokeAlign = 'INSIDE';
      // border-style: solid is required for border-width to occupy layout space.
      // styleToCSS only emits it when strokes has a color, so inject it directly.
      const rawCssBase = (defStyles._rawCss as string[] | undefined) ?? [];
      if (!rawCssBase.includes('border-style: solid')) rawCssBase.push('border-style: solid');
      defStyles._rawCss = rawCssBase;
      defaultElements[elemKey].styles = defStyles;

      // Rewrite each variant that changes this element's stroke to box-shadow.
      for (const variant of variants) {
        const elements = (variant.elements ?? {}) as ElementMap;
        if (!elements[elemKey]) continue;
        const styles = (elements[elemKey].styles ?? {}) as Styles;
        if (!('strokeWeight' in styles) && !('strokes' in styles)) continue;

        const weight = 'strokeWeight' in styles ? styles.strokeWeight : reservationWeight;
        const color = 'strokes' in styles ? styles.strokes : defStyles.strokes;

        const widthVal = dimensionValue(weight, tokensFormat ?? 'TOKEN') ?? '0px';
        const colorVal = colorValue(color, tokensFormat ?? 'TOKEN');

        if (colorVal && colorVal !== 'transparent') {
          const rawCss = (styles._rawCss as string[] | undefined) ?? [];
          rawCss.push(`box-shadow: inset 0 0 0 ${widthVal} ${colorVal}`);
          styles._rawCss = rawCss;
        }

        delete styles.strokeWeight;
        delete styles.strokes;
        delete styles.strokeAlign;
        elements[elemKey].styles = styles;
      }
    }

    defaultBlock.elements = defaultElements;
    data.default = defaultBlock;
    data.variants = variants;
    return data;
  },
};
