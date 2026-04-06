/**
 * Foundations data loading utilities for CLI environment
 * 
 * Provides functions to load and parse variables and styles JSON files
 * into strongly-typed Maps that can be passed to the transformer.
 * 
 * @packageDocumentation
 */

import fs from 'fs-extra';
import type { StylesMap, VariablesMap, CollectionsMap } from '@directededges/specs-from-figma';

/**
 * Container for all foundations data (styles, variables, collections)
 */
export interface FoundationsData {
  /** Map of style ID to style metadata */
  styles: StylesMap;
  /** Map of variable ID to variable metadata */
  variables: VariablesMap;
  /** Map of collection ID to collection metadata */
  collections: CollectionsMap;
}

/**
 * Load and parse variables and styles JSON files into typed Maps
 * 
 * This function handles all file I/O and parsing for foundations data,
 * building the strongly-typed Maps required by Component.fromRestApi().
 * 
 * Supports multiple styles payload shapes:
 * - { all_styles: [...] } - simplified format
 * - { meta: { styles: [...] } } - Figma REST API format
 * - { styles: {...} } - file JSON with styles map
 * 
 * Indexes styles by both node_id (primary) and key (secondary) for flexible lookup.
 * 
 * @param variablePaths - Array of file paths to variables JSON files
 * @param stylePaths - Array of file paths to styles JSON files
 * @param fileJson - Optional library file JSON to seed styles from (handles remote/published styles)
 * @returns Object containing styles, variables, and collections Maps
 * 
 * @example
 * ```typescript
 * const libraryJson = await fs.readJSON('./data/library.file.json');
 * const { styles, variables, collections } = await loadFoundations(
 *   ['./data/library.variables.json'],
 *   ['./data/library.styles.json', './data/foundations.styles.json'],
 *   libraryJson
 * );
 * 
 * const component = Component.fromRestApi(libraryJson, componentId, config, {
 *   coordinator,
 *   styles,
 *   variables,
 *   collections
 * });
 * ```
 */
export async function loadFoundations(
  variablePaths: string[],
  stylePaths: string[],
  fileJson?: Record<string, any>
): Promise<FoundationsData> {
  const styles: StylesMap = new Map();
  const variables: VariablesMap = new Map();
  const collections: CollectionsMap = new Map();
  
  // Seed styles from file itself (handles remote/published style references in components)
  if (fileJson?.styles && typeof fileJson.styles === 'object') {
    for (const [styleId, s] of Object.entries<any>(fileJson.styles)) {
      if (!styleId) continue;
      const type = s?.styleType || s?.type;
      if (!type) continue;
      
      styles.set(styleId, {
        id: styleId,
        name: s?.name || styleId,
        type,
        description: s?.description,
        ...(s?.$custom != null ? { $custom: s.$custom } : {})
      });
    }
  }

  // Load variables JSON files
  for (const path of variablePaths) {
    const json = await fs.readJSON(path);
    
    // Parse variables from meta.variables
    if (json.meta?.variables) {
      for (const [id, varDef] of Object.entries<any>(json.meta.variables)) {
        variables.set(id, {
          id,
          name: varDef.name,
          key: varDef.key ?? id,
          variableCollectionId: varDef.variableCollectionId ?? '',
          resolvedType: varDef.resolvedType,
          valuesByMode: varDef.valuesByMode ?? {},
          remote: Boolean(varDef.remote),
          description: varDef.description,
          scopes: Array.isArray(varDef.scopes) ? varDef.scopes : undefined,
          codeSyntax: varDef.codeSyntax,
          ...(varDef.$custom != null ? { $custom: varDef.$custom } : {})
        });
      }
    }
    
    // Parse collections from meta.variableCollections
    if (json.meta?.variableCollections) {
      for (const [id, colDef] of Object.entries<any>(json.meta.variableCollections)) {
        const modes = Array.isArray(colDef.modes) ? colDef.modes : [];
        const defaultModeId = colDef.defaultModeId ?? (modes[0]?.modeId ?? '');
        collections.set(id, {
          id,
          name: colDef.name,
          key: colDef.key ?? id,
          modes,
          defaultModeId,
          variableIds: Array.isArray(colDef.variableIds) ? colDef.variableIds : [],
          remote: Boolean(colDef.remote)
        });
      }
    }
  }
  
  // Load styles JSON files - supports multiple payload shapes
  for (const path of stylePaths) {
    const json = await fs.readJSON(path);
    
    // Shape 1: Simplified format - { all_styles: [...] }
    if (json.all_styles && Array.isArray(json.all_styles)) {
      for (const style of json.all_styles) {
        if (!style.id) continue;
        styles.set(style.id, {
          id: style.id,
          name: style.name,
          type: style.type,
          description: style.description,
          ...(style.$custom != null ? { $custom: style.$custom } : {})
        });
      }
    }
    
    // Shape 2: REST API endpoint format - { meta: { styles: [...] } }
    if (json.meta?.styles && Array.isArray(json.meta.styles)) {
      for (const s of json.meta.styles) {
        const primaryId = s.node_id || s.key;
        if (!primaryId) continue;
        
        const styleDef = {
          id: primaryId,
          name: s.name,
          type: s.style_type,
          description: s.description,
          ...(s.$custom != null ? { $custom: s.$custom } : {})
        };
        
        // Primary lookup: node_id (matches component references)
        styles.set(primaryId, styleDef);
        
        // Secondary lookup: key (for debugging and some API surfaces)
        if (s.key && s.key !== primaryId) {
          styles.set(s.key, styleDef);
        }
      }
    }
    
    // Shape 3: File JSON format - { styles: { [styleId]: {...} } }
    if (json.styles && typeof json.styles === 'object') {
      for (const [styleId, s] of Object.entries<any>(json.styles)) {
        if (!styleId) continue;
        const type = s?.styleType || s?.type;
        if (!type) continue;
        
        styles.set(styleId, {
          id: styleId,
          name: s?.name || styleId,
          type,
          description: s?.description,
          ...(s?.$custom != null ? { $custom: s.$custom } : {})
        });
      }
    }
  }

  return { styles, variables, collections };
}
