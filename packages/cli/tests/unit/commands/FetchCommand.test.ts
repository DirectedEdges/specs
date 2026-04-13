import { describe, it, expect } from 'vitest';
import { Fetch, formatDuration, formatRateLimitError } from '../../../src/commands/FetchCommand.js';

describe('FetchCommand', () => {
  it('registers name and description', () => {
    expect(Fetch.name()).toBe('fetch');
    expect(Fetch.description()).toContain('Fetch raw REST payloads');
  });

  it('registers expected options', () => {
    const options = Fetch.options.map(option => option.long).filter(Boolean);

    expect(options).toContain('--config');
    expect(options).toContain('--data-dir');
    expect(options).toContain('--outDir'); // deprecated alias
    expect(options).toContain('--only');
    expect(options).toContain('--verbose');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(45)).toBe('45 seconds');
  });

  it('formats minutes', () => {
    expect(formatDuration(120)).toBe('2 minutes');
  });

  it('formats hours', () => {
    expect(formatDuration(7200)).toBe('2 hours');
  });

  it('formats days', () => {
    expect(formatDuration(172800)).toBe('2 days');
  });

  it('formats months', () => {
    expect(formatDuration(30 * 24 * 60 * 60 * 3)).toBe('3 months');
  });

  it('uses singular when value is 1', () => {
    expect(formatDuration(60)).toBe('1 minute');
    expect(formatDuration(3600)).toBe('1 hour');
    expect(formatDuration(86400)).toBe('1 day');
  });

  it('returns 0 seconds for zero', () => {
    expect(formatDuration(0)).toBe('0 seconds');
  });
});

describe('formatRateLimitError', () => {
  it('includes all header details when present', () => {
    const headers = new Headers({
      'retry-after': '30',
      'x-figma-rate-limit-type': 'low',
      'x-figma-plan-tier': 'professional'
    });

    const result = formatRateLimitError('library', 'variables', headers);

    expect(result).toBe([
      'Error: Rate limited (429) while fetching library.variables',
      '  Retry after: 30 seconds',
      '  Seat tier: Viewer / Collab (low)',
      '  Plan: Professional',
      '  See: https://developers.figma.com/docs/rest-api/rate-limits/'
    ].join('\n'));
  });

  it('shows only base error and docs link when no headers present', () => {
    const headers = new Headers();

    const result = formatRateLimitError('kds', 'file', headers);

    expect(result).toBe([
      'Error: Rate limited (429) while fetching kds.file',
      '  See: https://developers.figma.com/docs/rest-api/rate-limits/'
    ].join('\n'));
  });

  it('handles partial headers (only retry-after)', () => {
    const headers = new Headers({ 'retry-after': '60' });

    const result = formatRateLimitError('kds', 'styles', headers);

    expect(result).toBe([
      'Error: Rate limited (429) while fetching kds.styles',
      '  Retry after: 1 minute',
      '  See: https://developers.figma.com/docs/rest-api/rate-limits/'
    ].join('\n'));
  });

  it('formats large retry-after as days', () => {
    const headers = new Headers({ 'retry-after': '254598' });

    const result = formatRateLimitError('kds', 'file', headers);

    expect(result).toContain('Retry after: 3 days');
  });

  it('maps high rate-limit type to Dev / Full label', () => {
    const headers = new Headers({ 'x-figma-rate-limit-type': 'high' });

    const result = formatRateLimitError('lib', 'file', headers);

    expect(result).toContain('Seat tier: Dev / Full (high)');
  });

  it('passes through unknown rate-limit type values', () => {
    const headers = new Headers({ 'x-figma-rate-limit-type': 'unknown' });

    const result = formatRateLimitError('lib', 'file', headers);

    expect(result).toContain('Seat tier: unknown');
  });

  it('title-cases plan tier', () => {
    const headers = new Headers({ 'x-figma-plan-tier': 'enterprise' });

    const result = formatRateLimitError('lib', 'file', headers);

    expect(result).toContain('Plan: Enterprise');
  });
});
