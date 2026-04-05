import { describe, it, expect, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createProgram } from '../../src/index.js';

type RunResult = {
  exitCode?: number;
};

async function runCli(args: string[]): Promise<RunResult> {
  let exitCode: number | undefined;

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    const resolvedCode = typeof code === 'number' ? code : typeof code === 'string' ? Number(code) : 0;
    exitCode = Number.isFinite(resolvedCode) ? resolvedCode : 0;
    throw new Error(`process.exit:${exitCode}`);
  });
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    const program = createProgram();
    await program.parseAsync(['node', 'anova-cli', ...args], { from: 'user' });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('process.exit:')) {
      throw error;
    }
  } finally {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }

  return { exitCode };
}

function normalizeManifest(content: string): string {
  return content
    .replace(/\*\*Generated:\*\*.*\n/, '**Generated:** <timestamp>  \n')
    .replace(/\*\*File:\*\*.*\n/, '**File:** <file>\n');
}

describe('CLI parity', () => {
  it('matches the audit manifest format', async () => {
    const testDir = path.join(process.cwd(), 'tests', 'tmp', `cli-parity-${Date.now()}`);
    await fs.ensureDir(testDir);

    const filePath = path.join(testDir, 'library.json');
    const outputPath = path.join(testDir, 'components.md');

    const data = {
      name: 'Test Library',
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '1:1',
            name: 'Page',
            type: 'CANVAS',
            children: [
              { id: '2:1', name: 'Alert', type: 'COMPONENT', children: [] },
              {
                id: '3:1',
                name: 'Button Set',
                type: 'COMPONENT_SET',
                children: [
                  { id: '3:2', name: 'Button/Primary', type: 'COMPONENT', children: [] }
                ]
              }
            ]
          }
        ]
      }
    };

    await fs.writeJSON(filePath, data);

    const result = await runCli(['audit', filePath, '--output', outputPath]);
    expect(result.exitCode).toBe(0);

    const manifest = await fs.readFile(outputPath, 'utf-8');
    const normalized = normalizeManifest(manifest);

    const expected = [
      '# Component Manifest',
      '',
      '**Generated:** <timestamp>  ',
      '**File:** <file>',
      '',
      '---',
      '',
      '## Components',
      '',
      '- [x] Alert (2:1, COMPONENT)',
      '- [x] Button Set (3:1, COMPONENT_SET)'
    ].join('\n');

    expect(normalized).toBe(expected);

    await fs.remove(testDir);
  });
});
