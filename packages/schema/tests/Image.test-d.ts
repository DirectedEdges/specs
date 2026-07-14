/**
 * Type-level tests for image content (ADR-063):
 * ObjectFit, ImageValue, FigmaImageRef, ImageData, Images, ImageProp, ImageBinding,
 * Styles.backgroundImage, and Config image fields.
 *
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  ObjectFit,
  ImageValue,
  FigmaImageRef,
  ImageData,
  Images,
  ImageProp,
  ImageBinding,
  AnyProp,
  Styles,
  Component,
  PropConfigurationValue,
  Config,
} from '../types/index.js';

// ─── ObjectFit ────────────────────────────────────────────────────────────────

const fitCover: ObjectFit = 'COVER';
const fitContain: ObjectFit = 'CONTAIN';

// @ts-expect-error: FILL is Figma vocabulary, not a valid ObjectFit
const _fitFill: ObjectFit = 'FILL';

// @ts-expect-error: CROP is coerced to COVER by the transformer, not a value
const _fitCrop: ObjectFit = 'CROP';

// ─── ImageValue ─────────────────────────────────────────────────────────────

// $image required; objectFit optional
const imageMinimal: ImageValue = { $image: '#/images/hero' };
const imageWithFit: ImageValue = { $image: 'card.examples#/images/hero', objectFit: 'CONTAIN' };

// @ts-expect-error: $image is required
const _imageNoRef: ImageValue = { objectFit: 'COVER' };

// @ts-expect-error: objectFit must be an ObjectFit
const _imageBadFit: ImageValue = { $image: '#/images/hero', objectFit: 'STRETCH' };

// ─── FigmaImageRef / ImageData ──────────────────────────────────────────────

const placeholder: FigmaImageRef = 'figma:abc123def456';
const resolvedData: ImageData = 'data:image/png;base64,iVBORw0KG...';
const placeholderData: ImageData = placeholder;

// @ts-expect-error: a FigmaImageRef must start with the figma: scheme
const _badPlaceholder: FigmaImageRef = 'abc123def456';

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

const stylesWithImage: Styles = { backgroundImage: { $image: '#/images/hero', objectFit: 'COVER' } };
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
