/**
 * Type-level tests for Conditional, ConditionExpression, and ConditionArgs types.
 *
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type {
  Conditional, ConditionExpression, ConditionArgs,
  Style, PropBinding,
} from '../types/index.js';

// ─── ConditionExpression.operation accepts any string ──────────────────────

const exprBuiltIn: ConditionExpression = {
  operation: 'isNotNull',
  args: { value: { $binding: '#/props/label' } },
};

const exprCustom: ConditionExpression = {
  operation: 'myCustomOperation',
  args: { value: { $binding: '#/props/label' } },
};

const exprBinary: ConditionExpression = {
  operation: 'equals',
  args: { value: { $binding: '#/props/icon' }, compareTo: 'check' },
};

// @ts-expect-error: operation is required
const _badExprNoOp: ConditionExpression = {
  args: { value: { $binding: '#/props/label' } },
};

// @ts-expect-error: args is required
const _badExprNoArgs: ConditionExpression = { operation: 'isNull' };

// ─── ConditionArgs shape ───────────────────────────────────────────────────

const argsUnary: ConditionArgs = {
  value: { $binding: '#/props/label' },
};

const argsBinary: ConditionArgs = {
  value: { $binding: '#/props/icon' },
  compareTo: 'check',
};

const argsBinaryNull: ConditionArgs = {
  value: { $binding: '#/props/label' },
  compareTo: null,
};

const argsBinaryNumber: ConditionArgs = {
  value: { $binding: '#/props/count' },
  compareTo: 0,
};

const argsBinaryBoolean: ConditionArgs = {
  value: { $binding: '#/props/flag' },
  compareTo: true,
};

// @ts-expect-error: value must be a PropBinding, not a string
const _badArgsString: ConditionArgs = { value: '#/props/label' };

// @ts-expect-error: value is required
const _badArgsMissing: ConditionArgs = { compareTo: 'x' };

// ─── Conditional shape ─────────────────────────────────────────────────────

const conditional: Conditional = {
  if: {
    condition: {
      operation: 'isNotNull',
      args: { value: { $binding: '#/props/label' } },
    },
    then: true,
    else: false,
  },
};

const conditionalString: Conditional = {
  if: {
    condition: {
      operation: 'equals',
      args: { value: { $binding: '#/props/status' }, compareTo: 'active' },
    },
    then: 'visible',
    else: 'hidden',
  },
};

const conditionalNull: Conditional = {
  if: {
    condition: {
      operation: 'isNull',
      args: { value: { $binding: '#/props/label' } },
    },
    then: null,
    else: 1,
  },
};

// @ts-expect-error: if is required
const _badNoIf: Conditional = {};

// then and else are both required — missing either is a compile error
const _badNoThen: Conditional = {
  // @ts-expect-error: then is required but missing
  if: { condition: { operation: 'isNull', args: { value: { $binding: '#/props/x' } } }, else: false },
};

const _badNoElse: Conditional = {
  // @ts-expect-error: else is required but missing
  if: { condition: { operation: 'isNull', args: { value: { $binding: '#/props/x' } } }, then: true },
};

// ─── Style union accepts Conditional ───────────────────────────────────────

const styleConditional: Style = {
  if: {
    condition: {
      operation: 'isNotNull',
      args: { value: { $binding: '#/props/label' } },
    },
    then: true,
    else: false,
  },
};

// Style still accepts all other members
const stylePrimitive: Style = true;
const styleNull: Style = null;
const styleString: Style = 'value';
const styleNumber: Style = 42;
const styleBinding: Style = { $binding: '#/props/isVisible' };
