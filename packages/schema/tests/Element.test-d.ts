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

// A promoted container records the hoisted fill it held, beside the consumed styles (ADR-090)
const promotedContainer: Element = {
  instanceOf: 'dsLayout',
  propConfigurations: {
    direction: 'VERTICAL',
    children: { $slotContent: '#/components/dsCard/slotContentExamples/dsCard__content__children' },
  },
  $extensions: {
    'com.figma': {
      promotedPrimitive: true,
      children: { $slotContent: '#/components/dsCard/slotContentExamples/dsCard__content__children' },
      styles: { layoutMode: 'VERTICAL' },
    },
  },
};

const inlineExtensionChildren: Element = {
  // @ts-expect-error — the extension's children is a SlotContentRef, never inline content
  $extensions: { 'com.figma': { children: ['label'] } },
};

// @ts-expect-error — the extension namespace is closed
const unknownNamespace: Element = { $extensions: { 'com.example': { promotedPrimitive: true } } };

// @ts-expect-error — the figma extension is closed to its two members
const unknownMember: Element = { $extensions: { 'com.figma': { promotedFrom: 'text' } } };

// ─── Element.contentStyles — formatting for a slot's content (ADR-102) ────────

// A slot element carries its own styles and, separately, the formatting its content takes on
const slotWithContentStyles: Element = {
  styles: { padding: 8, mainAxisAlignment: 'CENTER' },
  contentStyles: {
    typography: { $token: 'DS Type.Label.Medium', $type: 'typography' },
    textColor: { $token: 'DS Color.Text.OnPrimary', $type: 'color' },
  },
};

// Every member of the set is accepted
const allContentStyles: Element = {
  contentStyles: {
    textColor: '#FFFFFF',
    typography: { fontSize: 14, fontFamily: 'Inter' },
    textAlignHorizontal: 'CENTER',
    textAlignVertical: 'CENTER',
    textOverflow: 'ELLIPSIS',
    maxLines: 1,
  },
};

// contentStyles is optional, and an empty block is valid
const emptyContentStyles: Element = { contentStyles: {} };

// A per-variant override carries only what changes
const variantOverride: Element = {
  contentStyles: { textColor: { $token: 'DS Color.Text.Subtle', $type: 'color' } },
};

// The set is closed — a container's own styling cannot be recorded as content formatting
// @ts-expect-error: padding is not a content-formatting property
const paddingInContent: Element = { contentStyles: { padding: 8 } };

// @ts-expect-error: backgroundColor is not a content-formatting property
const backgroundInContent: Element = { contentStyles: { backgroundColor: '#FF0000' } };

// @ts-expect-error: layoutMode is not a content-formatting property
const layoutInContent: Element = { contentStyles: { layoutMode: 'VERTICAL' } };

// @ts-expect-error: fillColor arrives only when a glyph kind is added to SlotContentKind
const fillInContent: Element = { contentStyles: { fillColor: '#FF0000' } };
