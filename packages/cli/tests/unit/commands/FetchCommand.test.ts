import { describe, it, expect } from 'vitest';
import { Fetch } from '../../../src/commands/FetchCommand.js';

describe('FetchCommand', () => {
  it('registers name and description', () => {
    expect(Fetch.name()).toBe('fetch');
    expect(Fetch.description()).toContain('Fetch raw REST payloads');
  });

  it('registers expected options', () => {
    const options = Fetch.options.map(option => option.long).filter(Boolean);

    expect(options).toContain('--config');
    expect(options).toContain('--outDir');
    expect(options).toContain('--only');
    expect(options).toContain('--verbose');
  });
});
