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
  it('maps a token name to the key and the id it was fetched with', () => {
    const index = buildVariablesIndex(VARIABLES_JSON);

    expect(index['Spacing/md']).toEqual({
      key: 'key-spacing-md',
      id: 'VariableID:1:23',
      published: true,
    });
  });

  it('marks a variable hidden from publishing as unpublished, keeping its id', () => {
    const index = buildVariablesIndex(VARIABLES_JSON);

    expect(index['Color/brand/primary']).toEqual({
      key: 'key-color-brand-primary',
      id: 'VariableID:2:34',
      published: false,
    });
    expect(countUnpublished(index)).toBe(1);
  });

  it('omits an unnamed variable — the name is the only thing a spec can reference', () => {
    const index = buildVariablesIndex({
      meta: {
        variableCollections: { 'VariableCollectionId:1:1': { name: 'Spacing' } },
        variables: { 'VariableID:3:45': { key: 'key-nameless', variableCollectionId: 'VariableCollectionId:1:1' } },
      },
    });

    expect(Object.keys(index)).toHaveLength(0);
  });

  it('keeps a keyless variable as unpublished, so its id can still resolve in its own file', () => {
    const index = buildVariablesIndex({
      meta: {
        variableCollections: { 'VariableCollectionId:1:1': { name: 'Spacing' } },
        variables: { 'VariableID:4:56': { name: 'lg', variableCollectionId: 'VariableCollectionId:1:1' } },
      },
    });

    expect(index['Spacing/lg']).toEqual({ key: '', id: 'VariableID:4:56', published: false });
  });

  it('falls back to a bare name when the collection cannot be named', () => {
    const index = buildVariablesIndex({
      meta: {
        variableCollections: { 'VariableCollectionId:1:1': {} },
        variables: { 'VariableID:5:67': { name: 'orphan', key: 'key-orphan', variableCollectionId: 'VariableCollectionId:1:1' } },
      },
    });

    expect(index['orphan']).toMatchObject({ key: 'key-orphan', published: true });
  });

  it('returns an empty index for missing, empty, or malformed input', () => {
    expect(buildVariablesIndex(null)).toEqual({});
    expect(buildVariablesIndex(undefined)).toEqual({});
    expect(buildVariablesIndex({})).toEqual({});
    expect(buildVariablesIndex({ meta: { variables: {} } })).toEqual({});
  });
});
