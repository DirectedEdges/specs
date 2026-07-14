/**
 * Type-level tests for image content (ADR-063):
 * ImageScaleMode, ImageValue, Images, ImageProp, ImageBinding,
 * Styles.backgroundImage, and Config image fields.
 *
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  ImageScaleMode,
  ImageValue,
  Images,
  ImageProp,
  ImageBinding,
  AnyProp,
  Styles,
  Component,
  PropConfigurationValue,
  Config,
} from '../types/index.js';

// ─── ImageScaleMode ───────────────────────────────────────────────────────────

const scaleCover: ImageScaleMode = 'COVER';
const scaleContain: ImageScaleMode = 'CONTAIN';

// @ts-expect-error: FILL is Figma vocabulary, not a valid ImageScaleMode
const _scaleFill: ImageScaleMode = 'FILL';

// @ts-expect-error: CROP is out of scope
const _scaleCrop: ImageScaleMode = 'CROP';

// ─── ImageValue ─────────────────────────────────────────────────────────────

// $image required; scaleMode optional
const imageMinimal: ImageValue = { $image: '#/images/hero' };
const imageWithScale: ImageValue = { $image: 'card.examples#/images/hero', scaleMode: 'CONTAIN' };

// @ts-expect-error: $image is required
const _imageNoRef: ImageValue = { scaleMode: 'COVER' };

// @ts-expect-error: scaleMode must be an ImageScaleMode
const _imageBadScale: ImageValue = { $image: '#/images/hero', scaleMode: 'STRETCH' };

// ─── Images registry ──────────────────────────────────────────────────────────

const images: Images = {
  hero: 'data:image/png;base64,iVBORw0KG...',
  userPhoto: 'figma:abc123def456',
  logo: 'https://cdn.example.com/logo.png',
};

// @ts-expect-error: registry values must be strings
const _imagesBadValue: Images = { hero: 42 };

// ─── ImageProp ────────────────────────────────────────────────────────────────

const imagePropMinimal: ImageProp = { type: 'image' };
const imagePropNullable: ImageProp = { type: 'image', nullable: true };
const imagePropDefault: ImageProp = { type: 'image', default: '#/images/hero' };
const imagePropNullDefault: ImageProp = { type: 'image', default: null, nullable: true };
const imagePropExt: ImageProp = { type: 'image', $extensions: { 'com.figma': { type: 'INSTANCE_SWAP' } } };

// @ts-expect-error: type must be the literal 'image'
const _imagePropBadType: ImageProp = { type: 'string' };

// ImageProp is assignable to AnyProp
const anyFromImage: AnyProp = { type: 'image' } satisfies ImageProp;
const anyFromImageNullable: AnyProp = imagePropNullable;

// ─── ImageBinding ─────────────────────────────────────────────────────────────

// $binding required (inherited from PropBinding); examples optional
const bindingMinimal: ImageBinding = { $binding: '#/props/image' };
const bindingWithExamples: ImageBinding = {
  $binding: '#/props/image',
  examples: [{ $image: 'dsAvatar.examples#/images/userPhoto' }],
};

// @ts-expect-error: $binding is required
const _bindingNoRef: ImageBinding = { examples: [{ $image: '#/images/hero' }] };

// @ts-expect-error: examples must be ImageValue[]
const _bindingBadExamples: ImageBinding = { $binding: '#/props/image', examples: ['#/images/hero'] };

// ImageBinding is assignable to PropConfigurationValue
const configValFromBinding: PropConfigurationValue = bindingWithExamples;

// ─── Styles.backgroundImage ─────────────────────────────────────────────────

const stylesWithImage: Styles = { backgroundImage: { $image: '#/images/hero', scaleMode: 'COVER' } };
const stylesImageNull: Styles = { backgroundImage: null };

// @ts-expect-error: backgroundImage does not accept an ImageBinding (sourcing binds via propConfigurations)
const _stylesBadImage: Styles = { backgroundImage: { $binding: '#/props/image' } };

// ─── Component.images ─────────────────────────────────────────────────────────

const componentWithImages: Component = {
  title: 'Card',
  anatomy: {},
  default: {},
  images: { hero: 'data:image/png;base64,AAAA' },
};

// ─── Config image fields ──────────────────────────────────────────────────────

// include.imageData optional boolean
const configImageDataOn: Config = { processing: {}, format: {}, include: { imageData: true } };
const configImageDataOff: Config = { processing: {}, format: {}, include: {} };

// processing.imageComponent optional; name + sourceProperty required, fallback optional
const configImageComponent: Config = {
  processing: { imageComponent: { name: 'dsImage', sourceProperty: 'source' } },
  format: {},
  include: {},
};
const configImageComponentStrict: Config = {
  processing: { imageComponent: { name: 'dsImage', sourceProperty: 'source', fallback: false } },
  format: {},
  include: {},
};

// @ts-expect-error: imageComponent requires sourceProperty
const _configImageComponentMissing: Config = { processing: { imageComponent: { name: 'dsImage' } }, format: {}, include: {} };

// @ts-expect-error: imageData must be a boolean
const _configBadImageData: Config = { processing: {}, format: {}, include: { imageData: 'yes' } };
