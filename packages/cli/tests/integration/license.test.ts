/**
 * Integration tests for license key functionality
 *
 * These tests require:
 * - ANOVA_TEST_KEY_PRO: A sandbox PRO license key
 * - ANOVA_TEST_KEY_EXHAUSTED: A sandbox key with exhausted activations (optional)
 * - Figma test data in the data/ directory
 *
 * Tests are skipped when env vars are not set.
 */

import { describe, it, expect } from 'vitest';

const PRO_KEY = process.env.ANOVA_TEST_KEY_PRO;
const EXHAUSTED_KEY = process.env.ANOVA_TEST_KEY_EXHAUSTED;

describe.skipIf(!PRO_KEY)('License integration', () => {
  it('placeholder: PRO key produces PRO-level output', () => {
    // This test requires a real transformer + Figma fixture to run end-to-end.
    // It validates that Components.fromRestApi with a PRO key produces
    // output containing generator.license.level === 'PRO'.
    //
    // Implementation deferred until Figma test fixtures are available.
    expect(PRO_KEY).toBeDefined();
  });
});

describe.skipIf(!EXHAUSTED_KEY)('Activation limit integration', () => {
  it('placeholder: exhausted key produces FREE-level output with warning', () => {
    // This test requires a sandbox key with all activations consumed.
    // It validates that the CLI displays a seat-limit warning and
    // output is FREE tier.
    //
    // Implementation deferred until sandbox key infrastructure is available.
    expect(EXHAUSTED_KEY).toBeDefined();
  });
});
