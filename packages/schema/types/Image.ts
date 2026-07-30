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
 * Figma extraction provenance for a registry image — the content hash that
 * identifies the image inside Figma (Plugin `ImagePaint.imageHash`; REST
 * `fills[].imageRef`). Not required by platform consumers; reverse-direction
 * tooling uses it to reconstruct an `ImagePaint` (and to reuse the same Figma
 * image across round-trips) without re-uploading bytes.
 * @since 0.28.0
 */
export interface FigmaImageExtension {
  imageHash: string;
}

/** DTCG §5.2.3-style platform extensions for a registry image. @since 0.28.0 */
export interface ImageDataExtensions {
  'com.figma'?: FigmaImageExtension;
}

/**
 * A registry entry for one distinct image. Two-phase (detect → resolve),
 * expressed structurally: `src` absent means unresolved (the detect phase in
 * both runtimes — tiny enough for the plugin's saved-data budget); resolution
 * ADDS `src` rather than replacing anything, so the Figma identity in
 * `$extensions` survives for reverse-direction tooling.
 * @since 0.28.0
 */
export interface ImageData {
  /** Resolved image source — an emitted asset path (the standard resolved form, relative to the referencing spec file), a `data:` URI, or an external URL. Absent = unresolved. */
  src?: string;
  /** Figma extraction provenance (`imageHash`). */
  $extensions?: ImageDataExtensions;
}

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
