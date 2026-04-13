/**
 * Type-level tests for Variant.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Variant } from '../types/index.js';

// ─── Valid: Variant with all remaining fields ────────────────────────────────

const full: Variant = {
  configuration: { size: 'large' },
  invalid: false,
  elements: {},
  layout: [],
};

// ─── Valid: empty Variant (all fields optional) ──────────────────────────────

const empty: Variant = {};

// ─── Removed fields must not compile ─────────────────────────────────────────

// @ts-expect-error — `name` was removed in ADR 036
const withName: Variant = { name: 'foo' };

// @ts-expect-error — `baseline` was removed in ADR 036
const withBaseline: Variant = { baseline: 'bar' };
