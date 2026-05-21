import { describe, it, expect } from 'vitest';
import {
  splitComponentByConcern,
  extractApiFromSubcomponents,
  extractExamplesFromSubcomponents,
  hasExampleData,
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

describe('splitComponentByConcern — examples concern', () => {
  it('routes slotContentExamples and instanceExamples into examples (not api/variants)', () => {
    const { api, variants, examples } = splitComponentByConcern({
      title: 'Alert',
      anatomy: {},
      props: {},
      default: {},
      variants: [],
      slotContentExamples: { alert__children: { layout: [] } },
      instanceExamples: { alertHeadingOnly: { propConfigurations: {} } },
      metadata: { author: 'x' },
    });
    expect(examples.slotContentExamples).toEqual({ alert__children: { layout: [] } });
    expect(examples.instanceExamples).toEqual({ alertHeadingOnly: { propConfigurations: {} } });
    // Examples must not leak into the other concerns
    expect((api as any).slotContentExamples).toBeUndefined();
    expect((api as any).instanceExamples).toBeUndefined();
    expect((variants as any).slotContentExamples).toBeUndefined();
    expect((variants as any).instanceExamples).toBeUndefined();
  });

  it('omits example fields when the component has none', () => {
    const { examples } = splitComponentByConcern({
      title: 'Divider', anatomy: {}, props: {}, default: {}, variants: [], metadata: {},
    });
    expect(examples.slotContentExamples).toBeUndefined();
    expect(examples.instanceExamples).toBeUndefined();
    expect(hasExampleData(examples)).toBe(false);
  });

  it('collects subcomponent examples and reports them via hasExampleData', () => {
    const { examples } = splitComponentByConcern({
      title: 'Alert', anatomy: {}, props: {}, default: {}, variants: [], metadata: {},
      subcomponents: {
        actions: { title: 'Actions', metadata: {}, slotContentExamples: { actions__children: {} } },
      },
    });
    expect(examples.subcomponents?.actions.slotContentExamples).toEqual({ actions__children: {} });
    expect(hasExampleData(examples)).toBe(true);
  });
});

describe('extractExamplesFromSubcomponents', () => {
  it('includes only subcomponents that carry examples, else undefined', () => {
    const result = extractExamplesFromSubcomponents({
      withEx: { title: 'a', metadata: {}, instanceExamples: { ex1: {} } },
      without: { title: 'b', metadata: {} },
    });
    expect(result && Object.keys(result)).toEqual(['withEx']);

    const none = extractExamplesFromSubcomponents({
      a: { title: 'a', metadata: {} },
    });
    expect(none).toBeUndefined();
  });
});
