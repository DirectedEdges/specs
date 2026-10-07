// Absolute placement and inset offsets (specs#691).
import { dimensionValue } from '../dimensions.js';

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

/**
 * `position: ABSOLUTE` is emitted on the element that carries it in the spec.
 * `position: AUTO` means the element re-enters auto-layout flow (a variant
 * transition from ABSOLUTE back to AUTO); it emits `position: static` to undo a
 * prior absolute rule.
 */
export function positionDecls(
  styles: Record<string, unknown>,
  tokensFormat: string,
  inferAbsolute: boolean | undefined,
): string[] {
  const decls: string[] = [];

  if ('position' in styles) {
    if (styles.position === 'ABSOLUTE') decls.push('position: absolute');
    else if (styles.position === 'AUTO') decls.push('position: static');
  } else if (inferAbsolute && hasInsets(styles)) {
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
