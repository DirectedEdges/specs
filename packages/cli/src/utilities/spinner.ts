/**
 * Inline progress for commands that wait on something slow — a download, a render.
 *
 * The spinner occupies one line and is erased when it stops, so the caller prints the
 * outcome over it rather than under it: one line per unit of work, start to finish.
 *
 * Outside a TTY (a pipe, CI, a log file) there is no cursor to move, so the text prints
 * once and the elapsed time is still returned. Nothing writes escape codes into a file.
 *
 * @packageDocumentation
 */

import readline from 'readline';

export function isInteractive(): boolean {
  return Boolean(process.stdout.isTTY);
}

export function renderInlineStatus(text: string): void {
  if (!isInteractive()) {
    console.log(text);
    return;
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(text);
}

export function clearInlineStatus(): void {
  if (!isInteractive()) return;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

export function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

/** Start spinning, and return a stop function that erases the line and reports elapsed time. */
export function startSpinner(text: string): () => string {
  const start = Date.now();
  if (!isInteractive()) {
    console.log(text);
    return () => formatElapsed(Date.now() - start);
  }
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    const elapsed = formatElapsed(Date.now() - start);
    renderInlineStatus(`${frames[i++ % frames.length]} ${text} (${elapsed})`);
  }, 80);
  return () => {
    clearInterval(id);
    clearInlineStatus();
    return formatElapsed(Date.now() - start);
  };
}
