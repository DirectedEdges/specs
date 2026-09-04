/**
 * Type-level tests for image content (ADR-063):
 * ObjectFit, ImageValue, ImageData, Images, ImageProp, ImageBinding,
 * Styles.backgroundImage, and the image conventions.
 *
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  ObjectFit,
  ImageValue,
  ImageData,
  Images,
  ImageProp,
  ImageBinding,
  AnyProp,
  Styles,
  Component,
  PropConfigurationValue,
  Conventions,
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

// ─── ImageData ────────────────────────────────────────────────────────────────

// Unresolved (detect phase): src absent, Figma identity in $extensions
const unresolvedData: ImageData = {
  $extensions: { 'com.figma': { imageHash: 'abc123def456' } },
};

// Resolved: resolution ADDS src; the identity survives
const resolvedData: ImageData = {
  src: '_images/abc123def456.png',
  $extensions: { 'com.figma': { imageHash: 'abc123def456' } },
};

// src alone is valid (e.g. an externally-authored spec with no Figma origin)
const externalData: ImageData = { src: 'https://cdn.example.com/logo.png' };

// @ts-expect-error: imageHash is required inside the com.figma extension
const _badExtension: ImageData = { $extensions: { 'com.figma': {} } };

// @ts-expect-error: the retired string form (figma:<hash> / bare path) is no longer valid
const _retiredStringForm: ImageData = 'figma:abc123def456';

// ─── Images registry ──────────────────────────────────────────────────────────

const images: Images = {
  hero: { src: 'data:image/png;base64,iVBORw0KG...' },
  userPhoto: { $extensions: { 'com.figma': { imageHash: 'abc123def456' } } },
  logo: { src: 'https://cdn.example.com/logo.png' },
};

// @ts-expect-error: registry values must be ImageData objects
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
  images: { hero: { src: 'data:image/png;base64,AAAA' } },
};

// ─── Image conventions ────────────────────────────────────────────────────────

// figma.images: presence declares the convention; every member optional
const imagesAbsent: Conventions = { figma: {} };
const imagesFillsOnly: Conventions = { figma: { images: { backgroundImage: true } } };
const imagesAllTriggers: Conventions = {
  figma: { images: { backgroundImage: true, match: 'dsImage', sourceProps: ['source', 'image'] } },
};

// @ts-expect-error: match is a plain name string, not the retired { name, sourceProperty } object
const _imagesV1Shape: Conventions = { figma: { images: { match: { name: 'dsImage' } } } };

// @ts-expect-error: sourceProps must be a string array
const _imagesBadSourceProps: Conventions = { figma: { images: { sourceProps: 'source' } } };

// @ts-expect-error: image conventions do not live in settings
const _imagesInSettings: Conventions = { figma: {}, spec: { images: {} } };
