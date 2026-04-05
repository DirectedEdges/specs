/**
 * Figma API Shim for CLI Mode
 * 
 * Purpose: Provide stub implementations of Figma Plugin API global object for CLI mode
 * Status: Phase 2 implementation (2026-01-10)
 * 
 * This allows Model code to run in both Plugin and CLI modes without modification
 */

// Create a minimal figma global object for CLI mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof global !== 'undefined' && typeof (global as any).figma === 'undefined') {
  const MIXED = Symbol.for('figma.mixed');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).figma = {
    mixed: MIXED,
    
    // Stub methods that should not be called in CLI mode
    async getNodeByIdAsync(id: string) {
      console.warn(`[CLI Mode] figma.getNodeByIdAsync('${id}') called - returning null`);
      return null;
    },
    
    currentPage: null,
    
    variables: {
      async getVariableByIdAsync(id: string) {
        console.warn(`[CLI Mode] figma.variables.getVariableByIdAsync('${id}') called - returning null`);
        return null;
      },
      
      async getVariableCollectionByIdAsync(id: string) {
        console.warn(`[CLI Mode] figma.variables.getVariableCollectionByIdAsync('${id}') called - returning null`);
        return null;
      }
    }
  };
}

export {};
