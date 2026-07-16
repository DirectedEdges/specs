/**
 * Type-level tests for TokenReference.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { TokenReference, Style, ColorStyle, Styles } from '../types/index.js';

// ─── Minimal valid TokenReference ──────────────────────────────────────────

const colorRef: TokenReference = {
  $token: 'DS Color.Text.Primary',
  $type: 'color',
};

const dimensionRef: TokenReference = {
  $token: 'Space.4',
  $type: 'dimension',
};

const effectsRef: TokenReference = {
  $token: 'Elevation.Shadow.Card',
  $type: 'effects',
};

const typographyRef: TokenReference = {
  $token: 'Body.Medium',
  $type: 'typography',
};

// ─── TokenReference with extensions ────────────────────────────────────────

const colorRefFull: TokenReference = {
  $token: 'DS Color.Text.Primary',
  $type: 'color',
  $extensions: {
    'com.figma': {
      id: 'VAR:123',
      name: 'Text/Primary',
      collectionName: 'DS Color',
      rawValue: '#FF0000FF',
    },
  },
};

const namedStyleRef: TokenReference = {
  $token: 'Body.Medium',
  $type: 'typography',
  $extensions: {
    'com.figma': {
      id: 'STY:456',
      name: 'Body/Medium',
      // collectionName absent — distinguishes named style from variable
    },
  },
};

// rawValue may be string, number, or boolean
const numericTokenRef: TokenReference = {
  $token: 'Space.4',
  $type: 'dimension',
  $extensions: {
    'com.figma': { id: 'VAR:789', rawValue: 16 },
  },
};

const boolTokenRef: TokenReference = {
  $token: 'Component.Visible',
  $type: 'boolean',
  $extensions: {
    'com.figma': { id: 'VAR:abc', rawValue: true },
  },
};

// rawValue may be a DTCG Color object (color tokens resolve to one at extraction time)
const colorObjectTokenRef: TokenReference = {
  $token: 'TEST Resources.blue-500',
  $type: 'color',
  $extensions: {
    'com.figma': {
      id: 'VariableID:1295:846',
      name: 'blue-500',
      collectionName: 'TEST Resources',
      rawValue: { colorSpace: 'srgb', components: [0, 0, 1], hex: '#0000FF' },
    },
  },
};

// ColorObject rawValue with alpha and 'none' components
const colorObjectAlphaTokenRef: TokenReference = {
  $token: 'DS Color.Overlay.Scrim',
  $type: 'color',
  $extensions: {
    'com.figma': {
      id: 'VAR:def',
      rawValue: { colorSpace: 'oklch', components: [0.5, 'none', 240], alpha: 0.4 },
    },
  },
};

const _rawValueMissingColorSpace: TokenReference = {
  $token: 'x',
  $type: 'color',
  $extensions: {
    'com.figma': {
      id: 'VAR:ghi',
      // @ts-expect-error: colorSpace is required on a color-object rawValue
      rawValue: { components: [0, 0, 1] },
    },
  },
};

// ─── All $type values compile ───────────────────────────────────────────────

const _color:      TokenReference = { $token: 'x', $type: 'color' };
const _dimension:  TokenReference = { $token: 'x', $type: 'dimension' };
const _string:     TokenReference = { $token: 'x', $type: 'string' };
const _number:     TokenReference = { $token: 'x', $type: 'number' };
const _boolean:    TokenReference = { $token: 'x', $type: 'boolean' };
const _shadow:     TokenReference = { $token: 'x', $type: 'shadow' };
const _gradient:   TokenReference = { $token: 'x', $type: 'gradient' };
const _typography: TokenReference = { $token: 'x', $type: 'typography' };
const _effects:    TokenReference = { $token: 'x', $type: 'effects' };

// ─── Required fields ────────────────────────────────────────────────────────

// @ts-expect-error: $token is required
const _missingToken: TokenReference = { $type: 'color' };

// @ts-expect-error: $type is required
const _missingType: TokenReference = { $token: 'DS Color.Text.Primary' };

// @ts-expect-error: invalid $type value
const _invalidType: TokenReference = { $token: 'x', $type: 'variable' };

// ─── Style union accepts TokenReference ────────────────────────────────────

const styleAsToken: Style = colorRef;
const styleAsTokenFull: Style = colorRefFull;

// ─── ColorStyle union accepts TokenReference ───────────────────────────────

const colorStyleAsToken: ColorStyle = colorRef;

// ─── Styles.effects accepts TokenReference ─────────────────────────────────

const effectsFromRef: Styles = {
  effects: effectsRef,
};

// Styles.effects also accepts Effects inline
const effectsInline: Styles = {
  effects: { shadows: [{ visible: true, offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' } }] },
};

// ─── Styles.typography accepts TokenReference ──────────────────────────────

const typographyFromRef: Styles = {
  typography: typographyRef,
};

// Styles.typography also accepts Typography inline
const typographyInline: Styles = {
  typography: { fontSize: 16, fontFamily: 'Inter' },
};

// ─── $extensions is optional ────────────────────────────────────────────────

const noExtensions: TokenReference = { $token: 'x', $type: 'color' };
const emptyExtensions: TokenReference = { $token: 'x', $type: 'color', $extensions: {} };

// com.figma.id is required when com.figma block is present
// @ts-expect-error: id is required inside com.figma
const _missingFigmaId: TokenReference = { $token: 'x', $type: 'color', $extensions: { 'com.figma': { name: 'Text/Primary' } } };

// ─── No extra top-level fields allowed ─────────────────────────────────────

// @ts-expect-error: rawValue must not appear at top level
const _topLevelRawValue: TokenReference = { $token: 'x', $type: 'color', rawValue: '#FF0000FF' };

// @ts-expect-error: id must not appear at top level (Figma UUID belongs in $extensions)
const _topLevelId: TokenReference = { $token: 'x', $type: 'color', id: 'VAR:123' };
