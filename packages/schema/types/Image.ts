import { PropBinding } from "./PropBinding.js";
import { PropExtensions } from "./Props.js";

/**
 * How an image is fitted to its layer. Structural property — not token-bindable.
 * Named after CSS `object-fit` (`cover`/`contain`), biasing code over Figma's
 * `scaleMode` per Constitution VI. The transformer remaps Figma's `scaleMode`:
 * `FILL → COVER`, `FIT → CONTAIN`, and lossily coerces `CROP → COVER` and
 * `TILE → COVER` (so no image fill is silently dropped). Absent means `COVER`.
 * @since 0.28.0
 */
export type ObjectFit = 'COVER' | 'CONTAIN';

/**
 * An image fill value: a reference into an `images` registry plus optional fit.
 *
 * `$image` is a pointer into a `Component.images` registry — root-relative in a
 * single-file spec (e.g. `"#/images/hero"`) or carrying the component + concern
 * prefix in concern-split output (e.g. `"card.examples#/images/hero"`). Modelled
 * as an object (not a bare pointer) so `objectFit` — and future optional
 * subproperties — attach without a breaking change.
 * @since 0.28.0
 */
export interface ImageValue {
  /** Pointer into an `images` registry, e.g. `"#/images/hero"`. */
  $image: string;
  /** How the image is fitted to its layer. Absent means `COVER`. */
  objectFit?: ObjectFit;
}

/**
 * An unresolved image placeholder — the Figma image hash carried as
 * `figma:<imageRef>` while the bytes have not been fetched yet (two-phase
 * detect → resolve). The schema formally distinguishes this form from resolved
 * data by the `figma:` scheme.
 * @since 0.28.0
 */
export type FigmaImageRef = `figma:${string}`;

/**
 * A registry value: resolved image data — a `data:` URI (self-contained), an
 * external URL, or an emitted asset path — or an unresolved `FigmaImageRef`
 * placeholder. Both are strings; the JSON schema constrains the two forms by
 * scheme (the authoritative validation contract).
 * @since 0.28.0
 */
export type ImageData = FigmaImageRef | string;

/**
 * Registry of image data, keyed by identifier (`^[a-zA-Z0-9_-]+$`), referenced
 * by `ImageValue.$image`, `ImageBinding.examples`, and `ImageProp.default`.
 * specs-from-figma de-duplicates entries so each distinct image is stored once.
 * @since 0.28.0
 */
export type Images = Record<string, ImageData>;

/**
 * Image-valued property definition (e.g. a `dsImage` `source` prop, or a parent
 * prop forwarded into it). The authoring-default image rides on the
 * `ImageBinding` at the binding site, not on the prop.
 * @since 0.28.0
 */
export interface ImageProp {
  type: 'image';
  /** Default image — an `images` registry reference, or null. */
  default?: string | null;
  /** Whether this prop accepts a null value. */
  nullable?: boolean;
  /** DTCG §5.2.3 platform-specific extensions. */
  $extensions?: PropExtensions;
}

/**
 * A prop-bound image, forwarded into a nested image instance's source prop via
 * `propConfigurations`, carrying the authoring-default image(s) seen in Figma.
 *
 * Mirrors `SlotBinding` (ADR-047): `PropBinding` extended with `examples`.
 * `examples` is non-contractual reference material — parallel to
 * `StringProp.examples`. Because `ImageBinding extends PropBinding`, existing
 * `{ $binding }` values still validate.
 * @since 0.28.0
 */
export interface ImageBinding extends PropBinding {
  examples?: ImageValue[];
}
