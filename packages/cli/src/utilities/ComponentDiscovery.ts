/**
 * ComponentDiscovery - Component discovery utility for CLI/MCP environments
 *
 * Purpose: Find and list all components in a Figma REST API JSON file
 * Used by: AuditCommand for component discovery without transformation
 *
 * Features:
 * - Load and parse Figma REST API JSON files
 * - Find all components (excluding variant children)
 * - Return simple component metadata for listing
 *
 * Note: This is a lightweight utility for discovery only, not for transformation.
 * Transformation uses Component.fromRestApi() from specs-from-figma.
 */

import { readJsonPayload } from './payloadRead.js';
import type { SectionedFile } from './sectionedFile.js';

/**
 * Minimal node structure from REST API
 */
interface RestApiNode {
  id: string;
  name: string;
  type: string;
  children?: RestApiNode[];
  devStatus?: { type?: string; description?: string };
}

/** Dev statuses Figma itself sets, plus 'NONE' for a node with no status. */
export type KnownDevStatus = 'READY_FOR_DEV' | 'COMPLETED' | 'NONE';

export const KNOWN_DEV_STATUSES: readonly KnownDevStatus[] = ['READY_FOR_DEV', 'COMPLETED', 'NONE'];

/**
 * A dev status as carried from Figma. Values outside `KnownDevStatus` are passed
 * through verbatim rather than collapsed, so a status this CLI predates stays visible.
 */
export type DevStatus = KnownDevStatus | (string & {});

export function isKnownDevStatus(value: string): value is KnownDevStatus {
  return (KNOWN_DEV_STATUSES as readonly string[]).includes(value);
}

/** Normalize a node's devStatus, carrying unknown values through untouched. */
function readDevStatus(node: RestApiNode): DevStatus {
  const type = node.devStatus?.type?.trim();
  return type ? type.toUpperCase() : 'NONE';
}

/**
 * Minimal structure for REST API file data
 */
export interface RestApiFileData {
  document: any;
  components?: Record<string, any>;
  componentSets?: Record<string, any>;
  name?: string;
  lastModified?: string;
}

/**
 * Component metadata for discovery results
 */
export interface ComponentInfo {
  /** Component ID */
  id: string;
  /** Component name */
  name: string;
  /** Node type (COMPONENT or COMPONENT_SET) */
  type: string;
  /** Dev status from Figma, verbatim. 'NONE' when the property is absent on the node. */
  devStatus: DevStatus;
}

/**
 * Utility for discovering components in a Figma REST API file
 */
export class ComponentDiscovery {
  private _data: RestApiFileData;
  private _nodeMap: Map<string, RestApiNode> = new Map();
  private _parentMap: Map<string, string> = new Map();

  /**
   * Create from pre-parsed JSON data
   */
  constructor(data: RestApiFileData) {
    this._data = data;
    this.validate();
    this.buildIndex(this._data.document);
  }

  /**
   * Load from JSON file on disk. Size-guarded: a payload too large for a
   * single-string read fails with the file named and remedies listed.
   */
  static async fromFile(filePath: string): Promise<ComponentDiscovery> {
    const data = readJsonPayload(filePath) as unknown as RestApiFileData;
    return new ComponentDiscovery(data);
  }

  /**
   * Validate required structure
   */
  private validate(): void {
    if (!this._data.document) {
      throw new Error('Invalid file data: missing "document" property');
    }

    if (!this._data.document.type) {
      throw new Error('Invalid document: missing "type" property');
    }
  }

  /**
   * Build node index by walking the tree
   */
  private buildIndex(node: RestApiNode, parentId?: string): void {
    this._nodeMap.set(node.id, node);
    if (parentId) {
      this._parentMap.set(node.id, parentId);
    }

    if (node.children) {
      for (const child of node.children) {
        this.buildIndex(child, node.id);
      }
    }
  }

  /**
   * Find all components in the file
   * 
   * Excludes variant children (COMPONENTs inside COMPONENT_SETs) to prevent
   * duplicates in audit listings, since we show COMPONENT_SETs as the main entry.
   * 
   * @returns Array of component metadata
   */
  findAllComponents(): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    
    for (const node of this._nodeMap.values()) {
      // Keep all COMPONENT_SETs
      if (node.type === 'COMPONENT_SET') {
        components.push({
          id: node.id,
          name: node.name,
          type: node.type,
          devStatus: readDevStatus(node)
        });
        continue;
      }

      // For COMPONENTs, check if parent is a COMPONENT_SET
      if (node.type === 'COMPONENT') {
        const parentId = this._parentMap.get(node.id);
        if (parentId) {
          const parent = this._nodeMap.get(parentId);
          // Exclude if parent is a COMPONENT_SET (this is a variant child)
          if (parent?.type === 'COMPONENT_SET') {
            continue;
          }
        }

        components.push({
          id: node.id,
          name: node.name,
          type: node.type,
          devStatus: readDevStatus(node)
        });
      }
    }
    
    return components;
  }

  /**
   * The listable components instanced anywhere inside the given components —
   * what those components compose, and what their composed pieces compose in
   * turn, to a fixpoint. A generated scaffold imports the output of everything
   * it instances, so a selection that omits these cannot generate cleanly.
   *
   * An instance resolves to the same row `findAllComponents` would list: a
   * variant's COMPONENT_SET rather than the variant itself.
   */
  composedComponentIds(rootIds: Iterable<string>): Set<string> {
    const found = new Set<string>();
    const queue = [...rootIds];
    const walked = new Set<string>();

    const listableOwner = (componentId: string): string | undefined => {
      const node = this._nodeMap.get(componentId);
      if (!node) return undefined;
      if (node.type === 'COMPONENT') {
        const parent = this._nodeMap.get(this._parentMap.get(node.id) ?? '');
        if (parent?.type === 'COMPONENT_SET') return parent.id;
      }
      return node.id;
    };

    while (queue.length > 0) {
      const rootId = queue.shift()!;
      if (walked.has(rootId)) continue;
      walked.add(rootId);
      const root = this._nodeMap.get(rootId);
      if (!root) continue;

      const visit = (node: RestApiNode): void => {
        const componentId = (node as { componentId?: string }).componentId;
        if (node.type === 'INSTANCE' && componentId) {
          const owner = listableOwner(componentId);
          // Self-instancing (a set's own variant) adds nothing to the selection.
          if (owner && owner !== rootId && !found.has(owner)) {
            found.add(owner);
            queue.push(owner);
          }
        }
        for (const child of node.children ?? []) visit(child);
      };
      visit(root);
    }
    return found;
  }

  /**
   * Get file name (if available)
   */
  getFileName(): string {
    return this._data.name || 'Untitled';
  }

  /** File-level lastModified (ISO 8601) from the REST API payload, if present. */
  getFileLastModified(): string | undefined {
    return this._data.lastModified;
  }
}

/** What scan needs from a discovery — served by the whole-graph class above or
 *  the page-streaming one below. */
export interface DiscoverySource {
  findAllComponents(): ComponentInfo[];
  composedComponentIds(rootIds: Iterable<string>): Set<string>;
  getFileName(): string;
  getFileLastModified(): string | undefined;
}

/**
 * Discovery over a page-split payload (specs#561). Walks one page at a time and
 * keeps only tables — listable rows, variant→set relations, and each listable
 * component's instanced ids — so no whole-document graph is ever resident and
 * the single-string read limit never applies.
 */
export class SectionedComponentDiscovery implements DiscoverySource {
  private rows: ComponentInfo[] = [];
  private variantToSet = new Map<string, string>();
  private knownComponentIds = new Set<string>();
  private instancedBy = new Map<string, Set<string>>();
  private fileName: string;
  private fileLastModified: string | undefined;

  constructor(sectioned: SectionedFile) {
    const root = sectioned.root() as { name?: string; lastModified?: string };
    this.fileName = root.name || 'Untitled';
    this.fileLastModified = root.lastModified;

    for (const entry of sectioned.pageEntries()) {
      this.indexPage(sectioned.loadPage(entry) as unknown as RestApiNode);
      sectioned.releasePage(entry.id);
    }
  }

  private indexPage(page: RestApiNode): void {
    const walk = (node: RestApiNode, parent: RestApiNode | null): void => {
      if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') {
        this.knownComponentIds.add(node.id);
        const isVariant = node.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET';
        if (isVariant && parent) this.variantToSet.set(node.id, parent.id);
        if (!isVariant) {
          this.rows.push({ id: node.id, name: node.name, type: node.type, devStatus: readDevStatus(node) });
          this.instancedBy.set(node.id, this.collectInstancedIds(node));
        }
      }
      for (const child of node.children ?? []) walk(child, node);
    };
    walk(page, null);
  }

  private collectInstancedIds(root: RestApiNode): Set<string> {
    const ids = new Set<string>();
    const visit = (node: RestApiNode): void => {
      const componentId = (node as { componentId?: string }).componentId;
      if (node.type === 'INSTANCE' && componentId) ids.add(componentId);
      for (const child of node.children ?? []) visit(child);
    };
    visit(root);
    return ids;
  }

  findAllComponents(): ComponentInfo[] {
    return this.rows;
  }

  /** Same fixpoint as ComponentDiscovery.composedComponentIds, resolved through
   *  the tables: an instance's componentId maps to the listable row that
   *  represents it (its set for a variant), unknown ids resolve to nothing. */
  composedComponentIds(rootIds: Iterable<string>): Set<string> {
    const found = new Set<string>();
    const queue = [...rootIds];
    const walked = new Set<string>();

    const listableOwner = (componentId: string): string | undefined => {
      if (!this.knownComponentIds.has(componentId)) return undefined;
      return this.variantToSet.get(componentId) ?? componentId;
    };

    while (queue.length > 0) {
      const rootId = queue.shift()!;
      if (walked.has(rootId)) continue;
      walked.add(rootId);
      for (const componentId of this.instancedBy.get(rootId) ?? []) {
        const owner = listableOwner(componentId);
        if (owner && owner !== rootId && !found.has(owner)) {
          found.add(owner);
          queue.push(owner);
        }
      }
    }
    return found;
  }

  getFileName(): string {
    return this.fileName;
  }

  getFileLastModified(): string | undefined {
    return this.fileLastModified;
  }
}
