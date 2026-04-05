import { describe, it, expect } from 'vitest';
import { Audit } from '../../../src/commands/AuditCommand.js';

describe('AuditCommand', () => {
  it('registers name and description', () => {
    expect(Audit.name()).toBe('audit');
    expect(Audit.description()).toContain('component manifest');
  });

  it('registers expected options', () => {
    const options = Audit.options.map(option => option.long).filter(Boolean);

    expect(options).toContain('--output');
    expect(options).toContain('--include-all');
    expect(options).toContain('--variables');
    expect(options).toContain('--verbose');
  });
});
