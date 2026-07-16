/**
 * Type-level tests for image content (ADR-063):
 * ObjectFit, ImageValue, ImageData, Images, ImageProp, ImageBinding,
 * Styles.backgroundImage, and Config image fields.
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

// ─── Config image fields ──────────────────────────────────────────────────────

// processing.images: presence-switched block; every member optional on Config
const configImagesAbsent: Config = { processing: {}, format: {}, include: {} };
const configImagesFillsOnly: Config = {
  processing: { images: { backgroundImage: true } },
  format: {},
  include: {},
};
const configImagesComponent: Config = {
  processing: { images: { imageComponent: 'dsImage', sourceProps: ['source'] } },
  format: {},
  include: {},
};
const configImagesAllTriggers: Config = {
  processing: { images: { backgroundImage: true, imageComponent: 'dsImage', sourceProps: ['source', 'image'] } },
  format: {},
  include: {},
};

// @ts-expect-error: imageComponent is a plain name string, not the retired { name, sourceProperty } object
const _configImagesV1Shape: Config = { processing: { images: { imageComponent: { name: 'dsImage' } } }, format: {}, include: {} };

// @ts-expect-error: sourceProps must be a string array
const _configBadSourceProps: Config = { processing: { images: { sourceProps: 'source' } }, format: {}, include: {} };

// @ts-expect-error: include.imageData was retired — the processing.images block presence is the on-switch
const _configRetiredImageData: Config = { processing: {}, format: {}, include: { imageData: true } };
