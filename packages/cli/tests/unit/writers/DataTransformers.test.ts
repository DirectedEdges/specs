import { describe, it, expect } from 'vitest';
import {
  splitComponentByConcern,
  extractApiFromSubcomponents,
} from '../../../src/Writers/DataTransformers';

describe('splitComponentByConcern', () => {
  it('defaults missing props to {} (regression #84)', () => {
    const { api } = splitComponentByConcern({
      title: 'egdsDivider',
      anatomy: {},
      metadata: {},
    });
    expect(api.props).toEqual({});
    expect(Array.isArray(api.props)).toBe(false);
  });

  it('passes through props object when present', () => {
    const props = { variant: { type: 'VARIANT', values: ['a', 'b'] } };
    const { api } = splitComponentByConcern({
      title: 'X',
      anatomy: {},
      props,
      metadata: {},
    });
    expect(api.props).toBe(props);
  });
});

describe('extractApiFromSubcomponents', () => {
  it('defaults missing props on subcomponents to {} (regression #84)', () => {
    const result = extractApiFromSubcomponents({
      child: { title: 'child', anatomy: {}, metadata: {} },
    });
    expect(result?.child.props).toEqual({});
    expect(Array.isArray(result?.child.props)).toBe(false);
  });
});
