import { PropBinding } from "./PropBinding.js";
import { PropExtensions } from "./Props.js";

/**
 * How an image scales into its layer. Structural property — not token-bindable.
 * Named after CSS `object-fit` (`cover`/`contain`); the transformer remaps
 * Figma's `scaleMode` values `FILL → COVER` and `FIT → CONTAIN`. Figma's `CROP`
 * and `TILE` are not supported. Absent means `COVER`.
 * @since 0.28.0
 */
export type ImageScaleMode = 'COVER' | 'CONTAIN';

/**
 * An image fill value: a reference into an `images` registry plus optional scale mode.
 *
 * `$image` is a pointer into a `Component.images` registry — root-relative in a
 * single-file spec (e.g. `"#/images/hero"`) or carrying the component + concern
 * prefix in concern-split output (e.g. `"card.examples#/images/hero"`). Modelled
 * as an object (not a bare pointer) so `scaleMode` — and future optional
 * subproperties — attach without a breaking change.
 * @since 0.28.0
 */
export interface ImageValue {
  /** Pointer into an `images` registry, e.g. `"#/images/hero"`. */
  $image: string;
  /** How the image scales into its layer. Absent means `COVER`. */
  scaleMode?: ImageScaleMode;
}

/**
 * Registry of image data, keyed by identifier (`^[a-zA-Z0-9_-]+$`), referenced
 * by `ImageValue.$image`, `ImageBinding.examples`, and `ImageProp.default`.
 *
 * Each value is one string in one of four scheme-discriminated forms: a `data:`
 * URI (self-contained, resolved), an external URL, an emitted asset path, or
 * `"figma:<imageRef>"` — an unresolved placeholder holding the Figma image hash
 * pending a byte-fetch (two-phase detect → resolve). specs-from-figma
 * de-duplicates entries so each distinct image is stored once.
 * @since 0.28.0
 */
export type Images = Record<string, string>;

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
