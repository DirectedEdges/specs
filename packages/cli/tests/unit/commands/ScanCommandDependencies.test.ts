import { describe, it, expect } from 'vitest';
import {
  retainComposedDependencies,
  subcomponentParentOf,
} from '../../../src/commands/ScanCommand.js';

const CONVENTIONS = {
  match: ['{C} / {S}', '{C} / _ / {S}'],
  exclude: ['{C} / Examples / {S}'],
};

function row(id: string, name: string, included: boolean) {
  return { id, name, included };
}

describe('subcomponentParentOf', () => {
  it('binds {C} to a listed component, not to any text', () => {
    expect(subcomponentParentOf('List / Item', ['List'], CONVENTIONS)).toBe('List');
    expect(subcomponentParentOf('List / Item', ['Button'], CONVENTIONS)).toBeNull();
  });

  it('matches hidden-folder subcomponents', () => {
    expect(
      subcomponentParentOf('Button /_ / Start Visual L', ['Button'], CONVENTIONS)
    ).toBe('Button');
  });

  it('does not treat a component as its own subcomponent', () => {
    expect(subcomponentParentOf('List', ['List'], CONVENTIONS)).toBeNull();
  });

  it('honours exclude patterns', () => {
    expect(
      subcomponentParentOf('Slider / Examples / Steps', ['Slider'], CONVENTIONS)
    ).toBeNull();
  });

  it('is inert with no match patterns', () => {
    expect(subcomponentParentOf('List / Item', ['List'])).toBeNull();
  });
});

describe('retainComposedDependencies', () => {
  it('leaves a checked component subcomponent unchecked', () => {
    const rows = [
      row('1', 'List', true),
      row('2', 'List / Item', false),
      row('3', 'Action List', true),
      row('4', 'Action List / Item', false),
    ];
    const retained = retainComposedDependencies(rows, () => new Set(['2', '4']), CONVENTIONS);
    expect(retained).toBe(0);
    expect(rows.map(r => r.included)).toEqual([true, false, true, false]);
  });

  it('still retains a sibling component a checked component instances', () => {
    const rows = [
      row('1', 'Card', true),
      row('2', 'Mark / Brand / Member only deal', false),
    ];
    const retained = retainComposedDependencies(rows, () => new Set(['2']), CONVENTIONS);
    expect(retained).toBe(1);
    expect(rows[1].included).toBe(true);
  });

  it('retains a subcomponent whose own parent is unchecked', () => {
    const rows = [
      row('1', 'Card', true),
      row('2', 'List', false),
      row('3', 'List / Item', false),
    ];
    const retained = retainComposedDependencies(rows, () => new Set(['3']), CONVENTIONS);
    expect(retained).toBe(1);
    expect(rows[2].included).toBe(true);
  });

  it('retains nothing when nothing is checked', () => {
    const rows = [row('1', 'List', false)];
    expect(retainComposedDependencies(rows, () => new Set(['1']), CONVENTIONS)).toBe(0);
  });

  // ADR-093: retention runs after prior selections are merged forward, so without
  // protection it re-checks exactly what a human unchecked — and a setting that
  // says the manifest outranks the library would not actually outrank it.
  it('leaves a protected row unchecked even when a checked component composes it', () => {
    const rows = [
      row('1', 'Card', true),
      row('2', 'Mark / Brand / Member only deal', false),
    ];
    const retained = retainComposedDependencies(
      rows,
      () => new Set(['2']),
      CONVENTIONS,
      new Set(['2'])
    );
    expect(retained).toBe(0);
    expect(rows[1].included).toBe(false);
  });

  it('protects only the named rows', () => {
    const rows = [
      row('1', 'Card', true),
      row('2', 'Mark / Brand / Member only deal', false),
      row('3', 'Brand Logo', false),
    ];
    const retained = retainComposedDependencies(
      rows,
      () => new Set(['2', '3']),
      CONVENTIONS,
      new Set(['2'])
    );
    expect(retained).toBe(1);
    expect(rows[1].included).toBe(false);
    expect(rows[2].included).toBe(true);
  });
});
