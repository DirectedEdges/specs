/**
 * Display license status extracted from component output metadata.
 */

import type { ComponentsData } from '@directededges/specs-from-figma';

const STATUS_DESCRIPTIONS: Record<string, string> = {
  'invalid': 'key not recognized',
  'expired': 'key expired',
  'activation-limit-reached': 'all seats consumed for this key',
  'network-error': 'could not reach license server',
};

export class LicenseStatus {
  /**
   * Print a license status line based on the first successful result.
   * Silent when no license key was provided or no results succeeded.
   */
  static display(results: ComponentsData[], licenseKeyProvided: boolean): void {
    if (!licenseKeyProvided) return;

    const firstSuccess = results.find(
      (r): r is { name: string; component: Record<string, any> } => 'component' in r,
    );
    if (!firstSuccess) return;

    const generator = firstSuccess.component?.metadata?.generator;
    if (!generator?.license) return;

    const { level, status } = generator.license;

    if (status === 'active') {
      console.log(`License: ${level} (active)`);
    } else if (status) {
      const desc = STATUS_DESCRIPTIONS[status] || status;
      console.log(`License: ${level || 'FREE'} (${status} — ${desc})`);
    }
  }
}
