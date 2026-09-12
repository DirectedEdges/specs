/**
 * Type-level tests for Element.content field.
 *
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Element, PropBinding, SubcomponentRef } from '../types/index.js';

// ─── Element.content accepts string | PropBinding ───────────────────────────

const contentString: Element = { content: 'Submit' };
const contentGlyph: Element = { content: 'caret-down' };
const contentBound: Element = { content: { $binding: '#/props/label' } };

// ─── Element.instanceOf accepts string | PropBinding | SubcomponentRef ──────

const instanceString: Element = { instanceOf: 'Button' };
const instanceBound: Element = { instanceOf: { $binding: '#/props/icon' } };
const instanceSubRef: Element = { instanceOf: { $ref: '#/subcomponents/formLabel' } };

// content is optional — empty element is valid
const emptyElement: Element = {};

// Old { $ref } shape must NOT compile as Element.content
// @ts-expect-error: { $ref } is not valid for content
const _oldContent: Element = { content: { $ref: '#/props/label' } };

// ─── Element.text has been removed ──────────────────────────────────────────

// @ts-expect-error: text property no longer exists on Element
const _removedText: Element = { text: 'Submit' };

// ─── Capture provenance for a promoted element (ADR-084) ──────────────────────

// A promoted layer records that it was promoted, and the styles the promotion consumed
const promoted: Element = {
  instanceOf: 'dsTypography',
  propConfigurations: { color: 'On surface', size: 400 },
  styles: { layoutSizingHorizontal: 'FILL' },
  $extensions: {
    'com.figma': {
      promotedPrimitive: true,
      multipleMatches: true,
      styles: { textColor: { $token: 'Color/On surface', $type: 'color' } },
    },
  },
};

// Both members are independent: a promotion that consumed no styles records the flag alone
const promotedNoResidue: Element = {
  instanceOf: 'dsIcon',
  propConfigurations: { name: 'add' },
  $extensions: { 'com.figma': { promotedPrimitive: true } },
};

// @ts-expect-error — the extension namespace is closed
const unknownNamespace: Element = { $extensions: { 'com.example': { promotedPrimitive: true } } };

// @ts-expect-error — the figma extension is closed to its two members
const unknownMember: Element = { $extensions: { 'com.figma': { promotedFrom: 'text' } } };
