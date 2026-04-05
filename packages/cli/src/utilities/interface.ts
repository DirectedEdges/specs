/**
 * DataLoader - Interface for loading Figma data (styles, variables, collections)
 * 
 * Purpose: Abstract data access to support both Plugin API and REST API sources
 * 
 * Implementations:
 * - PluginApiDataLoader: Uses figma.* global APIs in plugin environment
 * - FigmaRESTDataResolver: Uses pre-loaded REST API JSON data
 */

export interface VariableDefinition {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, unknown>;
  remote: boolean;
  description?: string;
  scopes?: string[];
  codeSyntax?: {
    WEB?: string;
    ANDROID?: string;
    iOS?: string;
  };
}

export interface VariableCollection {
  id: string;
  name: string;
  key: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  variableIds: string[];
  remote: boolean;
}

export interface StyleDefinition {
  id: string;
  name: string;
  type: 'FILL' | 'STROKE' | 'TEXT' | 'EFFECT' | 'GRID' | 'PAINT';
  description?: string;
  [key: string]: unknown;
}

export type CodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS';

/**
 * Data loader interface for accessing Figma styles and variables
 */
export interface DataLoader {
  /**
   * Get style by ID
   */
  getStyle(styleId: string): Promise<StyleDefinition | null>;

  /**
   * Get variable by ID
   */
  getVariable(variableId: string): Promise<VariableDefinition | null>;

  /**
   * Get variable collection by ID
   */
  getCollection(collectionId: string): Promise<VariableCollection | null>;

  /**
   * Get variable name with optional platform-specific code syntax
   */
  getVariableName(variableId: string, platform: CodeSyntaxPlatform | 'DEFAULT'): Promise<string | null>;

  /**
   * Get collection name for a variable
   */
  getCollectionName(variableId: string): Promise<string | null>;
}
