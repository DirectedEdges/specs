/**
 * API concern data extracted from component
 * Contains: title, anatomy, props, subcomponents
 * Metadata always appears last in serialization
 */
export interface ComponentApiData {
  title: string;
  anatomy: any;
  props: Record<string, any>;
  subcomponents?: Record<string, SubcomponentApiData>;
  metadata: any;
}

/**
 * API data for subcomponent (nested within parent)
 */
export interface SubcomponentApiData {
  title: string;
  anatomy: any;
  props: Record<string, any>;
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
 * Examples concern data extracted from component
 * Contains: slotContentExamples, instanceExamples, images, subcomponents
 * (recursive). Metadata always appears last in serialization. Fields are
 * present only when the component actually has them.
 */
export interface ComponentExamplesData {
  slotContentExamples?: Record<string, any>;
  instanceExamples?: Record<string, any>;
  images?: Record<string, string>;
  subcomponents?: Record<string, SubcomponentExamplesData>;
  metadata: any;
}

/**
 * Examples data for subcomponent (nested within parent)
 */
export interface SubcomponentExamplesData {
  slotContentExamples?: Record<string, any>;
  instanceExamples?: Record<string, any>;
  images?: Record<string, string>;
  subcomponents?: Record<string, SubcomponentExamplesData>;
  metadata: any;
}

/**
 * Split component data into API, Variants, and Examples concerns
 * @param data Plain component data object
 * @returns Object with api, variants, and examples separated, metadata in each
 */
export function splitComponentByConcern(data: Record<string, any>): {
  api: ComponentApiData;
  variants: ComponentVariantsData;
  examples: ComponentExamplesData;
} {
  // Extract API concern: title, anatomy, props, subcomponents (recursive)
  const api: ComponentApiData = {
    title: data.title,
    anatomy: data.anatomy,
    props: data.props || {},
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

  // Extract Examples concern: slotContentExamples, instanceExamples, subcomponents
  // (recursive). Without this, --split-concerns would silently DROP these fields,
  // leaving the $slotContent references in `default`/`variants` dangling.
  const examples: ComponentExamplesData = { metadata: data.metadata };
  if (data.slotContentExamples) examples.slotContentExamples = data.slotContentExamples;
  if (data.instanceExamples) examples.instanceExamples = data.instanceExamples;
  // images registry (ADR-063) lives in the examples concern, beside
  // slotContentExamples — without this, --split-concerns would silently DROP
  // the registry and leave $image references dangling.
  if (data.images) examples.images = data.images;
  if (data.subcomponents) {
    const subExamples = extractExamplesFromSubcomponents(data.subcomponents);
    if (subExamples) examples.subcomponents = subExamples;
  }

  return { api, variants, examples };
}

/**
 * True when an examples concern carries any actual data (so callers can skip
 * emitting empty examples files for components that have no examples).
 */
export function hasExampleData(examples: ComponentExamplesData | SubcomponentExamplesData): boolean {
  return Boolean(
    (examples.slotContentExamples && Object.keys(examples.slotContentExamples).length > 0) ||
    (examples.instanceExamples && Object.keys(examples.instanceExamples).length > 0) ||
    (examples.images && Object.keys(examples.images).length > 0) ||
    (examples.subcomponents && Object.keys(examples.subcomponents).length > 0)
  );
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
      props: data.props || {},
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
 * Extract Examples concern from subcomponents
 * @param subcomponents Record of subcomponent data
 * @returns Record of subcomponent examples data, or undefined when no subcomponent
 *   has any example data (so empty `subcomponents` keys are never emitted)
 */
export function extractExamplesFromSubcomponents(
  subcomponents?: Record<string, any>
): Record<string, SubcomponentExamplesData> | undefined {
  if (!subcomponents) return undefined;

  const result: Record<string, SubcomponentExamplesData> = {};

  for (const [name, data] of Object.entries(subcomponents)) {
    const examplesData: SubcomponentExamplesData = { metadata: data.metadata };
    if (data.slotContentExamples) examplesData.slotContentExamples = data.slotContentExamples;
    if (data.instanceExamples) examplesData.instanceExamples = data.instanceExamples;
    if (data.images) examplesData.images = data.images;

    // Recursively handle nested subcomponents
    const nested = extractExamplesFromSubcomponents(data.subcomponents);
    if (nested) examplesData.subcomponents = nested;

    // Only include subcomponents that actually carry examples
    if (hasExampleData(examplesData)) result[name] = examplesData;
  }

  return Object.keys(result).length > 0 ? result : undefined;
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
