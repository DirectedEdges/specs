import { PropBinding } from "./PropBinding.js";
import { Conditional } from "./Conditional.js";
import { Effects } from "./Effects.js";
import { GradientValue } from "./Gradient.js";

export type Styles = Partial<{
  rotation: Style;
  visible: Style;
  opacity: Style;
  locked: Style;
  backgroundColor: ColorStyle;
  /** Glyph fill color. Present on GLYPH element type only. Represented in Figma as fills. @since 0.13.0 */
  fillColor: ColorStyle;
  effects: TokenReference | Effects;
  clipContent: Style;
  /** Corner radius. Scalar when uniform; `Corners` object when per-corner values differ. @since 1.0.0 */
  cornerRadius: Style | Corners;
  width: Style;
  height: Style;
  minWidth: Style;
  minHeight: Style;
  maxWidth: Style;
  maxHeight: Style;
  x: Style;
  y: Style;
  layoutPositioning: Style;
  layoutSizingHorizontal: Style;
  layoutSizingVertical: Style;
  strokes: ColorStyle;
  strokeAlign: Style;
  /** Stroke weight. Scalar when uniform; `Sides` object when per-side values differ. @since 1.0.0 */
  strokeWeight: Style | Sides;
  typography: TokenReference | Typography;
  textAlignHorizontal: Style;
  textAlignVertical: Style;
  textColor: ColorStyle;
  primaryAxisAlignItems: Style;
  primaryAxisSizingMode: Style;
  counterAxisAlignItems: Style;
  counterAxisAlignContent: Style;
  layoutMode: Style;
  layoutWrap: Style;
  itemReverseZIndex: Style;
  itemSpacing: Style;
  /** Padding. Scalar when uniform; `Sides` object when per-side values differ. @since 1.0.0 */
  padding: Style | Sides;
  counterAxisSpacing: Style;
  cornerSmoothing: Style;
  aspectRatio: AspectRatioStyle;
}>;

/**
 * Platform-neutral token reference. Uses `$token` and `$type` as the
 * complete platform-facing API surface; `$extensions["com.figma"]` carries
 * Figma extraction provenance only and is not required by platform consumers.
 * @since 0.11.0
 */
export interface TokenReference {
  /** DTCG dot-separated token path, e.g. "DS Color.Text.Primary". Usable directly as DTCG alias {DS Color.Text.Primary}. */
  $token: string;
  /**
   * DTCG token type (Format Module §9). Standard values: color, dimension, string, number, boolean,
   * shadow, gradient, typography. "effects" is an Anova extension for EffectsGroup references
   * (multi-shadow + blur composite) with no DTCG equivalent.
   */
  $type:
    | 'color'
    | 'dimension'
    | 'string'
    | 'number'
    | 'boolean'
    | 'shadow'
    | 'gradient'
    | 'typography'
    | 'effects';
  /** Tool-specific metadata per DTCG §5.2.3 (reverse domain name notation). Optional; not required for platform code generation. */
  $extensions?: {
    'com.figma'?: {
      /** Figma variable or style UUID. */
      id: string;
      /** Figma name within collection, e.g. "Text/Primary". */
      name?: string;
      /** Figma collection name, e.g. "DS Color" (variables only; presence distinguishes variable from named-style reference). */
      collectionName?: string;
      /** Value resolved by Figma at extraction time. No DTCG equivalent; Figma extraction provenance only. */
      rawValue?: string | number | boolean;
    };
  };
}

/**
 * Style value types supported in the output format.
 * Can be primitives, token references, prop bindings, or conditional expressions.
 */
export type Style = string | boolean | number | null | TokenReference | PropBinding | Conditional;

/**
 * Inline resolved color value per DTCG Color Module §4.1.
 * `colorSpace` and `components` are required; `alpha` defaults to 1 when omitted;
 * `hex` is an optional 6-digit sRGB fallback (#RRGGBB — no alpha channel in hex).
 *
 * The 14 supported `colorSpace` values correspond to DTCG Color §4.2.
 * The `colorSpace` field is typed as `string` (not a literal union) to avoid drift
 * with the schema enum — the schema provides the validation constraint.
 *
 * Mirrors `ColorValue` in `schema/styles.schema.json`.
 * @since 0.11.0
 */
export interface ColorValue { /** Candidate */
  /** Color space identifier per DTCG Color §4.2 (e.g. 'srgb', 'oklch', 'display-p3'). */
  colorSpace: string;
  /** Ordered component values for the given color space. Each element is a number or the 'none' keyword. */
  components: (number | 'none')[];
  /** Alpha channel 0–1. Defaults to 1 (fully opaque) when omitted. */
  alpha?: number;
  /** Optional 6-digit sRGB fallback hex string (#RRGGBB). Alpha is excluded per DTCG §4.1. */
  hex?: string;
}

/**
 * Colour-specific style value type.
 * Mirrors `ColorStyleValue` in `schema/styles.schema.json`.
 * Used for `backgroundColor`, `fillColor`, `textColor`, and `strokes` — the four properties
 * whose values are always colour-semantics and may carry gradient data.
 */
export type ColorStyle = string | TokenReference | GradientValue | null;

/**
 * Inline typography properties grouped into a composite object.
 * All fields are optional; only properties set on the text node are present.
 * Maps to transformer primitive types: font, mixableNumber, mixableString, pureNumber, boolean, lineHeight.
 */
export interface Typography {
  /** Font size in pixels (mixableNumber primitive) */
  fontSize?: number | 'mixed' | TokenReference;
  /** Font family name; 'mixed' when text has multiple families; TokenReference for variable-bound fonts */
  fontFamily?: string | 'mixed' | TokenReference;
  /** Style name (e.g., "Bold"); 'mixed' when varied; TokenReference for variable-bound fonts */
  fontStyle?: string | 'mixed' | TokenReference;
  /** Line height: "150%", "auto", or pixel value (lineHeight primitive) */
  lineHeight?: string | number | TokenReference;
  /** Letter spacing in pixels; 'mixed' allowed (mixableNumber primitive) */
  letterSpacing?: number | 'mixed' | TokenReference;
  /** Text case: "UPPER", "LOWER", "TITLE", "ORIGINAL", or 'mixed' (mixableString primitive) */
  textCase?: string | 'mixed' | TokenReference;
  /** Text decoration: "UNDERLINE", "STRIKETHROUGH", "NONE", or 'mixed' (mixableString primitive) */
  textDecoration?: string | 'mixed' | TokenReference;
  /** Paragraph indent in pixels (pureNumber primitive) */
  paragraphIndent?: number | TokenReference;
  /** Spacing between paragraphs in pixels (pureNumber primitive) */
  paragraphSpacing?: number | TokenReference;
  /** Leading trim mode — 'NONE' or 'CAP_HEIGHT' per Figma API; 'mixed' when varied across selection */
  leadingTrim?: 'NONE' | 'CAP_HEIGHT' | 'mixed';
  /** Spacing for list items in pixels (pureNumber primitive) */
  listSpacing?: number | TokenReference;
  /** Whether hanging punctuation is enabled (boolean primitive) */
  hangingPunctuation?: boolean | TokenReference;
  /** Whether hanging list is enabled (boolean primitive) */
  hangingList?: boolean | TokenReference;
}

/**
 * Aspect ratio expressed as a numerator/denominator pair.
 * `x` is the numerator (e.g. 16), `y` is the denominator (e.g. 9).
 * Both components are required; irrational ratios are expressed as `{ x: 1.618, y: 1 }`.
 */
export interface AspectRatioValue {
  /** Ratio numerator (e.g. 16 for 16:9) */
  x: number;
  /** Ratio denominator (e.g. 9 for 16:9) */
  y: number;
}

/**
 * Aspect ratio style value.
 * Present only when the node has a locked ratio; `null` when unconstrained.
 * `TokenReference` is intentionally excluded — aspect ratio is a structural
 * lock of literal numbers in the Figma API, not a token-driven value.
 */
export type AspectRatioStyle = AspectRatioValue | null;

/**
 * Per-side values using logical inline-axis directions (`start`/`end`).
 * Used for `padding` and `strokeWeight` when sides differ.
 * Each field is optional; only sides that differ from the collapsed value are present.
 * @since 1.0.0
 */
export interface Sides {
  /** Block-start (top) value */
  top?: Style;
  /** Inline-end value (right in LTR, left in RTL) */
  end?: Style;
  /** Block-end (bottom) value */
  bottom?: Style;
  /** Inline-start value (left in LTR, right in RTL) */
  start?: Style;
}

/**
 * Per-corner values using logical inline-axis directions (`topStart`/`topEnd`/`bottomStart`/`bottomEnd`).
 * Used for `cornerRadius` when corners differ.
 * Each field is optional; only corners that differ from the collapsed value are present.
 * @since 1.0.0
 */
export interface Corners {
  /** Top-start corner (top-left in LTR, top-right in RTL) */
  topStart?: Style;
  /** Top-end corner (top-right in LTR, top-left in RTL) */
  topEnd?: Style;
  /** Bottom-end corner (bottom-right in LTR, bottom-left in RTL) */
  bottomEnd?: Style;
  /** Bottom-start corner (bottom-left in LTR, bottom-right in RTL) */
  bottomStart?: Style;
}

/**
 * Style property keys that can appear in the serialized output
 */
export type StyleKey =
  | 'rotation'
  | 'visible'
  | 'opacity'
  | 'locked'
  | 'backgroundColor'
  | 'fillColor'
  | 'effects'
  | 'clipContent'
  | 'cornerRadius'
  | 'width'
  | 'height'
  | 'minWidth'
  | 'minHeight'
  | 'maxWidth'
  | 'maxHeight'
  | 'x'
  | 'y'
  | 'layoutPositioning'
  | 'layoutSizingHorizontal'
  | 'layoutSizingVertical'
  | 'strokes'
  | 'strokeAlign'
  | 'strokeWeight'
  | 'typography'
  | 'textAlignHorizontal'
  | 'textAlignVertical'
  | 'textColor'
  | 'primaryAxisAlignItems'
  | 'primaryAxisSizingMode'
  | 'counterAxisAlignItems'
  | 'counterAxisAlignContent'
  | 'layoutMode'
  | 'layoutWrap'
  | 'itemReverseZIndex'
  | 'itemSpacing'
  | 'padding'
  | 'counterAxisSpacing'
  | 'cornerSmoothing'
  | 'aspectRatio';
