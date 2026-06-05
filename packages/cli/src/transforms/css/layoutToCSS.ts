// Maps the layout group of spec style keys to CSS flex declarations.
// Each key is emitted when present — variant layering mirrors CSS cascading,
// so if a key appears in a variant it means it changed and should be emitted.

import { isTokenRef, tokenVar, dimensionValue } from './values.js';

const MAIN_AXIS_MAP: Record<string, string> = {
  START: 'flex-start',
  END: 'flex-end',
  CENTER: 'center',
  SPACE_BETWEEN: 'space-between',
};

const CROSS_AXIS_MAP: Record<string, string> = {
  START: 'flex-start',
  END: 'flex-end',
  CENTER: 'center',
  STRETCH: 'stretch',
  BASELINE: 'baseline',
};

const WRAP_ALIGN_MAP: Record<string, string> = {
  START: 'flex-start',
  SPACE_BETWEEN: 'space-between',
};

export function layoutToCSS(styles: Record<string, unknown>): string[] {
  const decls: string[] = [];

  if ('layoutMode' in styles) {
    const layoutMode = styles.layoutMode as string | null;
    // Suppress display when visible: false is present — styleToCSS will emit
    // display: none and a preceding display: flex in the same rule is dead code.
    const hiddenByVisible = styles.visible === false;
    if (!hiddenByVisible) {
      if (layoutMode === 'HORIZONTAL') {
        decls.push('display: flex');
        decls.push('flex-direction: row');
      } else if (layoutMode === 'VERTICAL') {
        decls.push('display: flex');
        decls.push('flex-direction: column');
      } else if (layoutMode === 'NONE' || layoutMode === null) {
        decls.push('display: block');
      }
    }
  }

  if ('mainAxisAlignment' in styles) {
    const v = styles.mainAxisAlignment as string | null;
    if (v && MAIN_AXIS_MAP[v]) decls.push(`justify-content: ${MAIN_AXIS_MAP[v]}`);
  }

  if ('crossAxisAlignment' in styles) {
    const v = styles.crossAxisAlignment as string | null;
    if (v && CROSS_AXIS_MAP[v]) decls.push(`align-items: ${CROSS_AXIS_MAP[v]}`);
  }

  if ('wrap' in styles) {
    decls.push(styles.wrap === true ? 'flex-wrap: wrap' : 'flex-wrap: nowrap');
  }

  if ('wrapAlignment' in styles) {
    const v = styles.wrapAlignment as string | null;
    if (v && WRAP_ALIGN_MAP[v]) decls.push(`align-content: ${WRAP_ALIGN_MAP[v]}`);
  }

  if ('itemSpacing' in styles && styles.itemSpacing !== undefined && styles.itemSpacing !== null) {
    const v = styles.itemSpacing;
    if (typeof v === 'number') {
      // gap does not accept negative values — negative itemSpacing represents
      // overlapping children and requires margin on child elements instead.
      if (v < 0) return decls; // caller handles via child margins (deferred)
      decls.push(`gap: ${v === 0 ? '0' : `${v}px`}`);
    } else if (isTokenRef(v)) {
      decls.push(`gap: ${tokenVar(v)}`);
    } else if (typeof v === 'object') {
      const is = v as Record<string, unknown>;
      const h = dimensionValue(is.horizontal);
      const g = dimensionValue(is.vertical);
      if (h && g) decls.push(`gap: ${g} ${h}`);
      else if (h) decls.push(`column-gap: ${h}`);
      else if (g) decls.push(`row-gap: ${g}`);
    }
  }

  if ('layoutSizingHorizontal' in styles) {
    const v = styles.layoutSizingHorizontal as string | undefined;
    if (v === 'HUG') decls.push('width: fit-content');
    else if (v === 'FILL') decls.push('flex-grow: 1');
  }

  if ('layoutSizingVertical' in styles) {
    const v = styles.layoutSizingVertical as string | undefined;
    if (v === 'HUG') decls.push('height: fit-content');
    else if (v === 'FILL') decls.push('align-self: stretch');
  }

  return decls;
}
