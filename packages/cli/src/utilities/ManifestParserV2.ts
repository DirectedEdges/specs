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

import type { DevStatus } from './ComponentDiscovery.js';

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
}

const SCAN_FORMAT_VERSION_REGEX = /\*\*Scan format version:\*\*\s+(\d+)/m;
const FILE_HEADER_REGEX = /\*\*File:\*\*\s+(.+?)$/m;
const VARIABLES_HEADER_REGEX = /\*\*Variables:\*\*\s+(.+?)$/m;
const FILE_LAST_MODIFIED_REGEX = /\*\*File last modified:\*\*\s+(.+?)$/m;

// | [x] | Name | id | TYPE | DEV_STATUS |
const ROW_REGEX =
  /^\|\s*\[([x ])\]\s*\|\s*(.+?)\s*\|\s*(\d+:\d+)\s*\|\s*(COMPONENT_SET|COMPONENT)\s*\|\s*(READY_FOR_DEV|NONE)\s*\|/i;

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
    let inComponentsSection = false;
    for (const line of content.split('\n')) {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        inComponentsSection = heading[1].toLowerCase() === 'components';
        continue;
      }
      if (!inComponentsSection) continue;
      const match = line.match(ROW_REGEX);
      if (!match) continue;
      const [, checkbox, name, id, type, devStatus] = match;
      components.push({
        id,
        // `specs scan` escapes pipes in cell values (`escapeCell`: | → \|).
        // Undo that here so names round-trip back to their literal form.
        name: name.trim().replace(/\\\|/g, '|'),
        type: type.toUpperCase() as 'COMPONENT' | 'COMPONENT_SET',
        included: checkbox.toLowerCase() === 'x',
        devStatus: devStatus.toUpperCase() as DevStatus
      });
    }

    return { components, metadata };
  }
}
