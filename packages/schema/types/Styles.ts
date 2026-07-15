import { PropBinding } from "./PropBinding.js";
import { Conditional } from "./Conditional.js";
import { Effects } from "./Effects.js";
import { GradientValue } from "./Gradient.js";
import { ImageValue } from "./Image.js";

export type Styles = Partial<{
  rotation: Style;
  visible: Style;
  opacity: Style;
  locked: Style;
  backgroundColor: ColorStyle;
  /** Image fill painted on a layer. Present on container element types. Fallback representation used when no image component is configured. A `TokenReference` when the image fill comes from an applied Figma fill style (the style reference routes here — not to `backgroundColor` — when the styled paint is an image). Absent when there is no image fill. @since 0.28.0 */
  backgroundImage: ImageValue | TokenReference | null;
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
  /** Layout positioning mode — AUTO (participates in parent auto-layout) or ABSOLUTE. Structural property — not token-bindable. @since 0.19.0 */
  position: Position | null;
  /** Offset from block-start (top) edge. Present when vertical constraint is MIN, STRETCH, or SCALE. Pixel number or percentage string. @since 0.19.0 */
  top: PositionOffset;
  /** Offset from block-end (bottom) edge. Present when vertical constraint is MAX or STRETCH. Pixel number. @since 0.19.0 */
  bottom: PositionOffset;
  /** Offset from inline-start edge. Present when horizontal constraint is MIN, STRETCH, or SCALE. Pixel number or percentage string. @since 0.19.0 */
  start: PositionOffset;
  /** Offset from inline-end edge. Present when horizontal constraint is MAX or STRETCH. Pixel number. @since 0.19.0 */
  end: PositionOffset;
  /** Horizontal offset from center. Present when horizontal constraint is CENTER. @since 0.19.0 */
  centerHorizontalOffset: PositionOffset;
  /** Vertical offset from center. Present when vertical constraint is CENTER. @since 0.19.0 */
  centerVerticalOffset: PositionOffset;
  layoutSizingHorizontal: Style;
  layoutSizingVertical: Style;
  strokes: ColorStyle;
  strokeAlign: Style;
  /** Stroke weight. Scalar when uniform; `Sides` object when per-side values differ. @since 1.0.0 */
  strokeWeight: Style | Sides;
  /** Dash pattern for a stroke. Present (non-null) when the stroke is dashed; null or absent when solid. Structural property — not token-bindable. @since 0.27.0 */
  strokeDashPattern: StrokeDashPattern | null;
  typography: TokenReference | Typography;
  textAlignHorizontal: Style;
  textAlignVertical: Style;
  /** How overflowing text is handled — `CLIP` (cut off) or `ELLIPSIS` (trailing ellipsis). Structural property — not token-bindable. Present on TEXT element type only. @since 0.28.0 */
  textOverflow: TextOverflow | null;
  /** Maximum number of lines before `ELLIPSIS` text overflow applies; `null` or absent means no limit. Present on TEXT element type only. @since 0.28.0 */
  maxLines: Style;
  textColor: ColorStyle;
  /** Alignment along the main axis (depends on `layoutMode`). Structural property — not token-bindable. @since 0.18.0 */
  mainAxisAlignment: MainAxisAlignment | null;
  primaryAxisSizingMode: Style;
  /** Alignment along the cross axis (perpendicular to `layoutMode`). Structural property — not token-bindable. @since 0.18.0 */
  crossAxisAlignment: CrossAxisAlignment | null;
  /** Auto-layout direction. Structural property — not token-bindable. @since 0.18.0 */
  layoutMode: LayoutMode | null;
  /** Whether auto-layout wrapping is enabled (default: false). @since 0.18.0 */
  wrap: Style;
  /** Space distribution between wrapped lines. Only meaningful when `wrap` is true. Structural property — not token-bindable. @since 0.18.0 */
  wrapAlignment: WrapAlignment | null;
  itemReverseZIndex: Style;
  /** Item spacing. Scalar when uniform; `ItemSpacing` object when horizontal and vertical gaps differ. @since 0.18.0 */
  itemSpacing: Style | ItemSpacing;
  /** Padding. Scalar when uniform; `Sides` object when per-side values differ. @since 1.0.0 */
  padding: Style | Sides;
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
   * shadow, gradient, typography. "effects" is a Specs extension for EffectsGroup references
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
 * Mirrors `ColorObject` in `schema/styles.schema.json`.
 * @since 0.11.0
 */
export interface ColorObject { /** Candidate */
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
 *
 * The `string` arm covers formatted colour strings (e.g. `#FF6600`, `rgba(...)`)
 * emitted when `Config.format.color` is set to a non-`OBJECT` format.
 */
export type ColorStyle = string | ColorObject | TokenReference | GradientValue | null;

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
 * Layout positioning mode. Structural property that cannot be token-bound.
 * @since 0.19.0
 */
export type Position = 'AUTO' | 'ABSOLUTE';

/**
 * Positional offset value. Pixel number, percentage string (SCALE constraint, e.g. "25%"), or null.
 * Narrower than `Style` — positional offsets are computed from Figma layout, not token-bindable.
 * @since 0.19.0
 */
export type PositionOffset = number | string | null;

/**
 * Auto-layout direction mode. Structural property that cannot be token-bound.
 * @since 0.18.0
 */
export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

/**
 * Wrap alignment mode for multi-line auto-layout. Structural property that cannot be token-bound.
 * Only meaningful when `wrap` is true.
 * @since 0.18.0
 */
export type WrapAlignment = 'START' | 'SPACE_BETWEEN';

/**
 * Main axis alignment mode for auto-layout containers.
 * Controls alignment along the primary axis (depends on `layoutMode`).
 * Structural property that cannot be token-bound.
 * @since 0.18.0
 */
export type MainAxisAlignment = 'START' | 'END' | 'CENTER' | 'SPACE_BETWEEN';

/**
 * Cross axis alignment mode for auto-layout containers.
 * Controls alignment perpendicular to the primary axis (depends on `layoutMode`).
 * Structural property that cannot be token-bound.
 * @since 0.18.0
 */
export type CrossAxisAlignment = 'START' | 'END' | 'CENTER' | 'STRETCH' | 'BASELINE';

/**
 * How text is handled when it overflows its bounds. Structural property that cannot be token-bound.
 * `'CLIP'` cuts the text off; `'ELLIPSIS'` truncates with a trailing ellipsis.
 * Named after CSS `text-overflow` and Jetpack Compose `TextOverflow` (values `clip`/`ellipsis`).
 * @since 0.28.0
 */
export type TextOverflow = 'CLIP' | 'ELLIPSIS';

/**
 * Dash geometry for a dashed stroke.
 * Presence on `Styles.strokeDashPattern` indicates a dashed stroke; null or absent indicates solid.
 * `dash` and `gap` are in pixels and correspond to index 0 and 1 of Figma's `strokeDashes` array.
 * @since 0.27.0
 */
export interface StrokeDashPattern {
  /** Dash segment length in pixels */
  dash: number;
  /** Gap segment length in pixels */
  gap: number;
}

/**
 * Bi-axial item spacing values using absolute visual axes.
 * Used for `itemSpacing` when horizontal and vertical gaps differ.
 * Each field is optional; only axes that differ from the collapsed value are present.
 * @since 0.18.0
 */
export interface ItemSpacing {
  /** Horizontal gap between items */
  horizontal?: Style;
  /** Vertical gap between items */
  vertical?: Style;
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
  | 'backgroundImage'
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
  | 'position'
  | 'top'
  | 'bottom'
  | 'start'
  | 'end'
  | 'centerHorizontalOffset'
  | 'centerVerticalOffset'
  | 'layoutSizingHorizontal'
  | 'layoutSizingVertical'
  | 'strokes'
  | 'strokeAlign'
  | 'strokeWeight'
  | 'strokeDashPattern'
  | 'typography'
  | 'textAlignHorizontal'
  | 'textAlignVertical'
  | 'textOverflow'
  | 'maxLines'
  | 'textColor'
  | 'mainAxisAlignment'
  | 'primaryAxisSizingMode'
  | 'crossAxisAlignment'
  | 'layoutMode'
  | 'wrap'
  | 'wrapAlignment'
  | 'itemReverseZIndex'
  | 'itemSpacing'
  | 'padding'
  | 'cornerSmoothing'
  | 'aspectRatio';
