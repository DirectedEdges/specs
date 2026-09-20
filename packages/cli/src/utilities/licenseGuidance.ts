// What to tell someone whose provided license key could not be checked.
//
// MIRRORED from the engine's `transientFailureGuidance` — the CLI cannot import
// it, and the two must not contradict each other about the same failure. A
// change there must land here too.

/**
 * States that mean the check did not complete, as against a verdict.
 *
 * `invalid`, `removed`, `expired` and `wrong-runtime` are definitive key
 * rejections, and free-tier output is reasonable for them. These are not
 * answers at all, so the key may well be valid.
 */
export const TRANSIENT_FAILURES: ReadonlySet<string> = new Set(['error', 'network-error', 'rate-limited']);

/**
 * The lines to print for a transient failure.
 *
 * Two different problems hide under "the check failed", and their remedies have
 * nothing in common. `network-error` means the license server was never reached
 * — an offline machine, a DNS failure, a corporate TLS interception — and
 * "retry in a few seconds" is useless advice for it. Anything else means the
 * server answered and the check itself did not complete, which usually clears.
 */
export function transientFailureLines(status: string): string[] {
  if (status === 'network-error') {
    return [
      'Error: The license server could not be reached.',
      'Your key was not validated, so no licensed output was produced.',
      "Check this machine's network connection, and any proxy or TLS inspection between it and the internet.",
      'To work offline, remove the key for free-tier output.',
    ];
  }
  return [
    `Error: The license check could not be completed (status: ${status}).`,
    'Your key was not validated, so no licensed output was produced.',
    'The server was reached but did not answer — this is usually temporary.',
    'Retry in a few seconds, or remove the key for free-tier output.',
  ];
}
