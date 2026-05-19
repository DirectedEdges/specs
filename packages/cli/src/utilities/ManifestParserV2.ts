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

import type { DevStatus } from "./ComponentDiscovery.js";

export interface ManifestRowV2 {
  id: string;
  name: string;
  type: "COMPONENT" | "COMPONENT_SET";
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

// Cheap recognition: a row starts with `| [x] |` or `| [ ] |`.
// Field extraction is handled separately by splitRow so that `\|` inside a
// cell (emitted by ScanCommand's escapeCell) is treated as part of the cell
// rather than as a column separator.
const ROW_RECOGNITION_REGEX = /^\|\s*\[[x ]\]\s*\|/i;
const ID_REGEX = /^\d+:\d+$/;

/**
 * Split a markdown table row into cell contents. Treats `\|` as an escaped
 * pipe that is part of the cell, not a column separator. Trims each cell and
 * unescapes `\|` → `|` after splitting.
 */
function splitRow(row: string): string[] {
  const trimmed = row.trim();
  // Strip leading and trailing outer pipes if present.
  const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const body = inner.endsWith("|") ? inner.slice(0, -1) : inner;

  const cells: string[] = [];
  let cell = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "\\" && body[i + 1] === "|") {
      cell += "|";
      i += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

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
      scanFormatVersion: versionMatch ? Number(versionMatch[1]) : 2,
    };

    const fileMatch = content.match(FILE_HEADER_REGEX);
    if (fileMatch) metadata.file = fileMatch[1].trim();

    const variablesMatch = content.match(VARIABLES_HEADER_REGEX);
    if (variablesMatch) metadata.variables = variablesMatch[1].trim();

    const lastModifiedMatch = content.match(FILE_LAST_MODIFIED_REGEX);
    if (lastModifiedMatch)
      metadata.fileLastModified = lastModifiedMatch[1].trim();

    const components: ManifestRowV2[] = [];
    let inComponentsSection = false;
    for (const line of content.split("\n")) {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        inComponentsSection = heading[1].toLowerCase() === "components";
        continue;
      }
      if (!inComponentsSection) continue;
      if (!ROW_RECOGNITION_REGEX.test(line)) continue;

      const cells = splitRow(line);
      if (cells.length < 5) continue;

      const [rawCheckbox, name, id, rawType, rawDevStatus] = cells;
      const checkbox = rawCheckbox
        .replace(/[\[\]]/g, "")
        .trim()
        .toLowerCase();
      if (checkbox !== "x" && checkbox !== "") continue;

      if (!ID_REGEX.test(id)) continue;

      const type = rawType.toUpperCase();
      if (type !== "COMPONENT" && type !== "COMPONENT_SET") continue;

      const devStatus = rawDevStatus.toUpperCase();
      if (devStatus !== "READY_FOR_DEV" && devStatus !== "NONE") continue;

      components.push({
        id,
        name,
        type: type as "COMPONENT" | "COMPONENT_SET",
        included: checkbox === "x",
        devStatus: devStatus as DevStatus,
      });
    }

    return { components, metadata };
  }
}
