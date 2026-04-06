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

import fs from 'fs-extra';

/**
 * Minimal node structure from REST API
 */
interface RestApiNode {
  id: string;
  name: string;
  type: string;
  children?: RestApiNode[];
}

/**
 * Minimal structure for REST API file data
 */
export interface RestApiFileData {
  document: any;
  components?: Record<string, any>;
  componentSets?: Record<string, any>;
  name?: string;
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
   * Load from JSON file on disk
   */
  static async fromFile(filePath: string): Promise<ComponentDiscovery> {
    const data = await fs.readJSON(filePath);
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
          type: node.type
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
          type: node.type
        });
      }
    }
    
    return components;
  }

  /**
   * Get file name (if available)
   */
  getFileName(): string {
    return this._data.name || 'Untitled';
  }
}
