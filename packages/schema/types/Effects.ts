import { TokenReference } from "./Styles.js";

/**
 * A single evaluated shadow (drop or inner).
 * `inset` distinguishes inner shadows (true) from drop shadows (absent/false).
 * Field names `offsetX`/`offsetY` align with the DTCG Format Module shadow token.
 * `offsetX`, `offsetY`, `blur`, `spread` may be a raw number or a Figma variable reference.
 * `color` is an 8-digit hex string (`#RRGGBBAA`) or a Figma variable reference.
 * `visible` is always a boolean — Figma does not support variable binding on
 * the `visible` field of individual effect items.
 */
export interface Shadow {
  visible: boolean;
  /** true for inner shadow; absent or false for drop shadow (DTCG) */
  inset?: boolean;
  /** Horizontal offset in pixels — DTCG field name */
  offsetX: number | TokenReference;
  /** Vertical offset in pixels — DTCG field name */
  offsetY: number | TokenReference;
  blur: number | TokenReference;
  spread: number | TokenReference;
  color: string | TokenReference;
}

/**
 * A single evaluated blur effect (layer blur or background blur).
 * Singular per type; the containing key (`layerBlur` vs `backgroundBlur`)
 * determines render role.
 * `visible` is always a boolean — Figma does not support variable binding on
 * the `visible` field of individual effect items.
 */
export interface Blur {
  visible: boolean;
  radius: number | TokenReference;
}

/**
 * Inline effects grouped by role.
 * Each key is optional; a key is omitted when no effects of that type are present.
 * `shadows` carries all shadow entries; `Shadow.inset` distinguishes drop vs inner.
 * Maps directly to platform properties:
 * - `shadows` (inset=false/absent) → `box-shadow` / `.shadow()`
 * - `shadows` (inset=true) → `inset box-shadow`
 * - `layerBlur` → `filter: blur()`
 * - `backgroundBlur` → `backdrop-filter: blur()`
 */
export interface Effects {
  /** Ordered list of shadows; Shadow.inset distinguishes drop (absent/false) vs inner (true) */
  shadows?: Shadow[];
  /** Singular layer blur (filter effect on the node itself) */
  layerBlur?: Blur;
  /** Singular background blur (backdrop filter) */
  backgroundBlur?: Blur;
}
