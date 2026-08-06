import { describe, it, expect } from 'vitest';
import { buildVariablesIndex, countUnpublished } from '../../../src/utilities/variablesIndex.js';

const VARIABLES_JSON = {
  meta: {
    variableCollections: {
      'VariableCollectionId:1:1': { name: 'Spacing' },
      'VariableCollectionId:2:2': { name: 'Color' },
    },
    variables: {
      'VariableID:1:23': {
        name: 'md',
        key: 'key-spacing-md',
        variableCollectionId: 'VariableCollectionId:1:1',
      },
      'VariableID:2:34': {
        name: 'brand/primary',
        key: 'key-color-brand-primary',
        variableCollectionId: 'VariableCollectionId:2:2',
        hiddenFromPublishing: true,
      },
    },
  },
};

describe('buildVariablesIndex', () => {
  it('indexes the same entry under both the variable id and the token path', () => {
    const index = buildVariablesIndex(VARIABLES_JSON);

    expect(index.byId['VariableID:1:23']).toEqual({ key: 'key-spacing-md', published: true });
    expect(index.byPath['Spacing/md']).toEqual({ key: 'key-spacing-md', published: true });
  });

  it('marks variables hidden from publishing as unpublished', () => {
    const index = buildVariablesIndex(VARIABLES_JSON);

    expect(index.byId['VariableID:2:34'].published).toBe(false);
    expect(index.byPath['Color/brand/primary'].published).toBe(false);
    expect(countUnpublished(index)).toBe(1);
  });

  it('indexes an unnamed variable by id only — the path axis needs a name', () => {
    const index = buildVariablesIndex({
      meta: {
        variableCollections: { 'VariableCollectionId:1:1': { name: 'Spacing' } },
        variables: { 'VariableID:3:45': { key: 'key-nameless', variableCollectionId: 'VariableCollectionId:1:1' } },
      },
    });

    expect(index.byId['VariableID:3:45']).toEqual({ key: 'key-nameless', published: true });
    expect(Object.keys(index.byPath)).toHaveLength(0);
  });

  it('omits a keyless variable from both axes — the key is what the index exists to supply', () => {
    const index = buildVariablesIndex({
      meta: {
        variableCollections: { 'VariableCollectionId:1:1': { name: 'Spacing' } },
        variables: { 'VariableID:4:56': { name: 'lg', variableCollectionId: 'VariableCollectionId:1:1' } },
      },
    });

    expect(Object.keys(index.byId)).toHaveLength(0);
    expect(Object.keys(index.byPath)).toHaveLength(0);
  });

  it('falls back to a bare name when the collection cannot be named', () => {
    const index = buildVariablesIndex({
      meta: {
        variableCollections: { 'VariableCollectionId:1:1': {} },
        variables: { 'VariableID:5:67': { name: 'orphan', key: 'key-orphan', variableCollectionId: 'VariableCollectionId:1:1' } },
      },
    });

    expect(index.byPath['orphan']).toEqual({ key: 'key-orphan', published: true });
  });

  it('returns empty axes for missing, empty, or malformed input', () => {
    expect(buildVariablesIndex(null)).toEqual({ byId: {}, byPath: {} });
    expect(buildVariablesIndex(undefined)).toEqual({ byId: {}, byPath: {} });
    expect(buildVariablesIndex({})).toEqual({ byId: {}, byPath: {} });
    expect(buildVariablesIndex({ meta: { variables: {} } })).toEqual({ byId: {}, byPath: {} });
  });
});
