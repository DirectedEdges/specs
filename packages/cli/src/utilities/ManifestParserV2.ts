/**
 * Parses v2 manifest files emitted by `specs scan`.
 *
 * Format (table form):
 *   **Scan format version:** 2
 *   **File:** path/to/file.json
 *
 *   | ✓ | Name | ID | Type | Dev Status |
 *   |---|------|----|------|------------|
 *   | [x] | Button | 1:23 | COMPONENT_SET | READY_FOR_DEV |
 *   | [ ] | Card | 1:45 | COMPONENT | NONE |
 */

import { isKnownDevStatus, type DevStatus } from './ComponentDiscovery.js';

export interface ManifestRowV2 {
  id: string;
  name: string;
  type: 'COMPONENT' | 'COMPONENT_SET';
  included: boolean;
  devStatus: DevStatus;
}

export interface ManifestMetadataV2 {
  scanFormatVersion: number;
  file?: string;
  variables?: string;
  fileLastModified?: string;
}

export interface ManifestResultV2 {
  components: ManifestRowV2[];
  metadata: ManifestMetadataV2;
  /** One entry per row that could not be parsed or carried an unrecognized status. */
  warnings: string[];
}

const SCAN_FORMAT_VERSION_REGEX = /\*\*Scan format version:\*\*\s+(\d+)/m;
const FILE_HEADER_REGEX = /\*\*File:\*\*\s+(.+?)$/m;
const VARIABLES_HEADER_REGEX = /\*\*Variables:\*\*\s+(.+?)$/m;
const FILE_LAST_MODIFIED_REGEX = /\*\*File last modified:\*\*\s+(.+?)$/m;

// | [x] | Name | id | TYPE | DEV_STATUS |
// The status column is open: any token is accepted so a status this CLI does not
// know is still parsed into a row (unselected) rather than dropping the row.
const ROW_REGEX =
  /^\|\s*\[([x ])\]\s*\|\s*(.+?)\s*\|\s*(\d+:\d+)\s*\|\s*(COMPONENT_SET|COMPONENT)\s*\|\s*([A-Za-z0-9_]+)\s*\|/i;

// Any line whose first cell is a checkbox is meant to be a component row.
const CHECKBOX_ROW_REGEX = /^\|\s*\[[^\]]*\]\s*\|/;

export class ManifestParserV2 {
  /** Returns true when the content declares scan format version 2 (or higher). */
  static isV2(content: string): boolean {
    const match = content.match(SCAN_FORMAT_VERSION_REGEX);
    if (!match) return false;
    return Number(match[1]) >= 2;
  }

  static parse(content: string): ManifestResultV2 {
    const versionMatch = content.match(SCAN_FORMAT_VERSION_REGEX);
    const metadata: ManifestMetadataV2 = {
      scanFormatVersion: versionMatch ? Number(versionMatch[1]) : 2
    };

    const fileMatch = content.match(FILE_HEADER_REGEX);
    if (fileMatch) metadata.file = fileMatch[1].trim();

    const variablesMatch = content.match(VARIABLES_HEADER_REGEX);
    if (variablesMatch) metadata.variables = variablesMatch[1].trim();

    const lastModifiedMatch = content.match(FILE_LAST_MODIFIED_REGEX);
    if (lastModifiedMatch) metadata.fileLastModified = lastModifiedMatch[1].trim();

    const components: ManifestRowV2[] = [];
    const warnings: string[] = [];
    let inComponentsSection = false;
    for (const line of content.split('\n')) {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        inComponentsSection = heading[1].toLowerCase() === 'components';
        continue;
      }
      if (!inComponentsSection) continue;
      const match = line.match(ROW_REGEX);
      if (!match) {
        if (CHECKBOX_ROW_REGEX.test(line)) {
          warnings.push(`Skipped unparseable manifest row: ${line.trim()}`);
        }
        continue;
      }
      const [, checkbox, name, id, type, rawStatus] = match;
      const devStatus: DevStatus = rawStatus.toUpperCase();
      const known = isKnownDevStatus(devStatus);
      if (!known) {
        warnings.push(
          `Unrecognized dev status "${devStatus}" on row ${id} — treating the component as unselected.`
        );
      }
      components.push({
        id,
        // `specs scan` escapes pipes in cell values (`escapeCell`: | → \|).
        // Undo that here so names round-trip back to their literal form.
        name: name.trim().replace(/\\\|/g, '|'),
        type: type.toUpperCase() as 'COMPONENT' | 'COMPONENT_SET',
        included: known && checkbox.toLowerCase() === 'x',
        devStatus
      });
    }

    return { components, metadata, warnings };
  }
}
