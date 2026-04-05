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
