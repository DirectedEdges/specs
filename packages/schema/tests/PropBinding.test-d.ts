/**
 * Type-level tests for PropBinding, isPropBinding, and binding integration
 * across Element and Style types.
 *
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  PropBinding, BindingKey,
  Element, Style, ColorStyle,
} from '../types/index.js';

// ─── PropBinding shape ──────────────────────────────────────────────────────

const binding: PropBinding = { $binding: '#/props/label' };
const bindingSwap: PropBinding = { $binding: '#/props/swap' };
const bindingVisible: PropBinding = { $binding: '#/props/isVisible' };

// $binding must be a string
// @ts-expect-error: number is not valid for $binding
const _badBindingNum: PropBinding = { $binding: 42 };

// $binding is required
// @ts-expect-error: empty object is not a PropBinding
const _badBindingEmpty: PropBinding = {};

// Extra keys are not permitted (additionalProperties: false in schema)
// @ts-expect-error: $ref is not a valid key on PropBinding
const _badBindingRef: PropBinding = { $binding: '#/props/x', $ref: '#/props/x' };

// ─── BindingKey ─────────────────────────────────────────────────────────────

const _bkChildren: BindingKey = 'children';
const _bkInstanceOf: BindingKey = 'instanceOf';
const _bkVisible: BindingKey = 'visible';
const _bkContent: BindingKey = 'content';

// @ts-expect-error: 'text' is no longer a BindingKey — replaced by 'content'
const _bkText: BindingKey = 'text';

// @ts-expect-error: 'styles' is not a BindingKey
const _badKey: BindingKey = 'styles';

// ─── Element.instanceOf accepts string | PropBinding ───────────────────────

const elemUnbound: Element = { instanceOf: 'Button' };
const elemBound: Element = { instanceOf: { $binding: '#/props/swap' } };

// { $ref } is now valid for instanceOf — it matches SubcomponentRef
const _subcomponentRef: Element = { instanceOf: { $ref: '#/subcomponents/formLabel' } };

// ─── Element.content accepts string | PropBinding ───────────────────────────

const contentUnbound: Element = { content: 'Submit' };
const contentBound: Element = { content: { $binding: '#/props/label' } };

// Old { $ref } shape must NOT compile as Element.content
// @ts-expect-error: ReferenceValue ($ref) is no longer valid for content
const _oldContent: Element = { content: { $ref: '#/props/label' } };

// ─── Style accepts PropBinding (for visible) ────────────────────────────────

const styleRaw: Style = true;
const styleToken: Style = null;
const styleBound: Style = { $binding: '#/props/isVisible' };

// Old { $ref } shape must NOT compile as Style
// @ts-expect-error: ReferenceValue ($ref) is no longer valid as Style
const _oldStyle: Style = { $ref: '#/props/isVisible' };

// ─── ColorStyle does NOT accept PropBinding or ReferenceValue ───────────────
// Color properties are not bindable; only string | TokenReference | GradientValue | null

const colorHex: ColorStyle = '#FF0000FF';
const colorNull: ColorStyle = null;

// PropBinding must NOT compile as ColorStyle
// @ts-expect-error: PropBinding is not valid for ColorStyle
const _colorBinding: ColorStyle = { $binding: '#/props/color' };

// { $ref } shape must NOT compile as ColorStyle (ReferenceValue removed in v1.0.0)
// @ts-expect-error: { $ref } is not valid for ColorStyle
const _colorRef: ColorStyle = { $ref: '#/props/color' };
