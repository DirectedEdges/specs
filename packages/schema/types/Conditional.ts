import { PropBinding } from "./PropBinding.js";

/**
 * Arguments for a condition expression.
 * `value` is the prop binding whose value is tested.
 * `compareTo` is the comparison operand for binary operations; omitted for unary operations.
 * @since 0.13.0
 */
export interface ConditionArgs {
  /** The prop binding whose value is tested. */
  value: PropBinding;
  /** Comparison operand for binary operations (`equals`, `notEquals`). Omitted for unary operations. */
  compareTo?: string | number | boolean | null;
}

/**
 * A declarative condition expression evaluated against a bound prop's value.
 * Pairs an `operation` name (plain string) with `args` to form a predicate.
 *
 * Built-in operations include `isNull`, `isNotNull`, `equals`, `notEquals`.
 * The `operation` field is typed as `string` — not a literal union — so that
 * consumers and future extensions can introduce custom operations without a
 * schema change.
 * @since 0.13.0
 */
export interface ConditionExpression {
  /** The predicate operation name (e.g. `"isNull"`, `"equals"`). */
  operation: string;
  /** Arguments for the operation: the binding to test and optional comparison operand. */
  args: ConditionArgs;
}

/**
 * A conditional binding. Wraps an `if` block containing a `condition`,
 * `then`, and `else` to declaratively derive a value from a prop binding.
 *
 * Discriminated from other `Style` members by the required `if` key.
 * @since 0.13.0
 */
export interface Conditional {
  /** The conditional expression block. */
  if: {
    /** The condition to evaluate against the bound prop. */
    condition: ConditionExpression;
    /** Value when the condition is true. */
    then: string | boolean | number | null;
    /** Value when the condition is false. */
    else: string | boolean | number | null;
  };
}
