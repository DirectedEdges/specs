import type { ComponentApi, ComponentVariants, ComponentExamples } from '../types/ComponentConcerns.js';

// ComponentApi — required fields only
const api: ComponentApi = {
  title: 'Button',
  anatomy: { root: { type: 'container' } },
};

// ComponentApi — with optional props, metadata, and nested subcomponents (no metadata/subcomponents on the nested entry)
const apiFull: ComponentApi = {
  title: 'Button',
  anatomy: { root: { type: 'container' } },
  props: { label: { type: 'string', default: 'Click me' } },
  subcomponents: {
    icon: {
      title: 'Icon',
      anatomy: { root: { type: 'container' } },
    },
  },
};

const _nestedApi: Omit<ComponentApi, 'metadata' | 'subcomponents'> = {
  title: 'Icon',
  anatomy: { root: { type: 'container' } },
};
// @ts-expect-error — metadata is not assignable within a subcomponent's api concern
_nestedApi.metadata = {} as any;

// ComponentVariants — required fields only
const variants: ComponentVariants = {
  default: { layout: ['root'], elements: { root: {} } },
};

// ComponentVariants — with optional variants and invalidVariantCombinations
const variantsFull: ComponentVariants = {
  default: { layout: ['root'], elements: { root: {} } },
  variants: [],
  invalidVariantCombinations: [{ disabled: true }],
};

// ComponentExamples — all fields optional
const examples: ComponentExamples = {};

// ComponentExamples — with instanceExamples and slotContentExamples
const examplesFull: ComponentExamples = {
  instanceExamples: {
    primary: { title: 'Primary', propConfigurations: {} },
  },
  slotContentExamples: {
    composedLabel: { anatomy: { root: { type: 'container' } }, elements: { root: {} }, layout: ['root'] },
  },
};

// Exported from index
import type { ComponentApi as IndexApi, ComponentVariants as IndexVariants, ComponentExamples as IndexExamples } from '../types/index.js';
const _indexedApi: IndexApi = api;
const _indexedVariants: IndexVariants = variants;
const _indexedExamples: IndexExamples = examples;

void apiFull;
void variantsFull;
void examplesFull;
