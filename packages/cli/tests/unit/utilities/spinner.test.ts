import { describe, it, expect, afterEach, vi } from 'vitest';
import readline from 'readline';
import { erasePrintedLine } from '../../../src/utilities/spinner.js';

/**
 * `erasePrintedLine` is how fetch keeps one line per unit of work: the estimate is
 * erased by the readiness line, which is erased by the download line. A wrapped
 * line occupies more than one row, and clearing one row leaves the rest on screen.
 */
describe('erasePrintedLine', () => {
  const original = {
    isTTY: process.stdout.isTTY,
    columns: process.stdout.columns,
  };

  afterEach(() => {
    Object.defineProperty(process.stdout, 'isTTY', { value: original.isTTY, configurable: true });
    Object.defineProperty(process.stdout, 'columns', { value: original.columns, configurable: true });
    vi.restoreAllMocks();
  });

  function asTty(columns: number) {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'columns', { value: columns, configurable: true });
    return {
      moveCursor: vi.spyOn(readline, 'moveCursor').mockImplementation(() => true),
      clearLine: vi.spyOn(readline, 'clearLine').mockImplementation(() => true),
      cursorTo: vi.spyOn(readline, 'cursorTo').mockImplementation(() => true),
    };
  }

  it('erases one row for a line that fits the terminal width', () => {
    const cursor = asTty(80);
    erasePrintedLine('✓ Ready: primer file');
    expect(cursor.moveCursor).toHaveBeenCalledTimes(1);
    expect(cursor.clearLine).toHaveBeenCalledTimes(1);
  });

  it('erases every row a wrapped line occupies', () => {
    const cursor = asTty(40);
    erasePrintedLine('x'.repeat(95));
    expect(cursor.moveCursor).toHaveBeenCalledTimes(3);
    expect(cursor.clearLine).toHaveBeenCalledTimes(3);
  });

  it('leaves the line standing outside a TTY, where there is no cursor to move', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    const moveCursor = vi.spyOn(readline, 'moveCursor').mockImplementation(() => true);
    erasePrintedLine('✓ Ready: primer file');
    expect(moveCursor).not.toHaveBeenCalled();
  });
});
