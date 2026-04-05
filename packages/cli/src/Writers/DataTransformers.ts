/**
 * API concern data extracted from component
 * Contains: title, anatomy, props, subcomponents
 * Metadata always appears last in serialization
 */
export interface ComponentApiData {
  title: string;
  anatomy: any;
  props: any[];
  subcomponents?: Record<string, SubcomponentApiData>;
  metadata: any;
}

/**
 * API data for subcomponent (nested within parent)
 */
export interface SubcomponentApiData {
  title: string;
  anatomy: any;
  props: any[];
  metadata: any;
}

/**
 * Variants concern data extracted from component
 * Contains: default, variants, invalidVariantCombinations, subcomponents
 * Metadata always appears last in serialization
 */
export interface ComponentVariantsData {
  default: any;
  variants: any[];
  invalidVariantCombinations?: any[];
  subcomponents?: Record<string, SubcomponentVariantsData>;
  metadata: any;
}

/**
 * Variants data for subcomponent (nested within parent)
 */
export interface SubcomponentVariantsData {
  default: any;
  variants: any[];
  invalidVariantCombinations?: any[];
  metadata: any;
}

/**
 * Split component data into API and Variants concerns
 * @param data Plain component data object
 * @returns Object with api and variants separated, metadata in both
 */
export function splitComponentByConcern(data: Record<string, any>): {
  api: ComponentApiData;
  variants: ComponentVariantsData;
} {
  // Extract API concern: title, anatomy, props, subcomponents (recursive)
  const api: ComponentApiData = {
    title: data.title,
    anatomy: data.anatomy,
    props: data.props || [],
    metadata: data.metadata
  };
  
  // Handle subcomponents recursively for API
  if (data.subcomponents) {
    api.subcomponents = extractApiFromSubcomponents(data.subcomponents);
  }
  
  // Extract Variants concern: default, variants, invalidVariantCombinations, subcomponents (recursive)
  const variants: ComponentVariantsData = {
    default: data.default,
    variants: data.variants || [],
    metadata: data.metadata
  };
  
  // Include invalidVariantCombinations only if present
  if (data.invalidVariantCombinations && data.invalidVariantCombinations.length > 0) {
    variants.invalidVariantCombinations = data.invalidVariantCombinations;
  }
  
  // Handle subcomponents recursively for Variants
  if (data.subcomponents) {
    variants.subcomponents = extractVariantsFromSubcomponents(data.subcomponents);
  }
  
  return { api, variants };
}

/**
 * Extract API concern from subcomponents
 * @param subcomponents Record of subcomponent data
 * @returns Record of subcomponent API data
 */
export function extractApiFromSubcomponents(
  subcomponents?: Record<string, any>
): Record<string, SubcomponentApiData> | undefined {
  if (!subcomponents) return undefined;
  
  const result: Record<string, SubcomponentApiData> = {};
  
  for (const [name, data] of Object.entries(subcomponents)) {
    // Extract API fields for this subcomponent
    const apiData: SubcomponentApiData = {
      title: data.title,
      anatomy: data.anatomy,
      props: data.props || [],
      metadata: data.metadata
    };
    
    // Recursively handle nested subcomponents
    if (data.subcomponents) {
      (apiData as any).subcomponents = extractApiFromSubcomponents(data.subcomponents);
    }
    
    result[name] = apiData;
  }
  
  return result;
}

/**
 * Extract Variants concern from subcomponents
 * @param subcomponents Record of subcomponent data
 * @returns Record of subcomponent variants data
 */
export function extractVariantsFromSubcomponents(
  subcomponents?: Record<string, any>
): Record<string, SubcomponentVariantsData> | undefined {
  if (!subcomponents) return undefined;
  
  const result: Record<string, SubcomponentVariantsData> = {};
  
  for (const [name, data] of Object.entries(subcomponents)) {
    // Extract Variants fields for this subcomponent
    const variantsData: SubcomponentVariantsData = {
      default: data.default,
      variants: data.variants || [],
      metadata: data.metadata
    };
    
    // Include invalidVariantCombinations only if present
    if (data.invalidVariantCombinations && data.invalidVariantCombinations.length > 0) {
      variantsData.invalidVariantCombinations = data.invalidVariantCombinations;
    }
    
    // Recursively handle nested subcomponents
    if (data.subcomponents) {
      (variantsData as any).subcomponents = extractVariantsFromSubcomponents(data.subcomponents);
    }
    
    result[name] = variantsData;
  }
  
  return result;
}

/**
 * Sort components by name for deterministic output
 * @param components Array of component objects with names
 * @returns Sorted array (case-sensitive alphabetical)
 */
export function sortComponentsByName(components: Array<{ name: string }>): Array<{ name: string }> {
  return [...components].sort((a, b) => {
    // Get name as string, fallback to empty string if undefined
    const nameA = String(a.name || '');
    const nameB = String(b.name || '');
    return nameA.localeCompare(nameB);
  });
}
