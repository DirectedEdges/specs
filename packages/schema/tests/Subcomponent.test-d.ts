import type { Subcomponent, SubcomponentSource, Subcomponents } from '../types/Subcomponent.js';

// SubcomponentSource — required fields
const source: SubcomponentSource = {
  pageId: '790:6766',
  nodeId: '1477:200',
  nodeType: 'COMPONENT',
};

// SubcomponentSource — nodeType accepts all three values
const _frame: SubcomponentSource = { pageId: 'p', nodeId: 'n', nodeType: 'FRAME' };
const _set: SubcomponentSource = { pageId: 'p', nodeId: 'n', nodeType: 'COMPONENT_SET' };

// Subcomponent — source is optional; a minimal subcomponent remains valid without it
const minimal: Subcomponent = {
  title: 'My Sub',
  anatomy: { root: { type: 'container' } },
  default: { layout: ['root'], elements: { root: {} } },
};

// Subcomponent — source can be present
const withSource: Subcomponent = {
  title: 'My Sub',
  anatomy: { root: { type: 'container' } },
  default: { layout: ['root'], elements: { root: {} } },
  source,
};

// Subcomponents record
const subs: Subcomponents = {
  '1B': withSource,
  '2A': minimal,
};

// SubcomponentSource is exported from index
import type { SubcomponentSource as IndexSource } from '../types/index.js';
const _indexed: IndexSource = source;
